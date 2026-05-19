import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DeletePlayerPayload = {
  userId?: string;
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase secrets are not configured' }, 500);
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

  const payload = (await req.json().catch(() => ({}))) as DeletePlayerPayload;
  const userId = payload.userId;

  if (!userId) {
    return jsonResponse({ error: 'Invalid player payload' }, 400);
  }

  if (userId === authData.user.id) {
    return jsonResponse({ error: 'Admins cannot delete their own account from this panel' }, 400);
  }

  const { data: targetData, error: targetError } = await serviceClient.auth.admin.getUserById(userId);
  if (targetError || !targetData.user) {
    return jsonResponse({ error: 'Player auth user was not found' }, 404);
  }

  const { error: predictionsError } = await serviceClient
    .from('predictions')
    .delete()
    .eq('user_id', userId);

  if (predictionsError) {
    return jsonResponse({ error: predictionsError.message }, 500);
  }

  const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return jsonResponse({ error: authDeleteError.message }, 500);
  }

  await serviceClient
    .from('profiles')
    .delete()
    .eq('id', userId);

  return jsonResponse({ ok: true });
});
