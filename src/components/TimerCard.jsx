import { useEffect, useState } from 'react';

export default function TimerCard({ timer, onPause, onResume, onRemove }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (timer.status === 'completed') {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [timer.status]);

  const { m, s } = secondsToParts(timer.remainingSeconds);
  const isCompleted = timer.status === 'completed';
  const isPaused = timer.status === 'paused';

  return (
    <div
      className={`rounded-2xl px-4 py-3 shadow-lg border flex items-center gap-3 transition-all
        ${flash ? 'bg-[#fdf0ef] border-[#c8302a]' : isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}
    >
      {/* Status dot */}
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0
          ${isCompleted ? 'bg-green-400' : isPaused ? 'bg-gray-300' : 'bg-[#c8302a]'}`}
      />

      {/* Label + time */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 truncate leading-tight">
          {timer.label}
        </p>
        <p className={`font-serif text-xl font-bold tabular-nums leading-tight
          ${isCompleted ? 'text-green-600' : 'text-[#1a1a1a]'}`}
        >
          {isCompleted ? 'Done!' : `${pad(m)}:${pad(s)}`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {!isCompleted && (
          <button
            onClick={() => isPaused ? onResume(timer.id) : onPause(timer.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm"
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        )}
        <button
          onClick={() => onRemove(timer.id)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors text-xs"
          aria-label="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function secondsToParts(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return { m, s };
}

function pad(n) {
  return String(n).padStart(2, '0');
}
