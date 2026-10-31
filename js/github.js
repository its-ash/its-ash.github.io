const USER = 'its-ash';
const KEY = 'itsash.gh';
const TTL = 30 * 60e3;
const API = `https://api.github.com/users/${USER}/events/public?per_page=100`;

const line = (e) => {
  const repo = (e.repo?.name ?? '').replace(`${USER}/`, '');
  const date = (e.created_at ?? '').slice(5, 10);
  const p = e.payload ?? {};
  switch (e.type) {
    case 'PushEvent': {
      const msg = p.commits?.at(-1)?.message?.split('\n')[0];
      const branch = (p.ref ?? '').replace('refs/heads/', '');
      return `${date} push ${repo}${msg ? `: ${msg}` : branch ? ` -> ${branch}` : ''}`;
    }
    case 'CreateEvent':
      return `${date} new ${p.ref_type ?? 'repo'} ${repo}`;
    case 'PullRequestEvent':
      return `${date} pr ${p.action ?? ''} ${repo}`;
    case 'IssuesEvent':
      return `${date} issue ${p.action ?? ''} ${repo}`;
    case 'WatchEvent':
      return `${date} star ${repo}`;
    case 'ReleaseEvent':
      return `${date} release ${repo}`;
    case 'ForkEvent':
      return `${date} fork ${repo}`;
    default:
      return null;
  }
};

export async function fetchActivity() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY));
    if (cached && Date.now() - cached.at < TTL) return cached.data;
  } catch {}
  const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const events = await res.json();
  if (!Array.isArray(events)) throw new Error('GitHub bad payload');
  const commits = events.filter((e) => e.type === 'PushEvent').reduce((n, e) => n + (e.payload?.size ?? e.payload?.commits?.length ?? 1), 0);
  const data = { commits, events: events.length, logs: events.map(line).filter(Boolean).slice(0, 40) };
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {}
  return data;
}
