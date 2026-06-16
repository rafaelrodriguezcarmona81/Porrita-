import { timingSafeEqual } from 'node:crypto';

// Comparación en tiempo constante (evita fuga por timing). timingSafeEqual exige
// buffers de la misma longitud, así que comprobamos longitud antes.
function secretsMatch(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protección: solo quien conozca el secreto de admin puede disparar la Action.
  const adminSecret = process.env.ADMIN_TRIGGER_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_TRIGGER_SECRET no configurado' });
  }
  // El cliente envía la cabecera "X-Admin-Secret"; Node/Vercel normaliza las
  // claves de las cabeceras entrantes a minúsculas, de ahí "x-admin-secret".
  if (!secretsMatch(req.headers['x-admin-secret'] || '', adminSecret)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Modo "solo verificar": valida la clave (para desbloquear el panel) sin
  // disparar la Action. La cabecera ya pasó la comprobación del secreto arriba.
  if (req.headers['x-verify-only'] === '1') {
    return res.status(200).json({ ok: true, verified: true });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN no configurado' });
  }

  const OWNER = 'rafaelrodriguezcarmona81';
  const REPO = 'Porrita-';
  const WORKFLOW_FILE = 'update-results.yml';
  const REF = 'main';

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: REF }),
      }
    );

    if (ghRes.status === 204) {
      return res.status(200).json({ ok: true, message: 'Action disparada correctamente' });
    }

    const errText = await ghRes.text();
    return res.status(ghRes.status).json({ error: 'GitHub API error', detail: errText });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno', detail: String(e) });
  }
}
