import { mountPrism } from './gl.js';

const $ = s => document.querySelector(s), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const h = (t, p = {}, ...k) => { const e = document.createElement(t); for (const [a, v] of Object.entries(p)) { if (a.startsWith('on')) e.addEventListener(a.slice(2), v); else if (a === 'class') e.className = v; else if (v !== false && v != null) e.setAttribute(a, v === true ? '' : v); } k.flat().forEach(c => c != null && c !== false && e.append(c.nodeType ? c : String(c))); return e; };
const sv = (t, a = {}, ...k) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const [x, v] of Object.entries(a)) e.setAttribute(x, v); k.forEach(c => e.append(c)); return e; };
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/((?:^|\n)- .+)+/g, m => '<ul>' + m.trim().split('\n').map(l => '<li>' + l.slice(2) + '</li>').join('') + '</ul>').replace(/\n/g, '<br>').replace(/<\/ul><br>/g, '</ul>');
const toast = m => { const t = h('div', {}, m); $('#toast').append(t); setTimeout(() => t.remove(), 3200); };
async function api(path, body) {
  const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PRISM': '1' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message || 'Something went wrong. Please try again.'); return j;
}
const S = { me: null, health: { careers: [], config: { celebration_threshold: 85, bands: [[0, 'Result']] } }, celebrated: new Set(), dirty: false };
const view = $('#view');
const LBL = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional', analytical: 'Logical reasoning', quantitative: 'Mathematics', creative: 'Creative problem solving', communication: 'Communication', spatial: 'Spatial thinking' };
const HINT = { R: 'Hands-on work with tools, machines or the outdoors', I: 'Investigating, researching and solving puzzles', A: 'Creating, designing and expressing ideas', S: 'Helping, teaching and working with people', E: 'Leading, persuading and starting things', C: 'Organising, planning and following clear processes', analytical: 'Breaking problems into logical steps', quantitative: 'Comfort with numbers and mathematics', creative: 'Finding original solutions', communication: 'Explaining ideas clearly', spatial: 'Visualising shapes, machines and layouts' };
const band = v => S.health.config.bands.find(b => v >= b[0])[1];

/* ---------- theme ---------- */
const setThemeIcon = () => $('#theme').textContent = document.documentElement.dataset.theme === 'dark' ? '☀ Light' : '☾ Dark';
$('#theme').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('prism-theme', t); setThemeIcon(); };
setThemeIcon();
addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- effects ---------- */
function countUp(el, to, dur = 1300) { if (RM) { el.textContent = to.toFixed(1); return; } const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(1); if (k < 1) requestAnimationFrame(f); })(t0); }
function confetti() {
  if (RM) return; const c = $('#fx'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const n = innerWidth < 600 ? 70 : 150, cols = ['#8b7bff', '#e8743b', '#4fd1c5', '#f0b34a', '#ff7a82'];
  const ps = Array.from({ length: n }, (_, i) => { const side = i % 5, fromBottom = side < 3; return { x: fromBottom ? Math.random() * c.width : side === 3 ? 0 : c.width, y: fromBottom ? c.height : c.height * .8, vx: fromBottom ? (Math.random() - .5) * 9 : (side === 3 ? 1 : -1) * (4 + Math.random() * 6), vy: -(9 + Math.random() * 12), s: 5 + Math.random() * 6, r: Math.random() * 6, c: cols[i % 5] }; });
  const t0 = performance.now(); (function f(t) { const el = t - t0; x.clearRect(0, 0, c.width, c.height); if (el > 3200) return; ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += .2; x.globalAlpha = Math.max(0, 1 - el / 3200); x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); requestAnimationFrame(f); })(t0);
}
function radar(labels, vals, title) {
  const n = labels.length, cx = 150, cy = 135, R = 90, pt = (i, r) => [cx + r * Math.cos(-Math.PI / 2 + 2 * Math.PI * i / n), cy + r * Math.sin(-Math.PI / 2 + 2 * Math.PI * i / n)];
  const s = sv('svg', { class: 'rad', viewBox: '0 0 300 270', role: 'img', 'aria-label': title });
  [.25, .5, .75, 1].forEach(k => s.append(sv('polygon', { class: 'gr', points: labels.map((_, i) => pt(i, R * k).join(',')).join(' ') })));
  labels.forEach((l, i) => { const [x, y] = pt(i, R + 18); s.append(sv('line', { class: 'gr', x1: cx, y1: cy, x2: pt(i, R)[0], y2: pt(i, R)[1] })); const t = sv('text', { x, y: y + 4, 'text-anchor': x < cx - 8 ? 'end' : x > cx + 8 ? 'start' : 'middle' }); t.textContent = l; s.append(t); });
  const poly = sv('polygon', { class: 'poly', points: vals.map((v, i) => pt(i, R * v / 100).join(',')).join(' ') }); s.append(poly);
  vals.forEach((v, i) => { const [x, y] = pt(i, R * v / 100); const c = sv('circle', { class: 'pt', cx: x, cy: y, r: 6, tabindex: 0, 'aria-label': `${labels[i]}: ${Math.round(v)} out of 100` }); const t = sv('title'); t.textContent = `${labels[i]}: ${Math.round(v)}/100`; c.append(t); s.append(c); });
  requestAnimationFrame(() => setTimeout(() => poly.classList.add('go'), 80));
  return h('figure', { style: 'margin:0' }, s, h('details', { class: 'sm' }, h('summary', {}, 'Text summary of this chart'), h('table', {}, labels.map((l, i) => h('tr', {}, h('th', {}, l), h('td', {}, Math.round(vals[i]) + ' / 100'))))));
}
const bar = (v, inv) => { const b = h('div', { class: 'bar' + (inv ? ' inv' : ''), role: 'progressbar', 'aria-valuenow': v, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i')); setTimeout(() => b.firstChild.style.width = v + '%', 150); return b; };
const fresh = s => s.freshness === 'Live' ? h('span', { class: 'badge ok' }, 'LIVE · ' + new Date(s.retrieved_at).toLocaleTimeString()) : s.freshness ? h('span', { class: 'badge ' + (s.freshness === 'Fresh' ? 'ok' : s.freshness === 'Aging' ? 'warn' : 'bad') }, (s.freshness === 'Fresh' ? '✓ ' : '⚠ ') + s.freshness + ' · ' + s.age_days + ' days old') : null;

/* ---------- dialogs ---------- */
const dlg = $('#dlg');
const openDlg = (...k) => { dlg.replaceChildren(...k); if (!dlg.open) dlg.showModal(); };
const confirmDlg = (title, text, ok = 'Confirm') => new Promise(res => { openDlg(h('h2', {}, title), h('p', { class: 'mut' }, text), h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => { dlg.close(); res(true); } }, ok), h('button', { class: 'btn', onclick: () => { dlg.close(); res(false); } }, 'Cancel'))); dlg.onclose = () => res(false); });
function loginForm() {
  const err = h('p', { class: 'err', role: 'alert' }), id = h('input', { type: 'text', id: 'li', autocomplete: 'username', placeholder: 'PRISM-26-A7K92F' }), dob = h('input', { type: 'password', id: 'ld', inputmode: 'numeric', maxlength: 8, placeholder: 'DDMMYYYY', autocomplete: 'off' }), pin = h('input', { type: 'password', id: 'lp', inputmode: 'numeric', maxlength: 8, autocomplete: 'current-password' });
  const f = h('form', { method: 'dialog', onsubmit: async e => { e.preventDefault(); err.textContent = ''; try { const r = await api('/api/login', { id: id.value, dob: dob.value, pin: pin.value }); S.me = r.result; updateAuth(); toast('Welcome back, ' + S.me.name); location.hash = '#/results'; route(); } catch (x) { err.textContent = x.message; } } },
    h('h2', {}, 'Applicant Login'), h('label', { for: 'li' }, 'Applicant ID'), id, h('label', { for: 'ld' }, 'Date of birth (DDMMYYYY)'), dob, h('label', { for: 'lp' }, 'PIN you created after your assessment'), pin, err,
    h('p', { class: 'sm mut' }, 'Your date of birth only verifies identity; the PIN is the credential. Both are stored as salted hashes.'), h('div', { class: 'row' }, h('button', { class: 'btn pri', type: 'submit' }, 'Open My Dashboard'), h('button', { class: 'btn', type: 'button', onclick: () => { location.hash = '#/'; } }, 'Cancel')));
  setTimeout(() => id.focus(), 600); return f;
}
function updateAuth() { const b = $('#loginBtn'); if (S.me) { b.textContent = S.me.name.split(' ')[0] + ' · Log out'; b.onclick = async () => { await api('/api/logout', {}); S.me = null; updateAuth(); chatReset(); toast('Logged out securely.'); location.hash = '#/'; route(); }; } else { b.textContent = 'Applicant Login'; b.onclick = loginDlg; } }

const loginDlg = () => { location.hash = '#/login'; };
function loginPrism() {
  const defs = sv('defs', {},
    sv('linearGradient', { id: 'login-prism-glass', x1: '0', y1: '0', x2: '1', y2: '1' },
      sv('stop', { offset: '0%', 'stop-color': '#d9f5ff', 'stop-opacity': '.34' }),
      sv('stop', { offset: '48%', 'stop-color': '#a3a8ff', 'stop-opacity': '.12' }),
      sv('stop', { offset: '100%', 'stop-color': '#8cebd5', 'stop-opacity': '.24' })),
    sv('linearGradient', { id: 'login-prism-beam', x1: '0', y1: '0', x2: '1', y2: '0' },
      sv('stop', { offset: '0%', 'stop-color': '#eafaff', 'stop-opacity': '0' }),
      sv('stop', { offset: '78%', 'stop-color': '#f1fbff', 'stop-opacity': '.9' }),
      sv('stop', { offset: '100%', 'stop-color': '#ffffff' })),
    sv('filter', { id: 'login-prism-glow', x: '-30%', y: '-100%', width: '180%', height: '300%' },
      sv('feGaussianBlur', { stdDeviation: '6' })));
  const colors = ['#a375ff', '#716fff', '#56afff', '#54e4cb', '#d7ee82', '#ffb46c', '#ff718e'];
  const rays = colors.map((color, index) => {
    const y = 55 + index * 80;
    return sv('path', { class: 'login-prism-ray', d: `M478 334 Q620 320 820 ${y}`, stroke: color, style: `--ray-delay:${index * 110}ms` });
  });
  const artwork = sv('svg', { viewBox: '0 0 860 620', preserveAspectRatio: 'xMidYMid meet', role: 'presentation' },
    defs,
    sv('circle', { cx: 390, cy: 330, r: 190, class: 'login-prism-halo' }),
    ...rays,
    sv('path', { d: 'M0 330 H355', class: 'login-prism-input', filter: 'url(#login-prism-glow)' }),
    sv('path', { d: 'M305 430 L430 190 L555 430 Z', fill: 'url(#login-prism-glass)', class: 'login-prism-body' }),
    sv('path', { d: 'M355 334 L478 334', class: 'login-prism-innerbeam' }),
    sv('path', { d: 'M305 430 L430 190 L555 430 Z', class: 'login-prism-edge' }),
    sv('path', { d: 'M430 190 V430', class: 'login-prism-cut' }),
    sv('circle', { cx: 355, cy: 330, r: 5, class: 'login-prism-core' }));
  return h('div', { class: 'login-prism', 'aria-hidden': 'true' }, artwork);
}
const loginPage = () => h('div', { class: 'login' }, loginPrism(), h('div', { class: 'card lcard' }, loginForm()));
/* ---------- views ---------- */
const sliderEl = (obj, key, label, hint, id) => { const o = h('output', { for: id }, obj[key]); const i = h('input', { type: 'range', id, min: 0, max: 100, value: obj[key], 'aria-label': label, oninput: () => { obj[key] = +i.value; o.textContent = i.value; S.dirty = true; } }); return h('div', { class: 'sl' }, h('label', { for: id }, label, h('span', { class: 'sm mut', style: 'display:block;font-weight:400' }, hint)), o, i); };
let clockFrame = 0, clockCleanup = null, prismCleanup = null;
function stopClock() { if (clockCleanup) { clockCleanup(); clockCleanup = null; } }
function stopPrism() { if (prismCleanup) { prismCleanup(); prismCleanup = null; } }
function makeClock() {
  const svg = sv('svg', { class: 'clock-face', viewBox: '0 0 500 500', role: 'img', 'aria-label': 'Precision analog clock showing local device time' });
  const defs = sv('defs');
  const metal = sv('linearGradient', { id: 'clock-metal', x1: '0', y1: '0', x2: '1', y2: '1' });
  [['0%', '#f5fbff'], ['18%', '#727d8e'], ['34%', '#f6fbff'], ['52%', '#596273'], ['72%', '#e4edf6'], ['100%', '#465064']].forEach(([offset, color]) => metal.append(sv('stop', { offset, 'stop-color': color })));
  const face = sv('radialGradient', { id: 'clock-dial', cx: '.38', cy: '.3', r: '.8' });
  [['0%', '#18263a'], ['65%', '#0b1422'], ['100%', '#050a12']].forEach(([offset, color]) => face.append(sv('stop', { offset, 'stop-color': color })));
  const hand = sv('linearGradient', { id: 'clock-hand', x1: '0', y1: '0', x2: '1', y2: '0' });
  [['0%', '#7c8797'], ['45%', '#ffffff'], ['62%', '#dce7f1'], ['100%', '#687384']].forEach(([offset, color]) => hand.append(sv('stop', { offset, 'stop-color': color })));
  const spectrum = sv('linearGradient', { id: 'clock-spectrum', x1: '0', y1: '0', x2: '1', y2: '0' });
  [['0%', 'var(--spectrum-violet)'], ['17%', 'var(--spectrum-indigo)'], ['34%', 'var(--spectrum-blue)'], ['51%', 'var(--spectrum-green)'], ['68%', 'var(--spectrum-yellow)'], ['84%', 'var(--spectrum-orange)'], ['100%', 'var(--spectrum-red)']].forEach(([offset, color]) => spectrum.append(sv('stop', { offset, 'stop-color': color })));
  const glow = sv('filter', { id: 'clock-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' });
  glow.append(sv('feGaussianBlur', { stdDeviation: '3', result: 'blur' }));
  defs.append(metal, face, hand, spectrum, glow);
  svg.append(defs);
  const addText = (text, attrs) => { const node = sv('text', attrs); node.textContent = text; svg.append(node); };
  svg.append(
    sv('circle', { class: 'clock-case', cx: 250, cy: 250, r: 244 }),
    sv('circle', { class: 'clock-bezel', cx: 250, cy: 250, r: 231 }),
    sv('circle', { class: 'clock-bezel-line', cx: 250, cy: 250, r: 222 }),
    sv('circle', { class: 'clock-dial', cx: 250, cy: 250, r: 211, fill: 'url(#clock-dial)' }),
    sv('circle', { class: 'clock-etch', cx: 250, cy: 250, r: 188 }),
    sv('circle', { class: 'clock-etch fine', cx: 250, cy: 250, r: 174 })
  );
  for (let index = 0; index < 60; index++) {
    const major = index % 5 === 0;
    svg.append(sv('g', { transform: `rotate(${index * 6} 250 250)` }, sv('line', {
      class: major ? 'clock-hour-marker' : 'clock-minute-marker',
      x1: 250, y1: major ? 43 : 44, x2: 250, y2: major ? 68 : 52,
      style: `--marker-delay:${(index / 5) * 45}ms`
    })));
  }
  Array.from({ length: 6 }, (_, i) => {
    const angle = i * Math.PI / 3 - Math.PI / 2, x = 250 + Math.cos(angle) * 145, y = 250 + Math.sin(angle) * 145;
    addText(String(i * 10).padStart(2, '0'), { class: 'clock-number', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  });
  addText('PRISM  /  ENGINE', { class: 'clock-brand', x: 250, y: 149, 'text-anchor': 'middle' });
  addText('CAREER MOMENTUM', { class: 'clock-caption', x: 250, y: 360, 'text-anchor': 'middle' });
  const screws = Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4 - Math.PI / 2, x = 250 + Math.cos(angle) * 231, y = 250 + Math.sin(angle) * 231;
    return sv('g', { transform: `translate(${x} ${y})` }, sv('circle', { class: 'clock-screw', r: 4.4 }), sv('path', { class: 'clock-screw-slot', d: 'M-2.2 0H2.2' }));
  });
  screws.forEach(screw => svg.append(screw));
  const hourHand = sv('g', { id: 'clock-hour-hand', class: 'clock-hand' }, sv('path', { d: 'M250 263 L241 255 L244 171 Q250 151 256 171 L259 255Z', fill: 'url(#clock-hand)' }));
  const minuteHand = sv('g', { id: 'clock-minute-hand', class: 'clock-hand' }, sv('path', { d: 'M250 263 L244 255 L246 110 Q250 92 254 110 L256 255Z', fill: 'url(#clock-hand)' }));
  const secondHand = sv('g', { id: 'clock-second-hand', class: 'clock-hand' },
    sv('path', { class: 'clock-second-trail', d: 'M222 93 A160 160 0 0 1 250 90', fill: 'none', stroke: 'url(#clock-spectrum)' }),
    sv('path', { class: 'clock-second', d: 'M250 282 L247.5 256 L248.5 103 L250 87 L251.5 103 L252.5 256Z' }));
  svg.append(hourHand, minuteHand, secondHand,
    sv('circle', { class: 'clock-hub-shadow', cx: 250, cy: 250, r: 17 }),
    sv('circle', { class: 'clock-hub', cx: 250, cy: 250, r: 12 }),
    sv('circle', { class: 'clock-core', cx: 250, cy: 250, r: 4.2 }));
  return svg;
}
function startClock(svg) {
  stopClock();
  const shell = svg.closest('.clock-shell'), stage = svg.closest('.clock-stage');
  const core = svg.querySelector('.clock-core');
  let previousSecond = -1, pointerFrame = 0;
  const hour = svg.querySelector('#clock-hour-hand'), minute = svg.querySelector('#clock-minute-hand'), second = svg.querySelector('#clock-second-hand');
  const animate = () => {
    if (!svg.isConnected) return stopClock();
    if (!document.hidden) {
      const now = new Date(), fractionalSecond = now.getSeconds() + now.getMilliseconds() / 1000;
      const fractionalMinute = now.getMinutes() + fractionalSecond / 60;
      const fractionalHour = now.getHours() % 12 + fractionalMinute / 60;
      hour.style.transform = `rotate(${fractionalHour * 30}deg)`;
      minute.style.transform = `rotate(${fractionalMinute * 6}deg)`;
      second.style.transform = `rotate(${fractionalSecond * 6}deg)`;
      if (now.getSeconds() !== previousSecond) {
        previousSecond = now.getSeconds();
        svg.setAttribute('aria-label', `Precision analog clock showing local device time ${now.toLocaleTimeString()}`);
        core.classList.remove('tick');
        void core.getBoundingClientRect();
        core.classList.add('tick');
      }
      clockFrame = requestAnimationFrame(animate);
    } else clockFrame = 0;
  };
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(clockFrame); clockFrame = 0; }
    else if (!clockFrame) animate();
  };
  const pointer = event => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const bounds = stage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5, y = (event.clientY - bounds.top) / bounds.height - .5;
      shell.style.setProperty('--tilt-x', `${-y * 2.2}deg`);
      shell.style.setProperty('--tilt-y', `${x * 2.2}deg`);
      shell.style.setProperty('--depth-y', `${-y * 5}px`);
      pointerFrame = 0;
    });
  };
  const resetPointer = () => { shell.style.setProperty('--tilt-x', '0deg'); shell.style.setProperty('--tilt-y', '0deg'); shell.style.setProperty('--depth-y', '0px'); };
  const scroll = () => stage.style.setProperty('--clock-scroll-y', `${-Math.min(window.scrollY, 320) * .035}px`);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('visibilitychange', visibility);
  if (!reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', pointer);
    stage.addEventListener('pointerleave', resetPointer);
  }
  if (!reducedMotion) addEventListener('scroll', scroll, { passive: true });
  clockCleanup = () => {
    cancelAnimationFrame(clockFrame); cancelAnimationFrame(pointerFrame); clockFrame = 0;
    document.removeEventListener('visibilitychange', visibility);
    stage.removeEventListener('pointermove', pointer); stage.removeEventListener('pointerleave', resetPointer);
    removeEventListener('scroll', scroll);
  };
  const hero = svg.closest('.prism-hero');
  requestAnimationFrame(() => hero.classList.add('clock-ready'));
  animate();
}
function splash() {
  const copy = h('div', { class: 'hero-copy' }, h('span', { class: 'hero-kicker' }, 'PRISM ENGINE  /  CAREER INTELLIGENCE'), h('h1', {}, 'Find the path that ', h('em', {}, 'fits you'), ', your family and the market.'), h('p', { class: 'mut hero-description' }, 'PRISM combines your strengths, your family’s budget and live-style labour-market signals into explainable career guidance, calculated by SARASH.'),
    h('div', { class: 'row hero-actions' }, h('a', { class: 'btn pri lg', href: '#/assess', style: 'display:inline-grid;place-content:center;text-decoration:none' }, S.me ? 'Open My Dashboard' : 'Start My PRISM Assessment'), !S.me && h('button', { class: 'btn ghost', onclick: loginDlg }, 'Already have a PRISM ID? Log in')));
  const prismFallback = sv('svg', { class: 'prism-fallback', viewBox: '0 0 320 320', 'aria-hidden': 'true' },
    sv('defs', {}, sv('linearGradient', { id: 'hero-prism-fallback', x1: '0', y1: '0', x2: '1', y2: '1' },
      sv('stop', { offset: '0%', 'stop-color': '#c7f8ff', 'stop-opacity': '.45' }),
      sv('stop', { offset: '48%', 'stop-color': '#8f8cff', 'stop-opacity': '.18' }),
      sv('stop', { offset: '100%', 'stop-color': '#63f1df', 'stop-opacity': '.35' }))),
    sv('path', { d: 'M10 159H111', class: 'fallback-beam' }),
    sv('path', { d: 'M111 160L160 76L209 160L160 244Z', fill: 'url(#hero-prism-fallback)', class: 'fallback-prism' }),
    sv('path', { d: 'M111 160L160 76L209 160L160 244Z', class: 'fallback-prism-edge' }),
    ...['#53eaff', '#628cff', '#916cff', '#df71ff'].map((color, i) => sv('path', {
      d: `M208 160Q246 ${136 + i * 8} 310 ${103 + i * 34}`, stroke: color, class: 'fallback-ray'
    })));
  const prismCanvas = h('canvas', { class: 'prism-canvas', 'aria-hidden': 'true' });
  const prismWindow = h('div', { class: 'prism-window prism-fallback-active', 'aria-hidden': 'true' }, prismFallback, prismCanvas);
  const stage = h('div', { class: 'clock-stage' }, h('div', { class: 'clock-dust', 'aria-hidden': 'true' }), prismWindow, h('div', { class: 'clock-shell' }, h('div', { class: 'clock-spectrum', 'aria-hidden': 'true' }), makeClock(), h('div', { class: 'clock-glass', 'aria-hidden': 'true' })));
  const guidance = [
    ['FIT_01', 'Interests + strengths -> fitting careers'],
    ['PATH_02', 'Education + projects -> next steps'],
    ['MARKET_03', 'Demand + growth -> informed choices']
  ];
  const guide = h('div', { class: 'hero-guidance', 'aria-label': 'Career guidance signals' }, h('div', { class: 'guidance-heading' }, 'CAREER GUIDANCE / SIGNALS'),
    ...guidance.map(([code, detail]) => h('div', { class: 'guidance-line' }, h('code', {}, code), h('span', {}, detail))));
  return h('section', { class: 'hero prism-hero' }, copy, stage, guide);
}
const draft = { name: '', dob: '', location: 'Chennai', pin: '', consent: false, student: Object.fromEntries(Object.keys(LBL).map(k => [k, 50])), parent: { budget_lakh: 10, loan_willingness: 50, risk_tolerance: 50, location_flexibility: 50, duration_tolerance: 50 }, choices: [{ career: '', preference: 80 }, { career: '', preference: 70 }, { career: '', preference: 60 }] };
let step = 0;
function assess() {
  const T = ['About you', 'Your interests', 'Your abilities', 'Your top 3 choices', 'Family section', 'Review & submit'];
  const err = h('p', { class: 'err', role: 'alert' }), body = h('div'), cs = S.health.careers;
  const text = (k, l, extra = {}) => [h('label', { for: 'f' + k }, l), h('input', { type: 'text', id: 'f' + k, value: draft[k], ...extra, oninput: e => { draft[k] = e.target.value; S.dirty = true; } })];
  if (step === 0) body.append(...text('name', 'Student name', { maxlength: 60, autocomplete: 'name' }), ...text('dob', 'Date of birth (DDMMYYYY)', { inputmode: 'numeric', maxlength: 8, placeholder: '15082008' }), h('label', { for: 'floc' }, 'City'), h('select', { id: 'floc', onchange: e => draft.location = e.target.value }, ['Chennai', 'Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Kolkata'].map(c => h('option', { selected: c === draft.location }, c))));
  if (step === 1) { body.append(h('p', { class: 'mut' }, 'How much does each statement describe you? (0 = not at all, 100 = very much)')); 'RIASEC'.split('').forEach(k => body.append(sliderEl(draft.student, k, LBL[k], HINT[k], 's' + k))); }
  if (step === 2) { body.append(h('p', { class: 'mut' }, 'Rate your current ability honestly. This is a self-rating, not a test.')); ['analytical', 'quantitative', 'creative', 'communication', 'spatial'].forEach(k => body.append(sliderEl(draft.student, k, LBL[k], HINT[k], 's' + k))); }
  if (step === 3) draft.choices.forEach((c, i) => body.append(h('label', { for: 'c' + i }, `Choice ${i + 1}`), h('select', { id: 'c' + i, onchange: e => { c.career = e.target.value; S.dirty = true; } }, h('option', { value: '' }, 'Select a career…'), cs.map(x => h('option', { value: x, selected: x === c.career }, x))), sliderEl(c, 'preference', 'How much do you want this?', '', 'p' + i)));
  if (step === 4) { body.append(h('label', { for: 'bud' }, 'Family education budget (₹ lakh)'), h('input', { type: 'number', id: 'bud', min: 0, max: 500, step: .5, value: draft.parent.budget_lakh, oninput: e => { draft.parent.budget_lakh = e.target.value; S.dirty = true; } })); [['loan_willingness', 'Willingness to take an education loan'], ['risk_tolerance', 'Comfort with uncertain career outcomes'], ['location_flexibility', 'Willingness to study in another city'], ['duration_tolerance', 'Comfort with longer study duration']].forEach(([k, l]) => body.append(sliderEl(draft.parent, k, l, '', 'q' + k))); }
  if (step === 5) body.append(h('div', { class: 'card', style: 'margin-bottom:12px' }, h('b', {}, draft.name), h('p', { class: 'sm mut' }, `${draft.location} · Budget ₹${draft.parent.budget_lakh} lakh · ${draft.choices.map(c => c.career).join(', ')}`)), h('label', { for: 'pin' }, 'Create a 4–8 digit PIN (used with your Applicant ID to return later)'), h('input', { type: 'password', id: 'pin', inputmode: 'numeric', maxlength: 8, autocomplete: 'new-password', oninput: e => draft.pin = e.target.value }), h('label', {}, h('input', { type: 'checkbox', onchange: e => draft.consent = e.target.checked }), ' I consent to my answers being processed to generate my PRISM result.'));
  const check = () => { if (step === 0) { if (!/^[\w .'-]{1,60}$/.test(draft.name.trim())) return 'Please enter the student’s name.'; if (!/^\d{8}$/.test(draft.dob)) return 'Enter date of birth as 8 digits, DDMMYYYY.'; } if (step === 3) { if (draft.choices.some(c => !c.career)) return 'Please choose all three careers.'; if (new Set(draft.choices.map(c => c.career)).size < 3) return 'Please choose three different careers.'; } if (step === 4 && !(+draft.parent.budget_lakh >= 0)) return 'Enter a valid budget.'; if (step === 5) { if (!/^\d{4,8}$/.test(draft.pin)) return 'PIN must be 4–8 digits.'; if (!draft.consent) return 'Please give consent to continue.'; } return ''; };
  const next = async () => { const m = check(); err.textContent = m; if (m) return; if (step < 5) { step++; route(); return; } if (await confirmDlg('Submit final assessment?', 'SARASH will now analyse your answers. You can log in later with your Applicant ID, date of birth and PIN.', 'Generate my result')) analyse(); };
  return h('div', { style: 'max-width:720px;margin:auto' }, h('div', { class: 'prog', role: 'progressbar', 'aria-valuenow': step + 1, 'aria-valuemax': 6 }, h('i', { style: `width:${(step + 1) / 6 * 100}%` })), h('p', { class: 'sm mut' }, `Step ${step + 1} of 6`), h('h2', {}, T[step]), h('div', { class: 'card' }, body, err, h('div', { class: 'row', style: 'margin-top:20px' }, step > 0 && h('button', { class: 'btn', onclick: () => { step--; route(); } }, 'Back'), h('button', { class: 'btn pri', onclick: next }, step === 5 ? 'Generate my result' : 'Continue'))));
}
async function analyse() {
  const msgs = ['Analysing your profile…', 'Comparing career compatibility…', 'Checking family feasibility…', 'Reviewing current market signals…', 'Preparing your PRISM result…']; let i = 0;
  const m = h('p', { class: 'mut', 'aria-live': 'polite' }, msgs[0]); const t = setInterval(() => m.textContent = msgs[Math.min(++i, 4)], 650);
  view.replaceChildren(h('div', { style: 'max-width:560px;margin:60px auto;text-align:center' }, h('h2', {}, 'Generating Results…'), m, h('div', { class: 'sk' }), h('div', { class: 'sk', style: 'width:70%' }), h('div', { class: 'sk', style: 'width:85%' })));
  try {
    const [r] = await Promise.all([api('/api/assess', { name: draft.name.trim(), dob: draft.dob, pin: draft.pin, location: draft.location, student: draft.student, parent: draft.parent, choices: draft.choices }), new Promise(r => setTimeout(r, 3300))]);
    S.me = r.result; S.dirty = false; draft.pin = ''; updateAuth(); chatReset(); location.hash = '#/results'; route();
  } catch (e) { toast(e.message); step = 5; route(); }
}
function results() {
  const r = S.me; if (!r) return h('div', { class: 'card', style: 'max-width:560px;margin:40px auto;text-align:center' }, h('h2', {}, 'No result yet'), h('p', { class: 'mut' }, 'Complete your assessment to generate your personalized PRISM analysis.'), h('a', { class: 'btn pri', href: '#/assess', style: 'display:inline-grid;place-content:center;text-decoration:none' }, 'Start My PRISM Assessment'), h('p', { class: 'sm' }, 'Returning applicant? ', h('a', { href: '#', onclick: e => { e.preventDefault(); loginDlg(); } }, 'Log in')));
  const P = r.predictions, top = P[0], good = top.sarash_score >= r.config.celebration_threshold, C = 2 * Math.PI * 88;
  const ringV = sv('circle', { class: 'v', cx: 100, cy: 100, r: 88, 'stroke-dasharray': C, 'stroke-dashoffset': C }), num = h('div', { class: 'score' }, '0.0');
  setTimeout(() => { ringV.setAttribute('stroke-dashoffset', C * (1 - top.sarash_score / 100)); countUp(num, top.sarash_score); }, 200);
  if (good && !S.celebrated.has(r.id)) { S.celebrated.add(r.id); setTimeout(confetti, 500); }
  const metric = (l, v, sub, inv) => h('div', { class: 'card' }, h('div', { class: 'sm mut' }, l), h('div', { class: 'score' }, v.toFixed(1)), h('div', { class: 'sm mut', style: 'margin:6px 0' }, sub), bar(v, inv));
  const card = (p, i) => h('details', { class: 'card' + (i === 0 ? ' top1' : ''), open: i === 0 }, h('summary', {}, `#${i + 1} ${p.career} — SARASH ${p.sarash_score}/100 · ${band(p.sarash_score)}`),
    h('div', { class: 'row', style: 'margin:12px 0' }, h('span', { class: 'badge calc' }, '✓ Calculated by SARASH'), h('span', { class: 'badge' }, `Fit ${p.match_score}`), h('span', { class: 'badge' }, `Feasibility ${p.parent_feasibility}`), h('span', { class: 'badge' }, `Market ${p.market_score}`)),
    h('p', {}, h('b', {}, 'Why recommended: '), `Based on your current assessment, this pathway appears compatible with you (profile similarity ${p.cosine_similarity}%). Your strongest matching areas are ${p.strengths.join(' and ')}.`),
    h('p', {}, h('b', {}, 'Develop next: '), p.gaps.length ? p.gaps.join(', ') : 'No major gaps found against this career’s typical profile.'),
    h('p', {}, h('b', {}, 'Family feasibility: '), `Estimated study cost ≈ ₹${p.course_cost_lakh} lakh vs budget ₹${r.parent.budget_lakh} lakh. Conflict Index ${p.conflict_index}/100 (${p.conflict_index < 30 ? 'low' : p.conflict_index < 60 ? 'moderate' : 'high'}) — ${p.conflict_index >= 60 ? 'consider scholarships, loans or a lower-cost alternative.' : 'currently manageable.'} Costs are estimates and vary by institution.`),
    h('p', {}, h('b', {}, 'Pathway: '), p.pathway), h('p', {}, h('b', {}, 'Main risk: '), p.market.growth_yoy < 5 ? 'Hiring growth is currently modest; build specialised skills.' : 'Fast-moving field; skills need continuous updating.'),
    h('h3', {}, 'Market evidence'), h('div', { class: 'grid' }, p.market_sources.map(s => h('div', { class: 'sm market-source' }, h('div', { class: 'market-source-head' }, h('b', {}, s.source), ' ', h('span', { class: 'badge' }, s.type), ' ', fresh(s)), h('div', { class: 'mut' }, `${s.note} (period: ${s.as_of})`),
      s.jobs?.length && h('ul', { class: 'job-list' }, s.jobs.slice(0, 3).map(job => {
        const title = job.url ? h('a', { href: job.url, target: '_blank', rel: 'noopener noreferrer' }, job.title) : job.title;
        const salary = job.salary_min && job.salary_max ? ` · INR ${Number(job.salary_min).toLocaleString()}–${Number(job.salary_max).toLocaleString()}` : job.salary_min ? ` · INR ${Number(job.salary_min).toLocaleString()}+` : '';
        return h('li', {}, title, job.company && ` · ${job.company}`, job.location && ` · ${job.location}`, salary);
      }))))));
  return h('div', { class: good ? 'celebrate' : '' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', {}, h('h1', { style: 'font-size:clamp(26px,4vw,40px)' }, good ? 'Excellent alignment! 🎉' : band(top.sarash_score)), h('p', { class: 'mut' }, good ? 'Your profile shows strong compatibility with this pathway.' : 'Based on your current assessment.')), h('div', { class: 'sm mut' }, h('b', {}, r.id), h('br'), 'Assessed ' + r.created.slice(0, 10) + ' · Calculated ' + r.calculated_at.slice(0, 10))),
    h('div', { class: 'grid g2', style: 'margin:16px 0' }, h('div', { class: 'card row' }, h('div', { class: 'ring' }, sv('svg', { viewBox: '0 0 200 200', width: 200, height: 200 }, sv('circle', { class: 't', cx: 100, cy: 100, r: 88 }), ringV), h('div', { class: 'n' }, num, h('div', { class: 'sm mut' }, 'PRISM / SARASH'))), h('div', {}, h('h3', {}, top.career), h('span', { class: 'badge calc' }, '✓ Calculated by SARASH'), ' ', h('span', { class: 'badge' }, '✎ Explained by PRISM AI Guide'), h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn pri', onclick: () => openChat('Why is ' + top.career + ' recommended?') }, 'Ask PRISM AI Guide'), h('button', { class: 'btn noprint', onclick: () => print() }, 'Download My PRISM Report')))),
      h('div', { class: 'grid g2' }, metric('Student Fit', top.match_score, 'Higher is better'), metric('Family Feasibility', top.parent_feasibility, 'Higher is better'), metric('Market Opportunity', top.market_score, 'Higher is better'), metric('Conflict Index', top.conflict_index, 'Lower is better', true))),
    h('div', { class: 'grid g2', style: 'margin-bottom:16px' }, h('div', { class: 'card' }, h('h3', {}, 'Student abilities'), radar(['quantitative', 'analytical', 'creative', 'communication', 'spatial'].map(k => LBL[k]), ['quantitative', 'analytical', 'creative', 'communication', 'spatial'].map(k => r.student[k]), 'Radar chart of student abilities')), h('div', { class: 'card' }, h('h3', {}, 'RIASEC interests (six dimensions)'), radar([...'RIASEC'].map(k => LBL[k]), [...'RIASEC'].map(k => r.student[k]), 'Radar chart of RIASEC interests'))),
    h('h2', {}, 'Top 3 recommendations'), h('div', { class: 'grid' }, P.map(card)),
    h('p', { class: 'sm mut', style: 'margin-top:24px' }, 'PRISM is decision support, not a scientific prediction of a perfect career. SARASH was trained on synthetic labels generated from PRISM design logic; real-world accuracy has not been validated. Adzuna listing counts and advertised salaries are live-search snapshots when configured; hiring-growth signals remain periodic public snapshots. The AI Guide explains results and never changes scores.'));
}
const FAQ = [['How is my score calculated?', 'SARASH, a small neural network, combines your profile, your family’s constraints and market signals. The AI Guide only explains the numbers.'], ['I forgot my Applicant ID.', 'Applicant ID recovery needs a support service, which is not connected in this local build.'], ['How do I download my report?', 'Open Results and press “Download My PRISM Report”, then choose Save as PDF in the print dialog.'], ['Is the market data real-time?', 'When configured, Adzuna provides current job-search results and advertised salary estimates. Listing counts can change and are not a guarantee of availability. Hiring-growth figures still come from dated public snapshots.']];
const help = () => h('div', { style: 'max-width:760px;margin:auto' }, h('h1', { style: 'font-size:36px' }, 'Help & Support'), FAQ.map(([q, a]) => h('details', { class: 'card', style: 'margin-bottom:10px' }, h('summary', {}, q), h('p', { class: 'mut' }, a))), h('p', { class: 'sm mut' }, 'Support ticketing will be connected later.'));
const privacy = () => h('div', { style: 'max-width:760px;margin:auto' }, h('h1', { style: 'font-size:36px' }, 'Privacy & Security'), [['What we collect', 'Name, date of birth, city, interest and ability self-ratings, three career choices, and family budget/loan/risk preferences.'], ['Why', 'Only to calculate your SARASH result and let the AI Guide explain it. Nothing is sold or shared.'], ['How we protect it', 'Date of birth and PIN are stored as salted scrypt hashes. Sessions use HTTP-only, SameSite cookies. Login and chat are rate limited. Secrets stay on the server.'], ['AI Guide', 'It only sees your own verified results. It cannot change scores or access other applicants.'], ['Market data', 'Adzuna job listings and advertised salaries are fetched server-side when configured. Hiring-growth signals use dated public snapshots (Naukri JobSpeak and foundit Insights Tracker).']].map(([a, b]) => h('div', { class: 'card', style: 'margin-bottom:10px' }, h('h3', {}, a), h('p', { class: 'mut' }, b))));

/* ---------- chat ---------- */
let msgs = [], busy = false, ctl = null; const chat = $('#chat'), fab = $('#fab');
const PROMPTS = ['Suggest a major for me', 'Why is my top career recommended?', 'Explain my conflict score', 'Which career has the strongest market?'];
function chatReset() { msgs = []; if (!chat.hidden) drawChat(); }
function openChat(pre) { chat.hidden = false; fab.setAttribute('aria-expanded', 'true'); drawChat(); if (pre) send(pre); else $('#cin').focus(); }
function closeChat() { chat.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
fab.onclick = () => chat.hidden ? openChat() : closeChat(); $('#bGuide').onclick = () => openChat();
chat.addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });
function drawChat() {
  const list = h('div', { class: 'msgs', 'aria-live': 'polite', id: 'msgs' });
  list.append(h('div', { class: 'm s' }, S.me ? '🔒 Using your SARASH results · market data: periodic snapshots' : 'Not signed in: general answers only. Complete the assessment to personalise.'));
  if (!msgs.length) list.append(h('div', { style: 'text-align:center;padding:12px' }, h('div', { style: 'font-size:34px' }, '✦'), h('h3', {}, 'Hi, I’m PRISM AI Guide'), h('p', { class: 'mut sm' }, 'I explain your results in plain language. I never change your scores.')), h('div', { class: 'prm' }, PROMPTS.map(p => h('button', { onclick: () => send(p) }, p))));
  msgs.forEach((m, i) => list.append(bubble(m, i)));
  const ta = h('textarea', { id: 'cin', rows: 1, placeholder: 'Ask me anything...', 'aria-label': 'Message', onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey && innerWidth > 820) { e.preventDefault(); send(); } } });
  const mic = h('button', { class: 'btn', 'aria-label': 'Voice input', onclick: () => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast('Voice input is not supported in this browser.'); const r = new SR(); r.onresult = e => ta.value += e.results[0][0].transcript; r.start(); toast('Listening…'); } }, '🎤');
  const go = h('button', { class: 'btn pri', id: 'csend', 'aria-label': busy ? 'Stop generating' : 'Send', onclick: () => busy ? ctl.abort() : send() }, busy ? '■' : '➤');
  chat.replaceChildren(h('header', {}, h('span', { style: 'font-size:22px' }, '✦'), h('b', {}, 'PRISM AI Guide'), h('button', { class: 'btn ghost', 'aria-label': 'Close chat', onclick: closeChat }, '✕')), list, h('div', { class: 'cmp' }, mic, ta, go)); list.scrollTop = list.scrollHeight;
}
function bubble(m, i) {
  const b = h('div', { class: 'm ' + (m.role === 'user' ? 'u' : 'a') }); if (m.role === 'user') { b.textContent = m.content; return b; }
  const c = h('div'); c.innerHTML = m.content ? md(m.content) : '<span class="dots"><i></i><i></i><i></i></span>'; b.append(c);
  if (m.done) b.append(h('div', { class: 'mact' }, h('button', { 'aria-label': 'Copy', onclick: () => { navigator.clipboard?.writeText(m.content); toast('Copied'); } }, '⧉'), i === msgs.length - 1 && h('button', { 'aria-label': 'Regenerate', onclick: () => { const q = msgs[i - 1].content; msgs.splice(i - 1); send(q); } }, '↻'), h('button', { 'aria-label': 'Helpful', onclick: () => toast('Thanks for the feedback') }, '👍'), h('button', { 'aria-label': 'Not helpful', onclick: () => toast('Thanks, we’ll improve') }, '👎'), i === msgs.length - 1 && msgs[i - 1] && h('button', { 'aria-label': 'Edit my message', onclick: () => { const q = msgs[i - 1].content; msgs.splice(i - 1); drawChat(); $('#cin').value = q; $('#cin').focus(); } }, '✎')));
  return b;
}
async function send(text) {
  const ta = $('#cin'); const q = (text ?? ta.value).trim(); if (!q || busy) return; if (chat.hidden) { chat.hidden = false; fab.setAttribute('aria-expanded', 'true'); }
  const hist = msgs.filter(m => m.done || m.role === 'user').slice(-8).map(({ role, content }) => ({ role, content }));
  msgs.push({ role: 'user', content: q }); const a = { role: 'assistant', content: '', done: false }; msgs.push(a); busy = true; ctl = new AbortController(); drawChat();
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PRISM': '1' }, body: JSON.stringify({ message: q, history: hist }), signal: ctl.signal });
    if (!r.ok) throw new Error((await r.json()).error?.message); const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); const parts = buf.split('\n\n'); buf = parts.pop(); for (const p of parts) { const d = p.replace(/^data: /, ''); if (d === '[DONE]') continue; a.content += JSON.parse(d).t; const box = $('#msgs')?.lastChild?.firstChild; if (box) { box.innerHTML = md(a.content); $('#msgs').scrollTop = $('#msgs').scrollHeight; } } }
  } catch (e) { if (e.name !== 'AbortError') { a.content = (a.content || '') + '\n\n⚠ ' + (e.message || 'Connection problem.') + ' Please try again.'; } }
  a.done = true; busy = false; drawChat();
}

/* ---------- router ---------- */
const ORDER = ['/', '/login', '/assess', '/results', '/dash', '/help', '/privacy']; let cur = null, tm;
function route() {
  stopClock(); stopPrism();
  const p = location.hash.slice(1) || '/'; document.body.classList.toggle('metal', p === '/login');
  document.querySelectorAll('.dnav a,.bnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + p));
  const f = { '/': splash, '/login': loginPage, '/assess': assess, '/results': results, '/dash': results, '/help': help, '/privacy': privacy }[p] || splash;
  const fwd = ORDER.indexOf(p) >= ORDER.indexOf(cur ?? p), old = view.firstElementChild; clearTimeout(tm);
  const swap = () => {
    const n = f();
    if (!RM) {
      n.classList.add(fwd ? 'enter-r' : 'enter-l');
      let transitionTimer;
      const clearTransition = event => {
        if (event && event.target !== n) return;
        n.classList.remove('enter-r', 'enter-l');
        n.removeEventListener('animationend', clearTransition);
        clearTimeout(transitionTimer);
      };
      n.addEventListener('animationend', clearTransition);
      transitionTimer = setTimeout(() => clearTransition(), 700);
    }
    view.replaceChildren(n);
    const clock = n.querySelector('.clock-face');
    if (clock) startClock(clock);
    const prism = n.querySelector('.prism-canvas');
    if (prism) prismCleanup = mountPrism(prism);
    scrollTo(0, 0);
  };
  if (old && cur !== p && !RM) { old.classList.add('leave'); tm = setTimeout(swap, 210); } else swap();
  cur = p;
}
addEventListener('hashchange', route);
(async () => { try { S.health = await api('/api/health'); } catch { toast('Server not reachable.'); } try { S.me = (await api('/api/me')).result; } catch { } updateAuth(); route(); })();
