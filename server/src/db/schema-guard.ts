import type { Pool, PoolClient } from "pg";
import { env } from "../config/env.js";

/**
 * Travas para os comandos destrutivos (`db:reset`, `db:seed`) num banco
 * COMPARTILHADO. No Postgres da disciplina cada dupla tem seu schema e o
 * `public` guarda tabelas de outras pessoas — então:
 *   - nada destrutivo roda no `public` sem ALLOW_PUBLIC_SCHEMA=1;
 *   - só se derruba/esvazia um schema que esteja vazio ou que já seja
 *     deste app (tem as tabelas-âncora abaixo). Um DB_SCHEMA apontado por
 *     engano para o schema de um colega é recusado.
 */
const ANCHOR_TABLES = ["users", "teams", "tasks", "journey_stages"];

type Queryable = Pool | PoolClient;

async function tablesIn(db: Queryable, schema: string): Promise<string[]> {
  const { rows } = await db.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = $1",
    [schema],
  );
  return rows.map((r) => r.tablename);
}

function refuse(message: string): never {
  throw new Error(`${message}\n  (DB_SCHEMA=${env.DB_SCHEMA})`);
}

function assertNotPublic(action: string): void {
  if (env.DB_SCHEMA === "public" && process.env.ALLOW_PUBLIC_SCHEMA !== "1") {
    refuse(
      `Recusado: ${action} no schema "public". Num banco compartilhado isso pode apagar dados de outras pessoas.\n` +
        "  Defina DB_SCHEMA com o SEU schema (ou ALLOW_PUBLIC_SCHEMA=1 se o banco for só seu).",
    );
  }
}

/** db:reset — só derruba um schema inexistente, vazio ou já deste app. */
export async function assertSafeToReset(db: Queryable): Promise<void> {
  assertNotPublic("db:reset");
  const tables = await tablesIn(db, env.DB_SCHEMA);
  if (tables.length === 0) return;
  const isOurs = ANCHOR_TABLES.every((t) => tables.includes(t));
  if (!isOurs) {
    refuse(
      `Recusado: o schema já tem ${tables.length} tabela(s) que não parecem deste app ` +
        `(${tables.slice(0, 5).join(", ")}${tables.length > 5 ? ", …" : ""}). ` +
        "Não vou derrubar o schema de outra pessoa.",
    );
  }
}

/** db:seed — só esvazia/popula um schema que já tenha o schema deste app. */
export async function assertSafeToSeed(db: Queryable): Promise<void> {
  assertNotPublic("db:seed");
  const tables = await tablesIn(db, env.DB_SCHEMA);
  const missing = ANCHOR_TABLES.filter((t) => !tables.includes(t));
  if (missing.length > 0) {
    refuse(
      `Recusado: o schema não tem as tabelas do app (faltam: ${missing.join(", ")}). ` +
        "Rode `npm run db:migrate` (ou db:reset) primeiro.",
    );
  }
}
