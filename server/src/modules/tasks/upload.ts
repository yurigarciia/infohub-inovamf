import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { open, rm } from "node:fs/promises";
import { resolve } from "node:path";
import multer from "multer";
import { env } from "../../config/env.js";
import { BadRequestError } from "../../shared/errors.js";
import { matchesSignature } from "./file-signature.js";

/**
 * Upload de entregas (RF-14, RNF-04). Grava em server/uploads/ (fora do
 * git), servido estático em /uploads na MESMA origem do app (via proxy do
 * Next) — por isso o arquivo não pode ser algo executável no browser:
 *   1. tipo permitido só pela lista abaixo;
 *   2. a extensão gravada vem do TIPO, nunca do nome enviado (x.html
 *      "declarado" como PDF viraria HTML servido na origem do app);
 *   3. a assinatura real do arquivo (magic bytes) precisa bater com o tipo.
 * O Pitch Vídeo não passa por aqui — é link externo (Q3).
 */
const UPLOAD_ROOT = resolve(process.cwd(), env.UPLOAD_DIR);
if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "video/mp4": ".mp4",
};

export const uploadSubmission = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXT_BY_MIME[file.mimetype] ?? ""}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!(file.mimetype in EXT_BY_MIME)) {
      cb(new BadRequestError("Tipo de arquivo não permitido (PDF, PNG, JPEG ou MP4)."));
      return;
    }
    cb(null, true);
  },
}).single("file");

/** Confere a assinatura do arquivo gravado; se não bater, apaga e recusa. */
export async function verifyUpload(file: Express.Multer.File): Promise<void> {
  const fh = await open(file.path, "r");
  const head = Buffer.alloc(12);
  try {
    await fh.read(head, 0, 12, 0);
  } finally {
    await fh.close();
  }
  if (!matchesSignature(file.mimetype, head)) {
    await discardUpload(file);
    throw new BadRequestError("O conteúdo do arquivo não corresponde ao tipo informado.");
  }
}

/** Remove do disco um upload que não será usado (recusado ou com erro). */
export async function discardUpload(file: Express.Multer.File | undefined): Promise<void> {
  if (file) await rm(file.path, { force: true });
}

/** URL pública (servida por express.static em /uploads). */
export function publicUrl(filename: string): string {
  return `/uploads/${filename}`;
}
