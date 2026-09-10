import { Router } from "express";
import type { Request, Response } from "express";
import { authRequired } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { getRecentAuditLogs } from "./audit.service.js";

export const auditRoutes = Router();

// RNF-05 — trilha de auditoria; só staff.
auditRoutes.get(
  "/audit-logs",
  authRequired,
  requireRole("ADMIN", "MENTOR"),
  async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await getRecentAuditLogs(limit));
  },
);
