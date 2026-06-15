export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
