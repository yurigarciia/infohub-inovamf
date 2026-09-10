import { Router } from "express";
import * as c from "./reference.controller.js";

// Dados de referência (B2) — leitura pública: a landing page consome
// /journey-stages sem autenticação.
export const referenceRoutes = Router();

referenceRoutes.get("/journey-stages", c.journeyStages);
referenceRoutes.get("/idea-areas", c.ideaAreas);
referenceRoutes.get("/cohorts", c.cohorts);
