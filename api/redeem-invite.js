// Canjea una invitación: valida el token (existe y no caducado) y, si la sesión
// del usuario es válida, le da de alta como jugador (su fila en porra_jugadores).
// Multi-uso: cualquiera con un token válido dentro de la ventana entra; no se
// consume el token. Todo con service_role (RLS bloquea el alta desde el cliente).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE no configurado' });
  }

  const auth = req.headers['authorization'] || '';
  const userToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!userToken) {
    return res.status(401).json({ error: 'Falta sesión' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const token = (body && body.token) || '';
  if (!token) {
    return res.status(400).json({ error: 'Falta token de invitación' });
  }

  const SB_URL = process.env.SUPABASE_URL || 'https://qkxenqexxdvpjnagsudk.supabase.co';
  const svc = { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` };

  try {
    // 1. Verificar la sesión del usuario contra GoTrue.
    const uRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${userToken}` },
    });
    if (uRes.status !== 200) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }
    const user = await uRes.json();
    const userId = user.id;
    const nombre =
      (user.user_metadata && user.user_metadata.full_name) ||
      (user.email || '').split('@')[0] || 'Jugador';

    // 2. Validar la invitación (existe y no caducada).
    const iRes = await fetch(
      `${SB_URL}/rest/v1/invitaciones?token=eq.${encodeURIComponent(token)}&select=token,expires_at`,
      { headers: svc }
    );
    const invs = await iRes.json();
    const inv = Array.isArray(invs) && invs[0];
    if (!inv) {
      return res.status(403).json({ error: 'Invitación inválida' });
    }
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ error: 'Invitación caducada' });
    }

    // 3. Alta idempotente: si ya tiene fila, no creamos otra.
    const eRes = await fetch(
      `${SB_URL}/rest/v1/porra_jugadores?user_id=eq.${encodeURIComponent(userId)}&select=nombre`,
      { headers: svc }
    );
    const existing = await eRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(200).json({ ok: true, nombre: existing[0].nombre, alreadyMember: true });
    }

    const cRes = await fetch(`${SB_URL}/rest/v1/porra_jugadores`, {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ nombre, user_id: userId, group_predictions: {}, podium: null }),
    });
    if (cRes.status >= 200 && cRes.status < 300) {
      return res.status(200).json({ ok: true, nombre });
    }
    const detail = await cRes.text();
    return res.status(cRes.status).json({ error: 'No se pudo crear el jugador', detail });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: String(e) });
  }
}
