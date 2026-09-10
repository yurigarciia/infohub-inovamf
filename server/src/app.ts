import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { referenceRoutes } from "./modules/reference/reference.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";

/**
 * Monta o app Express (sem dar listen). Separado de index.ts para os
 * testes poderem importar o app e bater nas rotas com supertest.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // cookies (refresh token)
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  // arquivos entregues pelos alunos (RNF-04) — servidos estáticos
  app.use("/uploads", express.static(env.UPLOAD_DIR));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "infohub-inovamf-server", ts: new Date().toISOString() });
  });

  // --- rotas dos módulos ---
  app.use("/auth", authRoutes); // RF-01
  app.use("/users", usersRoutes); // RF-03, /users/me
  app.use("/", referenceRoutes); // RF-04 — /journey-stages, /idea-areas, /cohorts
  // teams, tasks, reports, audit, notifications entram nos próximos módulos (B3+)

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
