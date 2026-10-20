/*
 * Admin data endpoint. Protected by an ADMIN_KEY env var.
 *
 * GET /api/admin-data?key=XXXX
 *   → {
 *       ok: true,
 *       updatedAt: "2026-10-20T...",
 *       subscribers: [{ email, at, source }, ...],
 *       visits: {
 *         total:    1234,
 *         today:      42,
 *         last7:      300,
 *         last30:    1000,
 *         avgPerDay:   33,
 *         daysTracked: 48,
 *         pages:     [[path, count], ...],   // top 50
 *         sources:   [[source, count], ...], // all
 *         countries: [[cc, count], ...],     // all
 *         hours:     [c0, c1, ..., c23],     // 24 entries
 *         daily:     [[date, count], ...]    // last 30 days
 *       }
 *     }
 *
 * SETUP (one time, in Vercel project settings):
 *   1. Reuse the SUBSCRIBER_GITHUB_TOKEN already set up for /api/subscribe.
 *   2. Add a new env var ADMIN_KEY = <long random string>. This gates the
 *      dashboard.
 *   3. Redeploy.
 *
 * Visit the dashboard at /admin and paste the ADMIN_KEY once; it is
 * remembered in sessionStorage for the tab.
 */

const REPO   = 'marcelkempers96/transitions-lab';
const BRANCH = 'main';
const API    = 'https://api.github.com';
const UA     = 'transitionslab-admin/1.0';

function cors(res){
  // Admin UI lives on the same origin, but allow a dev tool to call too
  // when the key is correct.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function constantTimeEq(a, b){
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function readFile(path, headers){
  const r = await fetch(`${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('read ' + path + ' failed: ' + r.status);
  const j = await r.json();
  try {
    return JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
  } catch(_){ return null; }
}

function daysAgoUTC(n){
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function datesInRange(fromDate, toDate){
  // inclusive at both ends; fromDate and toDate are YYYY-MM-DD strings.
  const out = [];
  const start = new Date(fromDate + 'T00:00:00Z');
  const end   = new Date(toDate   + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)){
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function summariseVisits(raw){
  const days = (raw && raw.days) || {};
  const dates = Object.keys(days).sort(); // ascending
  const today = new Date().toISOString().slice(0, 10);

  let total = 0;
  const pages     = {};
  const sources   = {};
  const countries = {};
  const hours     = new Array(24).fill(0);

  for (const date of dates){
    const b = days[date] || {};
    total += (b.total|0);
    const addInto = (dst, src) => {
      if (!src) return;
      for (const k of Object.keys(src)) dst[k] = (dst[k]|0) + (src[k]|0);
    };
    addInto(pages,     b.pages);
    addInto(sources,   b.sources);
    addInto(countries, b.countries);
    if (b.hours){
      for (const h of Object.keys(b.hours)){
        const i = parseInt(h, 10);
        if (i >= 0 && i < 24) hours[i] += (b.hours[h]|0);
      }
    }
  }

  const sumRange = (from) => {
    let s = 0;
    for (const d of datesInRange(from, today)){
      s += ((days[d] && days[d].total)|0);
    }
    return s;
  };

  const todayCount = (days[today] && days[today].total)|0;
  const last7      = sumRange(daysAgoUTC(6));
  const last30     = sumRange(daysAgoUTC(29));

  const daysTracked = dates.length;
  const avgPerDay   = daysTracked ? Math.round(total / daysTracked) : 0;

  const sortDesc = (obj, limit) => {
    const entries = Object.keys(obj).map(k => [k, obj[k]|0]);
    entries.sort((a, b) => b[1] - a[1]);
    return typeof limit === 'number' ? entries.slice(0, limit) : entries;
  };

  // Daily series: last 30 days inclusive of today, zero-filled.
  const daily = datesInRange(daysAgoUTC(29), today).map(d => [d, ((days[d] && days[d].total)|0)]);

  return {
    total,
    today: todayCount,
    last7,
    last30,
    avgPerDay,
    daysTracked,
    pages:     sortDesc(pages, 50),
    sources:   sortDesc(sources),
    countries: sortDesc(countries),
    hours,
    daily,
  };
}

export default async function handler(req, res){
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')      return res.status(405).json({error:'GET only'});

  const expected = process.env.ADMIN_KEY;
  if (!expected) return res.status(500).json({error:'admin key not configured'});

  // Accept key via ?key= or Authorization: Bearer <key>.
  const q    = req.query || {};
  const auth = (req.headers.authorization || '').trim();
  const bearer = /^Bearer\s+(.+)$/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : '';
  const supplied = (q.key && String(q.key)) || bearer || '';
  if (!constantTimeEq(supplied, expected)){
    return res.status(401).json({error:'unauthorized'});
  }

  const token = process.env.SUBSCRIBER_GITHUB_TOKEN;
  if (!token) return res.status(500).json({error:'store not configured'});

  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let subscribers = [];
  let visitsRaw   = { days: {} };
  try {
    const [subs, vis] = await Promise.all([
      readFile('data/subscribers.json', headers),
      readFile('data/visits.json', headers),
    ]);
    if (Array.isArray(subs)) subscribers = subs;
    if (vis && typeof vis === 'object') visitsRaw = vis;
  } catch(e){
    return res.status(502).json({error:'store read failed', detail: String(e).slice(0, 200)});
  }

  const visits = summariseVisits(visitsRaw);

  return res.status(200).json({
    ok: true,
    updatedAt: new Date().toISOString(),
    subscribers,
    visits,
  });
}
