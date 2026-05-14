import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ReminderPayload = {
  userId?: string;
  name?: string;
  missing?: number;
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('REMINDER_FROM_EMAIL') || 'Bolao da Copa <noreply@example.com>';
  const appUrl = Deno.env.get('APP_URL') || 'https://bolaodomanduca.com.br';
  const dryRun = Deno.env.get('REMINDER_DRY_RUN') === 'true';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase secrets are not configured' }, 500);
  }

  if (!dryRun && !resendApiKey) {
    return jsonResponse({ error: 'RESEND_API_KEY is not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { data: adminProfile, error: adminError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (adminError) {
    return jsonResponse({ error: adminError.message }, 500);
  }

  if (adminProfile?.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const payload = (await req.json().catch(() => ({}))) as ReminderPayload;
  const userId = payload.userId;
  const missing = Number(payload.missing ?? 0);
  const name = String(payload.name || 'participante');

  if (!userId || !Number.isFinite(missing) || missing <= 0) {
    return jsonResponse({ error: 'Invalid reminder payload' }, 400);
  }

  const { data: targetData, error: targetError } = await serviceClient.auth.admin.getUserById(userId);
  if (targetError || !targetData.user?.email) {
    return jsonResponse({ error: 'Target user email was not found' }, 404);
  }

  const safeName = name
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const subject = 'Lembrete para completar o Bolao da Copa 2026';
  const html = `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
      <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border:1px solid #e6e8ef;border-radius:16px;padding:32px;text-align:center;">
          <img
            src="${appUrl}/logobolao.png"
            alt="Bolao do Manduca"
            width="120"
            style="display:block;margin:0 auto 24px;width:120px;height:auto;"
          />

          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827;">
            Ol&#225;, ${safeName}!
          </h1>

          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#374151;">
            Seu palpite ainda n&#227;o est&#225; completo.
          </p>

          <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#374151;">
            Faltam <strong>${missing} jogo(s)</strong> para voc&#234; finalizar o Bol&#227;o do Manduca.
          </p>

          <a
            href="${appUrl}"
            style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px;"
          >
            Completar meus palpites
          </a>

          <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
            Se voc&#234; j&#225; completou seus palpites, pode ignorar este e-mail.
          </p>
        </div>
      </div>
    </div>
  `;

  if (dryRun) {
    return jsonResponse({
      ok: true,
      dryRun: true,
      to: targetData.user.email,
      subject,
    });
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: targetData.user.email,
      subject,
      html,
    }),
  });

  if (!emailResponse.ok) {
    const details = await emailResponse.text();
    console.error('Resend email failed', {
      status: emailResponse.status,
      details,
      from: fromEmail,
      toDomain: targetData.user.email.split('@')[1] ?? null,
    });
    return jsonResponse({
      ok: false,
      error: 'Email provider failed',
      providerStatus: emailResponse.status,
      details,
    });
  }

  return jsonResponse({ ok: true });
});
