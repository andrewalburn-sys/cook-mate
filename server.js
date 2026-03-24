// Local dev server for Vercel-style API routes
// Run with: node server.js
// Vite proxies /api/* to this on port 3001

import { config } from 'dotenv';
config({ path: '.env.local' });
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PORT = 3001;

// Dynamically import API handlers
async function getHandler(route) {
  const mod = await import(`./api/${route}.js?t=${Date.now()}`);
  return mod.default;
}

// Minimal req/res shim to match Vercel's handler signature
function createShim(req, body) {
  req.body = body;
  return req;
}

function createResShim(res) {
  let statusCode = 200;
  const shim = {
    status(code) { statusCode = code; return shim; },
    json(data) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    },
    send(data) {
      res.writeHead(statusCode, { 'Access-Control-Allow-Origin': '*' });
      res.end(data);
    },
  };
  return shim;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const routeMatch = url.pathname.match(/^\/api\/(.+)$/);
  if (!routeMatch) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const route = routeMatch[1];
  let body = {};
  if (req.method === 'POST') {
    const raw = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
    });
    try { body = JSON.parse(raw); } catch { body = {}; }
  }

  try {
    const handler = await getHandler(route);
    createShim(req, body);
    await handler(req, createResShim(res));
  } catch (err) {
    console.error(`[${route}] Error:`, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
