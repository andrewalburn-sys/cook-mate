import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// ─── Media query hook ────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function TimerSetupModal({ onConfirm, onCancel }) {
  const isMobile = useIsMobile();
  return isMobile
    ? <MobileSheet onConfirm={onConfirm} onCancel={onCancel} />
    : <DesktopModal onConfirm={onConfirm} onCancel={onCancel} />;
}

// ─── Shared form state hook ───────────────────────────────────────────────────
function useTimerForm(onConfirm) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);

  function handleConfirm() {
    const totalSeconds = hours * 3600 + minutes * 60;
    if (totalSeconds === 0) return;
    onConfirm({ label: 'Timer', durationSeconds: totalSeconds });
  }

  return { hours, setHours, minutes, setMinutes, handleConfirm };
}

// ─── Desktop Modal ────────────────────────────────────────────────────────────
function DesktopModal({ onConfirm, onCancel }) {
  const { hours, setHours, minutes, setMinutes, handleConfirm } = useTimerForm(onConfirm);

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onMouseDown={onCancel}
    >
      {/* Modal panel — stop propagation so clicks inside don't close */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">Set a Timer</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-5">
          {/* Hours + Minutes spinners */}
          <div className="flex gap-4 justify-center">
            <NumberSpinner label="Hours" value={hours} onChange={setHours} min={0} max={23} />
            <div className="flex items-center pb-1 text-2xl font-bold text-gray-300 self-center mt-4">:</div>
            <NumberSpinner label="Minutes" value={minutes} onChange={setMinutes} min={0} max={59} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 hover:text-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={hours === 0 && minutes === 0}
              className="flex-1 py-3 rounded-xl bg-[#c8302a] hover:bg-[#a8251f] text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Number Spinner (desktop) ─────────────────────────────────────────────────
function NumberSpinner({ label, value, onChange, min, max }) {
  const intervalRef = useRef(null);

  const increment = useCallback(() => onChange((v) => Math.min(max, v + 1)), [max, onChange]);
  const decrement = useCallback(() => onChange((v) => Math.max(min, v - 1)), [min, onChange]);

  function startRepeat(fn) {
    fn();
    intervalRef.current = setInterval(fn, 120);
  }
  function stopRepeat() { clearInterval(intervalRef.current); }

  function handleInput(e) {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">{label}</span>
      <div className="flex flex-col items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#c8302a] transition-colors">
        <button
          type="button"
          onMouseDown={() => startRepeat(increment)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          className="w-16 h-10 flex items-center justify-center text-gray-400 hover:text-[#c8302a] hover:bg-gray-50 transition-colors select-none"
        >
          <ChevronUp />
        </button>
        <input
          type="number"
          value={String(value).padStart(2, '0')}
          onChange={handleInput}
          min={min}
          max={max}
          className="w-16 h-14 text-center text-2xl font-bold text-[#1a1a1a] border-y-2 border-gray-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onMouseDown={() => startRepeat(decrement)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          className="w-16 h-10 flex items-center justify-center text-gray-400 hover:text-[#c8302a] hover:bg-gray-50 transition-colors select-none"
        >
          <ChevronDown />
        </button>
      </div>
    </div>
  );
}

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────
function MobileSheet({ onConfirm, onCancel }) {
  const hoursWheelRef = useRef(null);
  const minutesWheelRef = useRef(null);
  const sheetRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(onCancel, 300);
  }

  function confirm() {
    const h = hoursWheelRef.current?.getValue() ?? 0;
    const m = minutesWheelRef.current?.getValue() ?? 5;
    const totalSeconds = h * 3600 + m * 60;
    if (totalSeconds === 0) return;
    onConfirm({ label: 'Timer', durationSeconds: totalSeconds });
  }

  // Swipe-down-to-dismiss on the drag handle
  const startYRef = useRef(null);
  const currentDeltaRef = useRef(0);

  function onHandleTouchStart(e) {
    startYRef.current = e.touches[0].clientY;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }
  function onHandleTouchMove(e) {
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
      currentDeltaRef.current = delta;
    }
  }
  function onHandleTouchEnd() {
    if (currentDeltaRef.current > 80) {
      dismiss();
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.25s ease';
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    currentDeltaRef.current = 0;
  }

  return (
    <div className="fixed inset-0 z-50" style={{ background: visible ? 'rgba(0,0,0,0.4)' : 'transparent', transition: 'background 0.3s' }}>
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '90vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="font-serif text-lg font-bold text-[#1a1a1a]">Set a Timer</span>
          <button onClick={dismiss} className="text-[#c8302a] font-semibold text-sm">Cancel</button>
        </div>

        <div className="flex flex-col gap-5 px-5 pt-5 pb-4 overflow-y-auto">
          {/* Spin wheels */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Hours</span>
              <SpinWheel ref={hoursWheelRef} defaultValue={0} min={0} max={23} />
            </div>
            <div className="text-2xl font-bold text-gray-300 mt-5">:</div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Minutes</span>
              <SpinWheel ref={minutesWheelRef} defaultValue={5} min={0} max={59} />
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={confirm}
            className="w-full py-4 rounded-2xl bg-[#c8302a] hover:bg-[#a8251f] text-white font-semibold text-base transition-colors"
          >
            Start Timer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Spin Wheel ───────────────────────────────────────────────────────────────
const SpinWheel = forwardRef(function SpinWheel({ defaultValue, min, max }, ref) {
  const scrollRef = useRef(null);
  const currentValueRef = useRef(defaultValue);
  const itemHeight = 48;
  const visibleItems = 5;
  const padding = Math.floor(visibleItems / 2); // 2 blank rows top and bottom

  const items = [];
  for (let i = min; i <= max; i++) items.push(i);

  useImperativeHandle(ref, () => ({
    getValue: () => currentValueRef.current,
  }));

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = (defaultValue - min) * itemHeight;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    currentValueRef.current = Math.max(min, Math.min(max, idx + min));
  }

  return (
    <div className="relative select-none" style={{ height: itemHeight * visibleItems, width: '100%' }}>
      {/* Selection highlight */}
      <div
        className="absolute left-2 right-2 rounded-xl pointer-events-none z-10"
        style={{
          top: itemHeight * padding,
          height: itemHeight,
          background: 'rgba(200,48,42,0.08)',
          border: '1.5px solid rgba(200,48,42,0.15)',
        }}
      />
      {/* Fade overlays */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{ background: 'linear-gradient(to bottom, white 0%, transparent 35%, transparent 65%, white 100%)' }}
      />
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingTop: itemHeight * padding,
          paddingBottom: itemHeight * padding,
        }}
      >
        {/* Hide webkit scrollbar */}
        <style>{`.spin-wheel-scroll::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item) => (
          <div
            key={item}
            style={{ height: itemHeight, scrollSnapAlign: 'center' }}
            className="flex items-center justify-center text-xl font-semibold text-[#1a1a1a]"
          >
            {String(item).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Icons ────────────────────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
    </svg>
  );
}
function ChevronUp() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
      <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
