# Atalhos (tudo roda via Docker — não precisa de Node local).
.PHONY: up down install build test

up:      ; docker compose up
down:    ; docker compose down
install: ; docker compose run --rm frontend sh -c "corepack enable && pnpm install"
build:   ; docker compose run --rm frontend sh -c "corepack enable && pnpm build"
test:    ; docker compose run --rm frontend sh -c "corepack enable && pnpm test"
