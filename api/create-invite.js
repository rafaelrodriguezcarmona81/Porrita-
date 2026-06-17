import { timingSafeEqual, randomUUID } from 'node:crypto';

// Comparación en tiempo constante (mismo patrón que trigger-update).
function secretsMatch(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const INVITE_TTL_MS = 30 * 60 * 1000; // 30 minutos

// Genera un link de invitación. Solo el admin (que conoce ADMIN_TRIGGER_SECRET)
// puede llamarla. La invitación se guarda con service_role (la tabla está cerrada
// por RLS) y caduca a los 30 min; es multi-uso dentro de esa ventana.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminSecret = process.env.ADMIN_TRIGGER_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_TRIGGER_SECRET no configurado' });
  }
  if (!secretsMatch(req.headers['x-admin-secret'] || '', adminSecret)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado' });
  }

  const SB_URL = process.env.SUPABASE_URL || 'https://qkxenqexxdvpjnagsudk.supabase.co';
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  try {
    const r = await fetch(`${SB_URL}/rest/v1/invitaciones`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ token, expires_at: expiresAt }),
    });

    if (r.status >= 200 && r.status < 300) {
      return res.status(200).json({ ok: true, token, expires_at: expiresAt });
    }
    const detail = await r.text();
    return res.status(r.status).json({ error: 'Supabase error', detail });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: String(e) });
  }
}
