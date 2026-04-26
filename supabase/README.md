# Supabase local e sync com producao

Este repositorio ja esta vinculado ao projeto remoto `rtjozxqtrcsjnryurxkf` e agora possui a base minima para desenvolvimento local.

## O que ja foi sincronizado

- `config.toml`: configuracao local do Supabase CLI
- `migrations/20260323222152_remote_schema.sql`: schema atual da producao
- `database.types.ts`: tipos TypeScript gerados a partir do projeto remoto
- `backfill_profiles_from_auth.sql`: SQL avulso legado
- `ranking_rpc.sql`: SQL avulso legado

## O que foi encontrado na producao

- schema publico com tabelas, RLS e funcao RPC
- nenhuma Edge Function publicada no projeto neste momento

## O que ainda pode exigir trabalho manual

- secrets e configuracoes sensiveis
- dados reais para testes locais
- reorganizacao dos SQLs legados em migrations mais limpas, se necessario

## Pre-requisitos

1. Docker Desktop em execucao
2. Supabase CLI disponivel via `npx supabase`
3. `SUPABASE_ACCESS_TOKEN` autenticado
4. senha do banco remoto do projeto

## Projeto atual

- Project ref: `rtjozxqtrcsjnryurxkf`
- URL local da API: `http://127.0.0.1:56321`
- URL local do Studio: `http://127.0.0.1:56323`

## Comandos recomendados

Vincular o repositorio ao projeto remoto:

```bash
npx supabase link --project-ref rtjozxqtrcsjnryurxkf
```

Baixar o schema principal da producao:

```bash
npx supabase db pull remote_schema
```

Se quiser incluir tambem `auth` e `storage`:

```bash
npx supabase db pull remote_auth_storage --schema auth,storage
```

Baixar todas as Edge Functions:

```bash
npx supabase functions download --project-ref rtjozxqtrcsjnryurxkf --use-api
```

Gerar tipos TypeScript a partir do projeto remoto vinculado:

```bash
npx supabase gen types typescript --linked
```

Subir stack local:

```bash
npx supabase start
```

## Proximo passo sugerido

- usar `.env.local` para apontar o frontend para o Supabase local
- criar usuarios locais pelo Studio, se quiser testar autenticacao
- decidir se vale importar ou anonimizar dados da producao para testes
