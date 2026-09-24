import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { ensureAdmin, ensureEssentials } from "./essentials.js";
import { closePool, pool } from "./pool.js";

/**
 * Bootstrap de deploy (container / Coolify). Roda ANTES de subir a API:
 *
 *   1. espera o Postgres responder (o banco pode ainda estar subindo);
 *   2. cria o schema DB_SCHEMA se faltar (`CREATE SCHEMA IF NOT EXISTS`);
 *   3. se as tabelas ainda não existem, aplica `db/schema.sql` nesse schema;
 *   4. SEED_ON_INIT=true + nenhum usuário ainda -> dataset de demonstração;
 *   5. garante os dados essenciais (áreas, modelos de tarefa) e o 1º ADMIN
 *      (ADMIN_EMAIL/ADMIN_PASSWORD) — tudo idempotente, seguro a cada deploy.
 *
 * NÃO é um sistema de migrations incrementais: o schema.sql não tem
 * `IF NOT EXISTS`, por isso a checagem de "banco vazio" antes de aplicar.
 * Quando o schema começar a evoluir, entram migrations numeradas (PLAN.md).
 */
const SCHEMA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../../db/schema.sql");
const WAIT_TRIES = Number(process.env.DB_WAIT_TRIES ?? 30);
const WAIT_MS = Number(process.env.DB_WAIT_INTERVAL_MS ?? 2000);

async function waitForDb(): Promise<void> {
  for (let attempt = 1; attempt <= WAIT_TRIES; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (attempt === WAIT_TRIES) throw err;
      console.log(`[bootstrap] Postgres indisponível (${attempt}/${WAIT_TRIES}), aguardando…`);
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
  }
}

// O pool fixa search_path = DB_SCHEMA, então 'users' resolve só nele (nunca no public).
async function schemaExists(): Promise<boolean> {
  const { rows } = await pool.query<{ reg: string | null }>(
    "SELECT to_regclass('users') AS reg",
  );
  return rows[0]?.reg != null;
}

async function hasUsers(): Promise<boolean> {
  const { rowCount } = await pool.query("SELECT 1 FROM users LIMIT 1");
  return (rowCount ?? 0) > 0;
}

async function bootstrap(): Promise<void> {
  await waitForDb();

  // DB_SCHEMA já é validado como identificador simples em config/env.ts.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${env.DB_SCHEMA}"`);

  if (await schemaExists()) {
    console.log(`[bootstrap] schema "${env.DB_SCHEMA}" já presente — nada a aplicar.`);
  } else {
    console.log(`[bootstrap] schema "${env.DB_SCHEMA}" vazio — aplicando ${SCHEMA_PATH} …`);
    await pool.query(await readFile(SCHEMA_PATH, "utf8"));
    console.log("[bootstrap] schema aplicado.");
  }

  // "1ª subida" = ainda sem usuários (não depende de o schema ter acabado de ser criado)
  if (process.env.SEED_ON_INIT === "true" && !(await hasUsers())) {
    console.log("[bootstrap] SEED_ON_INIT=true e banco sem usuários — populando dados de demonstração…");
    const { seed } = await import("./seed.js");
    await seed();
  }

  await ensureEssentials();
  await ensureAdmin();
}

bootstrap()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("[bootstrap] falhou:", err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
