import { Router } from "express";
import type { Request, Response } from "express";
import { authRequired } from "../../middleware/auth.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { limitQuery } from "../../shared/validation.js";
import { getNotificationsForUser } from "./notifications.service.js";

export const notificationsRoutes = Router();

// RF-18/19 — e-mails enviados ao usuário autenticado.
notificationsRoutes.get(
  "/notifications/mine",
  authRequired,
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const limit = limitQuery.parse(req.query.limit);
    res.json(await getNotificationsForUser(req.user.id, limit));
  },
);
