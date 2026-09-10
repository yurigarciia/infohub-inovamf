import { Router } from "express";
import type { Request, Response } from "express";
import { authRequired } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { dashboard } from "./reports.repository.js";

export const reportsRoutes = Router();

// RF-22 — indicadores da coordenação; só staff. ?cohort= filtra (RF-24).
reportsRoutes.get(
  "/reports/dashboard",
  authRequired,
  requireRole("ADMIN", "MENTOR"),
  async (req: Request, res: Response) => {
    const cohort = typeof req.query.cohort === "string" && req.query.cohort ? req.query.cohort : null;
    res.json(await dashboard(cohort));
  },
);
