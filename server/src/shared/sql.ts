import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "../db/pool.js";

/**
 * Helpers finos em cima do pool. Os repositórios escrevem SQL puro e
 * usam estes para executar — nada de ORM nem query builder.
 *
 * Convenção: SEMPRE usar parâmetros posicionais ($1, $2, ...), nunca
 * interpolar valor em string de SQL (evita SQL injection).
 */

/** Executa uma query e devolve todas as linhas. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}

/** Executa uma query que deve devolver 0 ou 1 linha. */
export async function maybeOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Executa uma query que deve devolver exatamente 1 linha (senão erra). */
export async function one<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const rows = await query<T>(text, params);
  if (rows.length !== 1) {
    throw new Error(`Esperava 1 linha, veio ${rows.length}. SQL: ${text}`);
  }
  return rows[0] as T;
}

/**
 * Roda um bloco de operações dentro de uma transação. Faz COMMIT no
 * sucesso e ROLLBACK em qualquer exceção. O callback recebe o client
 * da transação — dentro dele use `client.query(...)`.
 */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
