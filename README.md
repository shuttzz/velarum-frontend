# Velarum — Frontend (web)

Cliente web do jogo. Esqueleto inicial: **Vite + React + TypeScript** (PixiJS v8 entra depois para cidade/mapa/batalha). Roda em **Docker** (não precisa de Node instalado).

Gerenciador de pacotes: **pnpm**, ativado via **Corepack** (embutido no Node) — fixado em `package.json` (`packageManager`). Não precisa instalar pnpm na máquina; o container faz `corepack enable && pnpm install`.

## Rodar (via Docker)
```sh
docker compose up          # dev server em http://localhost:5173
# ou: make up
```
As chamadas a `/api/*` são encaminhadas ao backend (`http://localhost:8080`). **Suba o backend antes** (em `../backend`: `docker compose up`) para a tela mostrar a conexão.

Testes:
```sh
docker compose run --rm frontend sh -c "corepack enable && pnpm test"   # ou: make test
```

## Stack planejada (ver `../backend/docs/GDD.md`)
- React + Zustand (estado de UI) + TanStack Query (estado do servidor)
- PixiJS v8 (canvas 2D isométrico) — cidade, mapa-mundi, batalha tática
- Vite + TypeScript + Vitest
- Cliente do backend gerado por oapi-codegen (OpenAPI)
- Mobile depois via PWA / Capacitor
