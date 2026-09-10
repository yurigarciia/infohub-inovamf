// Camada de acesso a equipes/ideias e ao funil (B3). Fala com o backend
// (server/) via api-client; as telas que importam de @/services não
// mudam. Datas chegam como ISO string e são convertidas para Date aqui,
// na fronteira, para os componentes seguirem usando `formatDate` etc.

import { apiFetch, setAccessToken } from "@/lib/api-client";
import type {
  IdeaArea,
  IdeaMaturity,
  Team,
  TeamBoardItem,
  TeamDetail,
  TeamFilters,
  TeamMemberRole,
  TeamNote,
  User,
} from "@/types";

// --- shapes crus vindos da API ---------------------------------------

interface RawUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: User["role"];
  isActive: boolean;
  lgpdConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface RawTeam {
  id: string;
  ideaName: string;
  ideaDescription: string;
  areaId: number | null;
  ideaMaturity: IdeaMaturity;
  sourceOrigin: string | null;
  cohort: string;
  currentStageId: number;
  isReadyForInovamf: boolean;
  createdAt: string;
  updatedAt: string;
}
interface RawArea {
  id: number;
  name: string;
  createdAt: string;
}
interface RawBoardItem extends RawTeam {
  currentStage: { id: number; number: number; name: string };
  area: RawArea | null;
  members: {
    id: string;
    teamId: string;
    userId: string;
    memberRole: TeamMemberRole;
    joinedAt: string;
    user: RawUser;
  }[];
}
interface RawDetail extends RawBoardItem {
  mentors: {
    id: string;
    teamId: string;
    mentorId: string;
    assignedAt: string;
    mentor: RawUser;
  }[];
  stageHistory: {
    id: string;
    teamId: string;
    stageId: number;
    enteredAt: string;
    exitedAt: string | null;
    changedById: string | null;
  }[];
  notes: {
    id: string;
    teamId: string;
    authorId: string;
    content: string;
    createdAt: string;
    author: RawUser;
  }[];
}

// --- conversão ISO string -> Date -----------------------------------

const toUser = (u: RawUser): User => ({
  ...u,
  lgpdConsentedAt: u.lgpdConsentedAt ? new Date(u.lgpdConsentedAt) : null,
  createdAt: new Date(u.createdAt),
  updatedAt: new Date(u.updatedAt),
});

const toTeam = (t: RawTeam): Team => ({
  ...t,
  createdAt: new Date(t.createdAt),
  updatedAt: new Date(t.updatedAt),
});

const toArea = (a: RawArea): IdeaArea => ({ ...a, createdAt: new Date(a.createdAt) });

const toBoardItem = (b: RawBoardItem): TeamBoardItem => ({
  ...toTeam(b),
  currentStage: b.currentStage,
  area: b.area ? toArea(b.area) : null,
  members: b.members.map((m) => ({
    ...m,
    joinedAt: new Date(m.joinedAt),
    user: toUser(m.user),
  })),
});

const toDetail = (d: RawDetail): TeamDetail => ({
  ...toBoardItem(d),
  mentors: d.mentors.map((m) => ({
    ...m,
    assignedAt: new Date(m.assignedAt),
    mentor: toUser(m.mentor),
  })),
  stageHistory: d.stageHistory.map((h) => ({
    ...h,
    enteredAt: new Date(h.enteredAt),
    exitedAt: h.exitedAt ? new Date(h.exitedAt) : null,
  })),
  notes: d.notes.map((n) => ({
    ...n,
    createdAt: new Date(n.createdAt),
    author: toUser(n.author),
  })),
});

// --- dados de referência (B2) -------------------------------------

export async function getIdeaAreas(): Promise<IdeaArea[]> {
  const rows = await apiFetch<RawArea[]>("/idea-areas");
  return rows.map(toArea);
}

/** Turmas/semestres com pelo menos uma equipe — filtro por período (RF-24). */
export async function getCohorts(): Promise<string[]> {
  return apiFetch<string[]>("/cohorts");
}

// --- funil / equipes (B3) ---------------------------------------

/** Painel do administrador — funil/kanban (RF-06, RF-07, RF-24). */
export async function getTeamsByStage(filters: TeamFilters = {}): Promise<TeamBoardItem[]> {
  const qs = new URLSearchParams();
  if (filters.search) qs.set("search", filters.search);
  if (filters.course) qs.set("course", filters.course);
  if (filters.areaId !== undefined) qs.set("areaId", String(filters.areaId));
  if (filters.taskStatus) qs.set("taskStatus", filters.taskStatus);
  if (filters.mentorId) qs.set("mentorId", filters.mentorId);
  if (filters.cohort) qs.set("cohort", filters.cohort);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const rows = await apiFetch<RawBoardItem[]>(`/teams${suffix}`);
  return rows.map(toBoardItem);
}

/** Área do aluno — equipes do usuário autenticado (o backend usa o token;
 * o parâmetro é mantido só pela compatibilidade das telas). */
export async function getTeamsForStudent(_userId?: string): Promise<TeamBoardItem[]> {
  void _userId;
  const rows = await apiFetch<RawBoardItem[]>("/teams/mine");
  return rows.map(toBoardItem);
}

/** Página de detalhe da equipe (RF-08). */
export async function getTeamDetail(teamId: string): Promise<TeamDetail> {
  return toDetail(await apiFetch<RawDetail>(`/teams/${teamId}`));
}

/** RF-09: avançar/retroceder manualmente a equipe entre etapas.
 * `_changedById` fica implícito no token no backend. */
export async function advanceTeamStage(
  teamId: string,
  toStageId: number,
  _changedById?: string,
): Promise<Team> {
  void _changedById;
  return toTeam(
    await apiFetch<RawTeam>(`/teams/${teamId}/stage`, {
      method: "POST",
      body: { toStageId },
    }),
  );
}

/** RF-10: anotação interna do mentor/admin — nunca exposta na área do aluno. */
export async function addTeamNote(
  teamId: string,
  _authorId: string,
  content: string,
): Promise<TeamNote> {
  void _authorId;
  const raw = await apiFetch<{
    id: string;
    teamId: string;
    authorId: string;
    content: string;
    createdAt: string;
  }>(`/teams/${teamId}/notes`, { method: "POST", body: { content } });
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

// --- cadastro (Etapa 1 do funil) --------------------------------

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
  /** Id da conta do líder (nova ou já existente). O envio também já
   * autentica o líder (cookie de refresh + access token em memória),
   * então a UI só precisa recarregar para a sessão aparecer. */
  leaderUserId: string;
}

/** Formulário inicial do aluno — Etapa 1 (RF-02, RF-04, RF-05). O
 * backend faz find-or-create de cada aluno por e-mail (não duplica quem
 * já existe — A4) e registra o consentimento LGPD do líder (RNF-02). */
export async function createTeamFromInscription(
  input: CreateTeamFromInscriptionInput,
): Promise<CreateTeamFromInscriptionResult> {
  const res = await apiFetch<{ team: RawTeam; leaderUserId: string; accessToken: string }>(
    "/teams",
    { method: "POST", body: { ...input, lgpdConsent: true }, skipRefresh: true },
  );
  setAccessToken(res.accessToken);
  return { team: toTeam(res.team), leaderUserId: res.leaderUserId };
}
