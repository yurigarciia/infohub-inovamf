import type { Request, Response } from "express";
import * as service from "./reference.service.js";

export async function journeyStages(_req: Request, res: Response): Promise<void> {
  res.json(await service.getJourneyStages());
}

export async function ideaAreas(_req: Request, res: Response): Promise<void> {
  res.json(await service.getIdeaAreas());
}

export async function cohorts(_req: Request, res: Response): Promise<void> {
  res.json(await service.getCohorts());
}
