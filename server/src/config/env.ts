import "dotenv/config";
import { z } from "zod";

/**
 * Configuração do servidor lida de variáveis de ambiente (server/.env).
 * Validada uma vez na inicialização — se algo obrigatório faltar, o
 * processo não sobe (falha cedo, com mensagem clara).
 */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória (ver server/.env.example)"),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET é obrigatória"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("InfoHub <no-reply@infohub.local>"),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(50),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuração inválida (server/.env):");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
