import { useRef, useState, useCallback } from 'react';

/**
 * Manages a WebRTC connection to the OpenAI Realtime API using an ephemeral token.
 *
 * Returns:
 *   status: 'idle' | 'connecting' | 'connected' | 'error'
 *   start(recipe, onTimerCommand) — activates mic and opens the session
 *   stop() — closes everything cleanly
 *   error: string | null
 */
export function useVoiceAssistant() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  // 'idle' | 'listening' | 'speaking'
  const [voiceActivity, setVoiceActivity] = useState('idle');

  const pcRef = useRef(null);       // RTCPeerConnection
  const dcRef = useRef(null);       // RTCDataChannel
  const streamRef = useRef(null);   // local microphone MediaStream
  const audioElRef = useRef(null);  // audio element for AI speech

  const stop = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    setStatus('idle');
    setError(null);
    setVoiceActivity('idle');
  }, []);

  const start = useCallback(async (recipe, onTimerCommand) => {
    stop();
    setStatus('connecting');
    setError(null);

    // 1. Get microphone access
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError('Microphone access denied. Please enable your microphone and try again.');
      setStatus('error');
      return;
    }

    // 2. Fetch ephemeral token from our serverless function
    let clientSecret;
    try {
      const systemPrompt = buildSystemPrompt(recipe);
      const res = await fetch('/api/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      clientSecret = data.client_secret?.value;
      if (!clientSecret) throw new Error('No client secret returned');
    } catch (err) {
      console.error('Token error:', err);
      setError('Voice assistant unavailable. Please try again.');
      setStatus('error');
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    // 3. Set up WebRTC peer connection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Receive AI audio and play it
    // Attach to DOM so browser autoplay policy is satisfied on HTTPS
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    audioElRef.current = audioEl;
    pc.ontrack = (e) => {
      console.log('[audio] track received');
      audioEl.srcObject = e.streams[0];
      audioEl.play().catch((err) => console.error('[audio] play blocked:', err));
    };

    // Send mic audio to OpenAI
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 4. Open a data channel for events (function calls, transcripts, etc.)
    const dc = pc.createDataChannel('oai-events');
    dcRef.current = dc;

    dc.onopen = () => {
      console.log('[dc] data channel opened');
      dc.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: '(cooking session started)' }],
        },
      }));
      dc.send(JSON.stringify({ type: 'response.create' }));
    };

    dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        console.log('[dc msg]', event.type, event.error ?? '');
        // Track listening vs speaking state
        if (event.type === 'input_audio_buffer.speech_started') setVoiceActivity('listening');
        if (event.type === 'input_audio_buffer.speech_stopped') setVoiceActivity('idle');
        if (event.type === 'response.created') setVoiceActivity('speaking');
        if (event.type === 'response.done') setVoiceActivity('idle');
        handleRealtimeEvent(event, dc, onTimerCommand);
      } catch {
        // ignore parse errors
      }
    };

    // 5. Create SDP offer and proxy through our server to avoid CORS
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    try {
      const sdpRes = await fetch(
        '/openai-realtime?model=gpt-4o-realtime-preview',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );
      if (!sdpRes.ok) throw new Error(`SDP ${sdpRes.status}`);
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      console.error('SDP error:', err);
      setError('Voice assistant unavailable. Please try again.');
      setStatus('error');
      stop();
      return;
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setStatus('idle');
      }
    };

    setStatus('connected');
  }, [stop]);

  return { status, error, voiceActivity, start, stop };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(recipe) {
  const ingredients = recipe.ingredients.map((i) => `- ${i.raw}`).join('\n');
  const steps = recipe.steps.map((s) => `${s.step}. ${s.instruction}`).join('\n');

  return `You are a knowledgeable, calm cooking assistant. You have read the full recipe below and understand it completely — ingredients, prep work, steps, timing, and potential trouble spots. You never volunteer information unprompted. You wait for the user to ask.

ON ACTIVATION:
When the session starts, give a single smart opening line tailored to this specific recipe. Acknowledge the dish by name and give the user one genuinely useful heads-up about this particular recipe — for example, if it has long marinating time, heavy prep, a tricky technique, or anything that would genuinely help them prepare mentally. Then stop and wait. Do not ask a question. Do not list steps. Just one helpful observation, then let them lead.

Examples of the tone and format:
- "This one takes about 2.5 hours start to finish — most of that is hands-off simmer time. What do you need?"
- "Carbonara moves fast once you start — worth having everything prepped and measured before you turn on the heat. What do you need?"

COOKING STAGES — understand and respond to each naturally:
- Ingredient prep: if the user asks about chopping, measuring, substitutions, or getting ingredients ready, answer that specifically without pushing them toward cooking steps
- Active cooking: if the user is mid-cook and asks what's next or how to handle something, answer for that moment only — not the whole remaining recipe
- Troubleshooting: if something has gone wrong, focus entirely on fixing it before anything else

CORE BEHAVIOR RULES:
- Never read out steps unprompted
- Never ask "are you ready for the next step?"
- Never assume the user is at any particular stage unless they've told you
- Match the user's energy — if they're asking quick questions, give quick answers
- Keep all responses short and spoken-word friendly — no bullet points, no lists, no headers. This is a voice assistant.

RECIPE SEQUENCING INTELLIGENCE:
When a user asks how to get started, what to do first, or any variation of beginning the recipe, scan the full recipe for steps that require significant lead time or parallel preparation that would not be obvious from reading the steps in order. This includes: water that needs to come to a boil, ovens that need to preheat, marinades or resting times, items that need to be at room temperature, or any long-running passive step that should be started before an active step earlier in the recipe.
If any are found, flag them upfront in a single natural spoken sentence before anything else. Keep it brief and practical — like a real sous chef giving a heads up.
Example: "Before you start the sauce, get a large pot of salted water on to boil — you'll need it for the pasta in step 3."
If there are no parallel or lead-time steps to flag, skip this and answer the question normally.
This is the only exception to the rule of not volunteering information unprompted. For all other questions remain fully reactive.

TIMERS:
When the user asks you to set a timer, or when a recipe step involves a specific time, call the set_timer function. Always confirm verbally after calling it.

RECIPE:
---
Title: ${recipe.title}
${recipe.prepTime ? `Prep time: ${recipe.prepTime}` : ''}
${recipe.cookTime ? `Cook time: ${recipe.cookTime}` : ''}
${recipe.totalTime ? `Total time: ${recipe.totalTime}` : ''}
${recipe.servings ? `Servings: ${recipe.servings}` : ''}

INGREDIENTS:
${ingredients}

STEPS:
${steps}
---`;
}

function handleRealtimeEvent(event, dc, onTimerCommand) {
  // The Realtime API emits this when a function call is fully formed
  if (event.type === 'response.output_item.done' && event.item?.type === 'function_call') {
    const { name, arguments: argsJson, call_id } = event.item;

    if (name === 'set_timer') {
      let args;
      try {
        args = JSON.parse(argsJson);
      } catch {
        return;
      }

      // Trigger the timer in the UI
      onTimerCommand?.({
        label: args.label ?? 'Timer',
        durationSeconds: args.durationSeconds ?? 60,
      });

      // Send the function result back so the model can verbally confirm
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id,
            output: JSON.stringify({ success: true }),
          },
        }));
        dc.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  }
}
