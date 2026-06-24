-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla de jugadores (esquema base)
-- ─────────────────────────────────────────────────────────────────────────────
-- En producción esta tabla ya existía (se creó antes de tener migraciones), así
-- que aquí usamos `if not exists`: en prod es un no-op y en local (o en un reset
-- limpio) la crea, de modo que las migraciones de RLS posteriores no fallen.
--
-- Migración forward-only: no la edites una vez aplicada; añade otra para cambios.

create table if not exists public.porra_jugadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  user_id uuid,
  group_predictions jsonb not null default '{}'::jsonb,
  podium jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
