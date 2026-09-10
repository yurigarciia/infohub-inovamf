import { Router } from "express";
import { authRequired } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as c from "./users.controller.js";

export const usersRoutes = Router();

// qualquer usuário autenticado
usersRoutes.get("/me", authRequired, c.me);

// mentores — usado no filtro do funil (RF-07); staff apenas
usersRoutes.get("/mentors", authRequired, requireRole("ADMIN", "MENTOR"), c.mentors);

// gestão de contas de staff (RF-03) — só ADMIN
usersRoutes.get("/staff", authRequired, requireRole("ADMIN"), c.listStaff);
usersRoutes.post("/staff", authRequired, requireRole("ADMIN"), c.createStaff);
usersRoutes.patch("/staff/:id", authRequired, requireRole("ADMIN"), c.updateStaff);
usersRoutes.patch("/staff/:id/active", authRequired, requireRole("ADMIN"), c.setStaffActive);
