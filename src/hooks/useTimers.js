import { useRef, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages multiple simultaneous countdown timers.
 *
 * Returns:
 *   timers: Timer[]
 *   addTimer({ label, durationSeconds }) → id
 *   pauseTimer(id)
 *   resumeTimer(id)
 *   removeTimer(id)
 */
export function useTimers() {
  const [timers, setTimers] = useState([]);
  const intervalRef = useRef(null);

  // Tick every second for running timers
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (t.status !== 'running') return t;
          const remaining = t.remainingSeconds - 1;
          if (remaining <= 0) {
            playAlert();
            return { ...t, remainingSeconds: 0, status: 'completed' };
          }
          return { ...t, remainingSeconds: remaining };
        })
      );
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const addTimer = useCallback(({ label, durationSeconds }) => {
    const id = uuidv4();
    setTimers((prev) => [
      ...prev,
      { id, label, durationSeconds, remainingSeconds: durationSeconds, status: 'running' },
    ]);
    return id;
  }, []);

  const pauseTimer = useCallback((id) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id && t.status === 'running' ? { ...t, status: 'paused' } : t))
    );
  }, []);

  const resumeTimer = useCallback((id) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id && t.status === 'paused' ? { ...t, status: 'running' } : t))
    );
  }, []);

  const removeTimer = useCallback((id) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { timers, addTimer, pauseTimer, resumeTimer, removeTimer };
}

function playAlert() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.2);
  } catch {
    // Audio context may not be available — visual flash fallback handled in UI
  }
}
