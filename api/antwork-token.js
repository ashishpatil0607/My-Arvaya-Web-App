import { requestAntworkToken } from './_antworkToken.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, body } = await requestAntworkToken(process.env);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(body);
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Token service unreachable' });
  }
}
