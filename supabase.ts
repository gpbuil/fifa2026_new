
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rtjozxqtrcsjnryurxkf.supabase.co';
const supabaseKey = 'sb_publishable_ZPcuhycJIJzbVLTPyb3EbQ_y_Roixz-';

export const supabase = createClient(supabaseUrl, supabaseKey);
