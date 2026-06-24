-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security para `porra_jugadores`  (F1/F3)
-- ─────────────────────────────────────────────────────────────────────────────
-- La `anon key` de la app es pública: sin RLS, cualquiera puede leer/alterar/
-- borrar la tabla con un simple curl. Estas políticas cierran las escrituras y
-- exigen sesión para leer. Las escrituras de la app ya viajan con el JWT del
-- usuario (Authorization: Bearer <access_token>), así que `auth.uid()` funciona.
--
-- Migración forward-only: se aplica sola al mergear a main (workflow "DB
-- migrations"). No la edites una vez aplicada; para cambios, añade otra migración.
--
-- ⚠️ SECUENCIA: debe llegar a main JUNTO con el backend de invitaciones (mismo
-- merge). Con RLS activa, el alta de jugadores deja de poder hacerse desde el
-- cliente (es el objetivo); el alta legítima pasa a server-side
-- (/api/redeem-invite con service_role). Sin ese backend desplegado, nadie nuevo
-- podría darse de alta.

alter table public.porra_jugadores enable row level security;

-- ¿El usuario actual ya es miembro (tiene fila)? Se usa en la policy de SELECT.
-- Es SECURITY DEFINER (corre como el owner, que ignora RLS) para que la consulta
-- a porra_jugadores NO recursione contra su propia policy. `search_path=''` →
-- todo cualificado. La membresía solo la crea /api/redeem-invite (service_role).
create or replace function public.es_miembro()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1 from public.porra_jugadores where user_id = auth.uid()
  );
$$;
grant execute on function public.es_miembro() to authenticated;

-- Limpieza idempotente (por si se re-ejecuta).
drop policy if exists jugadores_select on public.porra_jugadores;
drop policy if exists jugadores_update_own on public.porra_jugadores;

-- ── LECTURA: solo miembros (invite-only de verdad) ──────────────────────────────
-- Un usuario solo ve la clasificación si ya es miembro (fue dado de alta por una
-- invitación). Estar meramente autenticado (p. ej. login Google abierto) NO basta.
create policy jugadores_select
  on public.porra_jugadores for select
  to authenticated
  using (public.es_miembro());

-- ── ESCRITURA: solo el dueño edita su propia fila ───────────────────────────────
create policy jugadores_update_own
  on public.porra_jugadores for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT: sin policy para anon/authenticated → bloqueado desde el cliente.
--         El alta se hace server-side (service_role) al canjear invitación (#3).
-- DELETE: sin policy → bloqueado para todos los roles de cliente.
-- anon:   sin ninguna policy → sin lectura ni escritura.
-- service_role (serverless): ignora RLS por diseño → puede dar de alta y vincular.
