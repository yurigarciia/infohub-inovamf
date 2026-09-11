import "dotenv/config";
import { z } from "zod";

/**
 * Configuração do servidor lida de variáveis de ambiente (server/.env).
 * Validada uma vez na inicialização — se algo obrigatório faltar, o
 * processo não sobe (falha cedo, com mensagem clara).
 */
const schema = z.object({
  // Porta INTERNA da API. Fica separada de PORT de propósito: no deploy
  // single-service o Next fica com PORT (a única porta exposta) e a API
  // com API_PORT, atrás do proxy do Next (next.config.ts rewrites).
  API_PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Só usado quando o front chama a API cross-origin (dev sem o proxy).
  // Com o proxy do Next as chamadas são same-origin e o CORS não entra.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // URL pública do app (a do front). Base dos links em e-mail, ex.:
  // <APP_URL>/definir-senha?token=...
  APP_URL: z.string().default("http://localhost:3000"),
  // Path do cookie de refresh. "/" funciona tanto direto quanto atrás
  // do proxy (/api/auth/...). Restrinja se a API tiver domínio próprio.
  REFRESH_COOKIE_PATH: z.string().default("/"),

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
