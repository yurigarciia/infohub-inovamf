import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

/**
 * Configuração do servidor. As variáveis vêm de um ÚNICO `.env` na raiz
 * do repositório (ver `.env.example`); um `server/.env` opcional pode
 * sobrepor. O que já estiver no ambiente (ex.: injeção do Coolify) vence
 * os dois. Validada uma vez na inicialização — se algo obrigatório
 * faltar, o processo não sobe (falha cedo, com mensagem clara).
 */
// cwd = server/ (npm --prefix server ...) -> [server/.env, raiz/.env]
// cwd = raiz     (rodando da raiz)         -> [raiz/.env]
for (const rel of [".env", "../.env"]) {
  const path = resolve(process.cwd(), rel);
  if (existsSync(path)) loadEnv({ path }); // 1º que define vence; process.env vence ambos
}
// Var opcional em que "" (linha vazia no .env / campo vazio no Coolify) conta como ausente.
const optional = <T extends z.ZodTypeAny>(t: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), t.optional());

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
  // Flag Secure do cookie de refresh. Default: ligado em produção. Desligue
  // ("false") só se o app for servido em http:// puro (sem TLS) — do
  // contrário o browser descarta o cookie e o refresh nunca funciona.
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória (ver .env.example)"),
  // Schema do Postgres onde vivem as tabelas do app. O pool fixa o
  // search_path nele, então o SQL do projeto continua sem prefixo. Default
  // "infohub" (NUNCA "public"): o banco pode ser compartilhado — no da
  // disciplina cada dupla tem o seu schema. Só letras/dígitos/_ (é
  // interpolado em DDL).
  DB_SCHEMA: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "DB_SCHEMA deve ser um identificador simples (letras, dígitos, _)")
    .default("infohub"),

  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET é obrigatória"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  // Serviço de e-mail (mail-service próprio, POST /emails com x-api-key).
  // Sem MAIL_API_KEY os e-mails só são logados no console.
  MAIL_API_URL: z.string().url().default("https://mail-service.southinovations.com.br"),
  MAIL_API_KEY: optional(z.string().min(1)),
  // Domínios das contas de DEMONSTRAÇÃO (seed): destinatários neles não
  // recebem e-mail real — só log. Lista separada por vírgula; "" desliga.
  MAIL_SKIP_DOMAINS: z.string().default("acad.amf.br,infohub.amf.br"),

  // 1º administrador criado no bootstrap quando ainda não existe nenhum (ver
  // db/essentials.ts). Troque a senha depois pelo "esqueci minha senha".
  ADMIN_EMAIL: optional(z.string().email()),
  ADMIN_PASSWORD: optional(z.string().min(8, "ADMIN_PASSWORD precisa de ao menos 8 caracteres")),
  ADMIN_NAME: optional(z.string().min(1)),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(50),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuração inválida (.env da raiz / variáveis de ambiente):");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
/** Flag Secure dos cookies: explícita via COOKIE_SECURE, senão segue isProd. */
export const cookieSecure = env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProd;
export const isTest = env.NODE_ENV === "test";
