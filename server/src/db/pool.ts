import pg from "pg";
import { env } from "../config/env.js";

// DATE (oid 1082) volta como string "AAAA-MM-DD". O parser padrão do pg cria um Date
// à meia-noite no fuso do PROCESSO: no container (UTC) o prazo virava 00:00Z e, no
// navegador em horário de Brasília, aparecia um dia ANTES. Data pura não tem fuso.
pg.types.setTypeParser(1082, (value: string) => value);

/**
 * Pool de conexões do node-postgres (singleton). Todo acesso ao banco
 * passa por aqui — nenhum módulo cria sua própria conexão.
 *
 * `search_path` é fixado em DB_SCHEMA (e SÓ nele, sem `public`): o SQL do
 * projeto segue sem prefixo de schema, e um schema inexistente falha alto
 * ("no schema has been selected to create in") em vez de criar/ler tabelas
 * no `public` de um banco compartilhado.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  options: `-c search_path=${env.DB_SCHEMA}`,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do Postgres:", err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
