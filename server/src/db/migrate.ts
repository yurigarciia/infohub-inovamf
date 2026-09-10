import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "./pool.js";

/**
 * Aplica db/schema.sql (a fonte da verdade do schema) num banco Postgres.
 *
 *   npm run db:migrate           -> roda o schema.sql como está
 *   npm run db:reset             -> derruba o schema public inteiro antes
 *                                   (útil em dev; APAGA TODOS OS DADOS)
 *
 * Não é um sistema de migrations incrementais — nesta fase o schema.sql
 * é reaplicado inteiro. Migrations numeradas entram quando o schema
 * começar a evoluir de forma incremental (ver PLAN.md).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../../db/schema.sql");

async function migrate(): Promise<void> {
  const reset = process.argv.includes("--reset");

  const sql = await readFile(SCHEMA_PATH, "utf8");

  const client = await pool.connect();
  try {
    if (reset) {
      console.log("--reset: derrubando o schema public...");
      await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
      await client.query("CREATE SCHEMA public;");
      await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER;");
      await client.query("GRANT ALL ON SCHEMA public TO public;");
    }

    console.log(`Aplicando ${SCHEMA_PATH} ...`);
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
