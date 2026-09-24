import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Um único .env na raiz do repo (ver .env.example). cwd = app/ ao rodar
// `npm --prefix app ...`, então ../.env é o da raiz.
for (const rel of [".env", "../.env"]) loadEnv({ path: rel });

/**
 * O front e a API (server/) são processos separados. No deploy
 * single-service só a porta do Next fica exposta; o browser fala com a
 * API por `/api/*`, que o Next reescreve para a API local (mesma
 * origem para o browser → sem CORS, cookie de sessão simples).
 *
 * Alvo do proxy: INTERNAL_API_URL, ou derivado de API_PORT (default 3333).
 */
const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? "3333"}`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${INTERNAL_API_URL}/:path*` },
    ];
  },
};

export default nextConfig;
