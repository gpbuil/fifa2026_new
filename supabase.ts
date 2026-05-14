
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rtjozxqtrcsjnryurxkf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZPcuhycJIJzbVLTPyb3EbQ_y_Roixz-';

if (typeof window !== 'undefined') {
  const href = window.location.href;
  if (href.includes('type=recovery')) {
    sessionStorage.setItem('sb-recovery', '1');
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
