-- Ejecuta esto en Supabase: tu proyecto → SQL Editor → New query → Run

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  difficulty text not null check (difficulty in ('facil','medio','dificil')),
  nickname text not null,
  time_ms integer not null,
  created_at timestamptz not null default now()
);

-- Índice para que el top 10 por dificultad sea rápido de consultar.
create index if not exists leaderboard_difficulty_time_idx
  on public.leaderboard (difficulty, time_ms);

-- Row Level Security: sin esto, con la anon key nadie puede leer ni escribir.
alter table public.leaderboard enable row level security;

-- Cualquiera puede leer el ranking (es público por diseño).
create policy "leaderboard_select_publico"
  on public.leaderboard for select
  using (true);

-- Cualquiera puede insertar su tiempo, pero con validaciones básicas
-- para evitar basura obvia (nadie puede editar ni borrar filas existentes).
create policy "leaderboard_insert_validado"
  on public.leaderboard for insert
  with check (
    time_ms > 0 and time_ms < 3600000
    and char_length(nickname) between 1 and 16
    and difficulty in ('facil','medio','dificil')
  );

-- Nota: no se crean policies de UPDATE ni DELETE a propósito,
-- así nadie puede modificar tiempos ya guardados usando la anon key.
