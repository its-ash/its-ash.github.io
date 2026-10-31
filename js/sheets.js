import * as THREE from 'three';
import { mat, mesh, group, canvasTexture } from './kit.js';

const { clamp, lerp } = THREE.MathUtils;
const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const backOut = (x) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
const settle = (s, freq, damp, amp) => Math.sin(s * freq) * Math.exp(-s * damp) * amp;
const ROLLER_R = 0.07;
const INK = '#2b2118';
const ACCENT = '#b5541c';

const BIO = 'I build AI agents, LLM apps, and computer vision systems, and the fast Rust and Python code under them. I care most about low latency, code that is easy to maintain, clear deployment paths, and fast shipping.';
const HOW = [
  'Keep the architecture simple until complexity is proven necessary.',
  'Break requirements into small units that ship with fast feedback.',
  'Add tests and observability early to cut late-stage risk.',
  'Prefer clear interfaces, documented trade-offs, and clean handoffs.'
];
const FOCUS = [
  ['AI agents', 'Agents that plan, call tools, and finish real tasks.'],
  ['LLM apps', 'Retrieval, prompts, and evals that hold up in production.'],
  ['Computer vision', 'Image models that run fast on real cameras and devices.']
];
const STACK = [
  ['Languages', ['Rust', 'JavaScript', 'Python']],
  ['Systems', ['Linux']],
  ['AI', ['Agents', 'LLM', 'Computer Vision']]
];
const ABOUT_LINKS = [
  { label: 'Resume', url: '/resume.pdf' },
  { label: 'Contact me', focus: 'contact' }
];
const CONTACTS = [
  { label: 'Email', value: 'ashvini.jangid@email.com', url: 'mailto:ashvini.jangid@email.com', glyph: '@', color: '#d6453d' },
  { label: 'GitHub', value: 'github.com/its-ash', url: 'https://github.com/its-ash', glyph: 'GH', color: '#24292f' },
  { label: 'LinkedIn', value: 'linkedin.com/in/ashvinijangid', url: 'https://www.linkedin.com/in/ashvinijangid/', glyph: 'in', color: '#0a66c2' }
];

const wrap = (ctx, text, max) =>
  text.split(' ').reduce((lines, word) => {
    const last = lines.at(-1);
    if (last && ctx.measureText(`${last} ${word}`).width <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);

const paragraph = (ctx, text, x, y, max, lh) => {
  const lines = wrap(ctx, text, max);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + lines.length * lh;
};

const pill = (ctx, x, y, w, h, fill) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

const regionAt = (items, w, h) => (uv) => {
  const x = uv.x * w;
  const y = (1 - uv.y) * h;
  return items.findIndex(({ box: [x0, y0, x1, y1] }) => x >= x0 && x < x1 && y >= y0 && y < y1);
};

const parchment = (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#f8efd9');
  bg.addColorStop(1, '#efe0bd');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.62);
  edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edge.addColorStop(1, 'rgba(120, 80, 30, 0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b8893b';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, w - 80, h - 80);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
};

const header = (ctx, img) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(190, 190, 90, 0, Math.PI * 2);
  ctx.fillStyle = '#e4d3ad';
  ctx.fill();
  ctx.clip();
  if (img) ctx.drawImage(img, 100, 100, 180, 180);
  ctx.restore();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(190, 190, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '700 64px Outfit, sans-serif';
  ctx.fillText('Ashvini Jangid', 310, 180);
  ctx.fillStyle = '#7a5a33';
  ctx.font = '500 34px Outfit, sans-serif';
  ctx.fillText('Software engineer from India', 310, 232);
};

const heading = (ctx, text, x, y) => {
  ctx.fillStyle = ACCENT;
  ctx.font = '700 44px Outfit, sans-serif';
  ctx.fillText(text, x, y);
  ctx.fillRect(x, y + 14, 70, 5);
};

const bio = (ctx, x, y, max, size, lh) => {
  ctx.fillStyle = INK;
  ctx.font = `400 ${size}px Outfit, sans-serif`;
  return paragraph(ctx, BIO, x, y, max, lh);
};

const how = (ctx, x, y, max, size, lh, gap) => {
  HOW.forEach((line) => {
    ctx.fillStyle = '#c8962e';
    ctx.save();
    ctx.translate(x + 12, y - 12);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.font = `400 ${size}px Outfit, sans-serif`;
    y = paragraph(ctx, line, x + 45, y, max - 45, lh) + gap;
  });
  return y;
};

const focus = (ctx, x, y, max) => {
  FOCUS.forEach(([title, note]) => {
    ctx.fillStyle = INK;
    ctx.font = '700 36px Outfit, sans-serif';
    ctx.fillText(title, x, y);
    ctx.fillStyle = '#5a4630';
    ctx.font = '400 28px Outfit, sans-serif';
    y = paragraph(ctx, note, x, y + 42, max, 38) + 26;
  });
  return y;
};

const stack = (ctx, x, y, max) => {
  STACK.forEach(([label, items]) => {
    ctx.fillStyle = '#7a5a33';
    ctx.font = '600 26px Outfit, sans-serif';
    ctx.fillText(label.toUpperCase(), x, y);
    let px = x;
    let py = y + 14;
    items.forEach((it) => {
      const pw = ctx.measureText(it).width + 36;
      if (px + pw > x + max) {
        px = x;
        py += 56;
      }
      pill(ctx, px, py, pw, 44, '#fff8ea');
      ctx.strokeStyle = '#d9b77a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(it, px + 18, py + 32);
      px += pw + 12;
    });
    y = py + 100;
  });
  return y;
};

const buttons = (ctx, items, hover) =>
  items.forEach(({ label, focus: to, box: [x0, y0, x1, y1] }, i) => {
    pill(ctx, x0, y0, x1 - x0, y1 - y0, i === hover ? '#8f3f12' : ACCENT);
    ctx.fillStyle = '#fff8ea';
    ctx.font = '600 38px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${label} ${to ? '→' : '↗'}`, (x0 + x1) / 2, (y0 + y1) / 2 + 13);
    ctx.textAlign = 'left';
  });

const withBoxes = (items, boxes) => items.map((it, i) => ({ ...it, box: boxes[i] }));

const ABOUT = {
  wide: {
    w: 2048,
    h: 1152,
    pw: 3.2,
    ph: 1.8,
    items: withBoxes(ABOUT_LINKS, [[100, 950, 400, 1040], [430, 950, 760, 1040]]),
    draw(ctx, w, h, { img, hover }) {
      parchment(ctx, w, h);
      header(ctx, img);
      heading(ctx, 'About me', 100, 360);
      bio(ctx, 100, 430, 660, 34, 50);
      buttons(ctx, this.items, hover);
      heading(ctx, 'How I work', 840, 150);
      how(ctx, 840, 230, 565, 32, 46, 34);
      heading(ctx, 'Current focus', 1480, 150);
      const y = focus(ctx, 1480, 225, 470);
      heading(ctx, 'Tech stack', 1480, y + 40);
      stack(ctx, 1480, y + 110, 470);
    }
  },
  tall: {
    w: 1152,
    h: 2048,
    pw: 1.8,
    ph: 3.2,
    items: withBoxes(ABOUT_LINKS, [[100, 1880, 540, 1975], [600, 1880, 1052, 1975]]),
    draw(ctx, w, h, { img, hover }) {
      parchment(ctx, w, h);
      header(ctx, img);
      heading(ctx, 'About me', 100, 370);
      let y = bio(ctx, 100, 440, 950, 34, 48);
      heading(ctx, 'How I work', 100, y + 50);
      y = how(ctx, 100, y + 125, 950, 30, 42, 24);
      heading(ctx, 'Current focus', 100, y + 50);
      heading(ctx, 'Tech stack', 640, y + 50);
      focus(ctx, 100, y + 125, 480);
      stack(ctx, 640, y + 120, 420);
      buttons(ctx, this.items, hover);
    }
  }
};

const letterBase = (ctx, w, h, title, sub, subMax) => {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120, 150, 200, 0.18)';
  ctx.lineWidth = 2;
  for (let y = 196; y < h - 30; y += 44) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(214, 69, 61, 0.35)';
  ctx.fillRect(110, 0, 3, h);

  ctx.save();
  ctx.translate(w - 150, 40);
  ctx.rotate(0.06);
  ctx.strokeStyle = '#d6453d';
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(0, 0, 100, 120);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffe1c4';
  ctx.fillRect(10, 10, 80, 100);
  ctx.fillStyle = '#d6453d';
  ctx.font = '700 34px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IN', 50, 72);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = '700 64px Outfit, sans-serif';
  ctx.fillText(title, 140, 110);
  ctx.fillStyle = '#5a4630';
  ctx.font = '400 30px Outfit, sans-serif';
  paragraph(ctx, sub, 140, 160, subMax, 40);
  ctx.fillStyle = '#7a5a33';
  ctx.font = 'italic 500 34px Outfit, sans-serif';
  ctx.fillText('— Ashvini', w - 260, h - 40);
};

const contactRow = (ctx, { label, value, glyph, color, box: [x0, y0, x1, y1] }, on, r, valueSize) => {
  const cy = (y0 + y1) / 2;
  if (on) {
    ctx.fillStyle = 'rgba(181, 84, 28, 0.12)';
    ctx.beginPath();
    ctx.roundRect(x0, y0 + 6, x1 - x0, y1 - y0 - 12, 18);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x0 + 20 + r, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 32px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(glyph, x0 + 20 + r, cy + 11);
  ctx.textAlign = 'left';
  const tx = x0 + 2 * r + 50;
  ctx.fillStyle = '#7a5a33';
  ctx.font = '600 26px Outfit, sans-serif';
  ctx.fillText(label.toUpperCase(), tx, cy - 12);
  ctx.fillStyle = INK;
  ctx.font = `600 ${valueSize}px Outfit, sans-serif`;
  ctx.fillText(value, tx, cy + 30, x1 - tx - 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT;
  ctx.font = '600 36px Outfit, sans-serif';
  ctx.fillText('↗', x1 - 24, cy + 12);
  ctx.textAlign = 'left';
};

const SUB = 'Send a message about a project, a role, or an idea.';
const LETTER = {
  wide: {
    w: 1024,
    h: 716,
    pw: 2.0,
    ph: 1.4,
    items: CONTACTS.map((it, i) => ({ ...it, box: [60, 210 + i * 130, 964, 330 + i * 130] })),
    draw(ctx, w, h, { hover }) {
      letterBase(ctx, w, h, 'Contact', SUB, 760);
      this.items.forEach((it, i) => contactRow(ctx, it, i === hover, 40, 36));
    }
  },
  tall: {
    w: 770,
    h: 1100,
    pw: 1.4,
    ph: 2.0,
    items: CONTACTS.map((it, i) => ({ ...it, box: [50, 290 + i * 190, 720, 460 + i * 190] })),
    draw(ctx, w, h, { hover }) {
      letterBase(ctx, w, h, 'Contact', SUB, 480);
      this.items.forEach((it, i) => contactRow(ctx, it, i === hover, 36, 30));
    }
  }
};

const sheet = (layouts) => {
  const state = { hover: -1, img: null, key: 'wide' };
  const texs = {};
  const tex = (key) =>
    (texs[key] ??= (() => {
      const L = layouts[key];
      const t = canvasTexture(L.w, L.h, (ctx, w, h) => L.draw(ctx, w, h, state));
      t.anisotropy = 8;
      return t;
    })());
  const redraw = () => tex(state.key).userData.redraw();
  document.fonts?.ready.then(() => Object.values(texs).forEach((t) => t.userData.redraw()));
  return {
    state,
    tex,
    redraw,
    get L() {
      return layouts[state.key];
    },
    hover(i) {
      if (i === state.hover) return;
      state.hover = i;
      redraw();
    },
    regionAt(uv) {
      const L = layouts[state.key];
      return regionAt(L.items, L.w, L.h)(uv);
    },
    item: (i) => layouts[state.key].items[i]
  };
};

export function createAbout({ reduced = false }) {
  const root = group();
  const body = group();
  body.visible = false;
  root.add(body);

  const s = sheet(ABOUT);
  const img = new Image();
  img.onload = () => {
    s.state.img = img;
    s.redraw();
  };
  img.src = '/morty.png';

  const faceMat = new THREE.MeshBasicMaterial({ map: s.tex('wide'), toneMapped: false, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceMat);
  body.add(face);

  const wood = mat('#7a4e2c', { roughness: 0.6 });
  const gold = mat('#e2b04a', { metalness: 0.6, roughness: 0.35 });
  const roller = () => {
    const r = group();
    const bar = mesh(new THREE.CylinderGeometry(ROLLER_R, ROLLER_R, 1, 24), wood);
    bar.rotation.z = Math.PI / 2;
    const knobs = [-1, 1].map((side) => {
      const knob = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24), gold);
      knob.rotation.z = Math.PI / 2;
      knob.userData.side = side;
      return knob;
    });
    r.add(bar, ...knobs);
    r.userData = { bar, knobs };
    body.add(r);
    return r;
  };
  const top = roller();
  const bottom = roller();
  const ribbon = mesh(new THREE.BoxGeometry(0.08, 0.5, 0.01), mat('#c0392b'), [0, -0.2, 0.08]);
  top.add(ribbon);

  const fit = () => {
    const { pw } = s.L;
    [top, bottom].forEach(({ userData: { bar, knobs } }) => {
      bar.scale.y = pw + 0.2;
      knobs.forEach((k) => (k.position.x = k.userData.side * (pw / 2 + 0.14)));
    });
    ribbon.position.x = pw / 2 - 0.3;
    faceMat.map = s.tex(s.state.key);
    faceMat.needsUpdate = true;
  };
  fit();

  let q = 0;
  let clock = 0;
  let opened = 0;
  return {
    name: 'about',
    root,
    face,
    anchor: root,
    get halfW() {
      return s.L.pw / 2 + 0.15;
    },
    get halfH() {
      return s.L.ph / 2 + 0.25;
    },
    layout(tall) {
      const key = tall ? 'tall' : 'wide';
      if (key === s.state.key) return;
      s.state.key = key;
      s.state.hover = -1;
      s.redraw();
      fit();
    },
    regionAt: s.regionAt,
    hover: s.hover,
    item: s.item,
    update(dt, on) {
      q = reduced ? (on ? 1 : 0) : clamp(q + (on ? dt / 1.8 : -dt / 0.7), 0, 1);
      body.visible = q > 0.001;
      if (!body.visible) return;
      clock += dt;
      opened = q === 1 && on ? opened + dt : 0;
      const live = reduced ? 0 : 1;
      const { pw, ph } = s.L;
      const map = faceMat.map;
      const rise = backOut(clamp(q / 0.4, 0, 1));
      const roll = easeOut(clamp((q - 0.35) / 0.65, 0, 1));
      body.position.y = lerp(-1.4, 0, rise) + Math.sin(clock * 1.3) * 0.02 * live;
      body.scale.setScalar(lerp(0.25, 1, rise));
      body.rotation.y = (1 - easeOut(clamp(q / 0.4, 0, 1))) ** 2 * Math.PI * 1.5;
      body.rotation.x = (settle(opened, 7, 2.4, 0.1) + Math.sin(clock * 0.8) * 0.01) * live;
      body.rotation.z = Math.sin(clock * 0.9) * 0.008 * live;
      const k = Math.max(0.001, roll);
      const topY = ph / 2 + 0.06;
      top.position.y = topY;
      face.scale.set(pw, ph * k, 1);
      face.position.y = topY - 0.06 - (ph * k) / 2;
      map.repeat.y = k;
      map.offset.y = 1 - k;
      bottom.position.y = topY - 0.06 - ph * k - 0.04;
      bottom.rotation.x = -(ph * roll) / ROLLER_R;
      ribbon.rotation.z = settle(opened, 9, 3, 0.25) * live + Math.sin(clock * 2) * 0.04 * live;
      face.visible = roll > 0.001;
    }
  };
}

export function createContact({ reduced = false, from = [0, 1.3, -1.2] }) {
  const root = group();
  const body = group();
  body.visible = false;
  root.add(body);
  const anchor = group(0, 2.1, 0.25);
  root.add(anchor);

  const s = sheet(LETTER);

  const envelope = group();
  envelope.add(mesh(new THREE.BoxGeometry(1.0, 0.62, 0.04), mat('#f2e6cf', { roughness: 0.8 })));
  const vee = new THREE.Shape([new THREE.Vector2(-0.5, 0.31), new THREE.Vector2(0, -0.05), new THREE.Vector2(0.5, 0.31)]);
  envelope.add(mesh(new THREE.ShapeGeometry(vee), mat('#e6d6b8', { side: THREE.DoubleSide }), [0, 0, -0.021]));
  const flap = group(0, 0.31, 0.022);
  const flapGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, -0.38)]));
  flap.add(mesh(flapGeo, mat('#e9dbbf', { side: THREE.DoubleSide })));
  const seal = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24), mat('#c0392b', { roughness: 0.4 }), [0, -0.3, 0.012]);
  seal.rotation.x = Math.PI / 2;
  flap.add(seal);
  envelope.add(flap);
  body.add(envelope);

  const faceMat = new THREE.MeshBasicMaterial({ map: s.tex('wide'), toneMapped: false, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), faceMat);
  body.add(face);

  const start = new THREE.Vector3(...from);
  const rest = new THREE.Vector3(0, 1.15, 0);
  let q = 0;
  let clock = 0;
  let flapped = 0;
  let opened = 0;
  return {
    name: 'contact',
    root,
    face,
    anchor,
    get halfW() {
      return s.L.pw / 2 + 0.12;
    },
    get halfH() {
      return s.L.ph / 2 + 0.12;
    },
    layout(tall) {
      const key = tall ? 'tall' : 'wide';
      if (key === s.state.key) return;
      s.state.key = key;
      s.state.hover = -1;
      s.redraw();
      faceMat.map = s.tex(key);
      faceMat.needsUpdate = true;
    },
    regionAt: s.regionAt,
    hover: s.hover,
    item: s.item,
    update(dt, on) {
      q = reduced ? (on ? 1 : 0) : clamp(q + (on ? dt / 2.2 : -dt / 0.8), 0, 1);
      body.visible = q > 0.001;
      if (!body.visible) return;
      clock += dt;
      const live = reduced ? 0 : 1;
      const { pw, ph } = s.L;
      const flyT = clamp(q / 0.32, 0, 1);
      const fly = easeOut(flyT);
      const open = ease(clamp((q - 0.32) / 0.16, 0, 1));
      const slide = ease(clamp((q - 0.46) / 0.2, 0, 1));
      const pull = backOut(clamp((q - 0.64) / 0.36, 0, 1));
      flapped = open === 1 && on ? flapped + dt : 0;
      opened = q === 1 && on ? opened + dt : 0;

      envelope.position.lerpVectors(start, rest, fly);
      envelope.position.y += Math.sin(flyT * Math.PI) * 0.9 - pull * 0.12;
      envelope.scale.setScalar(lerp(0.3, 1, fly));
      envelope.rotation.y = (1 - fly) ** 2 * Math.PI * 3;
      envelope.rotation.x = Math.sin(flyT * Math.PI) * 0.5 - pull * 0.25 + settle(flapped, 10, 4, 0.04) * live;
      envelope.rotation.z = (1 - fly) * 0.6;
      flap.rotation.x = open * Math.PI + settle(flapped, 12, 5, 0.3) * live;

      const small = Math.min(0.84 / pw, 0.59 / ph);
      face.visible = slide > 0.001;
      face.position.set(0, lerp(1.0, 1.55, slide) + (2.1 - 1.55) * pull + Math.sin(clock * 1.4) * 0.015 * live * pull, lerp(-0.002, 0.25, pull));
      face.scale.set(pw, ph, 1).multiplyScalar(lerp(small, 1, pull));
      face.rotation.z = (1 - pull) * 0.12 + settle(opened, 6, 2.5, 0.05) * live;
      face.rotation.x = Math.sin(clock * 8) * (1 - pull) * 0.15 * live + settle(opened, 5, 2, 0.08) * live;
    }
  };
}
