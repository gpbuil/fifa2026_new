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

Template sugerido para Authentication > Email Templates > Reset Password.
Use entidades HTML numericas para acentos; elas tendem a ser mais consistentes em clientes como Outlook.

```html
<div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e6e8ef;border-radius:16px;padding:32px;text-align:center;">
      <img
        src="https://bolaodomanduca.com.br/logobolao.png"
        alt="Bolao do Manduca"
        width="120"
        style="display:block;margin:0 auto 24px;width:120px;height:auto;"
      />

      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827;">
        Ol&#225;!
      </h1>

      <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#374151;">
        N&#227;o se preocupe com a senha antiga.
      </p>

      <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
        Clique no bot&#227;o abaixo para registrar sua nova senha e voltar para o Bol&#227;o do Manduca.
      </p>

      <a
        href="{{ .ConfirmationURL }}"
        style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px;"
      >
        Criar nova senha
      </a>

      <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
        Se voc&#234; n&#227;o pediu essa altera&#231;&#227;o, pode ignorar este e-mail.
      </p>
    </div>
  </div>
</div>
```

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
