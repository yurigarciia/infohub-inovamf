import { Router } from "express";
import { authRequired } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as c from "./tasks.controller.js";
import { uploadSubmission } from "./upload.js";

// Montado em "/" — os caminhos completos ficam explícitos aqui.
export const tasksRoutes = Router();

const staff = requireRole("ADMIN", "MENTOR");

// modelos de tarefa (RF-11)
tasksRoutes.get("/task-templates", authRequired, staff, c.listTemplates);

// tarefas do aluno autenticado (RF-13) — antes de /tasks/:id
tasksRoutes.get("/tasks/mine", authRequired, c.listMine);

// tarefas de uma equipe (RF-08/13) — escopo por papel no service
tasksRoutes.get("/teams/:teamId/tasks", authRequired, c.listByTeam);

// criar / editar tarefa (RF-11/12) — staff
tasksRoutes.post("/tasks", authRequired, staff, c.create);
tasksRoutes.patch("/tasks/:id", authRequired, staff, c.update);

// entrega (RF-14/16) — aluno da equipe; multipart (arquivo) ou JSON (link)
tasksRoutes.post("/tasks/:id/submissions", authRequired, uploadSubmission, c.submit);

// revisão (RF-15) — staff
tasksRoutes.post("/submissions/:id/review", authRequired, staff, c.review);

// lembrete agendado (RF-17) ou manual (RF-20) — staff
tasksRoutes.post("/tasks/:id/reminders", authRequired, staff, c.reminder);
