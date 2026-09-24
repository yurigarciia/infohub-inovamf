import type { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError, UnauthorizedError } from "../../shared/errors.js";
import { dateOnly, httpUrl, requiredText } from "../../shared/validation.js";
import { assertUuid } from "../users/users.service.js";
import type { Actor } from "../teams/teams.service.js";
import * as service from "./tasks.service.js";
import { discardUpload, publicUrl, verifyUpload } from "./upload.js";

function actorOf(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, role: req.user.role };
}


// --- templates ----------------------------------------------------

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const { stageId } = z
    .object({ stageId: z.coerce.number().int().min(1).max(6).optional() })
    .parse(req.query);
  res.json(await service.getTemplates(stageId));
}

// --- tarefas ----------------------------------------------------

export async function listByTeam(req: Request, res: Response): Promise<void> {
  const teamId = assertUuid(req.params.teamId!);
  res.json(await service.getTasksForTeam(actorOf(req), teamId));
}

export async function listMine(req: Request, res: Response): Promise<void> {
  res.json(await service.getTasksForStudent(actorOf(req).id));
}

const createSchema = z.object({
  teamId: z.string().uuid(),
  stageId: z.number().int().min(1).max(6),
  templateId: z.string().uuid().optional(),
  title: requiredText(200),
  description: z.string().max(5000).optional(),
  dueDate: dateOnly,
});

export async function create(req: Request, res: Response): Promise<void> {
  const input = createSchema.parse(req.body);
  res.status(201).json(await service.createTask(actorOf(req), input));
}

const updateSchema = z.object({
  title: requiredText(200).optional(),
  description: z.string().optional(),
  dueDate: dateOnly.optional(),
});

export async function update(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  res.json(await service.updateTask(actorOf(req), id, updateSchema.parse(req.body)));
}

// --- entregas -------------------------------------------------

const externalLinkSchema = z.object({ externalLink: httpUrl });

export async function submit(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  const actor = actorOf(req);

  try {
    if (req.file) {
      await verifyUpload(req.file);
      res
        .status(201)
        .json(
          await service.submitTask(actor, id, {
            fileUrl: publicUrl(req.file.filename),
            isExternalLink: false,
          }),
        );
      return;
    }
    const { externalLink } = externalLinkSchema.parse(req.body);
    res
      .status(201)
      .json(await service.submitTask(actor, id, { fileUrl: externalLink, isExternalLink: true }));
  } catch (err) {
    // o multer já gravou o arquivo antes das checagens de permissão: não deixa órfão
    await discardUpload(req.file);
    throw err;
  }
}

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewComment: z.string().optional(),
});

export async function review(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  res.json(await service.reviewSubmission(actorOf(req), id, reviewSchema.parse(req.body)));
}

// --- lembretes ----------------------------------------------

const reminderSchema = z.union([
  z.object({ manual: z.literal(true) }),
  z.object({ remindAt: z.string().min(1) }),
]);

export async function reminder(req: Request, res: Response): Promise<void> {
  const id = assertUuid(req.params.id!);
  const actor = actorOf(req);
  const body = reminderSchema.parse(req.body);
  if ("manual" in body) {
    res.status(201).json(await service.sendManualReminder(actor, id));
    return;
  }
  const when = new Date(body.remindAt);
  if (Number.isNaN(when.getTime())) throw new BadRequestError("Data de lembrete inválida.");
  res.status(201).json(await service.configureReminder(actor, id, when.toISOString()));
}
