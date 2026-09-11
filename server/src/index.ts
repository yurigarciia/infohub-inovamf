import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, pool } from "./db/pool.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";

async function main(): Promise<void> {
  // valida conexão ao banco antes de aceitar requisições
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("Não consegui conectar ao Postgres. O banco está no ar?");
    console.error("  DATABASE_URL:", env.DATABASE_URL);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    console.log(`InfoHub API ouvindo em http://localhost:${env.API_PORT}  (env: ${env.NODE_ENV})`);
  });

  // RN-04 + RF-17 automático — varre tarefas atrasadas e lembretes devidos
  startScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} recebido — encerrando...`);
    stopScheduler();
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
