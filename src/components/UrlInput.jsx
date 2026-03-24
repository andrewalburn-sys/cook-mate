import { useState } from 'react';

export default function UrlInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const url = value.trim();
    if (!url) {
      setError('Please paste a recipe URL to continue.');
      return;
    }
    onSubmit(url);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-lg">

        {/* Wordmark */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gray-400 mb-3">
            Hands-free
          </p>
          <h1 className="font-serif text-5xl font-bold text-[#1a1a1a] leading-tight">
            CookMate
          </h1>
          <div className="mt-4 mx-auto w-12 h-px bg-[#c8302a]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="Paste a recipe URL to get started"
            disabled={loading}
            className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-[#1a1a1a] text-base
              placeholder:text-gray-400 focus:outline-none focus:border-[#c8302a]
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold text-base text-white
              bg-[#c8302a] hover:bg-[#a8251f] transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Spinner />
                Loading recipe…
              </>
            ) : (
              'Load Recipe'
            )}
          </button>
        </form>

        {/* Helper / error text */}
        {error ? (
          <p className="mt-4 text-sm text-[#c8302a] text-center">{error}</p>
        ) : (
          <p className="mt-4 text-sm text-gray-400 text-center">
            Works with Simply Recipes, Food & Wine, Serious Eats & more
          </p>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
