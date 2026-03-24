// Thin proxy for OpenAI Realtime SDP exchange.
// The browser can't call api.openai.com directly due to CORS,
// so we forward the request server-side and return the SDP answer.
export const config = { runtime: 'nodejs', maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sdp, token } = req.body ?? {};
  if (!sdp || !token) return res.status(400).json({ error: 'Missing sdp or token' });

  try {
    const response = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI SDP error:', err);
      return res.status(502).json({ error: 'SDP exchange failed' });
    }

    const sdpAnswer = await response.text();
    return res.status(200).json({ sdpAnswer });
  } catch (err) {
    console.error('SDP proxy error:', err);
    return res.status(500).json({ error: 'SDP exchange failed' });
  }
}
