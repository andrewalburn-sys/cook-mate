import { useState } from 'react';

export default function RecipeCard({ recipe }) {
  const [checked, setChecked] = useState({});

  function toggleIngredient(i) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <article className="max-w-4xl mx-auto pb-40">

      <div className="px-5 sm:px-8 pt-8">

        {/* Author */}
        {recipe.author && (
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
            {recipe.author}
          </p>
        )}

        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1a1a1a] leading-tight mb-5">
          {recipe.title}
        </h1>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-4 mb-6">
          {recipe.prepTime && <MetaPill label="Prep" value={recipe.prepTime} />}
          {recipe.cookTime && <MetaPill label="Cook" value={recipe.cookTime} />}
          {recipe.totalTime && <MetaPill label="Total" value={recipe.totalTime} />}
          {recipe.servings && <MetaPill label="Servings" value={recipe.servings} />}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-8" />

        {/* Description */}
        {recipe.description && (
          <p className="text-base text-gray-600 leading-relaxed mb-10 max-w-2xl">
            {recipe.description}
          </p>
        )}

        {/* Two-column body */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] gap-10">

          {/* Ingredients */}
          <section>
            <h2 className="font-serif text-xl font-bold text-[#1a1a1a] mb-5">
              Ingredients
            </h2>
            <ul className="space-y-3">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  <button
                    onClick={() => toggleIngredient(i)}
                    className="flex items-start gap-3 text-left w-full group"
                  >
                    {/* Checkbox */}
                    <span
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${checked[i]
                          ? 'border-[#c8302a] bg-[#c8302a]'
                          : 'border-gray-300 group-hover:border-[#c8302a]'
                        }`}
                    >
                      {checked[i] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-base leading-snug transition-colors
                        ${checked[i] ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}
                    >
                      {ing.raw}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Instructions */}
          <section>
            <h2 className="font-serif text-xl font-bold text-[#1a1a1a] mb-5">
              Instructions
            </h2>
            <ol className="space-y-8">
              {recipe.steps.map((s) => (
                <li key={s.step} className="flex gap-5">
                  <span className="font-serif text-2xl font-bold text-[#c8302a] flex-shrink-0 leading-tight mt-0.5">
                    {s.step}
                  </span>
                  <p className="text-base text-[#1a1a1a] leading-relaxed">{s.instruction}</p>
                </li>
              ))}
            </ol>
          </section>

        </div>
      </div>
    </article>
  );
}

function MetaPill({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-[#1a1a1a] mt-0.5">{value}</span>
    </div>
  );
}
