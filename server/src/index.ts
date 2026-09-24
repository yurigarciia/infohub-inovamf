import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, pool } from "./db/pool.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { flushPendingEmails } from "./modules/notifications/notifications.service.js";

async function main(): Promise<void> {
  // valida conexão ao banco antes de aceitar requisições
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("Não consegui conectar ao Postgres. O banco está no ar?");
    // sem a senha: este log vai parar nos logs da plataforma
    const u = new URL(env.DATABASE_URL);
    console.error(`  banco: ${u.username}@${u.host}${u.pathname} (schema ${env.DB_SCHEMA})`);
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
      // e-mails ainda em retentativa (cold start do mail-service) ganham até 10 s
      const pending = await flushPendingEmails(10_000);
      if (pending) console.log(`[email] ${pending} envio(s) pendente(s) aguardados no encerramento`);
      await closePool();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
