-- ─────────────────────────────────────────────────────────────────────────────
-- Invitaciones (acceso solo por enlace generado por el admin)
-- ─────────────────────────────────────────────────────────────────────────────
-- El admin genera tokens (uuid) con caducidad a 30 min vía /api/create-invite.
-- Cualquiera con un token válido dentro de la ventana puede canjearlo (multi-uso)
-- en /api/redeem-invite, que le da de alta como jugador.
--
-- La tabla está CERRADA por RLS: ni anon ni authenticated pueden tocarla. Solo el
-- service_role (que ignora RLS) la usa desde los endpoints serverless. Así nadie
-- puede forjar ni listar invitaciones desde el cliente.
--
-- CÓMO APLICAR (Supabase → SQL Editor): pega y ejecuta. Requiere también haber
-- aplicado db/rls.sql, y configurar SUPABASE_SERVICE_ROLE (y SUPABASE_URL) como
-- variables de entorno en Vercel.

create table if not exists public.invitaciones (
  token uuid primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Índice para purgar/consultar por caducidad si hace falta.
create index if not exists invitaciones_expires_at_idx on public.invitaciones (expires_at);

alter table public.invitaciones enable row level security;
-- Sin ninguna policy → anon y authenticated no tienen acceso. Solo service_role.
