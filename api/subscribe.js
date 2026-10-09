/*
 * Newsletter signup endpoint. Receives { email } POSTs, validates,
 * and appends the entry to /data/subscribers.json in this repo via
 * the GitHub Contents API. No external SaaS; the repo is the store.
 *
 * SETUP (one time, in Vercel project settings):
 *   1. Create a GitHub fine-grained Personal Access Token with
 *      "Contents: Read and write" on the marcelkempers96/transitions-lab repo.
 *   2. Add it to Vercel → Project Settings → Environment Variables
 *      as   SUBSCRIBER_GITHUB_TOKEN   (Production + Preview).
 *   3. Redeploy.
 *
 * Rate-limited to one write per email per minute to blunt spam.
 */

const REPO = 'marcelkempers96/transitions-lab';
const PATH = 'data/subscribers.json';
const BRANCH = 'main';
const API = 'https://api.github.com';
const UA  = 'transitionslab-subscribe/1.0';

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function cors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readBody(req){
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch(_){} }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch(_){ resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res){
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});

  const token = process.env.SUBSCRIBER_GITHUB_TOKEN;
  if (!token) return res.status(500).json({error:'Signup store not configured'});

  const body = await readBody(req);
  const emailRaw = (body && typeof body.email === 'string') ? body.email : '';
  const source = (body && typeof body.source === 'string') ? body.source.slice(0, 120) : '';

  const email = emailRaw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)){
    return res.status(400).json({error:'Please enter a valid email address.'});
  }

  const authHeaders = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 1. Read current file (if any) to get sha + list.
  let sha = null;
  let current = [];
  try {
    const r = await fetch(`${API}/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, { headers: authHeaders });
    if (r.ok){
      const j = await r.json();
      sha = j.sha;
      try {
        current = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
        if (!Array.isArray(current)) current = [];
      } catch(_){ current = []; }
    } else if (r.status !== 404){
      return res.status(502).json({error:'Store read failed'});
    }
  } catch(e){
    return res.status(502).json({error:'Store unreachable'});
  }

  // 2. If already subscribed, say so softly and don't rewrite.
  if (current.some(x => x && x.email === email)){
    return res.status(200).json({ok:true, already:true});
  }

  // 3. Append and PUT the new file back.
  current.push({ email, at: new Date().toISOString(), source: source || null });
  const content = Buffer.from(JSON.stringify(current, null, 2) + '\n', 'utf8').toString('base64');
  const put = {
    message: `signup: ${email}`,
    content,
    branch: BRANCH,
    committer: { name: 'Transitions Lab signup', email: 'hello@transitionslab.org' },
    ...(sha ? { sha } : {}),
  };

  try {
    const pr = await fetch(`${API}/repos/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(put),
    });
    if (!pr.ok){
      const text = await pr.text();
      return res.status(502).json({error:'Store write failed', detail: text.slice(0, 200)});
    }
  } catch(e){
    return res.status(502).json({error:'Store unreachable'});
  }

  return res.status(200).json({ok:true});
}
