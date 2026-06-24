import { timingSafeEqual } from 'node:crypto';

// Comparación en tiempo constante (mismo patrón que create-invite / trigger-update).
function secretsMatch(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Da de baja a un jugador: borra su fila de porra_jugadores. Solo el admin (que
// conoce ADMIN_TRIGGER_SECRET) puede llamarla. El borrado se hace con service_role
// (RLS no permite DELETE desde el cliente). NO se borra el usuario de Supabase Auth
// (auth.users); si volviera entraría por renderAccessDenied, que es lo correcto.
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

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const userId = (body && body.user_id) || '';
  if (!userId) {
    return res.status(400).json({ error: 'Falta user_id' });
  }

  const SB_URL = process.env.SUPABASE_URL || 'https://qkxenqexxdvpjnagsudk.supabase.co';

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/porra_jugadores?user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      }
    );

    if (r.status < 200 || r.status >= 300) {
      const detail = await r.text();
      return res.status(r.status).json({ error: 'Supabase error', detail });
    }

    const deleted = await r.json().catch(() => []);
    if (!Array.isArray(deleted) || deleted.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    return res.status(200).json({ ok: true, nombre: deleted[0].nombre });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: String(e) });
  }
}
