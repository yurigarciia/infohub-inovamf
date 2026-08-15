// Camada de acesso a equipes/ideias e ao funil. Hoje lê/escreve nos
// mocks em memória; amanhã troca para Prisma/API sem mudar as
// assinaturas (ver docs/frontend-plan.md, Seção 4.1).

import {
  MOCK_IDEA_AREAS,
  MOCK_JOURNEY_STAGES,
  MOCK_STUDENT_PROFILES,
  MOCK_TASKS,
  MOCK_TEAM_MEMBERS,
  MOCK_TEAM_MENTORS,
  MOCK_TEAM_NOTES,
  MOCK_TEAM_STAGE_HISTORY,
  MOCK_TEAMS,
  MOCK_USERS,
} from "@/mocks/data";
import { generateId } from "@/mocks/utils";
import { IdeaMaturity, TeamMemberRole, UserRole } from "@/types";
import type {
  IdeaArea,
  JourneyStage,
  Team,
  TeamBoardItem,
  TeamDetail,
  TeamFilters,
  TeamMemberWithUser,
  TeamNote,
  User,
} from "@/types";
import { recordAuditLog } from "./audit.service";
import { canAdvanceToStage } from "./journey.service";
import { delay } from "./latency";
import { recordNotification } from "./notifications.service";
import { findOrCreateStudentByEmail } from "./users.service";

export async function getIdeaAreas(): Promise<IdeaArea[]> {
  await delay();
  return [...MOCK_IDEA_AREAS];
}

/** Turmas/semestres com pelo menos uma equipe — para o filtro por
 * período (RF-24). Ordenado do mais recente para o mais antigo. */
export async function getCohorts(): Promise<string[]> {
  await delay();
  return [...new Set(MOCK_TEAMS.map((t) => t.cohort))].sort((a, b) => b.localeCompare(a));
}

/** Para cada aluno com pelo menos uma equipe, indica se ele é líder em
 * alguma delas ou só integrante em todas — usado hoje pelo seletor de
 * "papel ativo" (T-FE-05) pra rotular a conta de demonstração (Q1: a
 * distinção líder/integrante é por equipe, não um papel global). */
export async function getStudentMemberRoleSummary(): Promise<Map<string, TeamMemberRole>> {
  await delay(50);
  const summary = new Map<string, TeamMemberRole>();
  for (const member of MOCK_TEAM_MEMBERS) {
    const current = summary.get(member.userId);
    if (current === TeamMemberRole.LEADER) continue;
    summary.set(member.userId, member.memberRole);
  }
  return summary;
}

function getStageOrThrow(stageId: number): JourneyStage {
  const stage = MOCK_JOURNEY_STAGES.find((s) => s.id === stageId);
  if (!stage) throw new Error(`Etapa ${stageId} não encontrada.`);
  return stage;
}

function getMembersWithUser(teamId: string): TeamMemberWithUser[] {
  return MOCK_TEAM_MEMBERS.filter((m) => m.teamId === teamId).map((member) => {
    const user = MOCK_USERS.find((u) => u.id === member.userId);
    if (!user) throw new Error(`Usuário ${member.userId} não encontrado.`);
    return { ...member, user };
  });
}

function toBoardItem(team: Team): TeamBoardItem {
  return {
    ...team,
    currentStage: getStageOrThrow(team.currentStageId),
    area: team.areaId ? (MOCK_IDEA_AREAS.find((a) => a.id === team.areaId) ?? null) : null,
    members: getMembersWithUser(team.id),
  };
}

/** Painel do administrador — funil/kanban (RF-06, RF-07, RF-24). */
export async function getTeamsByStage(filters: TeamFilters = {}): Promise<TeamBoardItem[]> {
  await delay();

  let teams = [...MOCK_TEAMS];

  if (filters.search) {
    const search = filters.search.trim().toLowerCase();
    teams = teams.filter((t) => t.ideaName.toLowerCase().includes(search));
  }
  if (filters.areaId !== undefined) {
    teams = teams.filter((t) => t.areaId === filters.areaId);
  }
  if (filters.cohort) {
    teams = teams.filter((t) => t.cohort === filters.cohort);
  }
  if (filters.course) {
    const course = filters.course.trim().toLowerCase();
    const memberUserIds = new Set(
      MOCK_STUDENT_PROFILES.filter((sp) => sp.course.toLowerCase().includes(course)).map(
        (sp) => sp.userId,
      ),
    );
    teams = teams.filter((t) =>
      MOCK_TEAM_MEMBERS.some((m) => m.teamId === t.id && memberUserIds.has(m.userId)),
    );
  }
  if (filters.mentorId) {
    teams = teams.filter((t) =>
      MOCK_TEAM_MENTORS.some((tm) => tm.teamId === t.id && tm.mentorId === filters.mentorId),
    );
  }
  if (filters.taskStatus) {
    teams = teams.filter((t) =>
      MOCK_TASKS.some((task) => task.teamId === t.id && task.status === filters.taskStatus),
    );
  }

  return teams.map(toBoardItem);
}

/** Página de detalhe da equipe (RF-08). */
export async function getTeamDetail(teamId: string): Promise<TeamDetail> {
  await delay();
  const team = MOCK_TEAMS.find((t) => t.id === teamId);
  if (!team) throw new Error(`Equipe ${teamId} não encontrada.`);

  const mentors = MOCK_TEAM_MENTORS.filter((tm) => tm.teamId === teamId).map((tm) => {
    const mentor = MOCK_USERS.find((u) => u.id === tm.mentorId);
    if (!mentor) throw new Error(`Mentor ${tm.mentorId} não encontrado.`);
    return { ...tm, mentor };
  });

  const notes = MOCK_TEAM_NOTES.filter((n) => n.teamId === teamId)
    .map((note) => {
      const author = MOCK_USERS.find((u) => u.id === note.authorId);
      if (!author) throw new Error(`Autor ${note.authorId} não encontrado.`);
      return { ...note, author };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const stageHistory = MOCK_TEAM_STAGE_HISTORY.filter((h) => h.teamId === teamId).sort(
    (a, b) => a.enteredAt.getTime() - b.enteredAt.getTime(),
  );

  return { ...toBoardItem(team), mentors, notes, stageHistory };
}

/** RF-09: avançar/retroceder manualmente a equipe entre etapas.
 * Valida a transição via journey.service (RN-01) antes de aplicar. */
export async function advanceTeamStage(
  teamId: string,
  toStageId: number,
  changedById: string,
): Promise<Team> {
  const team = MOCK_TEAMS.find((t) => t.id === teamId);
  if (!team) throw new Error(`Equipe ${teamId} não encontrada.`);

  const allowed = await canAdvanceToStage(team.currentStageId, toStageId);
  if (!allowed) {
    throw new Error(`Transição da etapa ${team.currentStageId} para ${toStageId} não é válida.`);
  }

  await delay();
  const now = new Date();

  const openHistory = MOCK_TEAM_STAGE_HISTORY.find(
    (h) => h.teamId === teamId && h.exitedAt === null,
  );
  if (openHistory) openHistory.exitedAt = now;

  MOCK_TEAM_STAGE_HISTORY.push({
    id: generateId("tsh"),
    teamId,
    stageId: toStageId,
    enteredAt: now,
    exitedAt: null,
    changedById,
  });

  const fromStageId = team.currentStageId;
  team.currentStageId = toStageId;
  team.isReadyForInovamf = toStageId === 6 ? team.isReadyForInovamf : false;
  team.updatedAt = now;

  await recordAuditLog({
    actorUserId: changedById,
    entityType: "team",
    entityId: team.id,
    action: "STAGE_ADVANCED",
    metadata: { fromStageId, toStageId },
  });

  return team;
}

/** RF-10: anotação interna do mentor/admin — nunca exposta na área do aluno. */
export async function addTeamNote(
  teamId: string,
  authorId: string,
  content: string,
): Promise<TeamNote> {
  await delay();
  const note: TeamNote = {
    id: generateId("note"),
    teamId,
    authorId,
    content,
    createdAt: new Date(),
  };
  MOCK_TEAM_NOTES.push(note);
  return note;
}

export interface TeamMemberInscriptionInput {
  name: string;
  email: string;
  phone?: string;
  course: string;
  period: string;
}

export interface CreateTeamFromInscriptionInput {
  leader: TeamMemberInscriptionInput;
  members: TeamMemberInscriptionInput[];
  ideaName: string;
  ideaDescription: string;
  areaId: number;
  ideaMaturity: IdeaMaturity;
  sourceOrigin?: string;
  cohort: string;
}

export interface CreateTeamFromInscriptionResult {
  team: Team;
  /** Id da conta do líder (nova ou já existente) — RF-02: o próprio
   * envio do formulário cria/reaproveita a conta de acesso do líder,
   * então a UI pode logá-lo automaticamente após o cadastro. */
  leaderUserId: string;
}

/** Formulário inicial do aluno — Etapa 1 (RF-02, RF-04, RF-05).
 * Para o líder e cada integrante, busca a conta por e-mail e só cria
 * se não existir (T005 em PLAN.md) — evita duplicar quando o aluno já
 * integra outra equipe (Q4). */
export async function createTeamFromInscription(
  input: CreateTeamFromInscriptionInput,
): Promise<CreateTeamFromInscriptionResult> {
  const leaderUser = await findOrCreateStudentByEmail(input.leader);
  const memberUsers = [];
  for (const member of input.members) {
    memberUsers.push(await findOrCreateStudentByEmail(member));
  }

  await delay();
  const now = new Date();
  const team: Team = {
    id: generateId("team"),
    ideaName: input.ideaName,
    ideaDescription: input.ideaDescription,
    areaId: input.areaId,
    ideaMaturity: input.ideaMaturity,
    sourceOrigin: input.sourceOrigin ?? null,
    cohort: input.cohort,
    currentStageId: 1,
    isReadyForInovamf: false,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_TEAMS.push(team);

  MOCK_TEAM_MEMBERS.push({
    id: generateId("tm"),
    teamId: team.id,
    userId: leaderUser.id,
    memberRole: TeamMemberRole.LEADER,
    joinedAt: now,
  });
  for (const memberUser of memberUsers) {
    MOCK_TEAM_MEMBERS.push({
      id: generateId("tm"),
      teamId: team.id,
      userId: memberUser.id,
      memberRole: TeamMemberRole.MEMBER,
      joinedAt: now,
    });
  }

  MOCK_TEAM_STAGE_HISTORY.push({
    id: generateId("tsh"),
    teamId: team.id,
    stageId: 1,
    enteredAt: now,
    exitedAt: null,
    changedById: null,
  });

  const admins: User[] = MOCK_USERS.filter((u) => u.role === UserRole.ADMIN);
  for (const admin of admins) {
    await recordNotification({
      recipientUserId: admin.id,
      type: "NEW_TEAM_REGISTERED",
      subject: `Novo cadastro recebido: ${team.ideaName}`,
      relatedTeamId: team.id,
    });
  }

  return { team, leaderUserId: leaderUser.id };
}
