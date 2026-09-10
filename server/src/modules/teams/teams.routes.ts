import { Router } from "express";
import { authRequired } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as c from "./teams.controller.js";

export const teamsRoutes = Router();

// Etapa 1 do funil — o aluno ainda não tem sessão (RF-02)
teamsRoutes.post("/", c.createTeam);

// área do aluno — equipes do próprio usuário
teamsRoutes.get("/mine", authRequired, c.listMine);

// painel do funil (RF-06/07) — staff; mentor recebe só as suas
teamsRoutes.get("/", authRequired, requireRole("ADMIN", "MENTOR"), c.listBoard);

// detalhe (RF-08/10) — aluno da equipe, mentor atribuído ou admin
teamsRoutes.get("/:id", authRequired, c.detail);

// transição de etapa (RF-09) e anotação interna (RF-10) — staff
teamsRoutes.post("/:id/stage", authRequired, requireRole("ADMIN", "MENTOR"), c.advanceStage);
teamsRoutes.post("/:id/notes", authRequired, requireRole("ADMIN", "MENTOR"), c.addNote);
