const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'storingen';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function supabaseFetch(path, opties = {}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, opties);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase fout ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export default async function handler(req, res) {
  if (!isConfigured()) {
    return send(res, 501, { error: 'Supabase is nog niet geconfigureerd voor gedeelde opslag.' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await supabaseFetch(`${TABLE}?select=*&order=geplande_datum.asc.nullslast,datum.desc`, {
        method: 'GET',
        headers: supabaseHeaders(),
      });
      return send(res, 200, { storingen: rows || [] });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const rows = await supabaseFetch(TABLE, {
        method: 'POST',
        headers: supabaseHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(body),
      });
      return send(res, 200, { storing: rows?.[0] || null });
    }

    if (req.method === 'PATCH') {
      const id = req.query?.id;
      if (!id) return send(res, 400, { error: 'Ontbrekend storing-id.' });
      const body = await readBody(req);
      const rows = await supabaseFetch(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: supabaseHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(body),
      });
      return send(res, 200, { storing: rows?.[0] || null });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) return send(res, 400, { error: 'Ontbrekend storing-id.' });
      await supabaseFetch(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: supabaseHeaders(),
      });
      return send(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return send(res, 405, { error: 'Methode niet toegestaan.' });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Onbekende serverfout.' });
  }
}
