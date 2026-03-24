import { useNavigate } from 'react-router-dom';
import { recipes } from '../data/recipes';

export default function RecipeGrid() {
  const navigate = useNavigate();

  function handleCardClick(recipe) {
    navigate('/recipe', { state: { recipe } });
  }

  return (
    <section className="w-full max-w-lg mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onClick={() => handleCardClick(recipe)} />
        ))}
      </div>
    </section>
  );
}

function RecipeCard({ recipe, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-gray-100
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full"
    >
      {/* Image */}
      <div className="w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
      </div>

      {/* Text */}
      <div className="px-4 py-3 flex flex-col" style={{ minHeight: '6rem' }}>
        <p className="font-serif font-bold text-[#1a1a1a] text-base leading-snug mb-2">
          {recipe.title}
        </p>
        <p className="text-xs text-[#c8302a] font-semibold tracking-wide">
          From {recipe.source}
        </p>
      </div>
    </button>
  );
}
