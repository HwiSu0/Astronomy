// =====================================================================
//  kepler.js — 케플러 법칙 실험실
// =====================================================================
import * as A from './astro.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const TAU = Math.PI * 2;

// 아래 조작 막대가 가리는 높이 (좁은 화면에서는 두 줄로 늘어난다)
const barReserve = () => { const b = document.querySelector('.canvas-main .stage-bottom'); return b ? b.offsetHeight + 22 : 70; };
const AUYR_TO_KMS = 4.740470464;

const PRESETS = [
  ['수성', 0.387, 0.2056], ['금성', 0.723, 0.0068], ['지구', 1.0, 0.0167], ['화성', 1.524, 0.0934],
  ['목성', 5.203, 0.0484], ['토성', 9.537, 0.0539], ['핼리 혜성', 17.83, 0.967], ['예시 (e = 0.6)', 1.0, 0.6],
];
const REAL = [['수성', 0.387, 0.241], ['금성', 0.723, 0.615], ['지구', 1, 1], ['화성', 1.524, 1.881], ['목성', 5.203, 11.86], ['토성', 9.537, 29.45], ['천왕성', 19.19, 84.0], ['해왕성', 30.07, 164.8], ['명왕성', 39.48, 248.0], ['세레스', 2.77, 4.60], ['핼리 혜성', 17.83, 75.3]];

const st = { a: 1, e: 0.6, M: 1, N: 12, phase: 0, playing: true, speed: 0.05, sub: 'rv', name: '예시 (e = 0.6)' };

function setupCanvas(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
let M1, M2;
function resize() { M1 = setupCanvas($('#cMain')); M2 = setupCanvas($('#cSub')); }
new ResizeObserver(resize).observe($('.stage'));
resize();

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
function arrow(ctx, x0, y0, x1, y1, color, w = 2.2) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hs = Math.min(10, L * 0.35);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4)); ctx.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}

// 궤도 상태 (phase: 0~1, 근일점 통과 후 경과한 주기의 비율)
function orbitState(phase) {
  const { a, e } = st;
  const Mn = TAU * phase;
  const E = A.solveKepler(Mn, e);
  const b = a * Math.sqrt(1 - e * e);
  const x = a * (Math.cos(E) - e), y = b * Math.sin(E);
  const r = a * (1 - e * Math.cos(E));
  const nu = Math.atan2(y, x);
  const GM = 4 * Math.PI * Math.PI * st.M;
  const v = Math.sqrt(GM * (2 / r - 1 / a)); // AU/년
  const dx = -a * Math.sin(E), dy = b * Math.cos(E), dl = Math.hypot(dx, dy);
  return { M: Mn, E, x, y, r, nu, v, vx: (dx / dl) * v, vy: (dy / dl) * v, b };
}
const period = () => Math.sqrt(Math.pow(st.a, 3) / st.M);

function drawMain() {
  const { ctx, w, h } = M1;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, '#0b1022'); bg.addColorStop(1, '#03050b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  const { a, e, N } = st;
  const b = a * Math.sqrt(1 - e * e), c = a * e;
  const usableH = h - barReserve();
  const s = Math.min((w - 80) / (2 * a), (usableH - 60) / (2 * b));
  const cx0 = w / 2, cy0 = 20 + usableH / 2;
  // 타원 중심이 화면 중앙에 오도록: 초점(태양) = 중심 + (c, 0)
  const X = (x) => cx0 + (x + c) * s, Y = (y) => cy0 - y * s;
  const o = { sect: $('#optSect').checked, vel: $('#optVel').checked, anom: $('#optAnom').checked, axes: $('#optAxes').checked };
  const cur = orbitState(st.phase);

  // 면적 부채꼴
  if (o.sect) {
    for (let k = 0; k < N; k++) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (let j = 0; j <= 24; j++) { const q = orbitState((k + j / 24) / N); ctx.lineTo(X(q.x), Y(q.y)); }
      ctx.closePath();
      const curK = Math.floor(st.phase * N) % N;
      ctx.fillStyle = k === curK ? 'rgba(255,204,77,0.30)' : k % 2 ? 'rgba(110,168,255,0.10)' : 'rgba(208,140,255,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,180,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // 궤도
  ctx.strokeStyle = 'rgba(200,215,255,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(X(-c), Y(0), a * s, b * s, 0, 0, TAU); ctx.stroke();

  if (o.axes) {
    ctx.strokeStyle = 'rgba(150,170,230,0.4)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(-c - a), Y(0)); ctx.lineTo(X(-c + a), Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(-c), Y(-b)); ctx.lineTo(X(-c), Y(b)); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, X(-c), Y(0), 2.5, '#8a96c4'); label(ctx, '중심', X(-c), Y(0) + 13, '#8a96c4', 'center', 11);
    dot(ctx, X(-2 * c), Y(0), 3.5, '#8a96c4'); label(ctx, '빈 초점 F′', X(-2 * c), Y(0) - 13, '#8a96c4', 'center', 11);
    label(ctx, `근일점 (q = ${(a * (1 - e)).toFixed(3)} AU)`, X(a - c) + 6, Y(0) + 16, '#ffbd73', 'right', 11.5);
    label(ctx, `원일점 (Q = ${(a * (1 + e)).toFixed(3)} AU)`, X(-a - c) - 6, Y(0) + 16, '#9fcaff', 'left', 11.5);
    dot(ctx, X(a - c), Y(0), 3, '#ffbd73'); dot(ctx, X(-a - c), Y(0), 3, '#9fcaff');
    label(ctx, 'a', X(-c + a / 2), Y(0) - 10, '#cfd8ff', 'center', 12, 700);
    label(ctx, 'b', X(-c) + 9, Y(b / 2), '#cfd8ff', 'left', 12, 700);
  }

  // 근점 이각
  if (o.anom) {
    const C = [X(-c), Y(0)];
    ctx.strokeStyle = 'rgba(150,170,230,0.45)'; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(C[0], C[1], a * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const Qp = [C[0] + a * s * Math.cos(cur.E), C[1] - a * s * Math.sin(cur.E)];
    const Mp = [C[0] + a * s * Math.cos(cur.M), C[1] - a * s * Math.sin(cur.M)];
    ctx.strokeStyle = '#7fdbff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...C); ctx.lineTo(...Qp); ctx.stroke();
    ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(...Qp); ctx.lineTo(X(cur.x), Y(cur.y)); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, Qp[0], Qp[1], 3.5, '#7fdbff');
    ctx.strokeStyle = '#7fdbff'; ctx.beginPath(); ctx.arc(C[0], C[1], 26, 0, -cur.E, cur.E > 0); ctx.stroke();
    label(ctx, `E = ${(A.norm360(cur.E * A.RAD)).toFixed(1)}°`, C[0] + 30 * Math.cos(-cur.E / 2), C[1] + 36 * Math.sin(-cur.E / 2), '#7fdbff', 'center', 11.5);
    ctx.strokeStyle = '#b8ff9f'; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(...C); ctx.lineTo(...Mp); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, Mp[0], Mp[1], 4, '#b8ff9f');
    label(ctx, `M = ${(A.norm360(cur.M * A.RAD)).toFixed(1)}° (평균 운동)`, Mp[0], Mp[1] - 13, '#b8ff9f', 'center', 11.5);
    const nuA = cur.nu;
    ctx.strokeStyle = '#ffa23f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(0), Y(0), 40, 0, -nuA, nuA > 0); ctx.stroke();
    label(ctx, `ν = ${A.norm360(nuA * A.RAD).toFixed(1)}°`, X(0) + 52 * Math.cos(-nuA / 2), Y(0) + 52 * Math.sin(-nuA / 2), '#ffbd73', 'center', 11.5);
  }

  // 태양
  dot(ctx, X(0), Y(0), 9, '#ffd56b', 3.4);
  label(ctx, '태양 (초점 F)', X(0), Y(0) + 22, '#ffd76e', 'center', 11.5);
  // 반지름 벡터
  ctx.strokeStyle = 'rgba(255,214,107,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(cur.x), Y(cur.y)); ctx.stroke();
  // 행성과 속도
  if (o.vel) {
    const vc = Math.sqrt(4 * Math.PI * Math.PI * st.M / a); // 평균 정도 속력
    const L = Math.min((cur.v / vc) * 0.1 * Math.min(w, usableH), 0.32 * Math.min(w, usableH));
    const ux = cur.vx / cur.v, uy = cur.vy / cur.v;
    arrow(ctx, X(cur.x), Y(cur.y), X(cur.x) + ux * L, Y(cur.y) - uy * L, '#7cffb0', 2.4);
    label(ctx, `v = ${(cur.v * AUYR_TO_KMS).toFixed(2)} km/s`, X(cur.x) + ux * L + 8, Y(cur.y) - uy * L - 10, '#9fffc6', 'left', 12);
  }
  dot(ctx, X(cur.x), Y(cur.y), 7, '#5fa8ff', 2.6);
  label(ctx, `r = ${cur.r.toFixed(3)} AU`, X(cur.x) - 12, Y(cur.y) + 16, '#9fcaff', 'right', 12);
  if (o.sect) label(ctx, `같은 시간(P/${N}) 동안 쓸고 간 넓이 = πab/${N} = ${(Math.PI * a * b / N).toFixed(4)} AU² (모든 부채꼴이 같다)`, 16, 22, '#ffe08a', 'left', 12.5);
}

function drawSub() {
  const { ctx, w, h } = M2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, w, h);
  const pad = { l: 56, r: 20, t: 40, b: 26 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (pw < 40 || ph < 30) return;
  if (st.sub === 'rv') {
    const n = 300, pts = [];
    for (let k = 0; k <= n; k++) { const q = orbitState(k / n); pts.push([k / n, q.r, q.v * AUYR_TO_KMS]); }
    const rmax = st.a * (1 + st.e) * 1.05, vmax = Math.max(...pts.map((p) => p[2])) * 1.05;
    const xs = (f) => pad.l + f * pw, yr = (r) => pad.t + ph - (r / rmax) * ph, yv = (v) => pad.t + ph - (v / vmax) * ph;
    ctx.strokeStyle = 'rgba(80,100,160,0.25)';
    for (let f = 0; f <= 1.0001; f += 0.25) { ctx.beginPath(); ctx.moveTo(xs(f), pad.t); ctx.lineTo(xs(f), pad.t + ph); ctx.stroke(); label(ctx, `${(f * period()).toFixed(2)}년`, xs(f), h - 12, '#8a96c4', 'center', 10.5, 500); }
    const line = (idx, ys, color) => { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(xs(p[0]), ys(p[idx])) : ctx.moveTo(xs(p[0]), ys(p[idx])))); ctx.stroke(); };
    line(1, yr, '#9fcaff'); line(2, yv, '#7cffb0');
    const q = orbitState(st.phase);
    ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs(st.phase), pad.t); ctx.lineTo(xs(st.phase), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, xs(st.phase), yr(q.r), 4, '#9fcaff'); dot(ctx, xs(st.phase), yv(q.v * AUYR_TO_KMS), 4, '#7cffb0');
    label(ctx, `속력 v (최대 ${vmax.toFixed(1)} km/s)`, w - pad.r, pad.t - 12, '#7cffb0', 'right', 11.5);
    label(ctx, `거리 r (최대 ${rmax.toFixed(2)} AU)`, w - pad.r - 190, pad.t - 12, '#9fcaff', 'right', 11.5);
    label(ctx, '근일점 통과 후 시간 →', pad.l + 4, pad.t + 10, '#8a96c4', 'left', 11, 500);
  } else {
    const lx = (a) => Math.log10(a), lo = -0.6, hi = 1.75, plo = -0.8, phi = 2.6;
    const xs = (a) => pad.l + ((lx(a) - lo) / (hi - lo)) * pw, ys = (p) => pad.t + ph - ((lx(p) - plo) / (phi - plo)) * ph;
    ctx.strokeStyle = 'rgba(80,100,160,0.25)';
    [0.3, 1, 3, 10, 30].forEach((a) => { ctx.beginPath(); ctx.moveTo(xs(a), pad.t); ctx.lineTo(xs(a), pad.t + ph); ctx.stroke(); label(ctx, `${a} AU`, xs(a), h - 12, '#8a96c4', 'center', 10.5, 500); });
    [0.3, 1, 10, 100].forEach((p) => { ctx.beginPath(); ctx.moveTo(pad.l, ys(p)); ctx.lineTo(w - pad.r, ys(p)); ctx.stroke(); label(ctx, `${p}년`, pad.l - 6, ys(p), '#8a96c4', 'right', 10.5, 500); });
    ctx.strokeStyle = 'rgba(255,204,77,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs(0.25), ys(Math.pow(0.25, 1.5))); ctx.lineTo(xs(56), ys(Math.pow(56, 1.5))); ctx.stroke();
    label(ctx, 'P² = a³ (기울기 3/2)', xs(20), ys(Math.pow(20, 1.5)) - 14, '#ffd76e', 'center', 11.5);
    REAL.forEach(([n, a, p]) => { dot(ctx, xs(a), ys(p), 3.5, '#cfd8ff'); label(ctx, n, xs(a) + 6, ys(p) + 10, '#aab6e0', 'left', 10.5, 500); });
    dot(ctx, xs(st.a), ys(period()), 6, '#ff5c7a', 2.4);
    label(ctx, `현재 궤도 (M = ${st.M})`, xs(st.a) + 9, ys(period()) - 12, '#ff9fb2', 'left', 11.5);
    label(ctx, 'log P = 1.5 log a − 0.5 log M  (P: 년, a: AU)', w - pad.r, pad.t - 12, '#8a96c4', 'right', 11.5);
  }
}

function readout() {
  const { a, e, M: Ms } = st, b = a * Math.sqrt(1 - e * e);
  const q = orbitState(st.phase), P = period();
  const GM = 4 * Math.PI * Math.PI * Ms;
  const vp = Math.sqrt(GM * (1 + e) / (a * (1 - e))) * AUYR_TO_KMS, va = Math.sqrt(GM * (1 - e) / (a * (1 + e))) * AUYR_TO_KMS;
  $('#readout').innerHTML = `<b>${st.name}</b><br>` +
    `<span class="k">긴반지름 a</span> ${a.toFixed(3)} AU · <span class="k">짧은반지름 b</span> ${b.toFixed(3)} AU · <span class="k">이심률 e</span> ${e.toFixed(4)}<br>` +
    `<span class="k">근일점 거리 q</span> ${(a * (1 - e)).toFixed(3)} AU · <span class="k">원일점 거리 Q</span> ${(a * (1 + e)).toFixed(3)} AU<br>` +
    `<span class="k">공전 주기</span> P = √(a³/M) = <b>${P.toFixed(3)}년</b> (${(P * 365.25).toFixed(1)}일)<br>` +
    `<span class="k">근일점 속력</span> ${vp.toFixed(2)} km/s · <span class="k">원일점 속력</span> ${va.toFixed(2)} km/s<br>` +
    `<span class="k">속력비</span> v<sub>근</sub>/v<sub>원</sub> = (1 + e)/(1 − e) = ${((1 + e) / (1 - e)).toFixed(3)}<br>` +
    `<span class="k">면적 속도</span> πab/P = ${(Math.PI * a * b / P).toFixed(4)} AU²/년`;
  $('#readout2').innerHTML = `<b>지금 위치</b> (t = ${(st.phase * P).toFixed(3)}년, ${(st.phase * 100).toFixed(1)}% 경과)<br>` +
    `<span class="k">평균 근점 이각 M</span> ${A.norm360(q.M * A.RAD).toFixed(2)}° · <span class="k">이심 근점 이각 E</span> ${A.norm360(q.E * A.RAD).toFixed(2)}°<br>` +
    `<span class="k">진근점 이각 ν</span> ${A.norm360(q.nu * A.RAD).toFixed(2)}° · <span class="k">거리 r</span> ${q.r.toFixed(4)} AU<br>` +
    `<span class="k">속력 v</span> = √(GM(2/r − 1/a)) = <b>${(q.v * AUYR_TO_KMS).toFixed(2)} km/s</b><br>` +
    `<span class="note">검산: M = E − e sin E → ${(q.E - e * Math.sin(q.E)).toFixed(5)} rad ≈ ${(((q.M + Math.PI) % TAU) - Math.PI).toFixed(5)} rad</span>`;
  $('#clock').innerHTML = `<b>t = ${(st.phase * P).toFixed(3)}년</b> / P = ${P.toFixed(3)}년`;
}

// 컨트롤
$('#presets').innerHTML = PRESETS.map(([n], i) => `<button class="btn small" data-p="${i}">${n}</button>`).join('');
$('#presets').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-p]'); if (!b) return;
  const [n, a, e] = PRESETS[+b.dataset.p];
  Object.assign(st, { name: n, a, e, M: 1 });
  sync();
});
function sync() {
  $('#a').value = st.a; $('#e').value = st.e; $('#m').value = st.M; $('#n').value = st.N;
  $('#aOut').textContent = `${st.a.toFixed(2)} AU`; $('#eOut').textContent = st.e.toFixed(3);
  $('#mOut').textContent = `${st.M.toFixed(2)} M☉`; $('#nOut').textContent = st.N;
}
$('#a').addEventListener('input', (e) => { st.a = +e.target.value; st.name = '사용자 궤도'; sync(); });
$('#e').addEventListener('input', (e) => { st.e = +e.target.value; st.name = '사용자 궤도'; sync(); });
$('#m').addEventListener('input', (e) => { st.M = +e.target.value; sync(); });
$('#n').addEventListener('input', (e) => { st.N = +e.target.value; sync(); });
$('#btnPlay').addEventListener('click', () => { st.playing = !st.playing; $('#btnPlay').textContent = st.playing ? '❚❚' : '▶'; });
$('#speed').addEventListener('change', (e) => (st.speed = +e.target.value));
$$('#subSeg button').forEach((b) => b.addEventListener('click', () => { st.sub = b.dataset.sub; $$('#subSeg button').forEach((x) => x.classList.toggle('on', x === b)); }));
$$('.tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((x) => x.classList.toggle('on', x.id === 'tab-' + b.dataset.tab));
}));
$('#cMain').addEventListener('click', () => $('#btnPlay').click());
sync();

let last = performance.now(), tick = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (st.playing) st.phase = (st.phase + st.speed * dt) % 1;
  drawMain(); drawSub();
  if ((tick += dt) > 0.1) { tick = 0; readout(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
