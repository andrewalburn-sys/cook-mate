// Vercel Serverless Function — handles both session creation and SDP exchange
// server-side to avoid CORS issues with direct browser-to-OpenAI requests.
export const config = { runtime: 'nodejs', maxDuration: 30 };

const MODEL = 'gpt-realtime-2025-08-28';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sdpOffer, systemPrompt } = req.body ?? {};

  if (!sdpOffer) {
    return res.status(400).json({ error: 'Missing SDP offer' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Skip ephemeral session creation — use API key directly for SDP exchange.
    // The session will be configured via session.update after the data channel opens.
    console.log('[realtime-connect] exchanging SDP with API key directly, model:', MODEL);
    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    });

    if (!sdpRes.ok) {
      const err = await sdpRes.text();
      console.error('SDP exchange error:', err);
      return res.status(502).json({ error: 'Voice assistant unavailable. Please try again.' });
    }

    const sdpAnswer = await sdpRes.text();
    return res.status(200).json({ sdpAnswer });

  } catch (err) {
    console.error('Realtime connect error:', err);
    return res.status(500).json({ error: 'Voice assistant unavailable. Please try again.' });
  }
}
