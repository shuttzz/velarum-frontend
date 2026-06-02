# Frontend (web) — Velarum

Cliente web do jogo. Design do jogo: `../backend/docs/GDD.md`. Contexto global: `~/.claude/CLAUDE.md`.

## Stack
Vite · React · TypeScript · Vitest. PixiJS v8 (cidade/mapa/batalha) entra depois.
Estado planejado: Zustand (UI) + TanStack Query (servidor). Cliente do backend via oapi-codegen.
Gerenciador de pacotes: **pnpm** via Corepack (fixado em `package.json`; sem instalar na máquina).

## Convenções
- Roda em Docker (sem Node local). Testes com Vitest.
- Chamadas ao backend via proxy `/api` (Vite) → backend :8080.
- Ao final de cada etapa concluída: rodar **/publish** (commit + versão SemVer + push).

## Rodar / testar (Docker)
- `make up` → Vite (:5173)
- `make test` → Vitest
