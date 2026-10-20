/*
 * Page-view tracker. Receives a tiny {path, source, ref} POST from
 * assets/site.js on each unique page view per session, and increments
 * aggregate counters in data/visits.json via the GitHub Contents API.
 *
 * File shape (persisted in the repo):
 *   {
 *     "days": {
 *       "2026-10-20": {
 *         "total":    123,
 *         "pages":    { "/": 42, "/articles": 11, ... },
 *         "sources":  { "google": 70, "direct": 20, "linkedin": 8, ... },
 *         "countries":{ "NL": 50, "KE": 20, "US": 15, ... },
 *         "hours":    { "0":2, "1":1, ..., "23":4 }
 *       }
 *     }
 *   }
 *
 * SETUP: reuses SUBSCRIBER_GITHUB_TOKEN (Contents: Read/Write on this repo).
 *
 * Writing-each-hit note: one visit = one commit, same pattern as subscribers.
 * Client-side we only fire once per (page, session), which caps the write
 * rate at roughly one commit per unique page view per visitor session.
 * If the file is being written concurrently we retry up to 4 times with
 * jitter, using the sha returned by the previous GET for optimistic lock.
 */

const REPO   = 'marcelkempers96/transitions-lab';
const PATH   = 'data/visits.json';
const BRANCH = 'main';
const API    = 'https://api.github.com';
const UA     = 'transitionslab-track/1.0';

// Which hostnames are allowed to call this endpoint. Prevents the tracker
// from being used to spam the counter from random origins.
const ALLOWED_HOSTS = new Set([
  'transitionslab.org',
  'www.transitionslab.org',
  'localhost',
  '127.0.0.1',
]);

// Known sources we normalise client-side get kept; anything else is folded
// into an "other" bucket so one random referrer can't bloat the file.
const KNOWN_SOURCES = new Set([
  'direct','google','bing','duckduckgo','yahoo','ecosia','brave',
  'twitter','linkedin','facebook','reddit','substack','youtube',
  'github','hackernews','medium','mastodon','bluesky','threads',
  'instagram','whatsapp','telegram','email','rss','internal',
]);

function cors(res, origin){
  // Only reflect our own origins; everything else gets no CORS header
  // and the preflight fails, which is the point.
  if (origin && allowedOrigin(origin)){
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function allowedOrigin(originStr){
  try {
    const h = new URL(originStr).hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(h)) return true;
    // Vercel preview deploys: *.vercel.app
    if (/\.vercel\.app$/.test(h)) return true;
    return false;
  } catch(_){ return false; }
}

async function readBody(req){
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch(_){} }
  return await new Promise((resolve) => {
    let data = '';
    let bytes = 0;
    req.on('data', c => {
      bytes += c.length;
      if (bytes > 4096) { try { req.destroy(); } catch(_){} resolve({}); return; }
      data += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch(_){ resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function cleanPath(raw){
  if (typeof raw !== 'string') return '/';
  let p = raw.trim();
  if (!p || p[0] !== '/') return '/';
  // Strip query/hash, cap length, drop obvious junk.
  p = p.split('#')[0].split('?')[0];
  if (p.length > 200) p = p.slice(0, 200);
  // Normalise trailing slash except for root.
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');
  return p || '/';
}

function cleanSource(raw){
  if (typeof raw !== 'string') return 'direct';
  const s = raw.trim().toLowerCase().slice(0, 60);
  if (!s) return 'direct';
  if (KNOWN_SOURCES.has(s)) return s;
  // If it looks like a hostname, keep up to the first dot — "mymag.co.uk"
  // becomes "mymag.co.uk" (fine), random strings get bucketed to "other".
  if (/^[a-z0-9.\-]{3,60}$/.test(s) && s.includes('.')) return s;
  return 'other';
}

function todayUTC(){
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function hourUTC(){
  return String(new Date().getUTCHours());
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req, res){
  const origin = req.headers.origin || '';
  cors(res, origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({error:'POST only'});

  // Origin check. Beacons from the real site set Origin on cross-origin
  // POSTs; same-origin may omit it, which is fine on Vercel because the
  // request also comes through our own domain. We only reject when
  // Origin is set AND points somewhere else.
  if (origin && !allowedOrigin(origin)){
    return res.status(403).json({error:'origin not allowed'});
  }

  const token = process.env.SUBSCRIBER_GITHUB_TOKEN;
  if (!token) return res.status(500).json({error:'store not configured'});

  const body = await readBody(req);
  const path    = cleanPath(body && body.path);
  const source  = cleanSource(body && body.source);
  // "internal" means a navigation inside the site. We still want to count
  // it (so page-depth is visible), but we tag the source so it doesn't
  // get mixed in with external referrers.
  const country = (() => {
    const c = (req.headers['x-vercel-ip-country'] || '').toString().toUpperCase();
    return /^[A-Z]{2}$/.test(c) ? c : 'XX';
  })();
  const day  = todayUTC();
  const hour = hourUTC();

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Optimistic concurrency loop: read → mutate → PUT. Retry on 409/412.
  const MAX_TRIES = 4;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++){
    let sha = null;
    let data = { days: {} };

    try {
      const r = await fetch(`${API}/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, { headers: authHeaders });
      if (r.ok){
        const j = await r.json();
        sha = j.sha;
        try {
          const parsed = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
          if (parsed && typeof parsed === 'object'){
            data = parsed;
            if (!data.days || typeof data.days !== 'object') data.days = {};
          }
        } catch(_){ /* keep empty */ }
      } else if (r.status !== 404){
        // Non-404 error reading the file: give up quietly, don't block
        // the user's page.
        return res.status(200).json({ok:true, skipped:'read'});
      }
    } catch(_){
      return res.status(200).json({ok:true, skipped:'network'});
    }

    const bucket = data.days[day] || { total: 0, pages: {}, sources: {}, countries: {}, hours: {} };
    bucket.total = (bucket.total|0) + 1;
    bucket.pages[path]        = (bucket.pages[path]|0) + 1;
    bucket.sources[source]    = (bucket.sources[source]|0) + 1;
    bucket.countries[country] = (bucket.countries[country]|0) + 1;
    bucket.hours[hour]        = (bucket.hours[hour]|0) + 1;
    data.days[day] = bucket;

    const content = Buffer.from(JSON.stringify(data) + '\n', 'utf8').toString('base64');
    // "[skip ci]" tells Vercel not to redeploy on this commit — tracker
    // writes are frequent and never change what the site serves.
    const put = {
      message: `track: ${day} ${path} (${source}) [skip ci]`,
      content,
      branch: BRANCH,
      committer: { name: 'Transitions Lab tracker', email: 'marcel@transitionslab.org' },
      ...(sha ? { sha } : {}),
    };

    try {
      const pr = await fetch(`${API}/repos/${REPO}/contents/${PATH}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(put),
      });
      if (pr.ok) return res.status(200).json({ok:true});

      // 409/422 is the sha-conflict case GitHub returns when the file
      // moved underneath us. Back off a little and retry.
      if (pr.status === 409 || pr.status === 422){
        await sleep(80 + Math.floor(Math.random() * 160) * (attempt + 1));
        continue;
      }
      // Any other failure: give up quietly rather than blocking the page.
      return res.status(200).json({ok:true, skipped:'write'});
    } catch(_){
      return res.status(200).json({ok:true, skipped:'network'});
    }
  }

  return res.status(200).json({ok:true, skipped:'contended'});
}
