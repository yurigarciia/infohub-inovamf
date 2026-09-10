import type { Request, Response } from "express";
import { z } from "zod";
import { UnauthorizedError } from "../../shared/errors.js";
import { setRefreshCookie } from "../auth/auth.cookie.js";
import { assertUuid } from "../users/users.service.js";
import * as service from "./teams.service.js";

function actorOf(req: Request): { id: string; role: "ADMIN" | "MENTOR" | "STUDENT" } {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, role: req.user.role };
}

function ctxOf(req: Request) {
  return { userAgent: req.header("user-agent") ?? null, ipAddress: req.ip ?? null };
}

// --- POST /teams (público — Etapa 1 do funil) ------------------------

const personSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  course: z.string().min(1),
  period: z.string().min(1),
});

const createTeamSchema = z.object({
  leader: personSchema,
  members: z.array(personSchema).max(9).default([]),
  ideaName: z.string().min(1),
  ideaDescription: z.string().min(1),
  areaId: z.number().int().positive(),
  ideaMaturity: z.enum(["IDEA", "PROTOTYPE", "MVP_IN_PROGRESS", "MVP_READY"]),
  sourceOrigin: z.string().optional(),
  cohort: z.string().min(1),
  lgpdConsent: z.boolean().refine((v) => v === true, "É necessário aceitar o termo LGPD."),
});

export async function createTeam(req: Request, res: Response): Promise<void> {
  const input = createTeamSchema.parse(req.body);
  const { team, leaderUserId, session } = await service.createTeamFromInscription(input, ctxOf(req));
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  res.status(201).json({ team, leaderUserId, accessToken: session.accessToken });
}

// --- leitura -------------------------------------------------------

const boardQuerySchema = z.object({
  search: z.string().optional(),
  course: z.string().optional(),
  areaId: z.coerce.number().int().positive().optional(),
  taskStatus: z.string().optional(),
  mentorId: z.string().uuid().optional(),
  cohort: z.string().optional(),
});

export async function listBoard(req: Request, res: Response): Promise<void> {
  const filters = boardQuerySchema.parse(req.query);
  res.json(await service.getTeamsByStage(actorOf(req), filters));
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const actor = actorOf(req);
  res.json(await service.getTeamsForStudent(actor.id));
}

export async function detail(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  res.json(await service.getTeamDetail(actorOf(req), id));
}

// --- escrita -----------------------------------------------------

const advanceSchema = z.object({ toStageId: z.number().int().min(1).max(6) });

export async function advanceStage(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  const { toStageId } = advanceSchema.parse(req.body);
  res.json(await service.advanceTeamStage(actorOf(req), id, toStageId));
}

const noteSchema = z.object({ content: z.string().min(1) });

export async function addNote(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  const { content } = noteSchema.parse(req.body);
  res.status(201).json(await service.addTeamNote(actorOf(req), id, content));
}
