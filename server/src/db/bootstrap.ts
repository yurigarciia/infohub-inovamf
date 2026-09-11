import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "./pool.js";

/**
 * Bootstrap de deploy (container / Coolify). Roda ANTES de subir a API:
 *
 *   1. espera o Postgres responder (o banco pode ainda estar subindo);
 *   2. se o schema não existe (banco vazio), aplica `db/schema.sql`;
 *   3. se já existe, não faz nada — seguro de rodar a cada deploy;
 *   4. com SEED_ON_INIT=true, popula o dataset de demo só na primeira vez.
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

async function schemaExists(): Promise<boolean> {
  const { rows } = await pool.query<{ reg: string | null }>(
    "SELECT to_regclass('public.users') AS reg",
  );
  return rows[0]?.reg != null;
}

async function bootstrap(): Promise<void> {
  await waitForDb();

  if (await schemaExists()) {
    console.log("[bootstrap] schema já presente — nada a aplicar.");
    return;
  }

  console.log(`[bootstrap] banco vazio — aplicando ${SCHEMA_PATH} …`);
  await pool.query(await readFile(SCHEMA_PATH, "utf8"));
  console.log("[bootstrap] schema aplicado.");

  if (process.env.SEED_ON_INIT === "true") {
    console.log("[bootstrap] SEED_ON_INIT=true — populando dados de demonstração…");
    const { seed } = await import("./seed.js");
    await seed();
  }
}

bootstrap()
  .then(() => closePool())
  .catch(async (err) => {
    console.error("[bootstrap] falhou:", err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
