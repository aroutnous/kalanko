#!/usr/bin/env bash
set -euo pipefail

DEV_DATABASE_URL="postgresql://kalanko_user:kalanko_dev_password@db:5432/kalanko"

usage() {
  cat <<'EOF'
Usage: ./dev.sh <commande>

  up        docker compose up -d --build
  migrate   alembic upgrade head (dans le conteneur backend)
  seed      python -m scripts.seed_local (dans le conteneur backend)
  test      pytest (dans le conteneur backend)
  down      docker compose down
  logs      docker compose logs -f backend
EOF
}

cmd="${1:-}"

case "$cmd" in
  up)
    docker compose up -d --build
    ;;
  migrate)
    docker compose exec -e DATABASE_URL="$DEV_DATABASE_URL" backend alembic upgrade head
    ;;
  seed)
    docker compose exec -e DATABASE_URL="$DEV_DATABASE_URL" backend python -m scripts.seed_local
    ;;
  test)
    docker compose exec -e DATABASE_URL="$DEV_DATABASE_URL" backend pytest
    ;;
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f backend
    ;;
  *)
    usage
    exit 1
    ;;
esac
