// Espelha os models IdeaArea/JourneyStage/Team/TeamMember/TeamMentor/
// TeamStageHistory/TeamNote de app/prisma/schema.prisma.

import type { IdeaMaturity, TeamMemberRole } from "./enums";
import type { User } from "./user";

/** Área/setor da ideia — lista configurável pelo administrador (RF-04). */
export interface IdeaArea {
  id: number;
  name: string;
  createdAt: Date;
}

/** As 6 etapas fixas do funil InfoHub -> InovAMF. */
export interface JourneyStage {
  id: number;
  number: number;
  name: string;
}

export interface Team {
  id: string;
  ideaName: string;
  ideaDescription: string;
  areaId: number | null;
  ideaMaturity: IdeaMaturity;
  sourceOrigin: string | null;
  cohort: string;
  currentStageId: number;
  isReadyForInovamf: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** N:N entre User e Team. Um aluno pode integrar mais de uma equipe (Q4). */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  memberRole: TeamMemberRole;
  joinedAt: Date;
}

/** N:N entre mentores (User.role = MENTOR) e Team (Q2, RNF-03). */
export interface TeamMentor {
  id: string;
  teamId: string;
  mentorId: string;
  assignedAt: Date;
}

/** Histórico de transições entre etapas (RF-08, RF-09). */
export interface TeamStageHistory {
  id: string;
  teamId: string;
  stageId: number;
  enteredAt: Date;
  exitedAt: Date | null;
  changedById: string | null;
}

/** Anotações internas do mentor/admin (RF-10), não visíveis ao aluno. */
export interface TeamNote {
  id: string;
  teamId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

/** Membro de equipe já resolvido com os dados do usuário (join),
 * do jeito que uma query real com `include: { user: true }` devolveria. */
export interface TeamMemberWithUser extends TeamMember {
  user: User;
}

/** "View" usada pelo painel do admin (RF-06, RF-07): equipe com a etapa
 * atual e a área já resolvidas, e a lista de membros com usuário incluído. */
export interface TeamBoardItem extends Team {
  currentStage: JourneyStage;
  area: IdeaArea | null;
  members: TeamMemberWithUser[];
}

/** "View" usada na página de detalhe da equipe (RF-08). */
export interface TeamDetail extends TeamBoardItem {
  mentors: (TeamMentor & { mentor: User })[];
  stageHistory: TeamStageHistory[];
  /** Omitido para papel aluno na UI — ver RF-10. */
  notes: (TeamNote & { author: User })[];
}
