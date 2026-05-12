# Supabase Auth em producao

Checklist para manter recuperacao de senha e login social funcionando em `https://bolaodomanduca.com.br`.

## URLs

No painel do Supabase, em Authentication > URL Configuration:

- Site URL: `https://bolaodomanduca.com.br`
- Redirect URLs:
  - `https://bolaodomanduca.com.br`
  - `https://bolaodomanduca.com.br/`
  - `https://www.bolaodomanduca.com.br`
  - `https://www.bolaodomanduca.com.br/`

O frontend usa `window.location.origin` como `redirectTo`, entao o valor enviado em producao deve ser exatamente `https://bolaodomanduca.com.br`.

## Recuperacao de senha

Se o endpoint `/auth/v1/recover` retornar `500`, verificar nesta ordem:

1. Authentication > Logs: abrir o erro do envio mais recente.
2. Authentication > Email Templates > Reset Password: confirmar que o template usa `{{ .ConfirmationURL }}`.
3. Authentication > SMTP Settings: validar host, porta, usuario, senha, remetente e TLS.
4. Se nao houver SMTP customizado, verificar limite de envio do provedor padrao do Supabase.

## Google OAuth

No Google Cloud Console:

- Authorized JavaScript origins: `https://bolaodomanduca.com.br`
- Authorized redirect URI: `https://rtjozxqtrcsjnryurxkf.supabase.co/auth/v1/callback`

No Supabase, manter o mesmo Client ID e Client Secret configurados no provider Google.

## Teste manual

1. Abrir `https://bolaodomanduca.com.br`.
2. Enviar recuperacao para um e-mail cadastrado.
3. Confirmar que o link recebido volta para o dominio de producao.
4. Definir uma nova senha.
5. Entrar com a nova senha.
6. Repetir com login Google.
