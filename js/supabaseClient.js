import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// window.supabase lo expone el script del CDN cargado en index.html.
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
