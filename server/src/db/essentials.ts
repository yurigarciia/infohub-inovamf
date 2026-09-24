import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { pool } from "./pool.js";

/**
 * Dados MÍNIMOS para o app ser utilizável num banco recém-criado — o
 * schema.sql só carrega as 6 etapas. Sem áreas o formulário de cadastro
 * não fecha; sem modelos o admin não cria tarefa por template; sem admin
 * ninguém entra. Tudo idempotente: pode rodar a cada boot.
 *
 * O seed de demonstração (seed.ts) reaproveita estas mesmas listas.
 */
export const DEFAULT_AREAS: readonly string[] = [
  "Educação",
  "Saúde",
  "Tecnologia",
  "Sustentabilidade",
  "Finanças",
];

/** Catálogo fixo de modelos (RF-11) — [etapa, título, descrição]. */
export const DEFAULT_TEMPLATES: readonly (readonly [number, string, string])[] = [
  [3, "Definir problema, público-alvo e solução", "Documento curto descrevendo o problema, o público-alvo e a solução inicial discutidos no Encontro 1."],
  [4, "Enviar Value Proposition Design", "Anexar o Value Proposition Design construído no Encontro 2, em PDF ou imagem."],
  [5, "Enviar Business Model Canvas", "Anexar o Business Model Canvas construído no Encontro 3, em PDF ou imagem."],
  [6, "Enviar Pitch Vídeo e conferência de documentos", "Link do Pitch Vídeo (YouTube/Drive) + conferência final do Canvas, VPD e dados de todos os integrantes."],
];

async function isEmpty(table: string): Promise<boolean> {
  // `table` vem só das chamadas abaixo (constantes), nunca de input externo.
  const { rowCount } = await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
  return rowCount === 0;
}

/** Áreas de ideia + modelos de tarefa, só quando as tabelas estão vazias
 * (linhas com soft delete contam — não recria o que um admin apagou). */
export async function ensureEssentials(): Promise<void> {
  if (await isEmpty("idea_areas")) {
    for (const name of DEFAULT_AREAS) {
      await pool.query("INSERT INTO idea_areas (name) VALUES ($1)", [name]);
    }
    console.log(`[bootstrap] ${DEFAULT_AREAS.length} áreas de ideia criadas.`);
  }
  if (await isEmpty("task_templates")) {
    for (const [stageId, title, description] of DEFAULT_TEMPLATES) {
      await pool.query(
        "INSERT INTO task_templates (stage_id, title, description) VALUES ($1, $2, $3)",
        [stageId, title, description],
      );
    }
    console.log(`[bootstrap] ${DEFAULT_TEMPLATES.length} modelos de tarefa criados.`);
  }
}

/**
 * Garante o 1º administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD
 * (/ ADMIN_NAME). Não faz nada se já existe algum ADMIN. Sem as envs e
 * sem admin, só avisa — o operador precisa definir as envs (ou usar
 * SEED_ON_INIT=true para o dataset de demonstração).
 */
export async function ensureAdmin(): Promise<void> {
  const { rowCount: admins } = await pool.query("SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1");
  if (admins) return;

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.warn(
      "[bootstrap] ⚠ não há nenhum ADMIN no banco. Defina ADMIN_EMAIL e ADMIN_PASSWORD " +
        "(mín. 8 caracteres) para criar o primeiro, ou SEED_ON_INIT=true para o dataset de demo.",
    );
    return;
  }

  const email = env.ADMIN_EMAIL.trim();
  const taken = await pool.query("SELECT 1 FROM users WHERE lower(email) = lower($1)", [email]);
  if (taken.rowCount) {
    console.warn(`[bootstrap] ⚠ ADMIN_EMAIL (${email}) já pertence a um usuário que não é ADMIN — nada criado.`);
    return;
  }

  const hash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  await pool.query(
    `INSERT INTO users (name, email, role, password_hash, lgpd_consented_at)
     VALUES ($1, $2, 'ADMIN', $3, now())`,
    [env.ADMIN_NAME ?? "Administrador", email, hash],
  );
  console.log(`[bootstrap] administrador inicial criado: ${email}`);
}
