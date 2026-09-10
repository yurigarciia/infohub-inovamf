import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import multer from "multer";
import { env } from "../../config/env.js";
import { BadRequestError } from "../../shared/errors.js";

/**
 * Upload de entregas (RF-14, RNF-04). Grava em server/uploads/ (fora do
 * git), servido estático em /uploads. Valida tipo e tamanho; o Pitch
 * Vídeo não passa por aqui — é link externo (Q3).
 */
const UPLOAD_ROOT = resolve(process.cwd(), env.UPLOAD_DIR);
if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "video/mp4",
]);

export const uploadSubmission = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new BadRequestError("Tipo de arquivo não permitido (PDF, PNG, JPEG ou MP4)."));
      return;
    }
    cb(null, true);
  },
}).single("file");

/** URL pública (servida por express.static em /uploads). */
export function publicUrl(filename: string): string {
  return `/uploads/${filename}`;
}
