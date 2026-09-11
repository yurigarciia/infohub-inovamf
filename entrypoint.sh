#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Entrypoint de deploy da API (server/) — para Coolify e afins.
#
# Coolify (recurso da API):
#   Install command : npm install          (o postinstall instala app/ e server/)
#   Build command   : npm run build        (compila app/ e server/)
#   Start command   : ./entrypoint.sh
#
# Env obrigatórias no runtime: DATABASE_URL, JWT_ACCESS_SECRET, CORS_ORIGIN
#   (= URL pública do front). Opcional: PORT (Coolify injeta), SEED_ON_INIT=true
#   para popular o dataset de demonstração na primeira subida.
#
# O front (app/) sobe como OUTRO recurso, com Start command `npm run start:web`
# e a env NEXT_PUBLIC_API_URL apontando para a URL pública desta API.
# ---------------------------------------------------------------------------
set -e

echo "[entrypoint] preparando o banco (aplica db/schema.sql só se estiver vazio)…"
node server/dist/db/bootstrap.js

echo "[entrypoint] subindo a API na porta ${PORT:-3333}…"
exec node server/dist/index.js
