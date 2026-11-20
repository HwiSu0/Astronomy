// =====================================================================
//  moon.js — 달의 운동 실험실 (위상, 월출·월몰, 항성월·삭망월, 백도와 식)
// =====================================================================
import * as A from './astro.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const TAU = Math.PI * 2;

// 아래 조작 막대가 가리는 높이 (좁은 화면에서는 두 줄로 늘어난다)
const barReserve = () => { const b = document.querySelector('.canvas-main .stage-bottom'); return b ? b.offsetHeight + 22 : 70; };
const TZ = 9, LAT = 37.5665, LON = 126.978;

const params = new URLSearchParams(location.search);
const st = {
  jd: params.get('jd') ? +params.get('jd') : A.jdFromDate(new Date()),
  view: ['phase', 'month', 'eclipse'].includes(params.get('view')) ? params.get('view') : 'phase',
  playing: false, speed: 0.25, exag: 3,
};

// ------------------------------------------------------------------ 캔버스 도우미
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
function arrow(ctx, x0, y0, x1, y1, color, w = 1.6, hs = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4)); ctx.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}
/**
 * 위상 원판: phaseAngle i (0 = 보름, 180 = 삭), litAngle = 밝은 쪽 방향(화면 각, 라디안, 0 = 오른쪽)
 */
function phaseDisk(ctx, x, y, r, i, litAngle, earthshine = true) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(litAngle);
  ctx.fillStyle = earthshine ? '#22252f' : '#14161d';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  const k = A.cosd(i);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fbf8ee'); g.addColorStop(1, '#d6d0bd');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, Math.max(0.01, Math.abs(r * k)), r, 0, Math.PI / 2, (3 * Math.PI) / 2, k < 0);
  ctx.fill();
  ctx.restore();
}
const fmtKST = (jd, withTime = true) => { const c = A.civilFromJD(jd, TZ); return withTime ? `${A.fmtDate(c)} ${A.fmtHM(c.hours)}` : A.fmtDate(c); };
const fmtShort = (jd) => { const c = A.civilFromJD(jd, TZ); return `${c.m}/${c.d}`; };

// ------------------------------------------------------------------ 캐시된 주기 정보
let lun = null; // { t0: 직전 삭, t1: 다음 삭, quarters: [...] }
function lunation(jd) {
  if (lun && jd >= lun.t0 && jd < lun.t1) return lun;
  const t1 = A.findMoonPhase(jd, 0), t0 = A.findMoonPhase(t1 - 32, 0);
  lun = { t0, t1, q1: A.findMoonPhase(t0, 90), full: A.findMoonPhase(t0, 180), q3: A.findMoonPhase(t0, 270) };
  return lun;
}
const dayStart = (jd) => Math.floor(jd + TZ / 24 - 0.5) + 0.5 - TZ / 24; // 그날 0시(KST)의 JD

// ------------------------------------------------------------------ 뷰 1: 위상과 뜨는 시각
function drawPhaseView(ctx, w, h, ph) {
  const usableH = h - barReserve();
  const cx = w / 2 - 20, cy = 44 + (usableH - 44) / 2;
  const R0 = Math.max(80, Math.min(w * 0.36, (usableH - 70) / 2));
  // 햇빛
  for (let k = -3; k <= 3; k++) {
    const y = cy + k * (usableH / 8);
    arrow(ctx, w - 18, y, w - 78, y, 'rgba(255,214,107,0.75)', 2, 9);
  }
  label(ctx, '햇빛', w - 48, cy - usableH / 2 + 30, '#ffd76e', 'center', 13, 800);
  label(ctx, '(태양은 오른쪽 아주 멀리)', w - 60, cy + usableH / 2 - 20, '#ffd76e', 'center', 11, 500);

  // 관측자(서울)의 지평선과 보이는 쪽
  const lst = A.lstDeg(st.jd, LON);
  const last = A.norm24(12 + A.norm180(lst - ph.sun.ra) / 15);
  const th = (last - 12) * 15;
  const rE = 30;
  const z = [A.cosd(th), -A.sind(th)], tg = [A.sind(th), A.cosd(th)];
  const P = [cx + rE * z[0], cy + rE * z[1]];
  const L = Math.max(w, h) * 2;
  ctx.fillStyle = 'rgba(91,227,154,0.07)';
  ctx.beginPath();
  ctx.moveTo(P[0] + L * tg[0], P[1] + L * tg[1]); ctx.lineTo(P[0] + L * tg[0] + L * z[0], P[1] + L * tg[1] + L * z[1]);
  ctx.lineTo(P[0] - L * tg[0] + L * z[0], P[1] - L * tg[1] + L * z[1]); ctx.lineTo(P[0] - L * tg[0], P[1] - L * tg[1]);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(91,227,154,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(P[0] - R0 * 1.25 * tg[0], P[1] - R0 * 1.25 * tg[1]); ctx.lineTo(P[0] + R0 * 1.25 * tg[0], P[1] + R0 * 1.25 * tg[1]); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, '서울의 지평선', P[0] + R0 * 1.1 * tg[0], P[1] + R0 * 1.1 * tg[1] - 10, '#8af0b8', 'center', 11.5);
  label(ctx, '이쪽 하늘이 보인다', P[0] + 70 * z[0], P[1] + 70 * z[1], 'rgba(138,240,184,0.85)', 'center', 11, 600);

  // 달 궤도와 8위상
  ctx.strokeStyle = 'rgba(200,210,240,0.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
  const names = ['삭', '초승달', '상현', '상현망', '망', '하현망', '하현', '그믐달'];
  for (let k = 0; k < 8; k++) {
    const a = k * 45, x = cx + R0 * A.cosd(a), y = cy - R0 * A.sind(a);
    ctx.globalAlpha = 0.45;
    phaseDisk(ctx, x, y, 9, 0, 0, false); // 궤도 위 모습: 항상 태양 쪽(오른쪽) 절반이 밝다
    ctx.fillStyle = '#14161d'; ctx.beginPath(); ctx.arc(x, y, 9, Math.PI / 2, (3 * Math.PI) / 2); ctx.fill();
    ctx.globalAlpha = 1;
    label(ctx, names[k], cx + (R0 + 26) * A.cosd(a), cy - (R0 + 26) * A.sind(a), 'rgba(190,200,235,0.75)', 'center', 11, 600);
  }
  // 공전 방향
  const ar = R0 * 0.82;
  ctx.strokeStyle = 'rgba(160,180,240,0.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, ar, -2.2, -2.9, true); ctx.stroke();
  arrow(ctx, cx + ar * Math.cos(-2.85), cy + ar * Math.sin(-2.85), cx + ar * Math.cos(-2.95), cy + ar * Math.sin(-2.95), 'rgba(160,180,240,0.7)', 1.2, 7);
  label(ctx, '달의 공전', cx + ar * Math.cos(-2.55), cy + ar * Math.sin(-2.55) + 14, 'rgba(160,180,240,0.8)', 'center', 10.5, 500);

  // 지구 (낮/밤)
  ctx.fillStyle = '#0e1d3d'; ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3d7fd6'; ctx.beginPath(); ctx.arc(cx, cy, rE, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.strokeStyle = '#5fa8ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.stroke();
  label(ctx, '낮', cx + 14, cy, '#e8f2ff', 'center', 10.5, 700); label(ctx, '밤', cx - 14, cy, '#7f93c4', 'center', 10.5, 700);
  // 관측자 표시
  dot(ctx, P[0], P[1], 4.5, '#ffeeb0');
  ctx.strokeStyle = '#ffeeb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(P[0] + 14 * z[0], P[1] + 14 * z[1]); ctx.stroke();
  label(ctx, `서울 ${A.fmtHM(A.civilFromJD(st.jd, TZ).hours)}`, P[0] + 30 * z[0] + (z[0] < 0 ? -6 : 6), P[1] + 30 * z[1] - 2, '#ffeeb0', z[0] < 0 ? 'right' : 'left', 12, 700);

  // 현재 달
  const e = ph.elong, mx = cx + R0 * A.cosd(e), my = cy - R0 * A.sind(e);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
  phaseDisk(ctx, mx, my, 15, 0, 0, false);
  ctx.fillStyle = '#14161d'; ctx.beginPath(); ctx.arc(mx, my, 15, Math.PI / 2, (3 * Math.PI) / 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, my, 19, 0, TAU); ctx.stroke();
  // 지구에서 본 모습 (북반구에서 남쪽을 볼 때)
  const ox = cx + (R0 + 62) * A.cosd(e), oy = cy - (R0 + 62) * A.sind(e);
  const fx = Math.min(w - 120, Math.max(60, ox)), fy = Math.min(usableH - 40, Math.max(70, oy));
  phaseDisk(ctx, fx, fy, 24, ph.phaseAngle, e < 180 ? 0 : Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(fx, fy, 26, 0, TAU); ctx.stroke();
  label(ctx, '지구에서 본 모습', fx, fy + 38, '#e6e9f5', 'center', 11.5, 700);

  // 이각 호
  ctx.strokeStyle = '#ffa23f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 52, 0, -e * A.DEG, true); ctx.stroke();
  label(ctx, `이각 ${e.toFixed(0)}°`, cx + 66 * A.cosd(e / 2), cy - 66 * A.sind(e / 2), '#ffbd73', 'center', 11.5, 700);
  label(ctx, '북극(황도 북극) 위에서 내려다본 모습 · 지구와 달의 크기·거리는 과장됨', 14, h - barReserve() - 14, 'rgba(150,170,230,0.75)', 'left', 11.5, 500);
}

// ------------------------------------------------------------------ 뷰 2: 항성월과 삭망월
function drawMonthView(ctx, w, h) {
  const usableH = h - barReserve();
  const lu = lunation(st.jd);
  const t0 = lu.t0, t1 = t0 + A.SIDEREAL_MONTH, t2 = lu.t1;
  const ref = A.sunPosition(t0).lon + 180; // t0일 때 지구의 일심 황경을 화면 +x로
  const rm = Math.max(34, Math.min(56, usableH * 0.13));
  const Ro = Math.max(150, Math.min(w - 330, (usableH - 110 - 2 * rm) / A.sind(32)));
  const sx = Math.max(60, w - 300 - Ro), cy = 76 + rm + Ro * A.sind(32);
  const earthAt = (t) => { const a = A.sunPosition(t).lon + 180 - ref; return [sx + Ro * A.cosd(a), cy - Ro * A.sind(a)]; };
  const moonAt = (t, E) => { const a = A.moonPosition(t).lon - ref; return [E[0] + rm * A.cosd(a), E[1] - rm * A.sind(a)]; };
  // 태양과 궤도
  dot(ctx, sx, cy, 16, '#ffd56b', 3);
  label(ctx, '태양', sx, cy + 30, '#ffd76e', 'center', 12, 700);
  ctx.strokeStyle = 'rgba(95,168,255,0.45)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(sx, cy, Ro, 0.25, -0.75, true); ctx.stroke();
  label(ctx, '지구의 공전 궤도', sx + Ro * Math.cos(0.12) + 8, cy - Ro * Math.sin(0.12) + 18, 'rgba(140,190,255,0.85)', 'left', 11, 500);

  const draw = (t, tag, color, strong, lp = 'below') => {
    const E = earthAt(t), Mn = moonAt(t, E);
    ctx.strokeStyle = 'rgba(200,210,240,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(E[0], E[1], rm, 0, TAU); ctx.stroke();
    ctx.strokeStyle = strong ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = strong ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(Mn[0], Mn[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,107,0.4)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(E[0] + (sx - E[0]) * 0.32, E[1] + (cy - E[1]) * 0.32); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, E[0], E[1], 7, '#5fa8ff', 2);
    const la = Math.atan2(cy - Mn[1], sx - Mn[0]);
    phaseDisk(ctx, Mn[0], Mn[1], 7, 0, la, false);
    ctx.fillStyle = '#14161d'; ctx.beginPath(); ctx.arc(Mn[0], Mn[1], 7, la + Math.PI / 2, la + (3 * Math.PI) / 2); ctx.fill();
    if (lp === 'below') label(ctx, tag, E[0], E[1] + rm + 16, color, 'center', 12, 700);
    else if (lp === 'right') label(ctx, tag, E[0] + rm + 12, E[1] + 4, color, 'left', 12, 700);
    else if (lp === 'rightUp') label(ctx, tag, E[0] + rm + 12, E[1] - 14, color, 'left', 12, 700);
    return { E, Mn };
  };
  const a = draw(t0, `① 삭 (${fmtShort(t0)})`, '#cfd8ff', false, 'below');
  const b = draw(t1, `② 항성월 후 +27.32일 (${fmtShort(t1)})`, '#ffa3ff', false, 'right');
  const c = draw(t2, `③ 다음 삭 +29.53일 (${fmtShort(t2)})`, '#9fffc6', false, 'rightUp');
  // 먼 별 방향 (평행선)
  [a, b].forEach((o) => {
    const d = [o.Mn[0] - o.E[0], o.Mn[1] - o.E[1]], L = Math.hypot(...d);
    arrow(ctx, o.Mn[0], o.Mn[1], o.Mn[0] + (d[0] / L) * 70, o.Mn[1] + (d[1] / L) * 70, '#ff9fe8', 1.4, 7);
  });
  label(ctx, '①, ② 달은 같은 별 방향 (서로 평행)', b.Mn[0] - 78, b.Mn[1] + 16, '#ffb8ef', 'right', 11.5, 600);
  // 항성월 후 남은 각
  const sunDir = Math.atan2(cy - b.E[1], sx - b.E[0]), moonDir = Math.atan2(b.Mn[1] - b.E[1], b.Mn[0] - b.E[0]);
  let dd = sunDir - moonDir; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
  ctx.strokeStyle = '#ffa23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.E[0], b.E[1], rm * 0.6, moonDir, moonDir + dd, dd < 0); ctx.stroke();
  const dAng = A.norm360(A.sunPosition(t1).lon - A.moonPosition(t1).lon);
  label(ctx, `②에서 약 ${dAng.toFixed(0)}° 더 돌아야 삭`, b.E[0] - rm - 8, b.E[1] - rm * 0.55, '#ffbd73', 'right', 12, 700);
  // 현재
  if (st.jd > t0 + 1.5 && st.jd < t1 - 1.5) draw(st.jd, `지금 (${fmtShort(st.jd)})`, '#ffffff', true, 'right');
  label(ctx, '1/S = 1/P☾ − 1/E → 1/29.53 = 1/27.32 − 1/365.26', 14, 62, '#ffe08a', 'left', 13, 700);
  label(ctx, '지구–달 거리는 실제보다 매우 크게 그림', 14, h - barReserve() - 14, 'rgba(150,170,230,0.75)', 'left', 11.5, 500);
}

// ------------------------------------------------------------------ 뷰 3: 백도와 식 (비스듬히 본 3D)
function drawEclipseView(ctx, w, h, ph) {
  const usableH = h - barReserve();
  const cx = w / 2 - 20, cy = 40 + (usableH - 40) / 2 + 14;
  const Ro = Math.max(80, Math.min(w * 0.25, (usableH - 90) / 0.9));
  const el = 24 * A.DEG, az = -28 * A.DEG;
  const sun = ph.sun, m = ph.moon;
  // 좌표: x = 태양 방향, y = 동쪽 90°, z = 황도 북극 (지구 중심)
  const P = (x, y, z) => {
    const xr = x * Math.cos(az) - y * Math.sin(az), yr = x * Math.sin(az) + y * Math.cos(az);
    return [cx + xr * Ro, cy - (z * Math.cos(el) + yr * Math.sin(el)) * Ro, yr];
  };
  const ellipsePath = (fn, n = 180) => { ctx.beginPath(); for (let k = 0; k <= n; k++) { const p = fn((k / n) * 360); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } };
  // 황도면
  ellipsePath((a) => P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0));
  ctx.fillStyle = 'rgba(255,204,77,0.06)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,204,77,0.6)'; ctx.lineWidth = 1.4; ctx.stroke();
  label(ctx, '황도면', ...P(A.cosd(200) * 1.25, A.sind(200) * 1.25, 0).slice(0, 2), '#ffd76e', 'center', 12, 700);
  // 식이 가능한 영역 (태양·반태양 방향 ±16°)
  [[0, 'rgba(255,214,107,0.16)', '일식 가능 범위'], [180, 'rgba(255,120,120,0.14)', '월식 가능 범위']].forEach(([c0, col, t]) => {
    ctx.beginPath(); const o = P(0, 0, 0); ctx.moveTo(o[0], o[1]);
    for (let a = c0 - 16; a <= c0 + 16; a += 2) { const p = P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  });
  // 태양 방향과 지구 그림자
  const s1 = P(1.6, 0, 0);
  arrow(ctx, ...P(1.3, 0, 0).slice(0, 2), s1[0], s1[1], '#ffd56b', 2.2, 10);
  dot(ctx, s1[0] + 18, s1[1], 9, '#ffd56b', 2.4);
  label(ctx, '태양 방향', s1[0] + 18, s1[1] - 22, '#ffd76e', 'center', 12, 700);
  const sh = P(-1.45, 0, 0);
  ctx.strokeStyle = 'rgba(160,160,180,0.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...P(0, 0, 0).slice(0, 2)); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
  label(ctx, '지구 그림자', sh[0] - 4, sh[1] + 16, '#c9c9d9', 'center', 11.5, 600);
  // 백도 (기울기 과장)
  const inc = 5.145 * st.exag, nodeA = A.norm360(m.node - sun.lon);
  const orbit = (u, r = 1) => { const x0 = Math.cos(u * A.DEG), y0 = Math.sin(u * A.DEG) * A.cosd(inc), z0 = Math.sin(u * A.DEG) * A.sind(inc); return P(r * (x0 * A.cosd(nodeA) - y0 * A.sind(nodeA)), r * (x0 * A.sind(nodeA) + y0 * A.cosd(nodeA)), r * z0); };
  // 뒤쪽 반 → 앞쪽 반 순서로 (위/아래 구분 색)
  for (let k = 0; k < 360; k += 3) {
    const p0 = orbit(k), p1 = orbit(k + 3);
    ctx.strokeStyle = k < 180 ? 'rgba(200,215,255,0.9)' : 'rgba(200,215,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
  }
  label(ctx, `백도 (경사 5.1°를 ${st.exag}배 과장)`, ...orbit(90).slice(0, 2).map((v, i) => v + (i ? -14 : 0)), '#cfd8ff', 'center', 11.5, 700);
  // 교점선
  const n1 = orbit(0, 1.12), n2 = orbit(180, 1.12);
  ctx.strokeStyle = 'rgba(208,140,255,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, '☊ 승교점', n1[0], n1[1] - 12, '#e2b8ff', 'center', 12.5, 800);
  label(ctx, '☋ 강교점', n2[0], n2[1] - 12, '#e2b8ff', 'center', 12.5, 800);
  // 지구
  const o = P(0, 0, 0);
  dot(ctx, o[0], o[1], 9, '#5fa8ff', 2.4);
  label(ctx, '지구', o[0] + 12, o[1] + 14, '#9fcaff', 'left', 12, 700);
  // 달 (실제 황경·황위, 황위 과장)
  const dl = A.norm360(m.lon - sun.lon), b = m.lat * st.exag;
  const mp = P(A.cosd(b) * A.cosd(dl), A.cosd(b) * A.sind(dl), A.sind(b));
  const foot = P(A.cosd(dl), A.sind(dl), 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(mp[0], mp[1]); ctx.stroke(); ctx.setLineDash([]);
  phaseDisk(ctx, mp[0], mp[1], 10, 90, Math.atan2(s1[1] - mp[1], s1[0] - mp[0]), false); // 태양 쪽 절반이 밝다
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(mp[0], mp[1], 13, 0, TAU); ctx.stroke();
  label(ctx, `달 (황위 ${m.lat >= 0 ? '+' : ''}${m.lat.toFixed(2)}°)`, mp[0] + 16, mp[1] - 12, '#fff', 'left', 12, 700);
  // 정보
  const dNode = Math.min(Math.abs(A.norm180(sun.lon - m.node)), Math.abs(A.norm180(sun.lon - m.node - 180)));
  label(ctx, `태양과 가까운 교점 사이의 각: ${dNode.toFixed(1)}°  ${dNode < 17 ? '→ 지금은 식 계절 (삭·망 때 식이 일어날 수 있음)' : '→ 식 계절 아님'}`, 14, 62, dNode < 17 ? '#ffe08a' : '#9aa5cc', 'left', 13, 700);
  label(ctx, '태양이 고정되도록 회전하는 좌표에서 본 모습: 교점선이 약 346.6일(식년)에 한 바퀴 돈다', 14, h - barReserve() - 14, 'rgba(150,170,230,0.75)', 'left', 11.5, 500);
}

// ------------------------------------------------------------------ 아래 그래프
function drawSub() {
  const { ctx, w, h } = M2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, w, h);
  if (st.view === 'eclipse') return drawBetaChart(ctx, w, h);
  // 이번 삭망월 달력
  const lu = lunation(st.jd), n = Math.ceil(lu.t1 - lu.t0) + 1;
  const pad = 16, cw = (w - pad * 2) / n, r = Math.max(5, Math.min(cw * 0.36, 15));
  label(ctx, `이번 삭망월: ${fmtKST(lu.t0)} 삭 → ${fmtKST(lu.t1)} 삭 (매일 21시의 모습, 북반구에서 남쪽을 볼 때)`, pad, 18, '#8a96c4', 'left', 11.5, 600);
  for (let k = 0; k < n; k++) {
    const jd = dayStart(lu.t0 + k) + 21 / 24; // 그날 21시(KST)
    const p = A.moonPhase(jd);
    const x = pad + cw * (k + 0.5), y = h / 2 + 2;
    const today = Math.abs(dayStart(jd) - dayStart(st.jd)) < 1e-6;
    if (today) { ctx.fillStyle = 'rgba(110,168,255,0.18)'; ctx.fillRect(x - cw / 2 + 1, 30, cw - 2, h - 40); }
    phaseDisk(ctx, x, y, r, p.phaseAngle, p.elong < 180 ? 0 : Math.PI);
    const c = A.civilFromJD(jd, TZ);
    if (cw > 22 || k % 2 === 0) label(ctx, `${c.d}`, x, y + r + 14, today ? '#fff' : '#8a96c4', 'center', 10.5, today ? 800 : 500);
    const age = jd - lu.t0;
    if (cw > 22 || k % 3 === 0) label(ctx, `${age.toFixed(0)}`, x, y - r - 12, 'rgba(160,175,220,0.6)', 'center', 9.5, 500);
  }
  [[lu.q1, '상현'], [lu.full, '망'], [lu.q3, '하현']].forEach(([t, nm]) => {
    const x = pad + cw * (t - lu.t0 + 0.5);
    label(ctx, `${nm} ${fmtShort(t)}`, x, h - 10, '#ffd76e', 'center', 10.5, 700);
  });
  label(ctx, '월령', pad, 34, 'rgba(160,175,220,0.6)', 'left', 9.5, 500);
}
let betaCache = null;
function drawBetaChart(ctx, w, h) {
  const span = 420, t0 = st.jd - span / 2, t1 = st.jd + span / 2;
  if (!betaCache || Math.abs(betaCache.c - st.jd) > 40) {
    const pts = [];
    let t = t0 - 30;
    while (t < t1 + 30) {
      const tn = A.findMoonPhase(t, 0), tf = A.findMoonPhase(t, 180);
      const ts = Math.min(tn, tf);
      pts.push({ t: ts, isNew: ts === tn, b: A.moonPosition(ts).lat });
      t = ts + 2;
    }
    betaCache = { c: st.jd, pts };
  }
  const pad = { l: 46, r: 16, t: 28, b: 24 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const xs = (t) => pad.l + ((t - t0) / span) * pw, ys = (b) => pad.t + ph / 2 - (b / 5.6) * (ph / 2);
  ctx.fillStyle = 'rgba(255,214,107,0.10)'; ctx.fillRect(pad.l, ys(1.5), pw, ys(-1.5) - ys(1.5));
  ctx.fillStyle = 'rgba(255,120,120,0.12)'; ctx.fillRect(pad.l, ys(1.0), pw, ys(-1.0) - ys(1.0));
  ctx.strokeStyle = 'rgba(255,204,77,0.6)'; ctx.beginPath(); ctx.moveTo(pad.l, ys(0)); ctx.lineTo(w - pad.r, ys(0)); ctx.stroke();
  [-5, -2.5, 0, 2.5, 5].forEach((b) => label(ctx, `${b > 0 ? '+' : ''}${b}°`, pad.l - 6, ys(b), '#8a96c4', 'right', 10, 500));
  for (const p of betaCache.pts) {
    if (p.t < t0 || p.t > t1) continue;
    const x = xs(p.t), y = ys(p.b);
    ctx.strokeStyle = p.isNew ? 'rgba(255,214,107,0.5)' : 'rgba(220,220,235,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, ys(0)); ctx.lineTo(x, y); ctx.stroke();
    dot(ctx, x, y, 3.2, p.isNew ? '#ffd56b' : '#e6e6f0');
  }
  for (const e of eclipses) {
    if (e.t < t0 || e.t > t1) continue;
    const x = xs(e.t);
    label(ctx, e.type.replace('일식', '일식').replace('월식', '월식'), x, pad.t - 10 + (e.kind === 'solar' ? 0 : 0), e.kind === 'solar' ? '#ffd76e' : '#ff9a8a', 'center', 10.5, 700);
  }
  ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs(st.jd), pad.t); ctx.lineTo(xs(st.jd), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
  for (let k = -1; k <= 1; k++) { const t = st.jd + k * 182; label(ctx, fmtKST(t, false).slice(0, 7), xs(t), h - 10, '#8a96c4', 'center', 10.5, 500); }
  label(ctx, '삭(노랑)·망(흰색) 때 달의 황위 β — 띠 안에 들어오면 식: 노랑 |β|<1.5°(일식), 빨강 |β|<1.0°(월식)', w - pad.r, 12, '#8a96c4', 'right', 11, 500);
}

// ------------------------------------------------------------------ 패널
function drawPhasePanel(ph) {
  const cv = $('#cPhase'), ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  phaseDisk(ctx, cv.width / 2, cv.height / 2, cv.width * 0.42, ph.phaseAngle, ph.elong < 180 ? 0 : Math.PI);
}
function renderPanel() {
  const ph = A.moonPhase(st.jd), m = ph.moon, lu = lunation(st.jd);
  drawPhasePanel(ph);
  const age = st.jd - lu.t0;
  $('#phaseInfo').innerHTML = `<b style="font-size:16px">${A.moonPhaseName(ph.elong)}</b><br>
    <span class="k">월령</span> <b>${age.toFixed(1)}일</b><br>
    <span class="k">밝은 부분</span> ${(ph.illum * 100).toFixed(1)}%<br>
    <span class="k">이각</span> ${(ph.elong <= 180 ? ph.elong : 360 - ph.elong).toFixed(1)}° (태양의 ${ph.elong <= 180 ? '동쪽' : '서쪽'})<br>
    <span class="note">${ph.elong <= 180 ? '차오르는 중 — 오른쪽(서쪽)이 밝다' : '기우는 중 — 왼쪽(동쪽)이 밝다'}</span>`;
  const dNode = Math.min(Math.abs(A.norm180(ph.sun.lon - m.node)), Math.abs(A.norm180(ph.sun.lon - m.node - 180)));
  const sizeNote = m.dist < 362000 ? ' (근지점 부근 — 크게 보임)' : m.dist > 402000 ? ' (원지점 부근 — 작게 보임)' : '';
  $('#moonInfo').innerHTML = `<span class="k">지구–달 거리</span> <b>${Math.round(m.dist).toLocaleString()} km</b>${sizeNote}<br>
    <span class="k">시직경</span> ${(2 * m.sd * 60).toFixed(1)}′ · <span class="k">지평 시차</span> ${(m.par * 60).toFixed(1)}′<br>
    <span class="k">황경 λ</span> ${m.lon.toFixed(2)}° · <span class="k">황위 β</span> ${m.lat >= 0 ? '+' : ''}${m.lat.toFixed(2)}°<br>
    <span class="k">적경 α</span> ${A.fmtRA(m.ra, false)} · <span class="k">적위 δ</span> ${A.fmtDMS(m.dec, true, false)} <span class="note">(지심, 그날 분점)</span><br>
    <span class="k">승교점 황경 Ω</span> ${m.node.toFixed(1)}° · <span class="k">태양–교점</span> ${dNode.toFixed(1)}°${dNode < 17 ? ' <b style="color:#ffd76e">식 계절</b>' : ''}`;
  const c = A.civilFromJD(st.jd, TZ), jd0 = A.jdFromCivil(c.y, c.m, c.d, 0, TZ);
  const rs = A.moonRiseSet(jd0, LAT, LON), hz = A.moonHorizontal(st.jd, LAT, LON);
  const ev = [['월출', rs.rise], ['남중', rs.transit], ['월몰', rs.set]].filter((x) => x[1] != null).sort((a, b) => a[1] - b[1]);
  $('#riseInfo').innerHTML = `<b>서울 ${A.fmtDate(c)} (KST)</b><br>` +
    (ev.length ? ev.map(([n, t]) => `<span class="k">${n}</span> <b>${A.fmtHM(t)}</b>${n === '남중' ? ` (고도 ${rs.transitAlt.toFixed(1)}°)` : ''}`).join(' · ') : '이날은 뜨거나 지지 않음') +
    `<br><span class="k">지금 달의 고도</span> ${hz.alt.toFixed(1)}° · <span class="k">방위각</span> ${hz.az.toFixed(1)}° (${A.azName(hz.az)}) — ${hz.alt > 0 ? '<b style="color:var(--good)">지평선 위</b>' : '지평선 아래'}<br>` +
    `<span class="note">관측자 위치에 따른 시차(최대 약 1°)와 대기차를 반영한 값</span>`;
  // 다가오는 위상
  const list = [];
  let t = st.jd;
  for (let k = 0; k < 8; k++) {
    const cands = [[0, '삭'], [90, '상현'], [180, '망'], [270, '하현']].map(([a, n]) => ({ t: A.findMoonPhase(t, a), n }));
    const nx = cands.reduce((p, q) => (q.t < p.t ? q : p));
    list.push(nx); t = nx.t + 0.5;
  }
  $('#phaseList').innerHTML = list.map((x) => `<li data-t="${x.t}"><span>${x.n}</span><span>${fmtKST(x.t)}</span></li>`).join('');
  $('#lnk3d').href = `celestial.html?step=16&jd=${st.jd.toFixed(5)}`;
  $('#clock').innerHTML = `<b>${fmtKST(st.jd)}</b> KST<br>월령 ${age.toFixed(1)}일 · ${A.moonPhaseName(ph.elong).split(' ')[0]}`;
  if (document.activeElement !== $('#date')) $('#date').value = A.fmtDate(c);
  if (document.activeElement !== $('#time')) $('#time').value = Math.floor(c.hours * 60);
}
$('#phaseList').addEventListener('click', (e) => { const li = e.target.closest('li[data-t]'); if (li) setJD(+li.dataset.t); });

// 일식·월식 목록
let eclipses = [];
function computeEclipses() {
  const years = +$('#eclYears').value;
  eclipses = A.findEclipses(A.jdFromDate(new Date()) - 1, years, LAT, LON);
  renderEclipses();
  betaCache = null;
}
function renderEclipses() {
  const only = $('#onlyKorea').checked;
  const rows = eclipses.filter((e) => !only || e.vis !== '안 보임');
  $('#eclList').innerHTML = rows.map((e) => {
    let detail = '';
    if (e.kind === 'lunar') detail = `${e.umag > 0 ? `본영 식분 ${e.umag.toFixed(2)}` : `반영 식분 ${e.pmag.toFixed(2)}`} · 최대 ${fmtKST(e.t)}${e.vis !== '안 보임' ? ` · 서울 달 고도 ${e.altMax.toFixed(0)}°` : ''}`;
    else detail = `최대 ${fmtKST(e.t)} (지구 전체 기준)${e.local ? `<br>서울: ${fmtKST(e.local.t)}에 태양 지름의 ${(e.local.mag * 100).toFixed(0)}%가 가려짐 (태양 고도 ${e.local.sunAlt.toFixed(0)}°)` : ''}`;
    return `<li class="${e.kind}" data-t="${e.t}"><span class="vis ${e.vis !== '안 보임' ? 'on' : ''}">서울 ${e.vis}</span><span class="ty">${e.kind === 'solar' ? '☀️' : '🌕'} ${e.type}</span> ${fmtKST(e.t, false)}<br><span class="note">${detail}</span></li>`;
  }).join('') || '<li>해당하는 식이 없습니다.</li>';
}
$('#eclList').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-t]');
  if (!li) return;
  setJD(+li.dataset.t); setView('eclipse');
});
$('#onlyKorea').addEventListener('change', renderEclipses);
$('#eclYears').addEventListener('change', computeEclipses);

// ------------------------------------------------------------------ 컨트롤
function setJD(jd) { st.jd = jd; st.playing = false; $('#btnPlay').textContent = '▶'; }
function setView(v) {
  st.view = v;
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
}
$$('#viewSeg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#btnPlay').addEventListener('click', () => { st.playing = !st.playing; $('#btnPlay').textContent = st.playing ? '❚❚' : '▶'; });
$('#speed').addEventListener('change', (e) => (st.speed = +e.target.value));
st.speed = +$('#speed').value;
$$('[data-step]').forEach((b) => b.addEventListener('click', () => { st.jd += +b.dataset.step; }));
$('#date').addEventListener('change', (e) => {
  const [y, m, d] = e.target.value.split('-').map(Number);
  if (y) st.jd = A.jdFromCivil(y, m, d, A.civilFromJD(st.jd, TZ).hours, TZ);
});
$('#time').addEventListener('input', (e) => {
  const c = A.civilFromJD(st.jd, TZ);
  st.jd = A.jdFromCivil(c.y, c.m, c.d, +e.target.value / 60, TZ);
});
$$('.tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((x) => x.classList.toggle('on', x.id === 'tab-' + b.dataset.tab));
}));
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#btnPlay').click(); }
  if (e.code === 'ArrowRight') st.jd += e.shiftKey ? 1 : 1 / 24;
  if (e.code === 'ArrowLeft') st.jd -= e.shiftKey ? 1 : 1 / 24;
});

// ------------------------------------------------------------------ 루프
setView(st.view);
setTimeout(computeEclipses, 30);
let last = performance.now(), tick = 0;
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (st.playing) st.jd += st.speed * dt;
  const ph = A.moonPhase(st.jd);
  const { ctx, w, h } = M1;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  bg.addColorStop(0, '#0b1022'); bg.addColorStop(1, '#03050b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (st.view === 'phase') drawPhaseView(ctx, w, h, ph);
  else if (st.view === 'month') drawMonthView(ctx, w, h);
  else drawEclipseView(ctx, w, h, ph);
  drawSub();
  if ((tick += dt) > 0.15) { tick = 0; renderPanel(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
