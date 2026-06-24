-- ─────────────────────────────────────────────────────────────────────────────
-- Pronóstico del cuadro de eliminatorias (knockout bracket)
-- ─────────────────────────────────────────────────────────────────────────────
-- Añade la columna `bracket_predictions` a porra_jugadores para guardar, por
-- jugador, qué equipo cree que avanza en cada partido de cada ronda KO. El mapa
-- se indexa por match-key (la misma convención "{RONDA}_{LOCAL}_{VISITANTE}" que
-- usa el resto de la app) → equipo elegido. Por defecto un objeto vacío.
--
-- Las escrituras las hace el cliente con el JWT del usuario, así que las RLS
-- existentes de porra_jugadores (UPDATE solo del dueño: auth.uid() = user_id) ya
-- cubren esta columna sin cambios adicionales.
--
-- Migración forward-only e idempotente: no la edites una vez aplicada; añade otra
-- para cambios. `add column if not exists` la hace re-ejecutable sin error.

alter table public.porra_jugadores
  add column if not exists bracket_predictions jsonb not null default '{}'::jsonb;
