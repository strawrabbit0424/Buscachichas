import { supabase } from './supabaseClient.js';

const LB_MAX = 10;
const NICK_KEY = 'buscachichas:nickname';

/* El apodo sí puede vivir en localStorage: es solo para no tener que
   volver a escribirlo cada partida, no es parte del ranking en sí. */
export function loadNickname(){
  try{ return localStorage.getItem(NICK_KEY) || ''; }
  catch(e){ return ''; }
}
export function saveNickname(nick){
  try{ localStorage.setItem(NICK_KEY, nick); }
  catch(e){ console.error('No se pudo guardar el apodo localmente', e); }
}

export async function loadLeaderboard(difficulty){
  const { data, error } = await supabase
    .from('leaderboard')
    .select('nickname, time_ms, created_at')
    .eq('difficulty', difficulty)
    .order('time_ms', { ascending: true })
    .limit(LB_MAX);

  if(error){
    console.error('Error cargando el leaderboard:', error.message);
    return { list: [], error: error.message };
  }
  const list = data.map(row => ({
    nick: row.nickname,
    ms: row.time_ms,
    date: row.created_at ? row.created_at.slice(0, 10) : ''
  }));
  return { list, error: null };
}

export async function saveScore(difficulty, nickname, ms){
  const { error } = await supabase
    .from('leaderboard')
    .insert({ difficulty, nickname, time_ms: Math.round(ms) });

  if(error){
    console.error('Error guardando el tiempo:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
