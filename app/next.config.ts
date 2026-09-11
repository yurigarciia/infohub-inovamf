import type { NextConfig } from "next";

/**
 * O front e a API (server/) são processos separados. No deploy
 * single-service só a porta do Next fica exposta; o browser fala com a
 * API por `/api/*`, que o Next reescreve para a API local (mesma
 * origem para o browser → sem CORS, cookie de sessão simples).
 *
 * INTERNAL_API_URL aponta para a API dentro do container/host
 * (default: http://127.0.0.1:3333, casando com API_PORT do server/).
 */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:3333";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${INTERNAL_API_URL}/:path*` },
    ];
  },
};

export default nextConfig;
