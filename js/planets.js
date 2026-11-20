// =====================================================================
//  planets.js — 행성의 운동 실험실 (내행성·외행성, 위치 관계, 역행, 회합 주기)
// =====================================================================
import * as A from './astro.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const TAU = Math.PI * 2;
const TZ = 9;

const KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const MAXD = { mercury: 13, venus: 66, mars: 25, jupiter: 50, saturn: 21, uranus: 4.1, neptune: 2.4 };
// 태양이 각 황도 별자리에 들어가는 황경 (J2000, IAU 경계 근사)
const ZODIAC = [[351.6, '물고기자리'], [28.7, '양자리'], [53.4, '황소자리'], [90.1, '쌍둥이자리'], [117.9, '게자리'], [138.0, '사자자리'], [174.0, '처녀자리'], [217.8, '천칭자리'], [241.0, '전갈자리'], [247.7, '뱀주인자리'], [266.3, '궁수자리'], [299.7, '염소자리'], [327.5, '물병자리']];

const params = new URLSearchParams(location.search);
const state = {
  mode: 'real', frame: 'helio', strip: 'time',
  key: KEYS.includes(params.get('planet')) ? params.get('planet') : 'mars',
  customA: 1.52, incl: 0,
  t: A.jdFromDate(new Date()),
  playing: false, speed: 15, zoom: 1,
};
const opt = () => ({
  sight: $('#optSight').checked, sun: $('#optSun').checked, elong: $('#optElong').checked,
  retro: $('#optRetro').checked, trail: $('#optTrail').checked, labels: $('#optLabels').checked,
});

// ------------------------------------------------------------------ 물리 모델
const isReal = () => state.mode === 'real';
function conceptA() { return state.key === 'custom' ? state.customA : A.PLANETS[state.key].el[0]; }
function planetA() { return isReal() ? A.PLANETS[state.key].el[0] : conceptA(); }
function earthPeriod() { return isReal() ? A.PLANETS.earth.period : 365.25; }
function planetPeriod() { return isReal() ? A.PLANETS[state.key].period : 365.25 * Math.pow(conceptA(), 1.5); }
function synodic() { return 1 / Math.abs(1 / planetPeriod() - 1 / earthPeriod()); }
const isInner = () => planetA() < 1;
function earthPos(t) {
  if (isReal()) return A.heliocentric('earth', t);
  const th = (TAU * t) / 365.25;
  return [Math.cos(th), Math.sin(th), 0];
}
function planetPos(t) {
  if (isReal()) return A.heliocentric(state.key, t);
  const a = conceptA(), th = (TAU * t) / planetPeriod(), i = state.incl * A.DEG, node = 40 * A.DEG;
  const x0 = a * Math.cos(th - node), y0 = a * Math.sin(th - node);
  const x1 = x0, y1 = y0 * Math.cos(i), z1 = y0 * Math.sin(i);
  return [x1 * Math.cos(node) - y1 * Math.sin(node), x1 * Math.sin(node) + y1 * Math.cos(node), z1];
}
function geo(t) {
  const E = earthPos(t), P = planetPos(t);
  const g = [P[0] - E[0], P[1] - E[1], P[2] - E[2]];
  const dist = Math.hypot(...g), r = Math.hypot(...P), rE = Math.hypot(...E);
  const lon = A.norm360(A.atan2d(g[1], g[0])), lat = A.asind(g[2] / dist);
  const sunLon = A.norm360(A.atan2d(-E[1], -E[0]));
  const elong = A.acosd((-E[0] * g[0] - E[1] * g[1] - E[2] * g[2]) / (rE * dist));
  const phase = A.acosd((r * r + dist * dist - rE * rE) / (2 * r * dist));
  const dlam = A.norm180(lon - sunLon);
  return { E, P, g, dist, r, rE, lon, lat, sunLon, elong, dlam, phase, illum: (1 + A.cosd(phase)) / 2 };
}
const rate = (t) => A.norm180(geo(t + 0.25).lon - geo(t - 0.25).lon) * 2; // °/일

// ------------------------------------------------------------------ 현상 찾기
let events = [], evRange = [0, 0], evKey = '';
function bisect(f, a, b, it = 40) {
  let fa = f(a);
  for (let i = 0; i < it; i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}
function goldenMax(f, a, b) {
  const g = 0.381966;
  let c = a + g * (b - a), d = b - g * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < 40; i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = a + g * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = b - g * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}
function findEvents(t0, t1) {
  const S = synodic(), step = Math.max(0.2, S / 700);
  const out = [];
  const inner = isInner();
  let prev = null;
  for (let t = t0; t <= t1 + step; t += step) {
    const gd = geo(t), rt = rate(t);
    const cur = { t, dlam: gd.dlam, rate: rt, elong: gd.elong, dist: gd.dist, rE: gd.rE };
    if (prev) {
      const cross = (key, target, name) => {
        const p = A.norm180(prev.dlam - target), c = A.norm180(cur.dlam - target);
        if (Math.abs(p) < 60 && Math.abs(c) < 60 && (p < 0) !== (c < 0)) {
          const te = bisect((x) => A.norm180(geo(x).dlam - target), prev.t, cur.t);
          out.push({ t: te, name: typeof name === 'function' ? name(te) : name, kind: key });
        }
      };
      if (inner) {
        cross('conj', 0, (te) => (geo(te).dist < geo(te).rE ? '내합' : '외합'));
      } else {
        cross('conj', 0, '합');
        cross('opp', 180, '충');
        cross('qe', 90, '동구');
        cross('qw', -90, '서구');
      }
      if ((prev.rate < 0) !== (cur.rate < 0)) {
        const te = bisect(rate, prev.t, cur.t);
        out.push({ t: te, name: prev.rate > 0 ? '유 (역행 시작)' : '유 (순행 시작)', kind: prev.rate > 0 ? 'stat1' : 'stat2' });
      }
      if (inner && prev.prev && prev.elong > prev.prev.elong && prev.elong >= cur.elong) {
        const te = goldenMax((x) => geo(x).elong, prev.prev.t, cur.t), gd = geo(te);
        out.push({ t: te, name: `${gd.dlam > 0 ? '동방' : '서방'} 최대 이각 ${gd.elong.toFixed(1)}°`, kind: gd.dlam > 0 ? 'gee' : 'gew' });
      }
    }
    cur.prev = prev ? { t: prev.t, elong: prev.elong } : null;
    prev = cur;
  }
  return out.sort((a, b) => a.t - b.t);
}
function ensureEvents() {
  const S = synodic();
  const key = `${state.mode}|${state.key}|${state.customA}|${state.incl}`;
  if (key !== evKey || state.t < evRange[0] + S * 0.3 || state.t > evRange[1] - S * 1.3) {
    evKey = key;
    evRange = [state.t - S * 1.2, state.t + S * 2.2];
    events = findEvents(evRange[0], evRange[1]);
    renderEvents();
  }
}

// ------------------------------------------------------------------ 캔버스
function setupCanvas(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
let M, S2;
function resize() { M = setupCanvas($('#cMain')); S2 = setupCanvas($('#cSub')); }
new ResizeObserver(resize).observe($('.stage'));
resize();

const COLORS = { earth: '#5fa8ff', sun: '#ffcc4d', pro: '#6ea8ff', retro: '#ff5c7a', ring: '#1b2547' };
function pColor() { return state.key === 'custom' ? '#e6e6ff' : A.PLANETS[state.key].color; }
function pName() { return state.key === 'custom' ? '가상 행성' : A.PLANETS[state.key].ko; }

function fmtT(t) {
  if (isReal()) { const c = A.civilFromJD(t, TZ); return `${c.y}.${String(c.m).padStart(2, '0')}.${String(c.d).padStart(2, '0')}`; }
  return `${Math.round(t)}일`;
}
function fmtTShort(t) {
  if (isReal()) { const c = A.civilFromJD(t, TZ); return `${String(c.y).slice(2)}.${c.m}.${c.d}`; }
  return `${Math.round(t)}일`;
}

function rayCircle(px, py, dx, dy, cx, cy, R) {
  const ox = px - cx, oy = py - cy;
  const b = ox * dx + oy * dy, c = ox * ox + oy * oy - R * R, disc = b * b - c;
  if (disc < 0) return null;
  const t = -b + Math.sqrt(disc);
  return t > 0 ? [px + dx * t, py + dy * t] : null;
}
function label(ctx, text, x, y, color = '#dfe6ff', align = 'left', size = 12.5, weight = 600) {
  ctx.font = `${weight} ${size}px Pretendard Variable, Pretendard, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(4,6,13,0.9)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function dot(ctx, x, y, r, color, glow = 0) {
  if (glow) { const g = ctx.createRadialGradient(x, y, 0, x, y, r * glow); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * glow, 0, TAU); ctx.fill(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function nearEvent(t, tol) {
  let best = null;
  for (const e of events) if (Math.abs(e.t - t) < tol && (!best || Math.abs(e.t - t) < Math.abs(best.t - t))) best = e;
  return best;
}

function drawRing(ctx, cx, cy, R) {
  const band = 13;
  ctx.save();
  ctx.lineWidth = band * 2; ctx.strokeStyle = 'rgba(40,52,100,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(110,140,220,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, R - band, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + band, 0, TAU); ctx.stroke();
  // 별자리 경계와 이름
  for (let i = 0; i < ZODIAC.length; i++) {
    const [l0, name] = ZODIAC[i], l1 = ZODIAC[(i + 1) % ZODIAC.length][0];
    const a0 = -l0 * A.DEG;
    ctx.strokeStyle = 'rgba(110,140,220,0.45)';
    ctx.beginPath(); ctx.moveTo(cx + (R - band) * Math.cos(a0), cy + (R - band) * Math.sin(a0)); ctx.lineTo(cx + (R + band) * Math.cos(a0), cy + (R + band) * Math.sin(a0)); ctx.stroke();
    const mid = l0 + A.norm360(l1 - l0) / 2, am = -mid * A.DEG;
    ctx.save();
    ctx.translate(cx + R * Math.cos(am), cy + R * Math.sin(am));
    let rot = am + Math.PI / 2;
    if (Math.sin(am) > 0) rot += Math.PI;
    ctx.rotate(rot);
    ctx.font = '600 11px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(170,190,240,0.85)'; ctx.fillText(name, 0, 0);
    ctx.restore();
  }
  // 황경 눈금
  for (let l = 0; l < 360; l += 10) {
    const a = -l * A.DEG, big = l % 30 === 0;
    ctx.strokeStyle = big ? 'rgba(200,215,255,0.7)' : 'rgba(150,170,230,0.35)';
    ctx.beginPath(); ctx.moveTo(cx + (R + band) * Math.cos(a), cy + (R + band) * Math.sin(a));
    ctx.lineTo(cx + (R + band + (big ? 7 : 4)) * Math.cos(a), cy + (R + band + (big ? 7 : 4)) * Math.sin(a)); ctx.stroke();
    if (big) label(ctx, `${l}°`, cx + (R + band + 17) * Math.cos(a), cy + (R + band + 17) * Math.sin(a), 'rgba(170,185,230,0.8)', 'center', 10, 500);
  }
  ctx.restore();
}

function drawMain() {
  const { ctx, w, h } = M;
  const o = opt();
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, '#0b1022'); bg.addColorStop(1, '#03050b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  const t = state.t, gd = geo(t), S = synodic();
  const geoF = state.frame === 'geo';
  const usableH = h - 70;
  const cx = w / 2, cy = 34 + (usableH - 34) / 2 + 8;
  const ringR = Math.max(60, Math.min(w / 2, usableH / 2) - 30);
  const a = planetA(), e = isReal() ? A.orbitalElements(state.key, t).e : 0;
  const aMax = geoF ? a + 1.02 : Math.max(a * (1 + e), 1.03);
  const s = ((ringR - 22) / aMax) * state.zoom;
  const O = geoF ? gd.E : [0, 0, 0];
  const X = (v) => cx + (v[0] - O[0]) * s, Y = (v) => cy - (v[1] - O[1]) * s;

  drawRing(ctx, cx, cy, ringR);

  // 궤도
  if (!geoF) {
    const orbit = (fn, period, color, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      for (let k = 0; k <= 240; k++) { const p = fn(t + (period * k) / 240); k ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)); }
      ctx.stroke();
    };
    orbit(earthPos, earthPeriod(), 'rgba(95,168,255,0.55)', 1.4);
    orbit(planetPos, planetPeriod(), hexA(pColor(), 0.55), 1.4);
  } else {
    // 지구 중심: 태양의 겉보기 궤도
    ctx.strokeStyle = 'rgba(255,204,77,0.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, gd.rE * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }

  // 지구 중심 궤적 (주전원 모양)
  if (geoF && o.trail) {
    const span = Math.min(S * 1.05, isReal() ? 1500 : S * 1.05), n = 420;
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const tt = t - span + (span * k) / n, q = geo(tt);
      const x = cx + q.g[0] * s, y = cy - q.g[1] * s;
      if (prev) {
        const r = A.norm180(q.lon - prev.lon);
        ctx.strokeStyle = r >= 0 ? hexA(COLORS.pro, 0.25 + 0.65 * (k / n)) : hexA(COLORS.retro, 0.3 + 0.7 * (k / n));
        ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
      }
      prev = { x, y, lon: q.lon };
    }
  }

  const Es = [X(gd.E), Y(gd.E)], Ps = [X(gd.P), Y(gd.P)], Ss = [X([0, 0, 0]), Y([0, 0, 0])];

  // 역행 원리 그림
  if (o.retro) drawRetroDiagram(ctx, X, Y, cx, cy, ringR);

  // 태양 방향, 시선
  if (o.sun) {
    const d = norm2(Ss[0] - Es[0], Ss[1] - Es[1]);
    const q = rayCircle(Es[0], Es[1], d[0], d[1], cx, cy, ringR);
    if (q) { ctx.strokeStyle = 'rgba(255,204,77,0.45)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(...Es); ctx.lineTo(...q); ctx.stroke(); ctx.setLineDash([]); dot(ctx, q[0], q[1], 5, COLORS.sun, 2.5); label(ctx, '태양의 겉보기 위치', q[0], q[1] + 16, '#ffd76e', 'center', 11); }
  }
  if (o.sight) {
    const d = norm2(Ps[0] - Es[0], Ps[1] - Es[1]);
    const q = rayCircle(Es[0], Es[1], d[0], d[1], cx, cy, ringR);
    if (q) {
      ctx.strokeStyle = hexA(pColor(), 0.85); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(...Es); ctx.lineTo(...q); ctx.stroke();
      dot(ctx, q[0], q[1], 5.5, pColor(), 2.6);
      label(ctx, `${pName()}의 겉보기 위치`, q[0], q[1] - 16, pColor(), 'center', 11.5);
    }
  }

  // 이각
  if (o.elong) {
    const a1 = Math.atan2(Ss[1] - Es[1], Ss[0] - Es[0]), a2 = Math.atan2(Ps[1] - Es[1], Ps[0] - Es[0]);
    let da = a2 - a1; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const rr = 34;
    ctx.strokeStyle = '#ffa23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Es[0], Es[1], rr, a1, a1 + da, da < 0); ctx.stroke();
    const am = a1 + da / 2;
    label(ctx, `이각 ${gd.elong.toFixed(1)}° (${gd.dlam >= 0 ? '동' : '서'})`, Es[0] + (rr + 30) * Math.cos(am), Es[1] + (rr + 14) * Math.sin(am), '#ffbd73', 'center', 12);
  }

  // 태양, 지구, 행성
  dot(ctx, Ss[0], Ss[1], geoF ? 7 : 10, '#ffd56b', 3.2);
  label(ctx, '태양', Ss[0] + 14, Ss[1] - 12, '#ffd76e');
  dot(ctx, Es[0], Es[1], 6.5, COLORS.earth, 2.4);
  label(ctx, '지구', Es[0] + 11, Es[1] + 13, '#9fcaff');
  dot(ctx, Ps[0], Ps[1], 6.5, pColor(), 2.6);
  label(ctx, pName(), Ps[0] + 11, Ps[1] - 13, pColor());

  if (o.labels) {
    const ev = nearEvent(t, Math.max(1.5, S * 0.015));
    if (ev && !ev.kind.startsWith('stat')) label(ctx, `★ ${ev.name}`, Ps[0], Ps[1] + 26, '#ffffff', 'center', 14, 800);
  }
  // 공전 방향 안내
  label(ctx, '황도 북극에서 내려다본 모습 · 공전 방향: 시계 반대 방향', 14, h - 98, 'rgba(150,170,230,0.75)', 'left', 11.5, 500);
  label(ctx, '바깥 띠: 황도 12궁 별자리 (무한히 멀다고 가정)', 14, h - 82, 'rgba(150,170,230,0.75)', 'left', 11.5, 500);
}

function drawRetroDiagram(ctx, X, Y, cx, cy, ringR) {
  const S = synodic(), t = state.t;
  const centerKinds = isInner() ? ['conj'] : ['opp'];
  const centers = events.filter((e) => centerKinds.includes(e.kind) && (!isInner() || e.name === '내합'));
  if (!centers.length) return;
  const c = centers.reduce((b, e) => (Math.abs(e.t - t) < Math.abs(b.t - t) ? e : b));
  const s1 = events.filter((e) => e.kind === 'stat1' && e.t < c.t).pop();
  const s2 = events.find((e) => e.kind === 'stat2' && e.t > c.t);
  const D = s1 && s2 ? (s2.t - s1.t) / 4 : S / 30;
  const times = Array.from({ length: 9 }, (_, k) => c.t + (k - 4) * D);
  times.forEach((tt, k) => {
    const q = geo(tt);
    const e = [X(q.E), Y(q.E)], p = [X(q.P), Y(q.P)];
    const d = norm2(p[0] - e[0], p[1] - e[1]);
    const z = rayCircle(e[0], e[1], d[0], d[1], cx, cy, ringR);
    const col = `hsla(${200 + k * 18}, 90%, 68%, 0.9)`;
    ctx.strokeStyle = `hsla(${200 + k * 18}, 90%, 68%, 0.45)`; ctx.lineWidth = 1.1;
    if (z) { ctx.beginPath(); ctx.moveTo(...e); ctx.lineTo(...z); ctx.stroke(); dot(ctx, z[0], z[1], 3.5, col); label(ctx, String(k + 1), z[0] + (z[0] - cx) * 0.06, z[1] + (z[1] - cy) * 0.06, col, 'center', 11, 800); }
    dot(ctx, e[0], e[1], 3, col); label(ctx, String(k + 1), e[0] - 9, e[1] + 9, col, 'center', 10, 700);
    dot(ctx, p[0], p[1], 3, col); label(ctx, String(k + 1), p[0] + 9, p[1] - 9, col, 'center', 10, 700);
  });
  label(ctx, `역행 원리: ${fmtT(times[0])} ~ ${fmtT(times[8])}, ${D.toFixed(0)}일 간격 (번호 순서대로 겉보기 위치가 앞→뒤→앞)`, 14, 58 + 4, '#cfd8ff', 'left', 12, 600);
}

function norm2(x, y) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------------ 아래 그래프
function drawStrip() {
  const { ctx, w, h } = S2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, w, h);
  const S = synodic(), t = state.t;
  const pad = { l: 52, r: 16, t: 40, b: 26 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (pw < 50 || ph < 30) return;

  if (state.strip === 'time') {
    const Tr = (2 * statAngle(planetA()) / 360) * S; // 역행 기간 (원 궤도 근사)
    const W = A.clamp(Tr * 4.5, 80, 700), n = 500;
    const pts = [];
    let lonPrev = geo(t - W / 2).lon, acc = lonPrev;
    for (let k = 0; k <= n; k++) {
      const tt = t - W / 2 + (W * k) / n, l = geo(tt).lon;
      acc += A.norm180(l - lonPrev); lonPrev = l;
      pts.push([tt, acc]);
    }
    let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
    const m = (hi - lo) * 0.08 + 1; lo -= m; hi += m;
    const xs = (tt) => pad.l + ((tt - (t - W / 2)) / W) * pw, ys = (l) => pad.t + ph - ((l - lo) / (hi - lo)) * ph;
    // 격자
    ctx.strokeStyle = 'rgba(80,100,160,0.25)'; ctx.lineWidth = 1;
    const stepL = niceStep((hi - lo) / 4);
    for (let l = Math.ceil(lo / stepL) * stepL; l <= hi; l += stepL) {
      ctx.beginPath(); ctx.moveTo(pad.l, ys(l)); ctx.lineTo(w - pad.r, ys(l)); ctx.stroke();
      label(ctx, `${A.norm360(l).toFixed(0)}°`, pad.l - 6, ys(l), '#8a96c4', 'right', 10.5, 500);
    }
    const stepT = niceStep(W / 6);
    for (let tt = Math.ceil((t - W / 2) / stepT) * stepT; tt <= t + W / 2; tt += stepT) {
      ctx.beginPath(); ctx.moveTo(xs(tt), pad.t); ctx.lineTo(xs(tt), pad.t + ph); ctx.stroke();
      label(ctx, fmtTShort(tt), xs(tt), h - 12, '#8a96c4', 'center', 10.5, 500);
    }
    // 곡선
    for (let k = 1; k < pts.length; k++) {
      const retro = pts[k][1] < pts[k - 1][1];
      ctx.strokeStyle = retro ? COLORS.retro : COLORS.pro; ctx.lineWidth = retro ? 2.6 : 2;
      ctx.beginPath(); ctx.moveTo(xs(pts[k - 1][0]), ys(pts[k - 1][1])); ctx.lineTo(xs(pts[k][0]), ys(pts[k][1])); ctx.stroke();
    }
    // 현상 표시
    for (const e of events) {
      if (e.t < t - W / 2 || e.t > t + W / 2) continue;
      const k = Math.round(((e.t - (t - W / 2)) / W) * n), y = ys(pts[Math.max(0, Math.min(n, k))][1]);
      dot(ctx, xs(e.t), y, 3.2, e.kind.startsWith('stat') ? '#ffd76e' : '#ffffff');
      label(ctx, e.name.replace(/ \d.*$/, ''), xs(e.t), y - 11, e.kind.startsWith('stat') ? '#ffd76e' : '#dfe6ff', 'center', 10.5, 600);
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xs(t), pad.t); ctx.lineTo(xs(t), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, xs(t), ys(pts[n / 2][1]), 4.5, pColor(), 2.5);
    label(ctx, '↑ 황경 (동쪽)', pad.l + 4, pad.t - 10, '#8a96c4', 'left', 11, 600);
    label(ctx, '파랑: 순행 · 빨강: 역행 · 노랑: 유', w - pad.r, pad.t - 10, '#8a96c4', 'right', 11, 500);
  } else {
    const Tr = (2 * statAngle(planetA()) / 360) * S;
    const W = A.clamp(Tr * 3.2, 60, 520), n = 300;
    const pts = [];
    let lonPrev = geo(t - W / 2).lon, acc = lonPrev;
    for (let k = 0; k <= n; k++) {
      const tt = t - W / 2 + (W * k) / n, q = geo(tt);
      acc += A.norm180(q.lon - lonPrev); lonPrev = q.lon;
      pts.push([tt, acc, q.lat]);
    }
    let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
    const m = Math.max(3, (hi - lo) * 0.1); lo -= m; hi += m;
    let bmax = Math.max(1, ...pts.map((p) => Math.abs(p[2]))) * 1.25;
    const sx = pw / (hi - lo);
    const sy = Math.min(sx * 6, ph / 2 / bmax);
    const ex = sy / sx;
    const xs = (l) => pad.l + pw - (l - lo) * sx, ys = (b) => pad.t + ph / 2 - b * sy;
    // 황도 별자리
    ctx.font = '600 11px Pretendard Variable, sans-serif';
    for (let i = 0; i < ZODIAC.length; i++) {
      for (let wrap = -720; wrap <= 720; wrap += 360) {
        const l0 = ZODIAC[i][0] + wrap, l1 = l0 + A.norm360(ZODIAC[(i + 1) % ZODIAC.length][0] - ZODIAC[i][0]);
        if (l1 < lo || l0 > hi) continue;
        ctx.strokeStyle = 'rgba(110,140,220,0.3)'; ctx.setLineDash([2, 4]);
        if (l0 >= lo && l0 <= hi) { ctx.beginPath(); ctx.moveTo(xs(l0), pad.t); ctx.lineTo(xs(l0), pad.t + ph); ctx.stroke(); }
        ctx.setLineDash([]);
        const mid = (Math.max(l0, lo) + Math.min(l1, hi)) / 2;
        label(ctx, ZODIAC[i][1], xs(mid), pad.t + 8, 'rgba(160,180,235,0.75)', 'center', 11, 600);
      }
    }
    ctx.strokeStyle = 'rgba(255,204,77,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, ys(0)); ctx.lineTo(w - pad.r, ys(0)); ctx.stroke();
    label(ctx, '황도', pad.l + 4, ys(0) - 9, '#ffd76e', 'left', 10.5);
    const stepL = niceStep((hi - lo) / 6);
    for (let l = Math.ceil(lo / stepL) * stepL; l <= hi; l += stepL) label(ctx, `${A.norm360(l).toFixed(0)}°`, xs(l), h - 12, '#8a96c4', 'center', 10.5, 500);
    for (let k = 1; k < pts.length; k++) {
      const retro = pts[k][1] < pts[k - 1][1];
      ctx.strokeStyle = retro ? COLORS.retro : COLORS.pro; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(xs(pts[k - 1][1]), ys(pts[k - 1][2])); ctx.lineTo(xs(pts[k][1]), ys(pts[k][2])); ctx.stroke();
    }
    const every = Math.max(1, Math.round(n / (W / 10)));
    for (let k = 0; k <= n; k += every) dot(ctx, xs(pts[k][1]), ys(pts[k][2]), 1.6, '#cfd8ff');
    for (const e of events) {
      if (e.t < t - W / 2 || e.t > t + W / 2) continue;
      const k = Math.round(((e.t - (t - W / 2)) / W) * n), p = pts[Math.max(0, Math.min(n, k))];
      dot(ctx, xs(p[1]), ys(p[2]), 3.2, e.kind.startsWith('stat') ? '#ffd76e' : '#fff');
      label(ctx, `${e.name.replace(/ \d.*$/, '')} ${fmtTShort(e.t)}`, xs(p[1]), ys(p[2]) + (p[2] > 0 ? 14 : -13), '#dfe6ff', 'center', 10.5, 600);
    }
    dot(ctx, xs(pts[n / 2][1]), ys(pts[n / 2][2]), 5, pColor(), 2.6);
    label(ctx, `← 동쪽 (남쪽 하늘을 볼 때)   ·   황위는 ${ex.toFixed(1)}배 과장`, w - pad.r, pad.t - 10, '#8a96c4', 'right', 11, 500);
    label(ctx, `${fmtT(t - W / 2)} ~ ${fmtT(t + W / 2)}`, pad.l + 330, pad.t - 10, '#8a96c4', 'left', 11, 500);
  }
}
function niceStep(x) {
  const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

// ------------------------------------------------------------------ 망원경 모습
function drawScope(gd) {
  const cv = $('#cScope'), ctx = cv.getContext('2d');
  const W = cv.width, c = W / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, W);
  let diam;
  if (isReal()) {
    diam = (2 * Math.atan(A.PLANETS[state.key].diam / 2 / (gd.dist * 149597870.7)) * A.RAD) * 3600;
  }
  const dmin = Math.abs(planetA() - 1) || 0.1;
  const rel = isReal() ? diam / MAXD[state.key] : dmin / gd.dist;
  const r = A.clamp(rel * 100, 2.5, 108);
  ctx.save();
  ctx.translate(c, c);
  if (gd.dlam < 0) ctx.scale(-1, 1); // 새벽(서쪽 이각): 태양이 동쪽(왼쪽)에 있음
  ctx.fillStyle = '#1d1d26'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  const k = A.cosd(gd.phase);
  ctx.fillStyle = pColor();
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, Math.abs(r * k), r, 0, Math.PI / 2, (3 * Math.PI) / 2, k < 0);
  ctx.fill();
  if (state.key === 'saturn' && r > 5) {
    ctx.strokeStyle = 'rgba(232,209,140,0.8)'; ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 2.2, r * 0.6, -0.15, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, c, c - 2, 0, TAU); ctx.stroke();
  ctx.font = '600 20px Pretendard Variable, sans-serif'; ctx.fillStyle = '#8a96c4'; ctx.textAlign = 'center';
  ctx.fillText('동', 18, c + 6); ctx.fillText('서', W - 18, c + 6);
  return diam;
}

// ------------------------------------------------------------------ 정보 패널
function visibilityText(gd) {
  if (gd.elong < 12) return '태양과 너무 가까워 관측하기 어렵다';
  const tr = A.norm24(12 + gd.dlam / 15);
  const when = `남중 시각 ≈ ${A.fmtHM(tr)} (지방 태양시)`;
  if (isInner()) return gd.dlam > 0 ? `해가 진 뒤 <b>서쪽 하늘</b> (초저녁)${state.key === 'venus' ? ' — 개밥바라기' : ''} · ${when}` : `해 뜨기 전 <b>동쪽 하늘</b> (새벽)${state.key === 'venus' ? ' — 샛별' : ''} · ${when}`;
  if (gd.elong > 150) return `<b>밤새도록</b> 보인다 (저녁에 떠서 새벽에 짐) · ${when}`;
  if (gd.dlam > 0) return `<b>초저녁</b>에 남쪽~서쪽 하늘에서 보인다 · ${when}`;
  return `<b>새벽</b>에 동쪽~남쪽 하늘에서 보인다 · ${when}`;
}
function renderState() {
  const t = state.t, gd = geo(t), rt = rate(t);
  const S = synodic();
  const statWin = events.find((e) => e.kind.startsWith('stat') && Math.abs(e.t - t) < Math.max(2, S * 0.008));
  const motion = statWin ? '<span class="state-badge state-stat">유 (정지한 듯)</span>' : rt < 0 ? '<span class="state-badge state-retro">역행 (동→서)</span>' : '<span class="state-badge state-pro">순행 (서→동)</span>';
  const prevE = [...events].reverse().find((e) => e.t <= t && !e.kind.startsWith('stat'));
  const nextE = events.find((e) => e.t > t && !e.kind.startsWith('stat'));
  const near = nearEvent(t, Math.max(1.5, S * 0.015));
  const where = near && !near.kind.startsWith('stat') ? `<b>${near.name}</b> 무렵` : `${prevE ? prevE.name.replace(/ \d.*$/, '') : '…'} → <b>${nextE ? nextE.name.replace(/ \d.*$/, '') : '…'}</b> 사이`;
  $('#stateBox').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
      <b style="font-size:16px;color:${pColor()}">${pName()} <span class="note">(${isInner() ? '내행성' : '외행성'})</span></b>${motion}</div>
    <div class="readout">
      <span class="k">위치 관계</span> ${where}<br>
      <span class="k">이각</span> <b>${gd.elong.toFixed(1)}°</b> (태양의 ${gd.dlam >= 0 ? '동쪽' : '서쪽'}) · <span class="k">겉보기 속도</span> ${rt >= 0 ? '+' : ''}${rt.toFixed(3)}°/일<br>
      <span class="k">관측</span> ${visibilityText(gd)}<br>
      <span class="k">지구–행성 거리</span> ${gd.dist.toFixed(3)} AU · <span class="k">태양–행성</span> ${gd.r.toFixed(3)} AU<br>
      <span class="k">지구중심 황경 λ</span> ${gd.lon.toFixed(2)}° · <span class="k">황위 β</span> ${gd.lat >= 0 ? '+' : ''}${gd.lat.toFixed(2)}°
    </div>`;
  const diam = drawScope(gd);
  $('#scopeInfo').innerHTML = `<b>망원경으로 본 모습</b><br><span class="k">위상</span> ${(gd.illum * 100).toFixed(0)}% 밝음<br><span class="k">위상각</span> ${gd.phase.toFixed(1)}°<br>` +
    (diam ? `<span class="k">각지름</span> ${diam.toFixed(1)}″<br>` : `<span class="k">상대 크기</span> 거리에 반비례<br>`) +
    `<span class="note">남쪽 하늘을 보는 방향 (왼쪽 = 동)</span>`;
  const P = planetPeriod(), E = earthPeriod();
  $('#periodBox').innerHTML = `<span class="k">공전 주기</span> P = ${P.toFixed(1)}일 (${(P / 365.25).toFixed(3)}년) · <span class="k">a</span> = ${planetA().toFixed(3)} AU<br>` +
    `<span class="k">회합 주기</span> ${isInner() ? '1/S = 1/P − 1/E' : '1/S = 1/E − 1/P'} → <b>S = ${S.toFixed(1)}일</b> (${(S / 365.25).toFixed(3)}년)<br>` +
    `<span class="k">유의 상대 각 (원 궤도 근사)</span> θ = ${statAngle(planetA()).toFixed(1)}° → 역행 기간 ≈ ${(2 * statAngle(planetA()) / 360 * S).toFixed(0)}일`;
}
function statAngle(a) { return A.acosd(Math.sqrt(a) / (a - Math.sqrt(a) + 1)); }
function renderEvents() {
  const up = events.filter((e) => e.t > state.t - 0.5).slice(0, 9);
  $('#events').innerHTML = up.map((e) => `<li data-t="${e.t}"><span>${e.name}</span><span>${fmtT(e.t)}${isReal() ? '' : ''} (${e.t - state.t >= 0 ? '+' : ''}${(e.t - state.t).toFixed(0)}일)</span></li>`).join('') || '<li>계산 중…</li>';
}
$('#events').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-t]');
  if (li) { state.t = +li.dataset.t; state.playing = false; $('#btnPlay').textContent = '▶'; renderEvents(); }
});

// ------------------------------------------------------------------ 컨트롤
function buildPlanetButtons() {
  const keys = [...KEYS, ...(isReal() ? [] : ['custom'])];
  $('#planetBtns').innerHTML = keys.map((k) => `<button class="btn small ${k === state.key ? 'on' : ''}" data-planet="${k}" style="border-color:${k === state.key ? (k === 'custom' ? '#e6e6ff' : A.PLANETS[k].color) : ''}">${k === 'custom' ? '가상 행성' : A.PLANETS[k].ko}</button>`).join('');
  $('#customBox').classList.toggle('hidden', isReal());
}
$('#planetBtns').addEventListener('click', (e) => {
  const b = e.target.closest('[data-planet]');
  if (!b) return;
  state.key = b.dataset.planet;
  if (state.key === 'custom') { $('#customA').value = state.customA; }
  buildPlanetButtons(); evKey = ''; updateCustomOut();
});
$$('#frameSeg button').forEach((b) => b.addEventListener('click', () => {
  state.frame = b.dataset.frame;
  $$('#frameSeg button').forEach((x) => x.classList.toggle('on', x === b));
}));
$$('#modeSeg button').forEach((b) => b.addEventListener('click', () => {
  state.mode = b.dataset.mode;
  $$('#modeSeg button').forEach((x) => x.classList.toggle('on', x === b));
  if (isReal()) { if (state.key === 'custom') state.key = 'mars'; state.t = A.jdFromDate(new Date()); }
  else state.t = 0;
  $('#date').classList.toggle('hidden', !isReal());
  buildPlanetButtons(); evKey = ''; updateCustomOut();
}));
$$('#stripSeg button').forEach((b) => b.addEventListener('click', () => {
  state.strip = b.dataset.strip;
  $$('#stripSeg button').forEach((x) => x.classList.toggle('on', x === b));
}));
$('#btnPlay').addEventListener('click', () => { state.playing = !state.playing; $('#btnPlay').textContent = state.playing ? '❚❚' : '▶'; });
$('#speed').addEventListener('change', (e) => (state.speed = +e.target.value));
$$('[data-step]').forEach((b) => b.addEventListener('click', () => { state.t += +b.dataset.step; }));
$('#zoom').addEventListener('input', (e) => { state.zoom = +e.target.value; $('#zoomOut').textContent = `${state.zoom.toFixed(1)}×`; });
$('#date').addEventListener('change', (e) => {
  const [y, m, d] = e.target.value.split('-').map(Number);
  if (y) state.t = A.jdFromCivil(y, m, d, 21, TZ);
});
function updateCustomOut() {
  $('#customAOut').textContent = `${state.customA.toFixed(2)} AU (P = ${Math.pow(state.customA, 1.5).toFixed(2)}년)`;
  $('#inclOut').textContent = `${state.incl.toFixed(1)}°`;
}
$('#customA').addEventListener('input', (e) => { state.customA = +e.target.value; if (state.key !== 'custom') { state.key = 'custom'; buildPlanetButtons(); } evKey = ''; updateCustomOut(); });
$('#incl').addEventListener('input', (e) => { state.incl = +e.target.value; evKey = ''; updateCustomOut(); });
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#btnPlay').click(); }
  if (e.code === 'ArrowRight') state.t += e.shiftKey ? 10 : 1;
  if (e.code === 'ArrowLeft') state.t -= e.shiftKey ? 10 : 1;
});
$('#cMain').addEventListener('wheel', (e) => {
  e.preventDefault();
  state.zoom = A.clamp(state.zoom * Math.exp(-e.deltaY * 0.001), 0.5, 6);
  $('#zoom').value = state.zoom; $('#zoomOut').textContent = `${state.zoom.toFixed(1)}×`;
}, { passive: false });

// 탭
$$('.tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((x) => x.classList.toggle('on', x.id === 'tab-' + b.dataset.tab));
}));

// 계산기
function calc() {
  const P = +$('#calcP').value;
  if (P > 0 && P !== 1) {
    const S = 1 / Math.abs(1 / P - 1);
    $('#calcOut').innerHTML = `${P < 1 ? '내행성: 1/S = 1/P − 1/E' : '외행성: 1/S = 1/E − 1/P'}<br>S = 1 / |1/${P} − 1| = <b>${S.toFixed(4)}년 = ${(S * 365.25).toFixed(1)}일</b><br>` +
      `<span class="note">궤도 반지름 a = P<sup>2/3</sup> = ${Math.pow(P, 2 / 3).toFixed(3)} AU</span>`;
  } else $('#calcOut').textContent = 'P > 0, P ≠ 1 인 값을 넣으세요.';
  const E = +$('#calcE').value;
  if (E > 0 && E < 90) {
    const a = A.sind(E), P2 = Math.pow(a, 1.5), S2 = 1 / (1 / P2 - 1);
    $('#calcEOut').innerHTML = `최대 이각일 때 ∠태양–행성–지구 = 90° → a = sin E<br>a = sin ${E}° = <b>${a.toFixed(4)} AU</b><br>P = a<sup>3/2</sup> = ${P2.toFixed(4)}년 (${(P2 * 365.25).toFixed(1)}일), S = ${(S2 * 365.25).toFixed(1)}일<br>` +
      `<span class="note">이때 지구–행성 거리 = cos E = ${A.cosd(E).toFixed(4)} AU</span>`;
  }
  const a = +$('#calcA').value;
  if (a > 0) {
    const P3 = Math.pow(a, 1.5);
    $('#calcAOut').innerHTML = `P² = a³ (태양 질량, 년·AU 단위) → P = a<sup>3/2</sup><br>P = ${a}<sup>1.5</sup> = <b>${P3.toFixed(4)}년</b> (${(P3 * 365.25).toFixed(1)}일)` +
      (a !== 1 ? `<br>회합 주기 S = ${(1 / Math.abs(1 / P3 - 1)).toFixed(4)}년<br>평균 공전 속도 = 29.78/√a = ${(29.78 / Math.sqrt(a)).toFixed(2)} km/s` : '');
  }
}
['#calcP', '#calcE', '#calcA'].forEach((s) => $(s).addEventListener('input', calc));
calc();

// ------------------------------------------------------------------ 루프
buildPlanetButtons();
updateCustomOut();
let last = performance.now(), uiTick = 0;
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (state.playing) state.t += state.speed * dt;
  ensureEvents();
  drawMain();
  drawStrip();
  if ((uiTick += dt) > 0.12) {
    uiTick = 0;
    renderState();
    renderEvents();
    $('#clock').innerHTML = isReal()
      ? `<b>${fmtT(state.t)}</b> (KST)<br>회합 주기 ${synodic().toFixed(0)}일`
      : `<b>t = ${state.t.toFixed(0)}일</b> (지구 공전 ${(state.t / 365.25).toFixed(2)}회)<br>회합 주기 ${synodic().toFixed(0)}일`;
    if (isReal() && document.activeElement !== $('#date')) $('#date').value = A.fmtDate(A.civilFromJD(state.t, TZ));
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
