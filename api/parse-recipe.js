// Vercel Serverless Function — extracts a recipe from any URL using:
// 1. Jina AI Reader to fetch clean page content (handles JS-rendered sites)
// 2. GPT-4o to extract structured recipe JSON from that content
//
// AllRecipes blocks all automated access at the network level — it is a known
// industry limitation. This function works with most other recipe sites.

import { v4 as uuidv4 } from 'uuid';

export const config = { runtime: 'nodejs' };

const ALLRECIPES_HOSTS = ['www.allrecipes.com', 'allrecipes.com'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body ?? {};

  if (!url || !isValidRecipeUrl(url)) {
    return res.status(400).json({ error: 'Please paste a valid recipe URL' });
  }

  if (isAllRecipesUrl(url)) {
    return res.status(422).json({
      error: 'AllRecipes blocks all automated access — try the same recipe on Simply Recipes, Serious Eats, Food Network, or Epicurious.',
    });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  // ── Step 1: Fetch page content + OG image in parallel ──────────────────
  let pageContent = '';
  let ogImage = null;

  try {
    const [jinaRes, ogRes] = await Promise.all([
      fetch(`https://r.jina.ai/${url}`, {
        headers: {
          Accept: 'text/plain',
          'X-Timeout': '20',
          'X-Remove-Selector': 'nav, footer, header, .comments, .related, .sidebar',
        },
      }),
      // Fetch just enough HTML to grab Open Graph meta tags from the <head>
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1)',
          Accept: 'text/html',
        },
      }).catch(() => null), // non-fatal — OG image is a bonus
    ]);

    if (!jinaRes.ok) throw new Error(`Jina ${jinaRes.status}`);
    pageContent = await jinaRes.text();

    if (ogRes?.ok) {
      const html = await ogRes.text();
      ogImage = extractOgImage(html);
    }
  } catch (err) {
    console.error('Jina fetch error:', err);
    return res.status(502).json({ error: "Couldn't load this page. Check the URL and try again." });
  }

  // Check we got enough content to work with
  console.log(`[parse-recipe] Jina content length: ${pageContent.length} for ${url}`);
  if (pageContent.length < 500) {
    console.log(`[parse-recipe] Jina short content preview: ${pageContent.slice(0, 300)}`);
    // Fallback: fetch the page directly and extract JSON-LD recipe data
    console.log(`[parse-recipe] Trying direct fetch fallback for ${url}`);
    try {
      const directRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (directRes.ok) {
        const html = await directRes.text();
        // Extract JSON-LD blocks which contain structured recipe data
        const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        const jsonLdContent = jsonLdMatches.map(m => m[1]).join('\n');
        if (jsonLdContent.length > 200) {
          console.log(`[parse-recipe] Direct fetch JSON-LD found: ${jsonLdContent.length} chars`);
          pageContent = jsonLdContent;
        } else {
          console.log(`[parse-recipe] Direct fetch HTML length: ${html.length}`);
          pageContent = html.slice(0, 20000);
        }
      }
    } catch (err) {
      console.error(`[parse-recipe] Direct fetch fallback failed:`, err);
    }
    if (pageContent.length < 200) {
      return res.status(422).json({ error: "Couldn't load this recipe. Try another URL." });
    }
  }

  // Trim to avoid excessive token usage — use full content up to 40000 chars
  const trimmedContent = pageContent.slice(0, 40000);

  // ── Step 2: GPT-4o extracts structured recipe JSON ──────────────────────
  let recipe;
  try {
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are a recipe extraction assistant. Given the raw text content of a recipe web page, extract the recipe and return it as a JSON object.
Return ONLY the raw JSON — no markdown, no code fences, no explanation.

Use this exact schema:
{
  "title": "string",
  "description": "one or two sentence description, or empty string",
  "image": "full image URL found in the content, or null",
  "prepTime": "e.g. 15 min, or null",
  "cookTime": "e.g. 30 min, or null",
  "totalTime": "e.g. 45 min, or null",
  "servings": "e.g. 4 servings, or null",
  "author": "author name, or null",
  "ingredients": [
    { "raw": "full ingredient string exactly as written" }
  ],
  "steps": [
    { "step": 1, "instruction": "full instruction text" }
  ]
}

If you cannot find a complete recipe in the content, return: {"error": "No recipe found"}`,
          },
          {
            role: 'user',
            content: `Extract the recipe from this page content:\n\n${trimmedContent}`,
          },
        ],
      }),
    });

    if (!gptRes.ok) {
      const err = await gptRes.text();
      console.error('GPT error:', gptRes.status, err);
      throw new Error(`GPT ${gptRes.status}`);
    }

    const gptData = await gptRes.json();
    const rawText = gptData.choices?.[0]?.message?.content ?? '';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    recipe = JSON.parse(cleaned);

    if (recipe.error) {
      console.error(`[parse-recipe] GPT found no recipe for ${url}. Content length: ${trimmedContent.length}. Preview: ${trimmedContent.slice(0, 300)}`);
      return res.status(422).json({ error: "Couldn't find a recipe on that page. Try a direct recipe URL." });
    }
  } catch (err) {
    console.error('GPT extraction error:', err);
    return res.status(502).json({ error: "Couldn't extract the recipe. Try another URL." });
  }

  return res.status(200).json({
    id: uuidv4(),
    url,
    fetchedAt: new Date().toISOString(),
    ...recipe,
    // OG image wins — it's the canonical social-share image and always loads
    image: ogImage ?? recipe.image ?? null,
  });
}

function isValidRecipeUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Extracts og:image (or twitter:image fallback) from raw HTML
function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isAllRecipesUrl(url) {
  try {
    const { hostname } = new URL(url);
    return ALLRECIPES_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
