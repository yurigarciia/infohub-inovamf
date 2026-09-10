import pg from "pg";
import { env } from "../config/env.js";

/**
 * Pool de conexões do node-postgres (singleton). Todo acesso ao banco
 * passa por aqui — nenhum módulo cria sua própria conexão.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do Postgres:", err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
