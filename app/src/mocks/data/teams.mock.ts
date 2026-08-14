// Uma equipe por etapa do funil (1 a 6), cobrindo os 4 valores de
// IdeaMaturity. Beatriz Fernandes (user-student-4) integra 2 equipes
// (team-2 e team-6), demonstrando a decisão Q4 (N:N aluno<->equipe).
// SÓ deve ser importado por app/src/services/*.

import { IdeaMaturity, TeamMemberRole } from "@/types";
import type { Team, TeamMember, TeamMentor, TeamNote, TeamStageHistory } from "@/types";
import { CURRENT_COHORT } from "@/lib/constants";
import { daysFromNow } from "../utils";

const COHORT = CURRENT_COHORT;

export const MOCK_TEAMS: Team[] = [
  {
    id: "team-1",
    ideaName: "EstudaFácil",
    ideaDescription:
      "Plataforma de resumos colaborativos para estudantes do ensino médio, com trilhas de estudo geradas a partir do histórico de dificuldades.",
    areaId: 1, // Educação
    ideaMaturity: IdeaMaturity.IDEA,
    sourceOrigin: "Indicação de um professor",
    cohort: COHORT,
    currentStageId: 1,
    isReadyForInovamf: false,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-10),
  },
  {
    id: "team-2",
    ideaName: "SaúdeConecta",
    ideaDescription:
      "App que conecta pacientes de UBS a horários vagos de consulta em tempo real, reduzindo filas e faltas.",
    areaId: 2, // Saúde
    ideaMaturity: IdeaMaturity.PROTOTYPE,
    sourceOrigin: "Instagram do InfoHub",
    cohort: COHORT,
    currentStageId: 2,
    isReadyForInovamf: false,
    createdAt: daysFromNow(-25),
    updatedAt: daysFromNow(-3),
  },
  {
    id: "team-3",
    ideaName: "EcoRota",
    ideaDescription:
      "Ferramenta de roteirização para coleta seletiva em pequenos municípios, otimizando custo de combustível das cooperativas.",
    areaId: 4, // Sustentabilidade
    ideaMaturity: IdeaMaturity.PROTOTYPE,
    sourceOrigin: "Feira de profissões da faculdade",
    cohort: COHORT,
    currentStageId: 3,
    isReadyForInovamf: false,
    createdAt: daysFromNow(-40),
    updatedAt: daysFromNow(-2),
  },
  {
    id: "team-4",
    ideaName: "FinPlan",
    ideaDescription:
      "Assistente de planejamento financeiro para MEIs, com projeção de fluxo de caixa a partir de notas fiscais emitidas.",
    areaId: 5, // Finanças
    ideaMaturity: IdeaMaturity.MVP_IN_PROGRESS,
    sourceOrigin: "Indicação de um professor",
    cohort: COHORT,
    currentStageId: 4,
    isReadyForInovamf: false,
    createdAt: daysFromNow(-55),
    updatedAt: daysFromNow(-8),
  },
  {
    id: "team-5",
    ideaName: "TechMentor",
    ideaDescription:
      "Marketplace de mentoria técnica entre alunos veteranos e calouros de cursos de tecnologia da região.",
    areaId: 3, // Tecnologia
    ideaMaturity: IdeaMaturity.MVP_IN_PROGRESS,
    sourceOrigin: "Amigos que já passaram pelo InfoHub",
    cohort: COHORT,
    currentStageId: 5,
    isReadyForInovamf: false,
    createdAt: daysFromNow(-70),
    updatedAt: daysFromNow(-1),
  },
  {
    id: "team-6",
    ideaName: "AgroSmart",
    ideaDescription:
      "Sensor de baixo custo para monitoramento de umidade do solo em pequenas propriedades rurais, com alertas via app.",
    areaId: 4, // Sustentabilidade
    ideaMaturity: IdeaMaturity.MVP_READY,
    sourceOrigin: "Professor de Engenharia",
    cohort: COHORT,
    currentStageId: 6,
    isReadyForInovamf: true,
    createdAt: daysFromNow(-90),
    updatedAt: daysFromNow(-1),
  },
];

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  // team-1
  { id: "tm-1", teamId: "team-1", userId: "user-student-1", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-10) },
  { id: "tm-2", teamId: "team-1", userId: "user-student-2", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-10) },
  // team-2
  { id: "tm-3", teamId: "team-2", userId: "user-student-3", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-25) },
  { id: "tm-4", teamId: "team-2", userId: "user-student-4", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-25) },
  // team-3
  { id: "tm-5", teamId: "team-3", userId: "user-student-5", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-40) },
  { id: "tm-6", teamId: "team-3", userId: "user-student-6", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-40) },
  // team-4
  { id: "tm-7", teamId: "team-4", userId: "user-student-7", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-55) },
  { id: "tm-8", teamId: "team-4", userId: "user-student-8", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-55) },
  // team-5
  { id: "tm-9", teamId: "team-5", userId: "user-student-9", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-70) },
  { id: "tm-10", teamId: "team-5", userId: "user-student-10", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-70) },
  // team-6 — Thiago é líder; Beatriz (já em team-2) entra como integrante aqui também (Q4).
  { id: "tm-11", teamId: "team-6", userId: "user-student-11", memberRole: TeamMemberRole.LEADER, joinedAt: daysFromNow(-90) },
  { id: "tm-12", teamId: "team-6", userId: "user-student-4", memberRole: TeamMemberRole.MEMBER, joinedAt: daysFromNow(-80) },
];

export const MOCK_TEAM_MENTORS: TeamMentor[] = [
  { id: "tmt-1", teamId: "team-1", mentorId: "user-mentor-1", assignedAt: daysFromNow(-9) },
  { id: "tmt-2", teamId: "team-2", mentorId: "user-mentor-1", assignedAt: daysFromNow(-24) },
  // team-3 tem 2 mentores (N:N) — demonstra equipe atendida por mais de um mentor.
  { id: "tmt-3", teamId: "team-3", mentorId: "user-mentor-1", assignedAt: daysFromNow(-39) },
  { id: "tmt-4", teamId: "team-3", mentorId: "user-mentor-2", assignedAt: daysFromNow(-30) },
  { id: "tmt-5", teamId: "team-4", mentorId: "user-mentor-2", assignedAt: daysFromNow(-54) },
  { id: "tmt-6", teamId: "team-5", mentorId: "user-mentor-2", assignedAt: daysFromNow(-69) },
  { id: "tmt-7", teamId: "team-6", mentorId: "user-mentor-2", assignedAt: daysFromNow(-89) },
];

export const MOCK_TEAM_STAGE_HISTORY: TeamStageHistory[] = [
  // team-1: ainda na etapa 1
  { id: "tsh-1", teamId: "team-1", stageId: 1, enteredAt: daysFromNow(-10), exitedAt: null, changedById: null },
  // team-2: 1 -> 2
  { id: "tsh-2", teamId: "team-2", stageId: 1, enteredAt: daysFromNow(-25), exitedAt: daysFromNow(-20), changedById: null },
  { id: "tsh-3", teamId: "team-2", stageId: 2, enteredAt: daysFromNow(-20), exitedAt: null, changedById: "user-admin-1" },
  // team-3: 1 -> 2 -> 3
  { id: "tsh-4", teamId: "team-3", stageId: 1, enteredAt: daysFromNow(-40), exitedAt: daysFromNow(-35), changedById: null },
  { id: "tsh-5", teamId: "team-3", stageId: 2, enteredAt: daysFromNow(-35), exitedAt: daysFromNow(-28), changedById: "user-admin-1" },
  { id: "tsh-6", teamId: "team-3", stageId: 3, enteredAt: daysFromNow(-28), exitedAt: null, changedById: "user-mentor-1" },
  // team-4: 1 -> 2 -> 3 -> 4
  { id: "tsh-7", teamId: "team-4", stageId: 1, enteredAt: daysFromNow(-55), exitedAt: daysFromNow(-48), changedById: null },
  { id: "tsh-8", teamId: "team-4", stageId: 2, enteredAt: daysFromNow(-48), exitedAt: daysFromNow(-40), changedById: "user-admin-1" },
  { id: "tsh-9", teamId: "team-4", stageId: 3, enteredAt: daysFromNow(-40), exitedAt: daysFromNow(-30), changedById: "user-mentor-2" },
  { id: "tsh-10", teamId: "team-4", stageId: 4, enteredAt: daysFromNow(-30), exitedAt: null, changedById: "user-mentor-2" },
  // team-5: 1 -> 2 -> 3 -> 4 -> 5
  { id: "tsh-11", teamId: "team-5", stageId: 1, enteredAt: daysFromNow(-70), exitedAt: daysFromNow(-63), changedById: null },
  { id: "tsh-12", teamId: "team-5", stageId: 2, enteredAt: daysFromNow(-63), exitedAt: daysFromNow(-55), changedById: "user-admin-1" },
  { id: "tsh-13", teamId: "team-5", stageId: 3, enteredAt: daysFromNow(-55), exitedAt: daysFromNow(-42), changedById: "user-mentor-2" },
  { id: "tsh-14", teamId: "team-5", stageId: 4, enteredAt: daysFromNow(-42), exitedAt: daysFromNow(-15), changedById: "user-mentor-2" },
  { id: "tsh-15", teamId: "team-5", stageId: 5, enteredAt: daysFromNow(-15), exitedAt: null, changedById: "user-mentor-2" },
  // team-6: 1 -> 2 -> 3 -> 4 -> 5 -> 6
  { id: "tsh-16", teamId: "team-6", stageId: 1, enteredAt: daysFromNow(-90), exitedAt: daysFromNow(-82), changedById: null },
  { id: "tsh-17", teamId: "team-6", stageId: 2, enteredAt: daysFromNow(-82), exitedAt: daysFromNow(-74), changedById: "user-admin-1" },
  { id: "tsh-18", teamId: "team-6", stageId: 3, enteredAt: daysFromNow(-74), exitedAt: daysFromNow(-60), changedById: "user-mentor-2" },
  { id: "tsh-19", teamId: "team-6", stageId: 4, enteredAt: daysFromNow(-60), exitedAt: daysFromNow(-45), changedById: "user-mentor-2" },
  { id: "tsh-20", teamId: "team-6", stageId: 5, enteredAt: daysFromNow(-45), exitedAt: daysFromNow(-20), changedById: "user-mentor-2" },
  { id: "tsh-21", teamId: "team-6", stageId: 6, enteredAt: daysFromNow(-20), exitedAt: null, changedById: "user-mentor-2" },
];

/** Anotações internas do mentor/admin (RF-10) — não visíveis ao aluno na UI. */
export const MOCK_TEAM_NOTES: TeamNote[] = [
  {
    id: "note-1",
    teamId: "team-3",
    authorId: "user-mentor-1",
    content: "Equipe engajada, mas depende muito da Camila pra parte de design. Vale reforçar a divisão de tarefas no próximo encontro.",
    createdAt: daysFromNow(-5),
  },
  {
    id: "note-2",
    teamId: "team-4",
    authorId: "user-mentor-2",
    content: "Atraso no VPD foi por causa de prova final da faculdade do Gustavo. Combinei novo prazo verbalmente, mas precisa formalizar no sistema.",
    createdAt: daysFromNow(-2),
  },
  {
    id: "note-3",
    teamId: "team-6",
    authorId: "user-mentor-2",
    content: "Pitch muito bom na primeira gravação. Só reforcei clareza na parte de monetização antes da inscrição final.",
    createdAt: daysFromNow(-6),
  },
];
