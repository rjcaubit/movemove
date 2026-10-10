#!/usr/bin/env bash
# Publica o MoveMove no servidor de produção (atalho SSH definido fora do repositório).
#
#   npm run build && scripts/deploy.sh
#
# Envia o `dist/` já gerado, reconstrói a imagem `movemove-frontend:latest` lá
# (o servidor é x86_64; a imagem não sai pronta de um Mac ARM) e sobe o container.
# A imagem que estava no ar fica guardada com a etiqueta `antes-<data>-<hora>`.
# Para voltar atrás:
#   ssh server01 'docker tag movemove-frontend:antes-AAAAMMDD-HHMM movemove-frontend:latest \
#     && cd ~/movemove && docker compose up -d'
set -euo pipefail

SERVIDOR="${SERVIDOR:-server01}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
CONTEXTO="movemove-build-ctx"
ETIQUETA="antes-$(date +%Y%m%d-%H%M)"

[ -f "$RAIZ/dist/index.html" ] || { echo "Falta o dist/: rode 'npm run build' antes."; exit 1; }

echo "→ enviando dist/ para $SERVIDOR"
rsync -az "$RAIZ/dist/" "$SERVIDOR:movemove/dist/"
ssh "$SERVIDOR" "rm -rf ~/$CONTEXTO && mkdir -p ~/$CONTEXTO/docker"
scp -q "$RAIZ/Dockerfile" "$SERVIDOR:$CONTEXTO/"
scp -q "$RAIZ/docker/nginx.conf" "$SERVIDOR:$CONTEXTO/docker/"

echo "→ reconstruindo a imagem (a atual fica como movemove-frontend:$ETIQUETA)"
ssh "$SERVIDOR" "set -e
  cd ~/$CONTEXTO && cp -r ~/movemove/dist ./dist
  docker tag movemove-frontend:latest movemove-frontend:$ETIQUETA
  docker build -q -t movemove-frontend:latest .
  cd ~/movemove && docker compose up -d
  rm -rf ~/$CONTEXTO
  sleep 3
  docker ps --filter name=movemove-frontend --format '{{.Names}}  {{.Status}}'"

echo "→ conferindo o site"
curl -sI https://move.mundocapi.com/app/ | head -1
