import { Ambience } from './audio.js';
import { phaseName } from './astro.js';
import * as W from './weather.js';

const REFRESH_MS = 15 * 60e3;
const UNIT_KEY = 'itsash.unit';
const DOCK_KEY = 'itsash.dock';
const LOW_KEY = 'itsash.lowpower';
const SHARE_NAME = 'itsash-island.png';
const PROJECTS = [
  { label: 'fxopspro.com', url: 'https://fxopspro.com/' },
  { label: 'flavourdiem.com', url: 'https://flavourdiem.com/' },
  { label: 'scenta.in', url: 'https://scenta.in' },
  { label: 'marutiayurveda.in', url: 'https://marutiayurveda.in' },
  { label: 'share.ash-tools.store', url: 'https://share.ash-tools.store/' },
  { label: 'alanowarinternational.com', url: 'https://alanowarinternational.com/' }
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const autoLow = matchMedia('(max-width: 700px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
const savedLow = localStorage.getItem(LOW_KEY);
let lowPower = savedLow === null ? autoLow : savedLow === '1';

const app = { place: W.DEFAULT_PLACE, weather: null, mode: 'live', unit: localStorage.getItem(UNIT_KEY) === 'f' ? 'f' : 'c', offset: 0 };
const audio = new Ambience();
let scene = null;

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

let toastTimer = 0;
const toast = (msg) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

const fmtTemp = (c) => (Number.isFinite(c) ? `${Math.round(app.unit === 'f' ? (c * 9) / 5 + 32 : c)}°${app.unit.toUpperCase()}` : '--');
const hhmm = (iso) => (typeof iso === 'string' && iso.includes('T') ? iso.split('T')[1].slice(0, 5) : '--');

const effective = () => {
  const live = app.weather ?? { temp: null, code: 1, cloudCover: 20, wind: 8, windDir: 270, humidity: null };
  return app.mode === 'live' ? live : { ...live, ...W.PRESETS[app.mode], windDir: live.windDir };
};

const render = () => {
  const w = effective();
  const desc = app.weather || app.mode !== 'live' ? `${W.describe(w.code)}${app.mode === 'live' ? '' : ' (demo)'}` : 'Loading weather';
  $('#cond').textContent = Number.isFinite(w.temp) ? `${desc}, ${fmtTemp(w.temp)}` : desc;
  $$('[data-unit]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.unit === app.unit));
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === app.mode));
  scene?.setTempLabel(fmtTemp(w.temp), app.weather?.temp == null && app.mode === 'live' ? 'Loading weather' : W.describe(w.code), Number.isFinite(w.wind) ? `Wind ${Math.round(w.wind)} km/h` : '');
};

const tick = () => {
  const sky = scene?.sky();
  const c = W.conditions(effective().code, effective().cloudCover);
  audio.update({ rain: c.rain, wind: effective().wind, day: sky?.day ?? 1, night: sky?.night ?? 0, sunAlt: sky?.sunAlt ?? null });
};

const apply = () => {
  const w = effective();
  scene?.setWeather({ cond: W.conditions(w.code, w.cloudCover), wind: w.wind, windDir: w.windDir, temp: Number.isFinite(w.temp) ? w.temp : 20 });
  render();
  tick();
};

const renderPlace = () => {
  const { city, country, source, lat, lng } = app.place;
  const name = [city, country].filter(Boolean).join(', ') || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  $('#place').textContent = source === 'gps' ? name : `${name} (approx.)`;
};

const loadWeather = async () => {
  try {
    app.weather = await W.fetchWeather(app.place);
  } catch {
    toast('Weather is not available now. Showing a demo sky.');
  }
  apply();
};

const usePlace = async (place) => {
  app.place = place;
  scene?.setPlace(place.lat, place.lng);
  renderPlace();
  await loadWeather();
  app.place = await W.placeName(place);
  renderPlace();
};

const askLocation = async () => {
  try {
    const p = await W.browserLocation();
    W.setChoice('gps');
    await usePlace(p);
  } catch {
    W.setChoice('ip');
    toast('Location is blocked. Using your approximate location.');
    await usePlace(await W.ipLocation());
  }
};

const setUnit = (u) => {
  app.unit = u;
  localStorage.setItem(UNIT_KEY, u);
  render();
};

const openSheet = (id) => {
  const d = document.getElementById(id);
  if (d && !d.open) d.showModal();
};

const sunInfo = () => {
  const s = scene.sky();
  return s.sunAlt > 0
    ? `The sun is ${Math.round(s.sunAlt)}° above the horizon. Sunset at ${hhmm(app.weather?.sunset)}.`
    : `The sun is below the horizon. Sunrise at ${hhmm(app.weather?.sunrise)}.`;
};

const ACTIONS = {
  open: (_, url) => {
    const u = new URL(url, location.href);
    if (u.protocol === 'mailto:') return location.assign(u);
    if (['http:', 'https:'].includes(u.protocol)) window.open(u, '_blank', 'noopener,noreferrer');
  },
  unit: () => setUnit(app.unit === 'c' ? 'f' : 'c'),
  sun: () => toast(sunInfo()),
  moon: () => {
    const s = scene.sky();
    toast(`${phaseName(s.phase)}, ${Math.round(s.fraction * 100)}% lit.`);
  },
  cloud: () => toast('This cloud rains for a few seconds.'),
  skill: (o) => toast(`${o.userData.skill.name}: ${o.userData.skill.note}`),
  croc: () => toast('Snap! The crocodile guards the pond.'),
  temple: () => toast('Jai Bajrang Bali!'),
  lamp: () => toast(scene.lampOn() ? 'Lamp on.' : 'Lamp off.'),
  github: (o) => toast(o?.userData.info ?? 'Loading GitHub activity...'),
  ball: (_, n) => toast(n === 7 ? 'All 7 Dragon Balls found! Shenron is coming...' : `Dragon Ball found: ${n} of 7. Keep exploring the islands.`),
  summon: () => toast('Shenron: Speak your wish! Tap the dragon to open my resume.'),
  toast: (_, msg) => toast(String(msg)),
  sfx: (_, name) => ['honk', 'thwack', 'bell'].includes(name) && audio[name](),
  windmill: () => toast(`Wind speed: ${Math.round(effective().wind)} km/h.`)
};

const initScene = async () => {
  if (!hasWebGL()) return document.body.classList.add('no-webgl');
  try {
    const { createScene } = await import('./scene.js');
    const tip = $('#tip');
    scene = createScene($('#scene'), {
      reducedMotion: reduced,
      lowPower,
      onHover: (label, x, y) => {
        tip.hidden = !label;
        if (!label) return;
        tip.textContent = label;
        tip.style.translate = `${x + 16}px ${y + 16}px`;
      },
      projects: PROJECTS,
      onAction: (a, o, extra) => ACTIONS[a]?.(o, extra),
      onFocus: (on, name) => {
        document.body.classList.toggle('focused', on);
        $('#focusBar').hidden = !on;
        $('#listBtn').hidden = name !== 'projects';
        $('#tip').hidden = true;
        if (on) $('#backBtn').focus({ preventScroll: true });
      },
      onNear: (label) => {
        $('#nearLabel').textContent = label ?? '';
        $('#prompt').hidden = !label;
      },
      onBell: () => audio.bell(),
      onCamera: (mode) => {
        const btn = $('#camBtn');
        const follow = mode === 'follow';
        btn.querySelector('i').className = `ph ${follow ? 'ph-map-trifold' : 'ph-person-simple-walk'}`;
        btn.querySelector('span').textContent = follow ? 'Map view' : 'Follow me';
      },
      onThunder: () => setTimeout(() => audio.thunder(), 500 + Math.random() * 1200)
    });
    scene.setPlace(app.place.lat, app.place.lng);
    setLow(lowPower);
    document.body.classList.add('ready');
  } catch (err) {
    console.error(err);
    document.body.classList.add('no-webgl');
  }
};

const setDock = (expanded, tab) => {
  const dock = $('#dock');
  const tabs = $$('.dock-bar [data-tab]');
  const active = tab ?? tabs.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.tab ?? 'me';
  dock.dataset.expanded = expanded;
  tabs.forEach((b) => b.setAttribute('aria-pressed', b.dataset.tab === active));
  $$('.dock-panel').forEach((p) => (p.hidden = p.id !== `tab-${active}`));
  const toggle = $('#dockToggle');
  const label = expanded ? 'Minimize' : 'Expand';
  toggle.setAttribute('aria-expanded', expanded);
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  toggle.querySelector('i').className = `ph ${expanded ? 'ph-minus' : 'ph-plus'}`;
  localStorage.setItem(DOCK_KEY, JSON.stringify({ expanded, tab: active }));
};

const bindDock = () => {
  const dock = $('#dock');
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(DOCK_KEY)) ?? {};
  } catch {}
  setDock(saved.expanded !== false, ['me', 'scene'].includes(saved.tab) ? saved.tab : 'me');
  $$('.dock-bar [data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      const same = b.getAttribute('aria-pressed') === 'true';
      setDock(!(same && dock.dataset.expanded === 'true'), b.dataset.tab);
    })
  );
  $('#dockToggle').addEventListener('click', () => setDock(dock.dataset.expanded !== 'true'));
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', `${dock.offsetHeight}px`)).observe(dock);
};

const setLow = (on) => {
  lowPower = on;
  localStorage.setItem(LOW_KEY, on ? '1' : '0');
  const btn = $('#lowBtn');
  btn.setAttribute('aria-pressed', on);
  btn.querySelector('span').textContent = on ? 'Low power on' : 'Low power off';
  scene?.setLowPower(on);
};

const share = async () => {
  if (!scene) return;
  try {
    const blob = await scene.snapshot();
    const file = new File([blob], SHARE_NAME, { type: 'image/png' });
    const data = { files: [file], title: document.title, url: location.origin };
    if (navigator.canShare?.(data)) return await navigator.share(data);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: SHARE_NAME });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Snapshot saved.');
  } catch (err) {
    if (err?.name !== 'AbortError') toast('Snapshot is not available now.');
  }
};

const bindStick = () => {
  const pad = $('#stick');
  const knob = pad.querySelector('span');
  let id = null;
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    const max = r.width * 0.32;
    let x = e.clientX - (r.left + r.width / 2);
    let y = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y);
    if (d > max) [x, y] = [(x * max) / d, (y * max) / d];
    knob.style.translate = `${x}px ${y}px`;
    scene?.setStick(x / max, -y / max);
  };
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    pad.classList.remove('on');
    knob.style.translate = '';
    scene?.setStick(0, 0);
  };
  pad.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId;
    pad.setPointerCapture(id);
    pad.classList.add('on');
    move(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === id && move(e));
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
};

const bindUi = () => {
  bindDock();
  bindStick();
  $('#camBtn').addEventListener('click', () => scene?.toggleCamera());
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyC' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]') || scene?.focused()) return;
    scene?.toggleCamera();
  });
  $('#lowBtn').addEventListener('click', () => setLow(!lowPower));
  $('#shareBtn').addEventListener('click', share);
  $$('[data-open]').forEach((b) =>
    b.addEventListener('click', () => (scene ? scene.focus(b.dataset.open) : openSheet(b.dataset.open)))
  );
  $('#backBtn').addEventListener('click', () => scene?.unfocus());
  $('#listBtn').addEventListener('click', () => openSheet('projects'));
  $('#prompt').addEventListener('click', () => scene?.interact());
  addEventListener('keydown', (e) => e.key === 'Escape' && scene?.focused() && !document.querySelector('dialog[open]') && scene.unfocus());
  $$('dialog').forEach((d) =>
    d.addEventListener('click', (e) => {
      const r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
    })
  );
  $$('[data-unit]').forEach((b) => b.addEventListener('click', () => setUnit(b.dataset.unit)));
  $$('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      app.mode = b.dataset.mode;
      apply();
    })
  );
  $('#offset').addEventListener('input', (e) => {
    app.offset = Number(e.target.value);
    $('#offsetOut').textContent = app.offset === 0 ? 'Now' : `${app.offset > 0 ? '+' : ''}${app.offset}h`;
    scene?.setTimeOffset(app.offset);
    tick();
  });
  $('#sound').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const on = await audio.toggle();
    btn.setAttribute('aria-pressed', on);
    btn.querySelector('i').className = `ph ${on ? 'ph-speaker-high' : 'ph-speaker-slash'}`;
    btn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
    tick();
  });
  $('#locBtn').addEventListener('click', askLocation);
  $('#locate').addEventListener('close', (e) => (e.target.returnValue === 'gps' ? askLocation() : (W.setChoice('ip'), W.ipLocation().then(usePlace))));
};

const initLocation = async () => {
  const perm = await W.geoPermission();
  const choice = W.getChoice();
  if (perm === 'granted' || (choice === 'gps' && perm !== 'denied')) return askLocation();
  if (choice === 'ip' || perm === 'denied') return usePlace(await W.ipLocation());
  $('#locate').showModal();
};

bindUi();
render();
renderPlace();
await initScene();
apply();
initLocation();
setInterval(tick, 1000);
setInterval(() => !document.hidden && loadWeather(), REFRESH_MS);
