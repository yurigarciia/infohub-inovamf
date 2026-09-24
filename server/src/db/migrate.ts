import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { closePool, pool } from "./pool.js";
import { assertSafeToReset } from "./schema-guard.js";

/**
 * Aplica db/schema.sql (a fonte da verdade do schema) no schema DB_SCHEMA
 * do Postgres apontado por DATABASE_URL.
 *
 *   npm run db:migrate           -> cria o schema se faltar e roda o schema.sql
 *                                   (falha se as tabelas já existirem)
 *   npm run db:reset             -> derruba o SEU schema inteiro antes
 *                                   (APAGA OS DADOS dele; recusa `public` e
 *                                   schemas que não são deste app)
 *
 * Não é um sistema de migrations incrementais — nesta fase o schema.sql
 * é reaplicado inteiro. Migrations numeradas entram quando o schema
 * começar a evoluir de forma incremental (ver PLAN.md).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../db/schema.sql");

// env.DB_SCHEMA já foi validado como identificador simples; aspas por garantia.
const SCHEMA = `"${env.DB_SCHEMA}"`;

async function migrate(): Promise<void> {
  const reset = process.argv.includes("--reset");

  const sql = await readFile(SCHEMA_PATH, "utf8");

  const client = await pool.connect();
  try {
    if (reset) {
      await assertSafeToReset(client);
      console.log(`--reset: derrubando o schema ${SCHEMA}...`);
      await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
    }
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    console.log(`Aplicando ${SCHEMA_PATH} no schema ${SCHEMA} ...`);
    await client.query(sql);
    console.log("Schema aplicado com sucesso.");
  } catch (err) {
    console.error("Falha ao aplicar o schema:");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

void migrate();
