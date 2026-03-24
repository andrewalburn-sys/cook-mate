// Vercel Serverless Function — handles both session creation and SDP exchange
// server-side to avoid CORS issues with direct browser-to-OpenAI requests.
export const config = { runtime: 'nodejs' };

const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

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
    // Step 1: Create ephemeral session
    const sessionRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: 'shimmer',
        instructions: systemPrompt ?? 'You are a helpful cooking assistant.',
        modalities: ['audio', 'text'],
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
        tools: [
          {
            type: 'function',
            name: 'set_timer',
            description: 'Sets a visible countdown timer on screen for the user. Call this whenever the user asks to set a timer, or whenever a recipe step mentions a specific cooking time.',
            parameters: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description: 'A short descriptive label, e.g. "Simmer sauce" or "Boil pasta"',
                },
                durationSeconds: {
                  type: 'integer',
                  description: 'Timer duration in seconds',
                },
              },
              required: ['label', 'durationSeconds'],
            },
          },
        ],
        tool_choice: 'auto',
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      console.error('OpenAI session error:', err);
      return res.status(502).json({ error: 'Voice assistant unavailable. Please try again.' });
    }

    const session = await sessionRes.json();
    const clientSecret = session.client_secret?.value;
    if (!clientSecret) {
      return res.status(502).json({ error: 'Voice assistant unavailable. Please try again.' });
    }

    // Step 2: Exchange SDP offer for answer (server-side avoids CORS)
    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
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
