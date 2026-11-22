// =====================================================================
//  kepler.js — 케플러 법칙 실험실
// =====================================================================
import * as A from './astro.js';
import { begin, blockCircle, blockElement, label, place, around } from './labels.js';

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

// 밝은 종이 바탕용 그림 색
const INK = '#1f2129', MUTED = '#5f6270', FAINT = 'rgba(31,33,41,0.12)', PAPER = '#fbfaf8';
const C = { sun: '#e9a514', sunInk: '#9a6200', planet: '#2a6fd0', planetInk: '#1f5bb0', peri: '#c2570a', aph: '#2a62c9', vel: '#1d8a50', velInk: '#17703f', E: '#0b7fb0', M: '#3f8a1f', nu: '#d4650c', nuInk: '#b5540a', now: '#d23a50' };

function dot(ctx, x, y, r, color, halo = 0) {
  // halo: 큰 천체를 구별하기 위한 옅은 테두리 (빛 번짐 효과는 쓰지 않음)
  if (halo) { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r + 2 + halo, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (halo) { ctx.strokeStyle = PAPER; ctx.lineWidth = 1.2; ctx.stroke(); }
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
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);

  const { a, e, N } = st;
  const b = a * Math.sqrt(1 - e * e), c = a * e;
  const usableH = h - barReserve();
  const narrow = w < 560;
  begin(0, 0, w, usableH);
  const top = 40;  // 맨 위 설명 한 줄
  const s = Math.min((w - 80) / (2 * a), (usableH - top - 50) / (2 * b));
  const cx0 = w / 2, cy0 = top + (usableH - top) / 2;
  // 타원 중심이 화면 중앙에 오도록: 초점(태양) = 중심 + (c, 0)
  const X = (x) => cx0 + (x + c) * s, Y = (y) => cy0 - y * s;
  const o = { sect: $('#optSect').checked, vel: $('#optVel').checked, anom: $('#optAnom').checked, axes: $('#optAxes').checked };
  const cur = orbitState(st.phase);
  // 라벨은 그림을 모두 그린 뒤 중요한 것부터 자리를 찾아 놓는다
  const jobs = [];
  const Sx = X(0), Sy = Y(0), Px = X(cur.x), Py = Y(cur.y);
  blockCircle(Sx, Sy, 15); blockCircle(Px, Py, 12);
  if (o.sect) label(ctx, narrow ? `같은 시간(P/${N}) 동안 쓸고 간 넓이는 모두 같다` : `같은 시간(P/${N}) 동안 쓸고 간 넓이 = πab/${N} = ${(Math.PI * a * b / N).toFixed(4)} AU² (모든 부채꼴이 같다)`, 16, 22, C.sunInk, 'left', narrow ? 12 : 13);
  jobs.push(() => place(ctx, '태양 (초점 F)', [[Sx, Sy + 24, 'center'], [Sx, Sy - 24, 'center'], ...around(Sx, Sy, 18)], C.sunInk, 12.5, 700));
  jobs.push(() => place(ctx, `r = ${cur.r.toFixed(3)} AU`, around(Px, Py, 16), C.planetInk, 13, 700));

  // 면적 부채꼴
  if (o.sect) {
    for (let k = 0; k < N; k++) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      for (let j = 0; j <= 24; j++) { const q = orbitState((k + j / 24) / N); ctx.lineTo(X(q.x), Y(q.y)); }
      ctx.closePath();
      const curK = Math.floor(st.phase * N) % N;
      ctx.fillStyle = k === curK ? 'rgba(233,165,20,0.32)' : k % 2 ? 'rgba(42,98,201,0.08)' : 'rgba(122,69,196,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(31,33,41,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // 궤도
  ctx.strokeStyle = 'rgba(31,33,41,0.85)'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(X(-c), Y(0), a * s, b * s, 0, 0, TAU); ctx.stroke();

  if (o.axes) {
    ctx.strokeStyle = 'rgba(31,33,41,0.35)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(-c - a), Y(0)); ctx.lineTo(X(-c + a), Y(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(-c), Y(-b)); ctx.lineTo(X(-c), Y(b)); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, X(-c), Y(0), 2.5, MUTED); dot(ctx, X(-2 * c), Y(0), 3.5, MUTED);
    dot(ctx, X(a - c), Y(0), 3, C.peri); dot(ctx, X(-a - c), Y(0), 3, C.aph);
    const qx = X(a - c), Qx = X(-a - c), y0 = Y(0);
    jobs.push(() => place(ctx, `근일점 (q = ${(a * (1 - e)).toFixed(3)} AU)`, [[qx + 4, y0 + 18, 'right'], [qx + 4, y0 - 18, 'right'], [qx + 4, y0 + 36, 'right'], [qx + 4, y0 - 36, 'right']], C.peri, 12.5, 600));
    jobs.push(() => place(ctx, `원일점 (Q = ${(a * (1 + e)).toFixed(3)} AU)`, [[Qx - 4, y0 + 18, 'left'], [Qx - 4, y0 - 18, 'left'], [Qx - 4, y0 + 36, 'left'], [Qx - 4, y0 - 36, 'left']], C.aph, 12.5, 600));
    jobs.push(() => place(ctx, '중심', [[X(-c), y0 + 15, 'center'], [X(-c), y0 - 15, 'center'], [X(-c) + 8, y0 + 15, 'left']], MUTED, 12, 500));
    if (c * s > 30) jobs.push(() => place(ctx, '빈 초점 F′', [[X(-2 * c), y0 - 15, 'center'], [X(-2 * c), y0 + 15, 'center']], MUTED, 12, 500));
    jobs.push(() => place(ctx, 'a', [[X(-c + a / 2), y0 - 11, 'center'], [X(-c + a / 2), y0 + 11, 'center'], [X(-c - a / 2), y0 - 11, 'center']], INK, 13, 700));
    jobs.push(() => place(ctx, 'b', [[X(-c) + 9, Y(b / 2), 'left'], [X(-c) - 9, Y(b / 2), 'right'], [X(-c) + 9, Y(-b / 2), 'left']], INK, 13, 700));
  }

  // 근점 이각
  if (o.anom) {
    const Cn = [X(-c), Y(0)];
    ctx.strokeStyle = 'rgba(31,33,41,0.35)'; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(Cn[0], Cn[1], a * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const Qp = [Cn[0] + a * s * Math.cos(cur.E), Cn[1] - a * s * Math.sin(cur.E)];
    const Mp = [Cn[0] + a * s * Math.cos(cur.M), Cn[1] - a * s * Math.sin(cur.M)];
    ctx.strokeStyle = C.E; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...Cn); ctx.lineTo(...Qp); ctx.stroke();
    ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(...Qp); ctx.lineTo(X(cur.x), Y(cur.y)); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, Qp[0], Qp[1], 3.5, C.E);
    ctx.strokeStyle = C.E; ctx.beginPath(); ctx.arc(Cn[0], Cn[1], 26, 0, -cur.E, cur.E > 0); ctx.stroke();
    const eh = -cur.E / 2;
    jobs.push(() => place(ctx, `E = ${(A.norm360(cur.E * A.RAD)).toFixed(1)}°`, [36, 50, 66].flatMap((d) => [0, 0.3, -0.3].map((k) => [Cn[0] + d * Math.cos(eh + k), Cn[1] + d * Math.sin(eh + k), 'center'])), C.E, 12.5, 600));
    ctx.strokeStyle = C.M; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(...Cn); ctx.lineTo(...Mp); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, Mp[0], Mp[1], 4, C.M);
    blockCircle(Mp[0], Mp[1], 6); blockCircle(Qp[0], Qp[1], 6);
    jobs.push(() => place(ctx, `M = ${(A.norm360(cur.M * A.RAD)).toFixed(1)}° (평균 운동)`, [[Mp[0], Mp[1] - 15, 'center'], [Mp[0], Mp[1] + 15, 'center'], ...around(Mp[0], Mp[1], 12)], C.M, 12.5, 600));
    const nuA = cur.nu;
    ctx.strokeStyle = C.nu; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(0), Y(0), 40, 0, -nuA, nuA > 0); ctx.stroke();
    const nh = -nuA / 2;
    jobs.push(() => place(ctx, `ν = ${A.norm360(nuA * A.RAD).toFixed(1)}°`, [54, 70, 88].flatMap((d) => [0, 0.3, -0.3].map((k) => [Sx + d * Math.cos(nh + k), Sy + d * Math.sin(nh + k), 'center'])), C.nuInk, 12.5, 600));
  }

  // 태양
  dot(ctx, X(0), Y(0), 9, C.sun, 3.4);
  // 반지름 벡터
  ctx.strokeStyle = 'rgba(176,122,0,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(cur.x), Y(cur.y)); ctx.stroke();
  // 행성과 속도
  if (o.vel) {
    const vc = Math.sqrt(4 * Math.PI * Math.PI * st.M / a); // 평균 정도 속력
    const L = Math.min((cur.v / vc) * 0.1 * Math.min(w, usableH), 0.32 * Math.min(w, usableH));
    const ux = cur.vx / cur.v, uy = cur.vy / cur.v;
    arrow(ctx, X(cur.x), Y(cur.y), X(cur.x) + ux * L, Y(cur.y) - uy * L, C.vel, 2.4);
    const tx = X(cur.x) + ux * L, ty = Y(cur.y) - uy * L;
    jobs.splice(2, 0, () => place(ctx, `v = ${(cur.v * AUYR_TO_KMS).toFixed(2)} km/s`, [[tx + 8, ty - 10, 'left'], [tx - 8, ty - 10, 'right'], ...around(tx, ty, 14)], C.velInk, 13, 700));
  }
  dot(ctx, X(cur.x), Y(cur.y), 7, C.planet, 2.6);
  jobs.forEach((f) => f());
}

function drawSub() {
  const { ctx, w, h } = M2;
  begin(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
  const ovB = blockElement($('#cSub'), $('.canvas-sub .overlay-tl'));
  const pad = { l: 56, r: 20, t: w < 560 ? Math.max(40, ovB + 22) : 44, b: 26 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  if (pw < 40 || ph < 30) return;
  if (st.sub === 'rv') {
    const n = 300, pts = [];
    for (let k = 0; k <= n; k++) { const q = orbitState(k / n); pts.push([k / n, q.r, q.v * AUYR_TO_KMS]); }
    const rmax = st.a * (1 + st.e) * 1.05, vmax = Math.max(...pts.map((p) => p[2])) * 1.05;
    const xs = (f) => pad.l + f * pw, yr = (r) => pad.t + ph - (r / rmax) * ph, yv = (v) => pad.t + ph - (v / vmax) * ph;
    ctx.strokeStyle = FAINT;
    for (let f = 0; f <= 1.0001; f += 0.25) { ctx.beginPath(); ctx.moveTo(xs(f), pad.t); ctx.lineTo(xs(f), pad.t + ph); ctx.stroke(); label(ctx, `${(f * period()).toFixed(2)}년`, xs(f), h - 12, MUTED, 'center', 10.5, 500); }
    const line = (idx, ys, color) => { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(xs(p[0]), ys(p[idx])) : ctx.moveTo(xs(p[0]), ys(p[idx])))); ctx.stroke(); };
    line(1, yr, C.aph); line(2, yv, C.vel);
    const q = orbitState(st.phase);
    ctx.strokeStyle = 'rgba(31,33,41,0.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs(st.phase), pad.t); ctx.lineTo(xs(st.phase), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, xs(st.phase), yr(q.r), 4, C.aph); dot(ctx, xs(st.phase), yv(q.v * AUYR_TO_KMS), 4, C.vel);
    place(ctx, `속력 v (최대 ${vmax.toFixed(1)} km/s)`, [[w - pad.r, pad.t - 12, 'right'], [w - pad.r, 12, 'right']], C.velInk, 12, 600);
    place(ctx, `거리 r (최대 ${rmax.toFixed(2)} AU)`, [[w - pad.r - 200, pad.t - 12, 'right'], [w - pad.r, pad.t + 10, 'right'], [pad.l + 4, pad.t + 26, 'left']], C.aph, 12, 600);
    place(ctx, '근일점 통과 후 시간 →', [[pad.l + 4, pad.t + 10, 'left'], [pad.l + 4, pad.t + ph - 10, 'left']], MUTED, 11.5, 500);
  } else {
    const lx = (a) => Math.log10(a), lo = -0.6, hi = 1.75, plo = -0.8, phi = 2.6;
    const xs = (a) => pad.l + ((lx(a) - lo) / (hi - lo)) * pw, ys = (p) => pad.t + ph - ((lx(p) - plo) / (phi - plo)) * ph;
    ctx.strokeStyle = FAINT;
    [0.3, 1, 3, 10, 30].forEach((a) => { ctx.beginPath(); ctx.moveTo(xs(a), pad.t); ctx.lineTo(xs(a), pad.t + ph); ctx.stroke(); label(ctx, `${a} AU`, xs(a), h - 12, MUTED, 'center', 10.5, 500); });
    [0.3, 1, 10, 100].forEach((p) => { ctx.beginPath(); ctx.moveTo(pad.l, ys(p)); ctx.lineTo(w - pad.r, ys(p)); ctx.stroke(); label(ctx, `${p}년`, pad.l - 6, ys(p), MUTED, 'right', 10.5, 500); });
    ctx.strokeStyle = 'rgba(176,122,0,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs(0.25), ys(Math.pow(0.25, 1.5))); ctx.lineTo(xs(56), ys(Math.pow(56, 1.5))); ctx.stroke();
    label(ctx, 'P² = a³ (기울기 3/2)', xs(20), ys(Math.pow(20, 1.5)) - 14, C.sunInk, 'center', 11.5);
    REAL.forEach(([n, a, p]) => { dot(ctx, xs(a), ys(p), 3.5, 'rgba(31,33,41,0.6)'); label(ctx, n, xs(a) + 6, ys(p) + 10, MUTED, 'left', 11, 500); });
    dot(ctx, xs(st.a), ys(period()), 6, C.now, 2.4);
    label(ctx, `현재 궤도 (M = ${st.M})`, xs(st.a) + 9, ys(period()) - 12, C.now, 'left', 11.5);
    place(ctx, 'log P = 1.5 log a − 0.5 log M  (P: 년, a: AU)', [[w - pad.r, pad.t - 12, 'right'], [w - pad.r, pad.t + ph - 10, 'right']], MUTED, 11.5, 500);
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
