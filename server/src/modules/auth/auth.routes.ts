import { Router } from "express";
import * as c from "./auth.controller.js";

/** RF-01 — autenticação. Todas as rotas são públicas (não exigem token). */
export const authRoutes = Router();

authRoutes.post("/login", c.login);
authRoutes.post("/refresh", c.refresh);
authRoutes.post("/logout", c.logout);
authRoutes.post("/password-reset", c.requestPasswordReset);
authRoutes.post("/password-reset/confirm", c.confirmPasswordReset);
