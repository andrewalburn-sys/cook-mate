import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import TimerCard from '../components/TimerCard';
import TimerSetupModal from '../components/TimerSetupModal';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useTimers } from '../hooks/useTimers';

export default function RecipePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const recipe = state?.recipe ?? null;

  const [showTimerModal, setShowTimerModal] = useState(false);
  const { status: voiceStatus, error: voiceError, voiceActivity, isMuted, toggleMute, start: startVoice, stop: stopVoice } = useVoiceAssistant();
  const { timers, addTimer, pauseTimer, resumeTimer, removeTimer } = useTimers();

  const isConnected = voiceStatus === 'connected';
  const isConnecting = voiceStatus === 'connecting';

  // Redirect home if no recipe was passed
  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No recipe loaded.</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-[#c8302a] text-white font-semibold text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  function handleStartCooking() {
    startVoice(recipe, ({ label, durationSeconds }) => {
      addTimer({ label, durationSeconds });
    });
  }

  function handleTimerConfirm({ label, durationSeconds }) {
    addTimer({ label, durationSeconds });
    setShowTimerModal(false);
  }

  function handleBack() {
    stopVoice();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes pill-ring-listen {
          0%   { transform: scale(1);    opacity: 0.55; }
          100% { transform: scale(1.16); opacity: 0; }
        }
        @keyframes pill-ring-speak {
          0%   { transform: scale(1);    opacity: 0.3; }
          100% { transform: scale(1.1);  opacity: 0; }
        }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-5 py-3 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="text-gray-400 hover:text-[#1a1a1a] transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span className="font-serif text-base font-bold text-[#1a1a1a] flex-1 truncate">
          {recipe.title}
        </span>
        <span className="text-xs font-semibold tracking-widest uppercase text-gray-400 hidden sm:block">
          CookMate
        </span>
      </header>

      {/* Recipe content */}
      <RecipeCard recipe={recipe} />

      {/* Floating timers */}
      {timers.length > 0 && (
        <div className="fixed bottom-28 right-4 z-40 flex flex-col gap-2 w-56">
          {timers.map((t) => (
            <TimerCard
              key={t.id}
              timer={t}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onRemove={removeTimer}
            />
          ))}
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">

          {isConnected || isConnecting ? (
            <>
              {/* Spacer — mirrors idle state to keep everything right-aligned */}
              <div className="flex-1" />

              {/* Timer */}
              <button
                onClick={() => setShowTimerModal(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-600 hover:text-[#1a1a1a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/>
                </svg>
                Timer
              </button>

              {/* Status pill */}
              <div className="relative flex items-center justify-center">
                {isConnected && !isMuted && (
                  <span className="absolute inset-0 rounded-full pointer-events-none" style={{ backgroundColor: '#c8302a', animation: voiceActivity === 'listening' ? 'pill-ring-listen 1.0s ease-out infinite' : voiceActivity === 'speaking' ? 'pill-ring-speak 2.4s ease-out infinite' : 'none' }} />
                )}
                <button
                  onClick={isConnected ? toggleMute : undefined}
                  disabled={isConnecting}
                  className={`relative flex items-center justify-center gap-3 px-6 py-3.5 rounded-full text-white font-semibold text-base transition-colors min-w-[168px] ${
                    isConnecting
                      ? 'bg-[#c8302a] opacity-75 cursor-default'
                      : isMuted
                      ? 'bg-gray-500 hover:bg-gray-600'
                      : 'bg-[#c8302a] hover:bg-[#a8251f]'
                  }`}
                >
                  {isConnecting ? (
                    <><Spinner /> Connecting…</>
                  ) : isMuted ? (
                    <><MicOffIcon /> Muted</>
                  ) : (
                    <><MicIcon /> Listening…</>
                  )}
                </button>
              </div>

              {/* End button */}
              <button
                onClick={stopVoice}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                <XIcon />
                End
              </button>
            </>
          ) : (
            <>
              {/* Idle state — unchanged */}
              <div className="flex-1" />
              <button
                onClick={() => setShowTimerModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-600 hover:text-[#1a1a1a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/>
                </svg>
                Timer
              </button>
              <button
                onClick={handleStartCooking}
                className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#c8302a] hover:bg-[#a8251f] text-white font-semibold text-base shadow-lg transition-colors"
              >
                <MicIcon /> Start Cooking
              </button>
            </>
          )}
        </div>

        {voiceError && (
          <p className="text-center text-xs text-[#c8302a] mt-2">{voiceError}</p>
        )}
      </div>

      {/* Timer setup modal / bottom sheet */}
      {showTimerModal && (
        <TimerSetupModal
          onConfirm={handleTimerConfirm}
          onCancel={() => setShowTimerModal(false)}
        />
      )}
    </div>
  );
}


function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="22" strokeLinecap="round"/>
      <line x1="8" y1="22" x2="16" y2="22" strokeLinecap="round"/>
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
      <path d="M18.89 13.23A7 7 0 0012 17a7 7 0 01-6.89-5.77" strokeLinecap="round"/>
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V6a3 3 0 00-5.94-.6" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="22" strokeLinecap="round"/>
      <line x1="8" y1="22" x2="16" y2="22" strokeLinecap="round"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
