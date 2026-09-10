import type { Request, Response } from "express";
import { z } from "zod";
import { UnauthorizedError } from "../../shared/errors.js";
import * as service from "./users.service.js";

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  res.json(await service.getMe(req.user.id));
}

export async function mentors(_req: Request, res: Response): Promise<void> {
  res.json(await service.getMentors());
}

export async function listStaff(_req: Request, res: Response): Promise<void> {
  res.json(await service.getStaff());
}

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "MENTOR"]),
});

export async function createStaff(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const input = createStaffSchema.parse(req.body);
  const user = await service.createStaff(input, req.user.id);
  res.status(201).json(user);
}

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "MENTOR"]).optional(),
});

export async function updateStaff(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const id = service.assertUuid(req.params.id!);
  const input = updateStaffSchema.parse(req.body);
  res.json(await service.updateStaff(id, input, req.user.id));
}

const setActiveSchema = z.object({ isActive: z.boolean() });

export async function setStaffActive(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const id = service.assertUuid(req.params.id!);
  const { isActive } = setActiveSchema.parse(req.body);
  res.json(await service.setStaffActive(id, isActive, req.user.id));
}
