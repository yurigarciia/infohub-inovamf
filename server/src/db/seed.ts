import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { env } from "../config/env.js";
import { closePool, pool } from "./pool.js";
import { DEFAULT_AREAS, DEFAULT_TEMPLATES } from "./essentials.js";
import { assertSafeToSeed } from "./schema-guard.js";
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

// mesmas listas do bootstrap (essentials.ts); aqui com ids fixos
const AREAS = DEFAULT_AREAS.map((name, i) => [i + 1, name] as const);

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
  { slug: "mentor-3", name: "Ricardo Menezes", email: "ricardo.menezes@infohub.amf.br", phone: "(55) 99999-0004", role: "MENTOR", createdDays: -95 },
  { slug: "mentor-4", name: "Patrícia Duarte", email: "patricia.duarte@infohub.amf.br", phone: "(55) 99999-0005", role: "MENTOR", createdDays: -90 },
  { slug: "student-1", name: "João Pedro Alves", email: "joao.alves@acad.amf.br", phone: "(55) 98888-0001", role: "STUDENT", createdDays: -60, course: "Sistemas de Informação", period: "5º período" },
  { slug: "student-2", name: "Marina Costa", email: "marina.costa@acad.amf.br", phone: "(55) 98888-0002", role: "STUDENT", createdDays: -60, course: "Administração", period: "3º período" },
  { slug: "student-3", name: "Lucas Martins", email: "lucas.martins@acad.amf.br", phone: "(55) 98888-0003", role: "STUDENT", createdDays: -55, course: "Sistemas de Informação", period: "7º período" },
  { slug: "student-4", name: "Beatriz Fernandes", email: "beatriz.fernandes@acad.amf.br", phone: "(55) 98888-0004", role: "STUDENT", createdDays: -55, course: "Engenharia de Software", period: "4º período" },
  { slug: "student-5", name: "Rafael Oliveira", email: "rafael.oliveira@acad.amf.br", phone: "(55) 98888-0005", role: "STUDENT", createdDays: -50, course: "Sistemas de Informação", period: "2º período" },
  { slug: "student-6", name: "Camila Santos", email: "camila.santos@acad.amf.br", phone: "(55) 98888-0006", role: "STUDENT", createdDays: -50, course: "Design", period: "6º período" },
  { slug: "student-7", name: "Gustavo Pereira", email: "gustavo.pereira@acad.amf.br", phone: "(55) 98888-0007", role: "STUDENT", createdDays: -45, course: "Sistemas de Informação", period: "8º período" },
  { slug: "student-8", name: "Juliana Rocha", email: "juliana.rocha@acad.amf.br", phone: "(55) 98888-0008", role: "STUDENT", createdDays: -45, course: "Administração", period: "5º período" },
  { slug: "student-9", name: "Pedro Henrique Souza", email: "pedro.souza@acad.amf.br", phone: "(55) 98888-0009", role: "STUDENT", createdDays: -40, course: "Sistemas de Informação", period: "3º período" },
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
  { slug: "team-1", ideaName: "EstudaFácil", ideaDescription: "Plataforma de resumos colaborativos para estudantes do ensino médio, com trilhas de estudo geradas a partir do histórico de dificuldades.", areaId: 1, maturity: "IDEA", source: "Indicação de um professor", cohort: COHORT, currentStage: 2, ready: false, createdDays: -30 },
  { slug: "team-2", ideaName: "SaúdeConecta", ideaDescription: "App que conecta pacientes de UBS a horários vagos de consulta em tempo real, reduzindo filas e faltas.", areaId: 2, maturity: "PROTOTYPE", source: "Instagram do InfoHub", cohort: COHORT, currentStage: 2, ready: false, createdDays: -32 },
  { slug: "team-3", ideaName: "FinPlan", ideaDescription: "Assistente de planejamento financeiro para MEIs, com projeção de fluxo de caixa a partir de notas fiscais emitidas.", areaId: 5, maturity: "MVP_IN_PROGRESS", source: "Indicação de um professor", cohort: COHORT, currentStage: 3, ready: false, createdDays: -55 },
];

// [teamSlug, userSlug, role]
const MEMBERS: [string, string, "LEADER" | "MEMBER"][] = [
  ["team-1", "student-1", "LEADER"], ["team-1", "student-2", "MEMBER"], ["team-1", "student-3", "MEMBER"],
  ["team-2", "student-4", "LEADER"], ["team-2", "student-5", "MEMBER"], ["team-2", "student-6", "MEMBER"],
  ["team-3", "student-7", "LEADER"], ["team-3", "student-8", "MEMBER"], ["team-3", "student-9", "MEMBER"],
];

// [teamSlug, mentorSlug]
const MENTORS: [string, string][] = [
  ["team-1", "mentor-1"], ["team-2", "mentor-1"], // Carlos atende 2 equipes
  ["team-3", "mentor-2"],                          // Fernanda atende a terceira
];

// [teamSlug, stageId, enteredDays, exitedDays|null, changedBySlug|null]
const HISTORY: [string, number, number, number | null, string | null][] = [
  ["team-1", 1, -30, -25, null], ["team-1", 2, -25, null, "admin-1"],
  ["team-2", 1, -32, -26, null], ["team-2", 2, -26, null, "admin-1"],
  ["team-3", 1, -55, -48, null], ["team-3", 2, -48, -40, "admin-1"], ["team-3", 3, -40, null, "mentor-2"],
];

// [teamSlug, authorSlug, content, createdDays]
const NOTES: [string, string, string, number][] = [
  ["team-1", "mentor-1", "Equipe animada; já agendamos o Encontro 1 para a próxima semana.", -4],
  ["team-3", "mentor-2", "Atraso no problema/público-alvo foi por causa de provas finais. Combinei novo prazo verbalmente, mas precisa formalizar no sistema.", -2],
];

// [templateSlug, stageId, title, description]
const TEMPLATES: [string, number, string, string][] = DEFAULT_TEMPLATES.map(
  ([stage, title, description]) => [`template-${stage}`, stage, title, description],
);

interface SeedTask {
  slug: string; team: string; stage: number; template: string | null;
  title: string; description: string; dueDays: number;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "LATE" | "APPROVED" | "REJECTED";
  createdBy: string; createdDays: number; updatedDays: number;
}

const TASKS: SeedTask[] = [
  { slug: "task-1", team: "team-1", stage: 1, template: null, title: "Enviar formulário da ideia", description: "Formulário de inscrição da ideia, avaliado pela equipe InfoHub.", dueDays: -26, status: "APPROVED", createdBy: "admin-1", createdDays: -30, updatedDays: -25 },
  { slug: "task-2", team: "team-1", stage: 2, template: null, title: "Confirmar agendamento do 1º encontro", description: "Escolher um horário disponível para o Encontro 1 com o mentor.", dueDays: 3, status: "IN_PROGRESS", createdBy: "admin-1", createdDays: -5, updatedDays: -1 },
  { slug: "task-3", team: "team-2", stage: 1, template: null, title: "Enviar formulário da ideia", description: "Formulário de inscrição da ideia, avaliado pela equipe InfoHub.", dueDays: -27, status: "APPROVED", createdBy: "admin-1", createdDays: -32, updatedDays: -26 },
  { slug: "task-4", team: "team-2", stage: 2, template: null, title: "Confirmar agendamento do 1º encontro", description: "Escolher um horário disponível para o Encontro 1 com o mentor.", dueDays: 4, status: "PENDING", createdBy: "admin-1", createdDays: -4, updatedDays: -4 },
  { slug: "task-5", team: "team-3", stage: 1, template: null, title: "Enviar formulário da ideia", description: "Formulário de inscrição da ideia, avaliado pela equipe InfoHub.", dueDays: -49, status: "APPROVED", createdBy: "admin-1", createdDays: -55, updatedDays: -48 },
  { slug: "task-6", team: "team-3", stage: 3, template: "template-3", title: "Definir problema, público-alvo e solução", description: "Enviar o documento definido no Encontro 1.", dueDays: -6, status: "LATE", createdBy: "mentor-2", createdDays: -20, updatedDays: -6 },
  { slug: "task-7", team: "team-3", stage: 3, template: null, title: "Preparar apresentação da ideia", description: "Slides curtos com a ideia, para o Encontro 2.", dueDays: 7, status: "PENDING", createdBy: "mentor-2", createdDays: -3, updatedDays: -3 },
];

interface SeedSubmission {
  slug: string; task: string; by: string; fileUrl: string; external: boolean;
  version: number; current: boolean; submittedDays: number;
  review: "PENDING" | "APPROVED" | "REJECTED"; comment: string | null;
  reviewedBy: string | null; reviewedDays: number | null;
}

const SUBS: SeedSubmission[] = [
  { slug: "sub-1", task: "task-1", by: "student-1", fileUrl: "https://storage.infohub.amf.br/mock/estudafacil-ideia.pdf", external: false, version: 1, current: true, submittedDays: -29, review: "APPROVED", comment: null, reviewedBy: "admin-1", reviewedDays: -25 },
  { slug: "sub-3", task: "task-3", by: "student-4", fileUrl: "https://storage.infohub.amf.br/mock/saudeconecta-ideia.pdf", external: false, version: 1, current: true, submittedDays: -31, review: "APPROVED", comment: null, reviewedBy: "admin-1", reviewedDays: -26 },
  { slug: "sub-5", task: "task-5", by: "student-7", fileUrl: "https://storage.infohub.amf.br/mock/finplan-ideia.pdf", external: false, version: 1, current: true, submittedDays: -54, review: "APPROVED", comment: null, reviewedBy: "admin-1", reviewedDays: -48 },
];

// [taskSlug, remindDays, isManual, sent, sentDays|null, createdDays]
const REMINDERS: [string, number, boolean, boolean, number | null, number][] = [
  ["task-6", -7, false, true, -7, -20],
  ["task-6", -4, true, true, -4, -4],
  ["task-7", 5, false, false, null, -3],
];

interface SeedEmail {
  recipient: string; type: string; subject: string;
  team: string | null; task: string | null;
  status: "SENT" | "FAILED" | "RETRIED"; providerId: string | null;
  sentDays: number | null; createdDays: number;
}

const EMAILS: SeedEmail[] = [
  { recipient: "admin-1", type: "NEW_TEAM_REGISTERED", subject: "Novo cadastro recebido: EstudaFácil", team: "team-1", task: null, status: "SENT", providerId: "demo-0001", sentDays: -30, createdDays: -30 },
  { recipient: "student-1", type: "TASK_ASSIGNED", subject: "Nova tarefa: Confirmar agendamento do 1º encontro", team: "team-1", task: "task-2", status: "SENT", providerId: "demo-0002", sentDays: -5, createdDays: -5 },
  { recipient: "student-7", type: "DEADLINE_LATE", subject: "Prazo vencido: Definir problema, público-alvo e solução", team: "team-3", task: "task-6", status: "SENT", providerId: "demo-0003", sentDays: -6, createdDays: -6 },
  { recipient: "admin-1", type: "TASK_LATE", subject: "Tarefa atrasada: Definir problema, público-alvo e solução (FinPlan)", team: "team-3", task: "task-6", status: "SENT", providerId: "demo-0004", sentDays: -6, createdDays: -6 },
  { recipient: "student-7", type: "MANUAL_REMINDER", subject: "Lembrete do mentor: falta pouco para regularizar a FinPlan!", team: "team-3", task: "task-6", status: "SENT", providerId: "demo-0005", sentDays: -4, createdDays: -4 },
];

export async function seed(): Promise<void> {
  // num banco compartilhado, o TRUNCATE só pode atingir o schema deste app
  await assertSafeToSeed(pool);
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
      [randomUUID(), uid("admin-1"), "task_submission", uid("sub-5"), "SUBMISSION_APPROVED", JSON.stringify({ taskId: uid("task-5") }), d(-48)],
    );
    await c.query(
      "INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(), uid("admin-1"), "team", uid("team-1"), "STAGE_ADVANCED", JSON.stringify({ fromStageId: 1, toStageId: 2 }), d(-25)],
    );
  });

  console.log("Seed concluído.");
  console.log(`  ${USERS.length} usuários (senha de todos: ${PASSWORD})`);
  console.log(`  ${TEAMS.length} equipes, ${TASKS.length} tarefas, ${SUBS.length} entregas`);
  console.log("  login admin:  ana.souza@infohub.amf.br");
  console.log("  login mentor: fernanda.ribeiro@infohub.amf.br");
  console.log("  login aluno:  joao.alves@acad.amf.br (líder team-1)  /  beatriz.fernandes@acad.amf.br (líder team-2)");
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
