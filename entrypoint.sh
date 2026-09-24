#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Entrypoint de deploy — UM único recurso no Coolify rodando os dois
# processos. Só a porta do front (Next, $PORT) fica exposta; a API roda
# ao lado, interna (API_PORT, default 3333), e o Next reescreve /api/*
# para ela (app/next.config.ts).
#
# Coolify:
#   Install command : npm install         (postinstall instala app/ e server/)
#   Build command   : npm run build       (compila app/ e server/)
#   Start command   : ./entrypoint.sh
#   Porta exposta   : 3000  (ou o valor de $PORT)
#
# Env de runtime:
#   DATABASE_URL, JWT_ACCESS_SECRET   (obrigatórias)
#   APP_URL                           (URL pública do app — base dos links de e-mail)
#   PORT                              (Coolify injeta; porta do Next)
#   API_PORT                          (opcional, default 3333 — porta interna da API)
#   SEED_ON_INIT=true                 (opcional — popula dados de demo na 1a subida)
#
# As vars podem vir do ambiente (Coolify) OU de um .env na raiz (dev /
# self-host). server e Next também carregam o .env sozinhos; sourcear
# aqui garante que `next start` enxergue PORT desde o começo.
# ---------------------------------------------------------------------------
set -e

if [ -f .env ]; then
  echo "[entrypoint] carregando .env da raiz"
  set -a; . ./.env; set +a
fi

# Este é o caminho de PRODUÇÃO: ignora NODE_ENV=development vindo de um .env copiado
# (isso deixa o Next/React em modo dev e desliga o cookie Secure).
export NODE_ENV=production

echo "[entrypoint] preparando o banco (aplica db/schema.sql só se estiver vazio)…"
node server/dist/db/bootstrap.js

echo "[entrypoint] subindo front (:${PORT:-3000}) + API (:${API_PORT:-3333}) no mesmo recurso…"
# -k: se um cair, derruba o outro e o container reinicia (Coolify).
exec npx concurrently -k -n web,api -c cyan,magenta \
  "npm --prefix app run start" \
  "npm --prefix server run start"
