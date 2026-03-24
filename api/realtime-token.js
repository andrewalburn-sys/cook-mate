// Vercel Serverless Function — generates a short-lived ephemeral token
// for the OpenAI Realtime API so the API key never leaves the server.
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt } = req.body ?? {};

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
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

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI session error:', err);
      return res.status(502).json({ error: 'Voice assistant unavailable. Please try again.' });
    }

    const session = await response.json();
    console.log('[realtime-token] expires_at:', session.expires_at, 'client_secret expires_at:', session.client_secret?.expires_at);
    // Return only what the client needs
    return res.status(200).json({
      client_secret: session.client_secret,
      session_id: session.id,
    });
  } catch (err) {
    console.error('Realtime token error:', err);
    return res.status(500).json({ error: 'Voice assistant unavailable. Please try again.' });
  }
}
