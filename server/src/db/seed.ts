import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { closePool } from "./pool.js";
import { tx } from "../shared/sql.js";

/**
 * Popula o banco com um dataset de demonstração (portado dos mocks do
 * front — mesmos nomes/estrutura). Idempotente: TRUNCATE em tudo antes.
 *
 *   npm run db:seed
 *
 * Todos os usuários do seed têm a senha: senha123
 */
const PASSWORD = "senha123";
const NOW = Date.now();
const day = 24 * 60 * 60 * 1000;
/** Data relativa a "agora" (negativo = passado) — igual ao daysFromNow do front. */
const d = (days: number): Date => new Date(NOW + days * day);
/** Só a data (YYYY-MM-DD) para colunas DATE. */
const dateOnly = (days: number): string => d(days).toISOString().slice(0, 10);

// slug legível -> uuid real (para amarrar as FKs)
const id = new Map<string, string>();
const uid = (slug: string): string => {
  let v = id.get(slug);
  if (!v) {
    v = randomUUID();
    id.set(slug, v);
  }
  return v;
};

const STAGES = [
  [1, "Envio da ideia"],
  [2, "Contato com a equipe"],
  [3, "Encontro 1 - Entendendo a ideia"],
  [4, "Encontro 2 - Proposta de valor"],
  [5, "Encontro 3 - Modelo de negócio"],
  [6, "Encontro 4 - Pitch e inscrição"],
] as const;

const AREAS = [
  [1, "Educação"],
  [2, "Saúde"],
  [3, "Tecnologia"],
  [4, "Sustentabilidade"],
  [5, "Finanças"],
] as const;

interface SeedUser {
  slug: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "MENTOR" | "STUDENT";
  createdDays: number;
  course?: string;
  period?: string;
}

const USERS: SeedUser[] = [
  { slug: "admin-1", name: "Ana Beatriz Souza", email: "ana.souza@infohub.amf.br", phone: "(55) 99999-0001", role: "ADMIN", createdDays: -120 },
  { slug: "mentor-1", name: "Carlos Eduardo Lima", email: "carlos.lima@infohub.amf.br", phone: "(55) 99999-0002", role: "MENTOR", createdDays: -110 },
  { slug: "mentor-2", name: "Fernanda Ribeiro", email: "fernanda.ribeiro@infohub.amf.br", phone: "(55) 99999-0003", role: "MENTOR", createdDays: -100 },
  { slug: "student-1", name: "João Pedro Alves", email: "joao.alves@acad.amf.br", phone: "(55) 98888-0001", role: "STUDENT", createdDays: -60, course: "Sistemas de Informação", period: "5º período" },
  { slug: "student-2", name: "Marina Costa", email: "marina.costa@acad.amf.br", phone: "(55) 98888-0002", role: "STUDENT", createdDays: -60, course: "Administração", period: "3º período" },
  { slug: "student-3", name: "Lucas Martins", email: "lucas.martins@acad.amf.br", phone: "(55) 98888-0003", role: "STUDENT", createdDays: -55, course: "Sistemas de Informação", period: "7º período" },
  { slug: "student-4", name: "Beatriz Fernandes", email: "beatriz.fernandes@acad.amf.br", phone: "(55) 98888-0004", role: "STUDENT", createdDays: -55, course: "Engenharia de Software", period: "4º período" },
  { slug: "student-5", name: "Rafael Oliveira", email: "rafael.oliveira@acad.amf.br", phone: "(55) 98888-0005", role: "STUDENT", createdDays: -50, course: "Sistemas de Informação", period: "2º período" },
  { slug: "student-6", name: "Camila Santos", email: "camila.santos@acad.amf.br", phone: "(55) 98888-0006", role: "STUDENT", createdDays: -50, course: "Design", period: "6º período" },
  { slug: "student-7", name: "Gustavo Pereira", email: "gustavo.pereira@acad.amf.br", phone: "(55) 98888-0007", role: "STUDENT", createdDays: -45, course: "Sistemas de Informação", period: "8º período" },
  { slug: "student-8", name: "Juliana Rocha", email: "juliana.rocha@acad.amf.br", phone: "(55) 98888-0008", role: "STUDENT", createdDays: -45, course: "Administração", period: "5º período" },
  { slug: "student-9", name: "Pedro Henrique Souza", email: "pedro.souza@acad.amf.br", phone: "(55) 98888-0009", role: "STUDENT", createdDays: -40, course: "Sistemas de Informação", period: "3º período" },
  { slug: "student-10", name: "Larissa Almeida", email: "larissa.almeida@acad.amf.br", phone: "(55) 98888-0010", role: "STUDENT", createdDays: -40, course: "Engenharia de Software", period: "6º período" },
  { slug: "student-11", name: "Thiago Nascimento", email: "thiago.nascimento@acad.amf.br", phone: "(55) 98888-0011", role: "STUDENT", createdDays: -90, course: "Sistemas de Informação", period: "4º período" },
  { slug: "student-12", name: "Vitória Campos", email: "vitoria.campos@acad.amf.br", phone: "(55) 98888-0012", role: "STUDENT", createdDays: -200, course: "Administração", period: "8º período" },
];

interface SeedTeam {
  slug: string;
  ideaName: string;
  ideaDescription: string;
  areaId: number;
  maturity: "IDEA" | "PROTOTYPE" | "MVP_IN_PROGRESS" | "MVP_READY";
  source: string;
  cohort: string;
  currentStage: number;
  ready: boolean;
  createdDays: number;
}

const COHORT = "2026.2";
const PREV_COHORT = "2026.1";

const TEAMS: SeedTeam[] = [
  { slug: "team-1", ideaName: "EstudaFácil", ideaDescription: "Plataforma de resumos colaborativos para estudantes do ensino médio, com trilhas de estudo geradas a partir do histórico de dificuldades.", areaId: 1, maturity: "IDEA", source: "Indicação de um professor", cohort: COHORT, currentStage: 1, ready: false, createdDays: -10 },
  { slug: "team-2", ideaName: "SaúdeConecta", ideaDescription: "App que conecta pacientes de UBS a horários vagos de consulta em tempo real, reduzindo filas e faltas.", areaId: 2, maturity: "PROTOTYPE", source: "Instagram do InfoHub", cohort: COHORT, currentStage: 2, ready: false, createdDays: -25 },
  { slug: "team-3", ideaName: "EcoRota", ideaDescription: "Ferramenta de roteirização para coleta seletiva em pequenos municípios, otimizando custo de combustível das cooperativas.", areaId: 4, maturity: "PROTOTYPE", source: "Feira de profissões da faculdade", cohort: COHORT, currentStage: 3, ready: false, createdDays: -40 },
  { slug: "team-4", ideaName: "FinPlan", ideaDescription: "Assistente de planejamento financeiro para MEIs, com projeção de fluxo de caixa a partir de notas fiscais emitidas.", areaId: 5, maturity: "MVP_IN_PROGRESS", source: "Indicação de um professor", cohort: COHORT, currentStage: 4, ready: false, createdDays: -55 },
  { slug: "team-5", ideaName: "TechMentor", ideaDescription: "Marketplace de mentoria técnica entre alunos veteranos e calouros de cursos de tecnologia da região.", areaId: 3, maturity: "MVP_IN_PROGRESS", source: "Amigos que já passaram pelo InfoHub", cohort: COHORT, currentStage: 5, ready: false, createdDays: -70 },
  { slug: "team-6", ideaName: "AgroSmart", ideaDescription: "Sensor de baixo custo para monitoramento de umidade do solo em pequenas propriedades rurais, com alertas via app.", areaId: 4, maturity: "MVP_READY", source: "Professor de Engenharia", cohort: COHORT, currentStage: 6, ready: true, createdDays: -90 },
  { slug: "team-7", ideaName: "EcoVerde", ideaDescription: "Marketplace de compostagem compartilhada entre condomínios e hortas comunitárias.", areaId: 4, maturity: "MVP_READY", source: "Feira de profissões da faculdade", cohort: PREV_COHORT, currentStage: 6, ready: true, createdDays: -260 },
];

// [teamSlug, userSlug, role]
const MEMBERS: [string, string, "LEADER" | "MEMBER"][] = [
  ["team-1", "student-1", "LEADER"], ["team-1", "student-2", "MEMBER"],
  ["team-2", "student-3", "LEADER"], ["team-2", "student-4", "MEMBER"],
  ["team-3", "student-5", "LEADER"], ["team-3", "student-6", "MEMBER"],
  ["team-4", "student-7", "LEADER"], ["team-4", "student-8", "MEMBER"],
  ["team-5", "student-9", "LEADER"], ["team-5", "student-10", "MEMBER"],
  ["team-6", "student-11", "LEADER"], ["team-6", "student-4", "MEMBER"], // Beatriz em 2 equipes (A4)
  ["team-7", "student-12", "LEADER"],
];

// [teamSlug, mentorSlug]
const MENTORS: [string, string][] = [
  ["team-1", "mentor-1"], ["team-2", "mentor-1"],
  ["team-3", "mentor-1"], ["team-3", "mentor-2"], // 2 mentores (N:N)
  ["team-4", "mentor-2"], ["team-5", "mentor-2"], ["team-6", "mentor-2"], ["team-7", "mentor-1"],
];

// [teamSlug, stageId, enteredDays, exitedDays|null, changedBySlug|null]
const HISTORY: [string, number, number, number | null, string | null][] = [
  ["team-1", 1, -10, null, null],
  ["team-2", 1, -25, -20, null], ["team-2", 2, -20, null, "admin-1"],
  ["team-3", 1, -40, -35, null], ["team-3", 2, -35, -28, "admin-1"], ["team-3", 3, -28, null, "mentor-1"],
  ["team-4", 1, -55, -48, null], ["team-4", 2, -48, -40, "admin-1"], ["team-4", 3, -40, -30, "mentor-2"], ["team-4", 4, -30, null, "mentor-2"],
  ["team-5", 1, -70, -63, null], ["team-5", 2, -63, -55, "admin-1"], ["team-5", 3, -55, -42, "mentor-2"], ["team-5", 4, -42, -15, "mentor-2"], ["team-5", 5, -15, null, "mentor-2"],
  ["team-6", 1, -90, -82, null], ["team-6", 2, -82, -74, "admin-1"], ["team-6", 3, -74, -60, "mentor-2"], ["team-6", 4, -60, -45, "mentor-2"], ["team-6", 5, -45, -20, "mentor-2"], ["team-6", 6, -20, null, "mentor-2"],
  ["team-7", 6, -260, null, "mentor-1"],
];

// [teamSlug, authorSlug, content, createdDays]
const NOTES: [string, string, string, number][] = [
  ["team-3", "mentor-1", "Equipe engajada, mas depende muito da Camila pra parte de design. Vale reforçar a divisão de tarefas no próximo encontro.", -5],
  ["team-4", "mentor-2", "Atraso no VPD foi por causa de prova final da faculdade do Gustavo. Combinei novo prazo verbalmente, mas precisa formalizar no sistema.", -2],
  ["team-6", "mentor-2", "Pitch muito bom na primeira gravação. Só reforcei clareza na parte de monetização antes da inscrição final.", -6],
];

// [templateSlug, stageId, title, description]
const TEMPLATES: [string, number, string, string][] = [
  ["template-3", 3, "Definir problema, público-alvo e solução", "Documento curto descrevendo o problema, o público-alvo e a solução inicial discutidos no Encontro 1."],
  ["template-4", 4, "Enviar Value Proposition Design", "Anexar o Value Proposition Design construído no Encontro 2, em PDF ou imagem."],
  ["template-5", 5, "Enviar Business Model Canvas", "Anexar o Business Model Canvas construído no Encontro 3, em PDF ou imagem."],
  ["template-6", 6, "Enviar Pitch Vídeo e conferência de documentos", "Link do Pitch Vídeo (YouTube/Drive) + conferência final do Canvas, VPD e dados de todos os integrantes."],
];

interface SeedTask {
  slug: string; team: string; stage: number; template: string | null;
  title: string; description: string; dueDays: number;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "LATE" | "APPROVED" | "REJECTED";
  createdBy: string; createdDays: number; updatedDays: number;
}

const TASKS: SeedTask[] = [
  { slug: "task-1", team: "team-1", stage: 1, template: null, title: "Aguardar contato do InfoHub", description: "A equipe InfoHub vai analisar a ideia enviada e agendar o 1º encontro.", dueDays: 5, status: "PENDING", createdBy: "admin-1", createdDays: -10, updatedDays: -10 },
  { slug: "task-2", team: "team-2", stage: 2, template: null, title: "Confirmar agendamento do 1º encontro", description: "Escolher um horário disponível para o Encontro 1 com o mentor.", dueDays: 3, status: "IN_PROGRESS", createdBy: "admin-1", createdDays: -5, updatedDays: -1 },
  { slug: "task-3", team: "team-3", stage: 3, template: "template-3", title: "Definir problema, público-alvo e solução", description: "Enviar o documento definido no Encontro 1.", dueDays: -1, status: "SUBMITTED", createdBy: "mentor-1", createdDays: -14, updatedDays: -1 },
  { slug: "task-4", team: "team-4", stage: 4, template: "template-4", title: "Enviar Value Proposition Design", description: "Anexar o VPD construído no Encontro 2.", dueDays: -6, status: "LATE", createdBy: "mentor-2", createdDays: -20, updatedDays: -6 },
  { slug: "task-9", team: "team-4", stage: 4, template: null, title: "Enviar documentos complementares", description: "Comprovante de MEI de ao menos um integrante, exigido pelo edital deste ciclo.", dueDays: -10, status: "REJECTED", createdBy: "mentor-2", createdDays: -18, updatedDays: -9 },
  { slug: "task-5", team: "team-5", stage: 5, template: "template-5", title: "Enviar Business Model Canvas", description: "Anexar o Canvas construído no Encontro 3.", dueDays: -12, status: "APPROVED", createdBy: "mentor-2", createdDays: -25, updatedDays: -11 },
  { slug: "task-6", team: "team-5", stage: 5, template: null, title: "Preparar roteiro do Pitch", description: "Rascunho do roteiro do Pitch Vídeo, para revisão do mentor antes da gravação final.", dueDays: 4, status: "PENDING", createdBy: "mentor-2", createdDays: -3, updatedDays: -3 },
  { slug: "task-10", team: "team-5", stage: 3, template: "template-3", title: "Definir problema, público-alvo e solução", description: "Enviar o documento definido no Encontro 1.", dueDays: -45, status: "APPROVED", createdBy: "mentor-2", createdDays: -54, updatedDays: -43 },
  { slug: "task-11", team: "team-5", stage: 4, template: "template-4", title: "Enviar Value Proposition Design", description: "Anexar o VPD construído no Encontro 2.", dueDays: -20, status: "APPROVED", createdBy: "mentor-2", createdDays: -41, updatedDays: -18 },
  { slug: "task-7", team: "team-6", stage: 6, template: "template-6", title: "Enviar Pitch Vídeo", description: "Link do vídeo no YouTube ou Google Drive (não é upload de arquivo — Q3).", dueDays: -18, status: "APPROVED", createdBy: "mentor-2", createdDays: -30, updatedDays: -17 },
  { slug: "task-8", team: "team-6", stage: 6, template: null, title: "Conferência de documentos e Canvas final", description: "Reenviar o Canvas final consolidado, com os ajustes pedidos na primeira revisão.", dueDays: -15, status: "SUBMITTED", createdBy: "mentor-2", createdDays: -28, updatedDays: -3 },
  { slug: "task-12", team: "team-6", stage: 3, template: "template-3", title: "Definir problema, público-alvo e solução", description: "Enviar o documento definido no Encontro 1.", dueDays: -63, status: "APPROVED", createdBy: "mentor-2", createdDays: -73, updatedDays: -61 },
  { slug: "task-13", team: "team-6", stage: 4, template: "template-4", title: "Enviar Value Proposition Design", description: "Anexar o VPD construído no Encontro 2.", dueDays: -48, status: "APPROVED", createdBy: "mentor-2", createdDays: -59, updatedDays: -46 },
  { slug: "task-14", team: "team-6", stage: 5, template: "template-5", title: "Enviar Business Model Canvas", description: "Anexar o Canvas construído no Encontro 3.", dueDays: -25, status: "APPROVED", createdBy: "mentor-2", createdDays: -44, updatedDays: -23 },
  { slug: "task-15", team: "team-4", stage: 3, template: "template-3", title: "Definir problema, público-alvo e solução", description: "Enviar o documento definido no Encontro 1.", dueDays: -33, status: "APPROVED", createdBy: "mentor-2", createdDays: -39, updatedDays: -31 },
];

interface SeedSubmission {
  slug: string; task: string; by: string; fileUrl: string; external: boolean;
  version: number; current: boolean; submittedDays: number;
  review: "PENDING" | "APPROVED" | "REJECTED"; comment: string | null;
  reviewedBy: string | null; reviewedDays: number | null;
}

const SUBS: SeedSubmission[] = [
  { slug: "sub-3-1", task: "task-3", by: "student-5", fileUrl: "https://storage.infohub.amf.br/mock/ecorota-problema-publico-alvo.pdf", external: false, version: 1, current: true, submittedDays: -1, review: "PENDING", comment: null, reviewedBy: null, reviewedDays: null },
  { slug: "sub-9-1", task: "task-9", by: "student-7", fileUrl: "https://storage.infohub.amf.br/mock/finplan-comprovante-mei.pdf", external: false, version: 1, current: true, submittedDays: -9, review: "REJECTED", comment: "O comprovante enviado está vencido. Envie a certidão MEI atualizada (emitida nos últimos 90 dias).", reviewedBy: "mentor-2", reviewedDays: -8 },
  { slug: "sub-5-1", task: "task-5", by: "student-9", fileUrl: "https://storage.infohub.amf.br/mock/techmentor-bmc.pdf", external: false, version: 1, current: true, submittedDays: -12, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -11 },
  { slug: "sub-7-1", task: "task-7", by: "student-11", fileUrl: "https://www.youtube.com/watch?v=agrosmart-pitch-mock", external: true, version: 1, current: true, submittedDays: -18, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -17 },
  { slug: "sub-8-1", task: "task-8", by: "student-11", fileUrl: "https://storage.infohub.amf.br/mock/agrosmart-canvas-final-v1.pdf", external: false, version: 1, current: false, submittedDays: -14, review: "REJECTED", comment: "Faltou atualizar o bloco de fontes de receita — ainda está igual ao Canvas do Encontro 3.", reviewedBy: "mentor-2", reviewedDays: -12 },
  { slug: "sub-8-2", task: "task-8", by: "student-11", fileUrl: "https://storage.infohub.amf.br/mock/agrosmart-canvas-final-v2.pdf", external: false, version: 2, current: true, submittedDays: -3, review: "PENDING", comment: null, reviewedBy: null, reviewedDays: null },
  { slug: "sub-10-1", task: "task-10", by: "student-9", fileUrl: "https://storage.infohub.amf.br/mock/techmentor-problema-publico-alvo.pdf", external: false, version: 1, current: true, submittedDays: -46, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -43 },
  { slug: "sub-11-1", task: "task-11", by: "student-9", fileUrl: "https://storage.infohub.amf.br/mock/techmentor-vpd.pdf", external: false, version: 1, current: true, submittedDays: -21, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -18 },
  { slug: "sub-12-1", task: "task-12", by: "student-11", fileUrl: "https://storage.infohub.amf.br/mock/agrosmart-problema-publico-alvo.pdf", external: false, version: 1, current: true, submittedDays: -64, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -61 },
  { slug: "sub-13-1", task: "task-13", by: "student-11", fileUrl: "https://storage.infohub.amf.br/mock/agrosmart-vpd.pdf", external: false, version: 1, current: true, submittedDays: -49, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -46 },
  { slug: "sub-14-1", task: "task-14", by: "student-11", fileUrl: "https://storage.infohub.amf.br/mock/agrosmart-bmc.pdf", external: false, version: 1, current: true, submittedDays: -26, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -23 },
  { slug: "sub-15-1", task: "task-15", by: "student-7", fileUrl: "https://storage.infohub.amf.br/mock/finplan-problema-publico-alvo.pdf", external: false, version: 1, current: true, submittedDays: -34, review: "APPROVED", comment: null, reviewedBy: "mentor-2", reviewedDays: -31 },
];

// [taskSlug, remindDays, isManual, sent, sentDays|null, createdDays]
const REMINDERS: [string, number, boolean, boolean, number | null, number][] = [
  ["task-3", -2, false, true, -2, -14],
  ["task-4", -7, false, true, -7, -20],
  ["task-4", -4, true, true, -4, -4],
  ["task-6", 2, false, false, null, -3],
];

interface SeedEmail {
  recipient: string; type: string; subject: string;
  team: string | null; task: string | null;
  status: "SENT" | "FAILED" | "RETRIED"; providerId: string | null;
  sentDays: number | null; createdDays: number;
}

const EMAILS: SeedEmail[] = [
  { recipient: "admin-1", type: "NEW_TEAM_REGISTERED", subject: "Novo cadastro recebido: EstudaFácil", team: "team-1", task: null, status: "SENT", providerId: "resend-mock-0001", sentDays: -10, createdDays: -10 },
  { recipient: "student-3", type: "TASK_ASSIGNED", subject: "Nova tarefa: Confirmar agendamento do 1º encontro", team: "team-2", task: "task-2", status: "SENT", providerId: "resend-mock-0002", sentDays: -5, createdDays: -5 },
  { recipient: "student-5", type: "DEADLINE_REMINDER", subject: 'Lembrete: prazo da tarefa "Definir problema, público-alvo e solução" está próximo', team: "team-3", task: "task-3", status: "SENT", providerId: "resend-mock-0003", sentDays: -2, createdDays: -2 },
  { recipient: "student-7", type: "DEADLINE_LATE", subject: "Prazo vencido: Enviar Value Proposition Design", team: "team-4", task: "task-4", status: "SENT", providerId: "resend-mock-0004", sentDays: -6, createdDays: -6 },
  { recipient: "student-9", type: "SUBMISSION_APPROVED", subject: "Entrega aprovada: Business Model Canvas", team: "team-5", task: "task-5", status: "SENT", providerId: "resend-mock-0005", sentDays: -11, createdDays: -11 },
  { recipient: "student-7", type: "SUBMISSION_REJECTED", subject: "Ajustes solicitados: Enviar documentos complementares", team: "team-4", task: "task-9", status: "SENT", providerId: "resend-mock-0006", sentDays: -8, createdDays: -8 },
  { recipient: "admin-1", type: "FILE_SUBMITTED", subject: "Novo arquivo entregue por AgroSmart", team: "team-6", task: "task-8", status: "FAILED", providerId: null, sentDays: null, createdDays: -3 },
  { recipient: "admin-1", type: "TASK_LATE", subject: "Tarefa atrasada: Enviar Value Proposition Design (FinPlan)", team: "team-4", task: "task-4", status: "RETRIED", providerId: "resend-mock-0008", sentDays: -6, createdDays: -6 },
  { recipient: "student-7", type: "MANUAL_REMINDER", subject: "Lembrete do mentor: falta pouco para regularizar a FinPlan!", team: "team-4", task: "task-4", status: "SENT", providerId: "resend-mock-0009", sentDays: -4, createdDays: -4 },
];

export async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, env.BCRYPT_ROUNDS);

  await tx(async (c) => {
    await c.query(`
      TRUNCATE TABLE
        audit_logs, email_notifications, password_reset_tokens, refresh_tokens,
        task_reminders, task_submissions, tasks, task_templates,
        team_notes, team_stage_history, team_mentors, team_members, teams,
        student_profiles, users, idea_areas, journey_stages
      RESTART IDENTITY CASCADE
    `);

    for (const [n, name] of STAGES) {
      await c.query("INSERT INTO journey_stages (id, number, name) VALUES ($1, $2, $3)", [n, n, name]);
    }
    await c.query("SELECT setval(pg_get_serial_sequence('journey_stages','id'), 6, true)");

    for (const [aid, name] of AREAS) {
      await c.query("INSERT INTO idea_areas (id, name, created_at) VALUES ($1, $2, $3)", [aid, name, d(-200)]);
    }
    await c.query("SELECT setval(pg_get_serial_sequence('idea_areas','id'), 5, true)");

    for (const u of USERS) {
      await c.query(
        `INSERT INTO users (id, name, email, password_hash, phone, role, is_active, lgpd_consented_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$7,$7)`,
        [uid(u.slug), u.name, u.email, passwordHash, u.phone, u.role, d(u.createdDays)],
      );
      if (u.role === "STUDENT") {
        await c.query("INSERT INTO student_profiles (user_id, course, period) VALUES ($1,$2,$3)", [
          uid(u.slug), u.course, u.period,
        ]);
      }
    }

    for (const t of TEAMS) {
      await c.query(
        `INSERT INTO teams (id, idea_name, idea_description, area_id, idea_maturity, source_origin,
                            cohort, current_stage_id, is_ready_for_inovamf, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
        [uid(t.slug), t.ideaName, t.ideaDescription, t.areaId, t.maturity, t.source, t.cohort, t.currentStage, t.ready, d(t.createdDays)],
      );
    }

    for (const [team, user, role] of MEMBERS) {
      await c.query(
        "INSERT INTO team_members (id, team_id, user_id, member_role, joined_at) VALUES ($1,$2,$3,$4,$5)",
        [randomUUID(), uid(team), uid(user), role, d(-10)],
      );
    }

    for (const [team, mentor] of MENTORS) {
      await c.query(
        "INSERT INTO team_mentors (id, team_id, mentor_id, assigned_at) VALUES ($1,$2,$3,$4)",
        [randomUUID(), uid(team), uid(mentor), d(-10)],
      );
    }

    for (const [team, stageId, enteredDays, exitedDays, changedBy] of HISTORY) {
      await c.query(
        "INSERT INTO team_stage_history (id, team_id, stage_id, entered_at, exited_at, changed_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [randomUUID(), uid(team), stageId, d(enteredDays), exitedDays === null ? null : d(exitedDays), changedBy ? uid(changedBy) : null],
      );
    }

    for (const [team, author, content, createdDays] of NOTES) {
      await c.query(
        "INSERT INTO team_notes (id, team_id, author_id, content, created_at) VALUES ($1,$2,$3,$4,$5)",
        [randomUUID(), uid(team), uid(author), content, d(createdDays)],
      );
    }

    for (const [slug, stageId, title, description] of TEMPLATES) {
      await c.query(
        "INSERT INTO task_templates (id, stage_id, title, description, created_at) VALUES ($1,$2,$3,$4,$5)",
        [uid(slug), stageId, title, description, d(-200)],
      );
    }

    for (const t of TASKS) {
      await c.query(
        `INSERT INTO tasks (id, team_id, stage_id, template_id, title, description, due_date, status, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [uid(t.slug), uid(t.team), t.stage, t.template ? uid(t.template) : null, t.title, t.description, dateOnly(t.dueDays), t.status, uid(t.createdBy), d(t.createdDays), d(t.updatedDays)],
      );
    }

    for (const s of SUBS) {
      await c.query(
        `INSERT INTO task_submissions (id, task_id, submitted_by, file_url, is_external_link, version, is_current,
                                       submitted_at, review_status, review_comment, reviewed_by, reviewed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [uid(s.slug), uid(s.task), uid(s.by), s.fileUrl, s.external, s.version, s.current, d(s.submittedDays), s.review, s.comment, s.reviewedBy ? uid(s.reviewedBy) : null, s.reviewedDays === null ? null : d(s.reviewedDays)],
      );
    }

    for (const [task, remindDays, isManual, sent, sentDays, createdDays] of REMINDERS) {
      await c.query(
        "INSERT INTO task_reminders (id, task_id, remind_at, is_manual, sent, sent_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [randomUUID(), uid(task), d(remindDays), isManual, sent, sentDays === null ? null : d(sentDays), d(createdDays)],
      );
    }

    for (const e of EMAILS) {
      await c.query(
        `INSERT INTO email_notifications (id, recipient_user_id, type, subject, related_team_id, related_task_id, status, provider_message_id, sent_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [randomUUID(), uid(e.recipient), e.type, e.subject, e.team ? uid(e.team) : null, e.task ? uid(e.task) : null, e.status, e.providerId, e.sentDays === null ? null : d(e.sentDays), d(e.createdDays)],
      );
    }

    // Auditoria — algumas entradas iniciais (RNF-05).
    await c.query(
      "INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(), uid("admin-1"), "team", uid("team-2"), "STAGE_ADVANCED", JSON.stringify({ fromStageId: 1, toStageId: 2 }), d(-20)],
    );
    await c.query(
      "INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(), uid("mentor-2"), "task_submission", uid("sub-5-1"), "SUBMISSION_APPROVED", JSON.stringify({ taskId: uid("task-5") }), d(-11)],
    );
    await c.query(
      "INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(), uid("mentor-2"), "task_submission", uid("sub-9-1"), "SUBMISSION_REJECTED", JSON.stringify({ taskId: uid("task-9"), reviewComment: "Comprovante vencido." }), d(-8)],
    );
  });

  console.log("Seed concluído.");
  console.log(`  ${USERS.length} usuários (senha de todos: ${PASSWORD})`);
  console.log(`  ${TEAMS.length} equipes, ${TASKS.length} tarefas, ${SUBS.length} entregas`);
  console.log("  login admin:  ana.souza@infohub.amf.br");
  console.log("  login mentor: fernanda.ribeiro@infohub.amf.br");
  console.log("  login aluno:  joao.alves@acad.amf.br (líder team-1)  /  beatriz.fernandes@acad.amf.br (2 equipes)");
}

// Só auto-executa quando rodado direto (`npm run db:seed` / `tsx src/db/seed.ts`).
// Quando importado (ex.: bootstrap.ts com SEED_ON_INIT), quem importa chama seed().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .catch((err) => {
      console.error("Falha no seed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
