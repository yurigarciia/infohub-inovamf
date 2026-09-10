import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { env } from "../../config/env.js";
import { tx } from "../../shared/sql.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { assertTransitionAllowed } from "../journey/journey.rules.js";
import { recordNotification } from "../notifications/notifications.service.js";
import { startSessionFor } from "../auth/auth.service.js";
import type { AuthResult, SessionContext } from "../auth/auth.service.js";
import * as ref from "../reference/reference.repository.js";
import * as repo from "./teams.repository.js";
import type {
  TeamMemberRow,
  TeamMentorRow,
  TeamNoteRow,
  TeamRow,
  TeamStageHistoryRow,
} from "./teams.repository.js";

type Role = "ADMIN" | "MENTOR" | "STUDENT";
export interface Actor {
  id: string;
  role: Role;
}

// --- views (espelham TeamBoardItem / TeamDetail do front) --------------

interface JourneyStageLite {
  id: number;
  number: number;
  name: string;
}
interface IdeaAreaLite {
  id: number;
  name: string;
  createdAt: string;
}

export interface TeamBoardItem extends TeamRow {
  currentStage: JourneyStageLite;
  area: IdeaAreaLite | null;
  members: TeamMemberRow[];
}

export interface TeamDetail extends TeamBoardItem {
  mentors: TeamMentorRow[];
  stageHistory: TeamStageHistoryRow[];
  notes: TeamNoteRow[];
}

async function decorate(teams: TeamRow[]): Promise<TeamBoardItem[]> {
  if (teams.length === 0) return [];
  const [stages, areas, members] = await Promise.all([
    ref.listJourneyStages(),
    ref.listIdeaAreas(),
    repo.listMembers(teams.map((t) => t.id)),
  ]);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const membersByTeam = new Map<string, TeamMemberRow[]>();
  for (const m of members) {
    const list = membersByTeam.get(m.teamId) ?? [];
    list.push(m);
    membersByTeam.set(m.teamId, list);
  }
  return teams.map((t) => ({
    ...t,
    currentStage: stageById.get(t.currentStageId)!,
    area: t.areaId ? (areaById.get(t.areaId) ?? null) : null,
    members: membersByTeam.get(t.id) ?? [],
  }));
}

// --- controle de acesso (RNF-03) --------------------------------------

export async function assertCanSeeTeam(actor: Actor, teamId: string): Promise<TeamRow> {
  const team = await repo.getTeam(teamId);
  if (!team) throw new NotFoundError("Equipe não encontrada.");
  if (actor.role === "ADMIN") return team;
  if (actor.role === "MENTOR") {
    if (!(await repo.isAssignedMentor(teamId, actor.id))) {
      throw new ForbiddenError("Você não é mentor desta equipe.");
    }
    return team;
  }
  if (!(await repo.isMember(teamId, actor.id))) {
    throw new ForbiddenError("Você não faz parte desta equipe.");
  }
  return team;
}

export async function assertCanManageTeam(actor: Actor, teamId: string): Promise<TeamRow> {
  if (actor.role === "STUDENT") {
    throw new ForbiddenError("Somente mentor ou administrador pode alterar a equipe.");
  }
  return assertCanSeeTeam(actor, teamId);
}

// --- leitura ---------------------------------------------------------

/** Painel do funil (RF-06/07). Mentor vê só as equipes atribuídas. */
export async function getTeamsByStage(
  actor: Actor,
  filters: repo.BoardFilters,
): Promise<TeamBoardItem[]> {
  const effective =
    actor.role === "MENTOR" ? { ...filters, mentorId: actor.id } : filters;
  const teams = await repo.listTeams(effective);
  return decorate(teams);
}

/** Área do aluno — sempre as equipes do próprio usuário autenticado. */
export async function getTeamsForStudent(userId: string): Promise<TeamBoardItem[]> {
  const teams = await repo.listTeamsForUser(userId);
  return decorate(teams);
}

/** Detalhe da equipe (RF-08/10). Notas internas só para staff. */
export async function getTeamDetail(actor: Actor, teamId: string): Promise<TeamDetail> {
  const team = await assertCanSeeTeam(actor, teamId);
  const [board] = await decorate([team]);
  const [mentors, stageHistory, notes] = await Promise.all([
    repo.listMentors(teamId),
    repo.listStageHistory(teamId),
    actor.role === "STUDENT" ? Promise.resolve<TeamNoteRow[]>([]) : repo.listNotes(teamId),
  ]);
  return { ...board!, mentors, stageHistory, notes };
}

// --- escrita -------------------------------------------------------

export interface InscriptionMember {
  name: string;
  email: string;
  phone?: string;
  course: string;
  period: string;
}

export interface CreateTeamInput {
  leader: InscriptionMember;
  members: InscriptionMember[];
  ideaName: string;
  ideaDescription: string;
  areaId: number;
  ideaMaturity: string;
  sourceOrigin?: string;
  cohort: string;
  lgpdConsent: boolean;
}

export interface CreateTeamResult {
  team: TeamRow;
  leaderUserId: string;
  /** sessão do líder — RF-02: o envio já cria/reaproveita a conta e loga. */
  session: AuthResult;
}

/**
 * Etapa 1 do funil (RF-02/04/05). Find-or-create de cada aluno por
 * e-mail (não duplica quem já existe — A4), registra consentimento LGPD
 * (RNF-02) do líder, cria a equipe na etapa 1 e notifica os admins.
 */
export async function createTeamFromInscription(
  input: CreateTeamInput,
  ctx: SessionContext,
): Promise<CreateTeamResult> {
  const throwawayHash = await bcrypt.hash(randomBytes(18).toString("hex"), env.BCRYPT_ROUNDS);

  const resolveStudent = async (
    client: PoolClient,
    person: InscriptionMember,
    isLeader: boolean,
  ): Promise<string> => {
    const existing = await repo.findUserByEmail(client, person.email);
    if (existing) {
      if (existing.role !== "STUDENT") {
        throw new ForbiddenError(
          `O e-mail ${person.email} pertence a uma conta de equipe (admin/mentor).`,
        );
      }
      return existing.id;
    }
    return repo.insertStudent(client, {
      name: person.name.trim(),
      email: person.email.trim(),
      phone: person.phone?.trim() || null,
      course: person.course.trim(),
      period: person.period.trim(),
      lgpdConsentedAt: isLeader && input.lgpdConsent ? new Date() : null,
      passwordHash: throwawayHash,
    });
  };

  const { teamId, leaderUserId } = await tx(async (client) => {
    const leaderId = await resolveStudent(client, input.leader, true);
    const memberIds: string[] = [];
    for (const m of input.members) {
      memberIds.push(await resolveStudent(client, m, false));
    }

    const newTeamId = await repo.insertTeam(client, {
      ideaName: input.ideaName.trim(),
      ideaDescription: input.ideaDescription.trim(),
      areaId: input.areaId,
      ideaMaturity: input.ideaMaturity,
      sourceOrigin: input.sourceOrigin?.trim() || null,
      cohort: input.cohort,
    });

    await repo.insertMember(client, newTeamId, leaderId, "LEADER");
    for (const id of memberIds) {
      if (id !== leaderId) await repo.insertMember(client, newTeamId, id, "MEMBER");
    }
    await repo.openStageHistory(client, newTeamId, 1, null);

    return { teamId: newTeamId, leaderUserId: leaderId };
  });

  const team = (await repo.getTeam(teamId))!;

  await recordAuditLog({
    actorUserId: leaderUserId,
    entityType: "team",
    entityId: teamId,
    action: "TEAM_REGISTERED",
    metadata: { cohort: team.cohort, memberCount: input.members.length + 1 },
  });

  for (const adminId of await repo.listAdminIds()) {
    await recordNotification({
      recipientUserId: adminId,
      type: "NEW_TEAM_REGISTERED",
      subject: `Novo cadastro recebido: ${team.ideaName}`,
      relatedTeamId: teamId,
    });
  }

  const session = await startSessionFor(
    {
      id: leaderUserId,
      name: input.leader.name.trim(),
      email: input.leader.email.trim(),
      role: "STUDENT",
    },
    ctx,
  );

  return { team, leaderUserId, session };
}

/** RF-09 — avança/retrocede a equipe uma etapa (RN-01 valida a transição). */
export async function advanceTeamStage(
  actor: Actor,
  teamId: string,
  toStageId: number,
): Promise<TeamRow> {
  const team = await assertCanManageTeam(actor, teamId);
  assertTransitionAllowed(team.currentStageId, toStageId);

  const updated = await tx(async (client) => {
    await client.query("SELECT id FROM teams WHERE id = $1 FOR UPDATE", [teamId]);
    await repo.closeOpenStageHistory(client, teamId);
    await repo.openStageHistory(client, teamId, toStageId, actor.id);
    return repo.updateCurrentStage(client, teamId, toStageId);
  });

  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "team",
    entityId: teamId,
    action: "STAGE_ADVANCED",
    metadata: { fromStageId: team.currentStageId, toStageId },
  });
  return updated;
}

/** RF-10 — anotação interna (nunca exposta ao aluno). */
export async function addTeamNote(
  actor: Actor,
  teamId: string,
  content: string,
): Promise<TeamNoteRow> {
  await assertCanManageTeam(actor, teamId);
  const note = await repo.insertNote(teamId, actor.id, content.trim());
  await recordAuditLog({
    actorUserId: actor.id,
    entityType: "team_note",
    entityId: note.id,
    action: "NOTE_ADDED",
    metadata: { teamId },
  });
  return note;
}
