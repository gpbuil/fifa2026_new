# Teste end to end do Bolao

Este documento descreve um roteiro completo de teste end to end para validar o fluxo principal do Bolao: autenticacao, recuperacao de senha, palpites, entrada de resultados oficiais pelo admin e ranking.

## Objetivo

Garantir que um participante consegue entrar no sistema, registrar ou revisar palpites, acompanhar resultados oficiais e consultar sua pontuacao no ranking depois que o admin lanca os resultados.

## Ambiente

Use o ambiente local isolado deste projeto:

```bash
npm install
npm run supabase:start
docker compose up -d app
```

URLs locais:

- App: `http://localhost:3100`
- Supabase API: `http://127.0.0.1:56321`
- Supabase Studio: `http://127.0.0.1:56323`
- Mailpit: `http://127.0.0.1:56324`

Para validar build antes ou depois do roteiro:

```bash
npm run build
```

## Massa de dados

Crie ou confirme estes usuarios no Supabase local:

- Usuario participante:
  - E-mail: `participante.e2e@example.com`
  - Senha: `Senha123`
  - Nome: `Participante E2E`

- Usuario admin:
  - E-mail: `admin.e2e@example.com`
  - Senha: `Senha123`
  - Nome: `Admin E2E`
  - Campo `profiles.role`: `admin`

No Supabase Studio, confira:

- tabela `profiles` com os dois usuarios
- usuario admin com `role = admin`
- tabelas de palpites/resultados sem registros antigos que possam mascarar o teste

## Criterios gerais

O teste so deve ser aprovado se:

- login com credenciais validas funciona
- login com credenciais invalidas mostra erro
- recuperacao de senha envia e-mail para o Mailpit
- fluxo de nova senha permite alterar a senha
- participante consegue preencher palpites da fase de grupos
- participante consegue acessar a aba de mata-mata
- admin consegue bloquear e desbloquear palpites
- admin consegue salvar resultados oficiais da fase de grupos
- mata-mata oficial so fica editavel depois da fase de grupos completa
- ranking aparece depois de existir resultado oficial
- detalhe do ranking mostra confrontos, palpite, resultado oficial, regra e pontos

## Fluxo 1: login do participante

1. Acesse `http://localhost:3100`.
2. Confirme que a tela de login aparece.
3. Preencha um e-mail invalido, por exemplo `participante.e2e@example.com`.
4. Preencha uma senha invalida.
5. Clique em `Entrar`.
6. Confirme que aparece a mensagem `E-mail ou senha invalidos.`
7. Preencha:
   - E-mail: `participante.e2e@example.com`
   - Senha: `Senha123`
8. Clique em `Entrar`.
9. Confirme que o usuario entra no app e que o botao `Sair` aparece.

Resultado esperado: usuario autenticado e tela principal de palpites visivel.

## Fluxo 2: esqueceu a senha

1. Saia do sistema, se estiver logado.
2. Na tela de login, clique em `Esqueceu a senha?`.
3. Confirme que o campo `Seu E-mail de cadastro` aparece.
4. Informe `participante.e2e@example.com`.
5. Clique em `Enviar Link de Recuperacao`.
6. Confirme que aparece a mensagem de sucesso informando que o link sera enviado se o e-mail existir.
7. Acesse o Mailpit em `http://127.0.0.1:56324`.
8. Abra o e-mail de recuperacao.
9. Clique no link de recuperacao.
10. Confirme que a tela `Defina sua nova senha` aparece.
11. Preencha:
    - Nova senha: `Senha1234`
    - Confirmar nova senha: `Senha1234`
12. Clique em `Atualizar Senha`.
13. Confirme que aparece mensagem de sucesso.
14. Volte ao login e entre com:
    - E-mail: `participante.e2e@example.com`
    - Senha: `Senha1234`

Resultado esperado: senha atualizada e login funcionando com a nova senha.

Ao final deste fluxo, volte a senha para `Senha123` se quiser manter a massa padrao.

## Fluxo 3: palpites do participante

1. Entre como `participante.e2e@example.com`.
2. Confirme que a tela `Entrada de Resultados` aparece.
3. Na fase de grupos, preencha pelo menos os jogos do Grupo A.
4. Confirme que a classificacao do grupo muda conforme os placares inseridos.
5. Preencha alguns jogos de outros grupos para validar que a digitacao permanece estavel.
6. Clique em `MATA-MATA` ou `Mata-mata`, conforme o viewport.
7. Confirme que a grade do mata-mata aparece.
8. Preencha alguns palpites do mata-mata quando os confrontos estiverem disponiveis.
9. Recarregue a pagina.
10. Confirme que os palpites preenchidos continuam salvos.

Resultado esperado: palpites persistidos e tela de grupos/mata-mata navegavel.

## Fluxo 4: acesso admin

1. Saia do participante.
2. Entre como `admin.e2e@example.com`.
3. Acesse `http://localhost:3100/admin`.
4. Confirme que a tela `Admin` aparece.
5. Clique em `Bloquear resultados`.
6. Volte para a tela principal.
7. Confirme que os campos de palpite do participante ficam bloqueados ou que a tela mostra comparacao com resultados oficiais quando aplicavel.
8. Volte para `/admin`.
9. Clique em `Desbloquear resultados`.
10. Confirme que a edicao de palpites volta a ficar disponivel.

Resultado esperado: admin consegue alternar o bloqueio global de palpites.

## Fluxo 5: entrada de resultados oficiais

1. Entre como admin e acesse `/admin`.
2. Na secao `Resultados oficiais - Fase de grupos`, escolha o Grupo A.
3. Preencha placares oficiais para todos os jogos do Grupo A.
4. Clique em `Salvar` em cada jogo.
5. Recarregue a pagina.
6. Confirme que os placares salvos continuam preenchidos.
7. Complete os resultados oficiais de todos os grupos.
8. Confirme que o aviso do mata-mata deixa de aparecer quando todos os jogos de grupos forem preenchidos.
9. Na secao `Resultados oficiais - Mata-mata`, preencha um jogo da `Rodada de 32`.
10. Clique em `Salvar`.
11. Recarregue a pagina.
12. Confirme que o placar do mata-mata permanece salvo.

Resultado esperado: resultados oficiais persistidos e mata-mata liberado apenas apos a fase de grupos completa.

## Fluxo 6: ranking

1. Com resultados oficiais cadastrados, acesse `http://localhost:3100/ranking`.
2. Confirme que aparece `Ranking Geral`.
3. Confirme que existe ao menos uma linha no ranking.
4. Use a busca e pesquise por `Participante E2E`.
5. Confirme que o participante aparece filtrado.
6. Pesquise por `nao-encontrado-xpto`.
7. Confirme que aparece estado vazio da busca.
8. Limpe a busca.
9. Clique em um participante do ranking.
10. Confirme que a area `Detalhe` mostra:
    - fase
    - confronto
    - resultado oficial
    - palpite
    - regra de pontuacao
    - pontos
11. Confirme que a legenda `Regras e Pontos` aparece.
12. Se houver mais de uma pagina, teste os botoes de paginacao do ranking e do detalhe.

Resultado esperado: ranking calculado com base nos resultados oficiais e detalhes visiveis por participante.

## Fluxo 7: comparacao participante x oficial

1. Entre como participante.
2. Garanta que o admin bloqueou os palpites.
3. Na tela principal, confira os jogos com resultado oficial.
4. Confirme que cada jogo mostra:
   - `Palpite`
   - `Oficial`
   - status como `Acertou placar`, `Acertou resultado`, `Nao acertou` ou `Sem palpite`
5. Acesse a aba de mata-mata.
6. Confirme que os jogos oficiais do mata-mata tambem aparecem em modo de comparacao quando existirem.

Resultado esperado: participante consegue acompanhar a comparacao entre seus palpites e os resultados oficiais.

## Testes automatizados existentes

Alguns pontos de interface ja possuem cobertura Playwright.

Rodar todos:

```bash
cmd /c npm run test:e2e
```

Rodar por arquivo:

```bash
cmd /c npx playwright test tests/auth-ui.spec.ts
cmd /c npx playwright test tests/prediction-ui.spec.ts
cmd /c npx playwright test tests/ranking-ui.spec.ts
```

Para os testes que exigem login, informe credenciais:

```bash
set E2E_EMAIL=participante.e2e@example.com
set E2E_PASSWORD=Senha123
cmd /c npm run test:e2e
```

No PowerShell:

```powershell
$env:E2E_EMAIL="participante.e2e@example.com"
$env:E2E_PASSWORD="Senha123"
cmd /c npm run test:e2e
```

## Checklist final

- [ ] App abre em `http://localhost:3100`
- [ ] Supabase Studio abre em `http://127.0.0.1:56323`
- [ ] Mailpit abre em `http://127.0.0.1:56324`
- [ ] Login invalido mostra erro
- [ ] Login valido entra no app
- [ ] Recuperacao de senha envia e-mail
- [ ] Nova senha funciona
- [ ] Participante salva palpites
- [ ] Palpites persistem apos reload
- [ ] Admin acessa `/admin`
- [ ] Admin bloqueia/desbloqueia palpites
- [ ] Admin salva resultados oficiais
- [ ] Mata-mata oficial fica bloqueado ate grupos completos
- [ ] Ranking aparece com resultados oficiais
- [ ] Detalhe do ranking mostra calculo por jogo
- [ ] `npm run build` passa
- [ ] Playwright passa ou falhas estao documentadas
