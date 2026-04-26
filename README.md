# FIFA 2026 Bolao

Aplicacao React + Supabase para palpites e ranking.

## Estrutura

- frontend React/Vite
- migrations e configuracao do Supabase em [`supabase/`](./supabase)
- tipos do banco em [`supabase/database.types.ts`](./supabase/database.types.ts)

## Ambientes

- local: usa [`.env.local`](./.env.local) e `npx supabase start`
- dev remoto: usa variaveis do projeto Supabase de homologacao
- prod: usa variaveis do projeto Supabase de producao

Modelos de variaveis:

- [`.env.example`](./.env.example)
- [`.env.dev.example`](./.env.dev.example)
- [`.env.prod.example`](./.env.prod.example)

## Desenvolvimento local

1. Instale dependencias:

```bash
npm install
```

2. Suba o Supabase local:

```bash
npm run supabase:start
```

3. Rode o frontend:

```bash
npm run dev
```

4. Valide o build:

```bash
npm run build
```

## Desenvolvimento com Docker

Suba o frontend em container:

```bash
docker compose up --build app
```

O app fica em `http://localhost:3100` e usa as variaveis de [`.env.local`](./.env.local).

Para parar:

```bash
docker compose down
```

Para validar a imagem de producao:

```bash
docker compose --profile prod up --build app-prod
```

A versao estatica fica em `http://localhost:8180`.

## Banco e Supabase

Scripts uteis:

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run supabase:reset`
- `npm run supabase:types`

Guia completo do fluxo `dev -> prod`:

- [`docs/deployment-workflow.md`](./docs/deployment-workflow.md)
