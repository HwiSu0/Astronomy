// =====================================================================
//  moon.js — 달의 운동 실험실 (위상, 월출·월몰, 항성월·삭망월, 백도와 식)
// =====================================================================
import * as A from './astro.js';
import { FONT, begin as beginLayout, block, blockCircle, blockPath, blockElement, label, place as placeLabel, around, isFree } from './labels.js';

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

// 밝은 종이 바탕용 그림 색
const INK = '#1f2129', MUTED = '#5f6270', PAPER = '#fbfaf8';
const C = { sun: '#e9a514', sunInk: '#9a6200', earth: '#2a6fd0', earthInk: '#1f5bb0', hor: '#1d8a50', horInk: '#17703f', elong: '#d4650c', elongInk: '#b5540a', node: '#6a39b0', sidereal: '#a3369a', synodic: '#17703f', moonDark: '#2b2e36', eclLunar: '#b8322f' };
function dot(ctx, x, y, r, color, halo = 0) {
  // halo: 큰 천체를 구별하기 위한 옅은 테두리 (빛 번짐 효과는 쓰지 않음)
  if (halo) { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r + 2 + halo, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  if (halo) { ctx.strokeStyle = PAPER; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function arrow(ctx, x0, y0, x1, y1, color, w = 1.6, hs = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - hs * Math.cos(a - 0.4), y1 - hs * Math.sin(a - 0.4)); ctx.lineTo(x1 - hs * Math.cos(a + 0.4), y1 - hs * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/**
 * 위상 원판: phaseAngle i (0 = 보름, 180 = 삭), litAngle = 밝은 쪽 방향(화면 각, 라디안, 0 = 오른쪽)
 */
function phaseDisk(ctx, x, y, r, i, litAngle, earthshine = true, outline = true) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(litAngle);
  ctx.fillStyle = earthshine ? '#3a3d47' : C.moonDark;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  const k = A.cosd(i);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fffaea'); g.addColorStop(1, '#e6dcbc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, Math.max(0.01, Math.abs(r * k)), r, 0, Math.PI / 2, (3 * Math.PI) / 2, k < 0);
  ctx.fill();
  // 밝은 바탕에서 달의 밝은 면이 묻히지 않도록 윤곽선
  if (outline) { ctx.strokeStyle = 'rgba(31,33,41,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
/** 궤도 위의 달: 태양 쪽 절반이 밝다 (litAngle = 태양 방향) */
function halfMoon(ctx, x, y, r, litAngle, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  phaseDisk(ctx, x, y, r, 0, litAngle, false);
  ctx.fillStyle = C.moonDark; ctx.beginPath(); ctx.arc(x, y, r, litAngle + Math.PI / 2, litAngle + (3 * Math.PI) / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(31,33,41,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
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

// 그림 영역의 위·아래 여백: 위는 보기 전환 버튼, 아래는 설명 글
const TOP = 62, BOTTOM = 30;

// ------------------------------------------------------------------ 뷰 1: 위상과 뜨는 시각
function drawPhaseView(ctx, w, h, ph) {
  const usableH = h - barReserve();
  const narrow = w < 560, fs = narrow ? 12 : 13;
  const sunW = narrow ? 48 : 96;                        // 오른쪽: 햇빛 화살표 자리
  const availH = Math.max(180, usableH - TOP - BOTTOM);
  const R0 = Math.max(64, Math.min((w - sunW) / 2 - 46, availH / 2 - 36));
  const cx = (w - sunW) / 2, cy = TOP + availH / 2;

  // 설명 (맨 아래)
  label(ctx, narrow ? '황도 북극에서 본 모습 · 크기·거리 과장' : '황도 북극(위)에서 내려다본 모습 · 지구와 달의 크기·거리는 과장됨', 12, usableH - 14, MUTED, 'left', 12, 400);

  // 관측자(서울)의 지평선과 보이는 쪽
  const lst = A.lstDeg(st.jd, LON);
  const last = A.norm24(12 + A.norm180(lst - ph.sun.ra) / 15);
  const th = (last - 12) * 15;
  const rE = narrow ? 24 : 30;
  const z = [A.cosd(th), -A.sind(th)], tg = [A.sind(th), A.cosd(th)];
  const P = [cx + rE * z[0], cy + rE * z[1]];
  const L = Math.max(w, h) * 2;
  ctx.fillStyle = 'rgba(29,138,80,0.06)';
  ctx.beginPath();
  ctx.moveTo(P[0] + L * tg[0], P[1] + L * tg[1]); ctx.lineTo(P[0] + L * tg[0] + L * z[0], P[1] + L * tg[1] + L * z[1]);
  ctx.lineTo(P[0] - L * tg[0] + L * z[0], P[1] - L * tg[1] + L * z[1]); ctx.lineTo(P[0] - L * tg[0], P[1] - L * tg[1]);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(29,138,80,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(P[0] - R0 * 1.3 * tg[0], P[1] - R0 * 1.3 * tg[1]); ctx.lineTo(P[0] + R0 * 1.3 * tg[0], P[1] + R0 * 1.3 * tg[1]); ctx.stroke(); ctx.setLineDash([]);

  // 햇빛 (오른쪽에서 온다)
  const ay0 = TOP + 18, ay1 = TOP + availH - 8;
  label(ctx, '햇빛', w - sunW / 2 - 4, TOP - 2, C.sunInk, 'center', fs + 1, 700);
  for (let k = 0; k <= 6; k++) {
    const y = ay0 + ((ay1 - ay0) * k) / 6;
    arrow(ctx, w - 8, y, w - sunW + 10, y, 'rgba(233,165,20,0.85)', 2, 9);
  }
  block(w - sunW + 4, TOP + 8, sunW, availH);

  // 달 궤도와 8위상 (궤도 위 모습: 항상 태양 쪽 절반이 밝다)
  ctx.strokeStyle = 'rgba(31,33,41,0.3)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
  const names = ['삭', '초승달', '상현', '상현망', '망', '하현망', '하현', '그믐달'];
  for (let k = 0; k < 8; k++) {
    const a = k * 45, x = cx + R0 * A.cosd(a), y = cy - R0 * A.sind(a);
    halfMoon(ctx, x, y, 9, 0, 0.6);
    blockCircle(x, y, 10);
    const lx = cx + (R0 + 22) * A.cosd(a), ly = cy - (R0 + 22) * A.sind(a);
    const al = A.cosd(a) > 0.3 ? 'left' : A.cosd(a) < -0.3 ? 'right' : 'center';
    label(ctx, names[k], al === 'left' ? lx - 6 : al === 'right' ? lx + 6 : lx, ly, MUTED, al, fs, 500);
  }
  // 공전 방향 화살표
  const ar = R0 * 0.8;
  ctx.strokeStyle = 'rgba(31,33,41,0.4)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, ar, -2.2, -2.9, true); ctx.stroke();
  arrow(ctx, cx + ar * Math.cos(-2.85), cy + ar * Math.sin(-2.85), cx + ar * Math.cos(-2.95), cy + ar * Math.sin(-2.95), 'rgba(31,33,41,0.55)', 1.2, 7);

  // 지구 (낮/밤)
  ctx.fillStyle = '#1f3563'; ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9cc0ef'; ctx.beginPath(); ctx.arc(cx, cy, rE, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.strokeStyle = C.earth; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rE, 0, TAU); ctx.stroke();
  label(ctx, '낮', cx + rE * 0.45, cy, '#123a75', 'center', 11.5, 700, false); label(ctx, '밤', cx - rE * 0.45, cy, '#d3ddf2', 'center', 11.5, 700, false);
  blockCircle(cx, cy, rE + 2);
  // 관측자 표시
  dot(ctx, P[0], P[1], 4.5, C.elongInk);
  ctx.strokeStyle = C.elongInk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(P[0] + 14 * z[0], P[1] + 14 * z[1]); ctx.stroke();
  blockCircle(P[0] + 7 * z[0], P[1] + 7 * z[1], 9);

  // 이각 호
  const e = ph.elong;
  ctx.strokeStyle = C.elong; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, rE + 22, 0, -e * A.DEG, true); ctx.stroke();

  // 현재 달
  const mx = cx + R0 * A.cosd(e), my = cy - R0 * A.sind(e);
  ctx.strokeStyle = 'rgba(31,33,41,0.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
  halfMoon(ctx, mx, my, 15, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, my, 19, 0, TAU); ctx.stroke();
  blockCircle(mx, my, 21);

  // 지구에서 본 달: 궤도와 겹치지 않는 구석에 작은 상자로 (자리가 없으면 오른쪽 패널의 그림을 본다)
  {
    const ir = 26, t1 = '지구에서 본 달', t2 = '남쪽 하늘을 볼 때';
    ctx.font = FONT(12, 600);
    const bw = Math.max(ctx.measureText(t1).width + 20, 2 * ir + 24, 120), bh = 2 * ir + 52;
    const spots = [[12, TOP], [w - sunW - bw - 10, TOP], [12, TOP + availH - bh], [w - sunW - bw - 10, TOP + availH - bh]];
    const free = ([x, y]) => {
      const nx = A.clamp(cx, x, x + bw), ny = A.clamp(cy, y, y + bh);
      return x >= 0 && Math.hypot(nx - cx, ny - cy) > R0 + 44 && isFree({ x, y, w: bw, h: bh });
    };
    const spot = spots.find(free);
    if (spot) {
      const [x, y] = spot;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(31,33,41,0.2)'; ctx.lineWidth = 1;
      roundRect(ctx, x + 0.5, y + 0.5, bw, bh, 6); ctx.fill(); ctx.stroke();
      label(ctx, t1, x + bw / 2, y + 15, INK, 'center', 12, 600, false);
      phaseDisk(ctx, x + bw / 2, y + 28 + ir, ir, ph.phaseAngle, e < 180 ? 0 : Math.PI);
      label(ctx, t2, x + bw / 2, y + bh - 13, MUTED, 'center', 11, 400, false);
      block(x, y, bw, bh);
    }
  }

  // ---- 자리를 찾아 놓는 라벨들 ----
  const side = z[0] < 0 ? 'right' : 'left';
  placeLabel(ctx, `서울 ${A.fmtHM(A.civilFromJD(st.jd, TZ).hours)}`, [
    [P[0] + 28 * z[0], P[1] + 28 * z[1], side],
    [P[0] + 28 * z[0] + 20 * tg[0], P[1] + 28 * z[1] + 20 * tg[1], side],
    [P[0] + 28 * z[0] - 20 * tg[0], P[1] + 28 * z[1] - 20 * tg[1], side],
    [P[0] + 46 * z[0], P[1] + 46 * z[1], 'center'],
    [P[0] + 30 * tg[0], P[1] + 30 * tg[1], 'center'], [P[0] - 30 * tg[0], P[1] - 30 * tg[1], 'center'],
  ], C.elongInk, fs, 700);
  const ec = [];
  for (const rr of [rE + 40, rE + 56, rE + 74, rE + 92]) for (const da of [0, 16, -16, 32, -32]) {
    const a = e / 2 + da;
    if (a > 0 && a < e) ec.push([cx + rr * A.cosd(a), cy - rr * A.sind(a), 'center']);
  }
  if (!ec.length) ec.push([cx + (rE + 40) * A.cosd(e / 2), cy - (rE + 40) * A.sind(e / 2), 'center']);
  placeLabel(ctx, `이각 ${e.toFixed(0)}°`, ec, C.elongInk, fs, 700);
  const hc = [];
  for (const k of [1.15, 0.95, 1.32, -1.15, -0.95, -1.32]) for (const off of [-13, 13]) hc.push([P[0] + R0 * k * tg[0] + off * z[0], P[1] + R0 * k * tg[1] + off * z[1], 'center']);
  placeLabel(ctx, '서울의 지평선', hc, C.horInk, fs, 600);
  const vc = [];
  for (const d of [76, 96, 118, 58]) for (const s of [0, 36, -36]) vc.push([P[0] + d * z[0] + s * tg[0], P[1] + d * z[1] + s * tg[1], 'center']);
  placeLabel(ctx, '이쪽 하늘이 보인다', vc, C.hor, fs - 0.5, 600);
  placeLabel(ctx, '달의 공전', [-2.55, -2.35, -2.75, -2.15].flatMap((a) => [[cx + (ar - 16) * Math.cos(a), cy + (ar - 16) * Math.sin(a), 'center'], [cx + (ar + 16) * Math.cos(a), cy + (ar + 16) * Math.sin(a), 'center']]), MUTED, fs - 0.5, 500);
}

// ------------------------------------------------------------------ 뷰 2: 항성월과 삭망월
function drawMonthView(ctx, w, h) {
  const usableH = h - barReserve();
  const narrow = w < 560, fs = narrow ? 12 : 13;
  const top = TOP + 26;                                  // 공식 한 줄을 더 둔다
  const availH = Math.max(200, usableH - top - BOTTOM);
  const lu = lunation(st.jd);
  const t0 = lu.t0, t1 = t0 + A.SIDEREAL_MONTH, t2 = lu.t1;
  const ref = A.sunPosition(t0).lon + 180;               // t0일 때 지구의 일심 황경을 화면 +x로
  const rm = narrow ? 32 : A.clamp(availH * 0.12, 36, 54);
  const ex = narrow ? w * 0.5 : Math.min(w - 330, w * 0.62);  // 세 지구가 놓이는 세로 줄의 x
  // 한 달 동안 지구가 약 29° 돈다. 넓은 화면에서는 태양이 화면 안에 들어오도록 반지름을 줄인다
  const Ro = Math.max(160, Math.min((availH - 2 * rm - 40) / A.sind(31), narrow ? Infinity : ex - 90));
  const sx = ex - Ro, cy = top + availH - rm - 18;       // 태양 위치 (넓지 않으면 화면 왼쪽 밖)
  const earthAt = (t) => { const a = A.sunPosition(t).lon + 180 - ref; return [sx + Ro * A.cosd(a), cy - Ro * A.sind(a)]; };
  const moonAt = (t, E) => { const a = A.moonPosition(t).lon - ref; return [E[0] + rm * A.cosd(a), E[1] - rm * A.sind(a)]; };

  label(ctx, '1/S = 1/P☾ − 1/E → 1/29.53 = 1/27.32 − 1/365.26', 12, TOP + 4, INK, 'left', fs, 600);
  label(ctx, '지구–달 거리는 실제보다 매우 크게 그림', 12, usableH - 14, MUTED, 'left', 12, 400);

  // 태양과 지구 궤도
  ctx.strokeStyle = 'rgba(42,111,208,0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(sx, cy, Ro, 0.2, -0.85, true); ctx.stroke();
  if (sx > 30) {
    dot(ctx, sx, cy, 16, C.sun, 3);
    blockCircle(sx, cy, 22);
    placeLabel(ctx, '태양', around(sx, cy, 30), C.sunInk, fs, 700);
  } else {
    arrow(ctx, 46, cy - 6, 10, cy - 6, C.sun, 2.2, 10);
    block(6, cy - 14, 46, 16);
    label(ctx, '태양 쪽', 14, cy + 12, C.sunInk, 'left', fs, 700);
  }
  const orbitLabelAt = [0.78, 0.68, -0.12];

  // 세 시각의 지구–달 (그림을 먼저 모두 그리고, 라벨은 나중에 자리를 찾는다)
  const draw = (t, strong) => {
    const E = earthAt(t), Mn = moonAt(t, E);
    ctx.strokeStyle = 'rgba(31,33,41,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(E[0], E[1], rm, 0, TAU); ctx.stroke();
    ctx.strokeStyle = strong ? INK : 'rgba(31,33,41,0.45)'; ctx.lineWidth = strong ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(Mn[0], Mn[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(176,122,0,0.55)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(E[0] + (sx - E[0]) * 0.3, E[1] + (cy - E[1]) * 0.3); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, E[0], E[1], 7, C.earth, 2);
    halfMoon(ctx, Mn[0], Mn[1], 7, Math.atan2(cy - Mn[1], sx - Mn[0]));
    blockCircle(E[0], E[1], 10); blockCircle(Mn[0], Mn[1], 9);
    return { E, Mn };
  };
  const a = draw(t0, false), b = draw(t1, false), c = draw(t2, false);
  const now = st.jd > t0 + 1.5 && st.jd < t1 - 1.5 ? draw(st.jd, true) : null;
  // 먼 별 방향 (①, ②의 달 방향은 평행)
  const al = narrow ? 44 : 70;
  const tips = [a, b].map((o) => {
    const d = [o.Mn[0] - o.E[0], o.Mn[1] - o.E[1]], L = Math.hypot(...d);
    const tip = [o.Mn[0] + (d[0] / L) * al, o.Mn[1] + (d[1] / L) * al];
    arrow(ctx, o.Mn[0], o.Mn[1], tip[0], tip[1], C.sidereal, 1.4, 7);
    return tip;
  });
  // 항성월 후 남은 각
  const sunDir = Math.atan2(cy - b.E[1], sx - b.E[0]), moonDir = Math.atan2(b.Mn[1] - b.E[1], b.Mn[0] - b.E[0]);
  let dd = sunDir - moonDir; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
  ctx.strokeStyle = C.elong; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.E[0], b.E[1], rm * 0.6, moonDir, moonDir + dd, dd < 0); ctx.stroke();
  const dAng = A.norm360(A.sunPosition(t1).lon - A.moonPosition(t1).lon);

  // ---- 라벨 ----
  placeLabel(ctx, '지구의 공전 궤도', orbitLabelAt.flatMap((oa) => [[sx + Ro * Math.cos(oa) + 10, cy - Ro * Math.sin(oa), 'left'], [sx + Ro * Math.cos(oa) - 10, cy - Ro * Math.sin(oa), 'right']]), C.earthInk, fs - 1, 500);
  const tagAt = (o, text, color) => placeLabel(ctx, text, [
    [o.E[0] + rm + 10, o.E[1], 'left'], [o.E[0] + rm + 10, o.E[1] - 16, 'left'], [o.E[0] + rm + 10, o.E[1] + 16, 'left'],
    [o.E[0], o.E[1] + rm + 15, 'center'], [o.E[0], o.E[1] - rm - 14, 'center'], [o.E[0] + rm + 10, o.E[1] - 32, 'left'], [o.E[0] + rm + 10, o.E[1] + 32, 'left'],
  ], color, fs, 700);
  tagAt(c, narrow ? `③ 다음 삭 +29.53일 (${fmtShort(t2)})` : `③ 다음 삭: +29.53일 (${fmtShort(t2)})`, C.synodic);
  tagAt(b, narrow ? `② +27.32일 (${fmtShort(t1)})` : `② 항성월 후: +27.32일 (${fmtShort(t1)})`, C.sidereal);
  tagAt(a, `① 삭 (${fmtShort(t0)})`, INK);
  if (now) tagAt(now, `지금 (${fmtShort(st.jd)})`, INK);
  const tb = tips[1], ta = tips[0];
  placeLabel(ctx, narrow ? '①·② 같은 별 방향' : '①, ② 달은 같은 별 방향 (서로 평행)', [
    [tb[0] - 6, tb[1] - 14, 'right'], [tb[0] - 6, tb[1] + 14, 'right'], [ta[0] - 6, ta[1] + 14, 'right'], [ta[0] - 6, ta[1] - 14, 'right'],
    [tb[0], tb[1] - 28, 'center'], [ta[0], ta[1] + 28, 'center'],
  ], C.sidereal, fs - 0.5, 600);
  const rtext = narrow ? `약 ${dAng.toFixed(0)}° 더 돌아야 삭` : `②에서 약 ${dAng.toFixed(0)}° 더 돌아야 삭`;
  placeLabel(ctx, rtext, [
    [b.E[0] - rm - 8, b.E[1] - rm * 0.6, 'right'], [b.E[0] - rm - 8, b.E[1] - rm - 8, 'right'], [b.E[0], b.E[1] - rm - 30, 'center'],
    [b.E[0] - rm - 8, b.E[1] + rm * 0.7, 'right'], [b.E[0] + rm + 10, b.E[1] - rm - 10, 'left'],
  ], C.elongInk, fs, 700);
}

// ------------------------------------------------------------------ 뷰 3: 백도와 식 (비스듬히 본 3D)
function drawEclipseView(ctx, w, h, ph) {
  const usableH = h - barReserve();
  const narrow = w < 560, fs = narrow ? 12 : 13;
  const top = TOP + 26;
  const availH = Math.max(180, usableH - top - BOTTOM);
  const Ro = Math.max(70, Math.min((w - 60) / (narrow ? 2.75 : 3.1), (availH - 40) / 1.7));
  const cx = w / 2 - Ro * 0.12, cy = top + availH / 2 + 4;
  const el = (narrow ? 34 : 24) * A.DEG, az = -28 * A.DEG;
  const sun = ph.sun, m = ph.moon;
  // 좌표: x = 태양 방향, y = 동쪽 90°, z = 황도 북극 (지구 중심)
  const P = (x, y, z) => {
    const xr = x * Math.cos(az) - y * Math.sin(az), yr = x * Math.sin(az) + y * Math.cos(az);
    return [cx + xr * Ro, cy - (z * Math.cos(el) + yr * Math.sin(el)) * Ro, yr];
  };
  const ellipsePath = (fn, n = 180) => { ctx.beginPath(); for (let k = 0; k <= n; k++) { const p = fn((k / n) * 360); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } };
  const dNode = Math.min(Math.abs(A.norm180(sun.lon - m.node)), Math.abs(A.norm180(sun.lon - m.node - 180)));
  label(ctx, `태양과 가까운 교점 사이의 각: ${dNode.toFixed(1)}°  ${dNode < 17 ? (narrow ? '→ 식 계절' : '→ 지금은 식 계절 (삭·망 때 식이 일어날 수 있음)') : '→ 식 계절 아님'}`, 12, TOP + 4, dNode < 17 ? '#8a5a00' : MUTED, 'left', fs, 600);
  label(ctx, narrow ? '태양 방향을 고정한 좌표 · 교점선은 식년마다 한 바퀴' : '태양이 고정되도록 회전하는 좌표에서 본 모습: 교점선이 약 346.6일(식년)에 한 바퀴 돈다', 12, usableH - 14, MUTED, 'left', 12, 400);

  // 황도면
  ellipsePath((a) => P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0));
  ctx.fillStyle = 'rgba(233,165,20,0.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(176,122,0,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
  // 식이 가능한 영역 (태양·반태양 방향 ±16°)
  [[0, 'rgba(233,165,20,0.2)'], [180, 'rgba(210,58,80,0.14)']].forEach(([c0, col]) => {
    ctx.beginPath(); const o = P(0, 0, 0); ctx.moveTo(o[0], o[1]);
    for (let a = c0 - 16; a <= c0 + 16; a += 2) { const p = P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  });
  // 태양 방향과 지구 그림자
  const s1 = P(narrow ? 1.45 : 1.6, 0, 0);
  arrow(ctx, ...P(1.28, 0, 0).slice(0, 2), s1[0], s1[1], C.sun, 2.2, 10);
  const sunPt = [s1[0] + 16, s1[1]];
  dot(ctx, sunPt[0], sunPt[1], 9, C.sun, 2.4);
  blockCircle(sunPt[0], sunPt[1], 14);
  const sh = P(narrow ? -1.32 : -1.45, 0, 0);
  ctx.strokeStyle = 'rgba(60,62,75,0.4)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...P(0, 0, 0).slice(0, 2)); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
  // 백도 (기울기 과장)
  const inc = 5.145 * st.exag, nodeA = A.norm360(m.node - sun.lon);
  const orbit = (u, r = 1) => { const x0 = Math.cos(u * A.DEG), y0 = Math.sin(u * A.DEG) * A.cosd(inc), z0 = Math.sin(u * A.DEG) * A.sind(inc); return P(r * (x0 * A.cosd(nodeA) - y0 * A.sind(nodeA)), r * (x0 * A.sind(nodeA) + y0 * A.cosd(nodeA)), r * z0); };
  // 황도면 위쪽 반은 진하게, 아래쪽 반은 옅게
  for (let k = 0; k < 360; k += 3) {
    const p0 = orbit(k), p1 = orbit(k + 3);
    ctx.strokeStyle = k < 180 ? 'rgba(31,33,41,0.85)' : 'rgba(31,33,41,0.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
  }
  // 교점선
  const n1 = orbit(0, 1.12), n2 = orbit(180, 1.12);
  ctx.strokeStyle = 'rgba(122,69,196,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]); ctx.stroke(); ctx.setLineDash([]);
  // 지구
  const o = P(0, 0, 0);
  dot(ctx, o[0], o[1], 9, C.earth, 2.4);
  blockCircle(o[0], o[1], 13);
  // 달 (실제 황경·황위, 황위 과장)
  const dl = A.norm360(m.lon - sun.lon), b = m.lat * st.exag;
  const mp = P(A.cosd(b) * A.cosd(dl), A.cosd(b) * A.sind(dl), A.sind(b));
  const foot = P(A.cosd(dl), A.sind(dl), 0);
  ctx.strokeStyle = 'rgba(31,33,41,0.45)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(mp[0], mp[1]); ctx.stroke(); ctx.setLineDash([]);
  phaseDisk(ctx, mp[0], mp[1], 10, 90, Math.atan2(s1[1] - mp[1], s1[0] - mp[0]), false); // 태양 쪽 절반이 밝다
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(mp[0], mp[1], 13, 0, TAU); ctx.stroke();
  blockCircle(mp[0], mp[1], 15);

  // ---- 라벨 ---- (선 위에 얹히지 않도록 백도·황도면·그림자 선을 먼저 막아 둔다)
  const samp = (fn, n) => Array.from({ length: n + 1 }, (_, k) => fn((k / n) * 360));
  blockPath(samp((u) => orbit(u), 72));
  blockPath(samp((a) => P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0), 72));
  blockPath(Array.from({ length: 9 }, (_, k) => P(((narrow ? -1.32 : -1.45) * k) / 8, 0, 0)), 4);
  placeLabel(ctx, `달 (황위 ${m.lat >= 0 ? '+' : ''}${m.lat.toFixed(2)}°)`, around(mp[0], mp[1], 19), INK, fs, 700);
  placeLabel(ctx, '지구', around(o[0], o[1], 16), C.earthInk, fs, 700);
  placeLabel(ctx, '태양 방향', [[sunPt[0], sunPt[1] - 24, 'center'], [sunPt[0], sunPt[1] + 24, 'center'], [sunPt[0] - 8, sunPt[1] - 24, 'right']], C.sunInk, fs, 700);
  placeLabel(ctx, '☊ 승교점', [[n1[0], n1[1] - 13, 'center'], [n1[0], n1[1] + 14, 'center'], ...around(n1[0], n1[1], 12)], C.node, fs, 700);
  placeLabel(ctx, '☋ 강교점', [[n2[0], n2[1] - 13, 'center'], [n2[0], n2[1] + 14, 'center'], ...around(n2[0], n2[1], 12)], C.node, fs, 700);
  placeLabel(ctx, '지구 그림자', [[sh[0], sh[1] + 16, 'center'], [sh[0], sh[1] - 16, 'center'], [sh[0] - 8, sh[1], 'right'], [sh[0] + 20, sh[1] + 18, 'center']], '#4a4c57', fs - 0.5, 600);
  const pc = [];
  for (const a of [200, 160, 230, 130, 250, 110]) { const p = P(A.cosd(a) * 1.25, A.sind(a) * 1.25, 0); pc.push([p[0], p[1] + 14, 'center'], [p[0], p[1] - 14, 'center']); }
  placeLabel(ctx, '황도면', pc, C.sunInk, fs, 700);
  const oc = [];
  for (const u of [90, 60, 120, 40, 140, 270, 240, 300]) { const p = orbit(u); oc.push([p[0], p[1] - 14, 'center'], [p[0], p[1] + 15, 'center']); }
  placeLabel(ctx, narrow ? `백도 (경사 ${st.exag}배 과장)` : `백도 (경사 5.1°를 ${st.exag}배 과장)`, oc, INK, fs - 0.5, 600);
}

// ------------------------------------------------------------------ 아래 그래프
function drawSub() {
  const { ctx, w, h } = M2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
  beginLayout(0, 0, w, h);
  if (st.view === 'eclipse') return drawBetaChart(ctx, w, h);
  // 이번 삭망월 달력
  const narrow = w < 560;
  const lu = lunation(st.jd), n = Math.ceil(lu.t1 - lu.t0) + 1;
  const pad = 16, cw = (w - pad * 2) / n, r = Math.max(5, Math.min(cw * 0.36, 15));
  label(ctx, narrow ? `${fmtShort(lu.t0)} 삭 → ${fmtShort(lu.t1)} 삭 · 매일 21시, 남쪽 하늘` : `이번 삭망월: ${fmtKST(lu.t0)} 삭 → ${fmtKST(lu.t1)} 삭 (매일 21시의 모습, 북반구에서 남쪽을 볼 때)`, pad, 16, MUTED, 'left', 12, 600);
  const y = h / 2 + 4;
  for (let k = 0; k < n; k++) {
    const jd = dayStart(lu.t0 + k) + 21 / 24; // 그날 21시(KST)
    const p = A.moonPhase(jd);
    const x = pad + cw * (k + 0.5);
    const today = Math.abs(dayStart(jd) - dayStart(st.jd)) < 1e-6;
    if (today) { ctx.fillStyle = 'rgba(38,72,168,0.09)'; ctx.fillRect(x - cw / 2 + 1, 30, cw - 2, h - 40); }
    phaseDisk(ctx, x, y, r, p.phaseAngle, p.elong < 180 ? 0 : Math.PI);
    const c = A.civilFromJD(jd, TZ);
    if (cw > 22 || k % 2 === 0) label(ctx, `${c.d}`, x, y + r + 13, today ? INK : MUTED, 'center', 11.5, today ? 700 : 400);
    const age = jd - lu.t0;
    if (cw > 22 || k % 3 === 0) label(ctx, `${age.toFixed(0)}`, x, y - r - 11, '#7a7c86', 'center', 10.5, 400);
  }
  [[lu.q1, '상현'], [lu.full, '망'], [lu.q3, '하현']].forEach(([t, nm]) => {
    const x = pad + cw * (t - lu.t0 + 0.5);
    label(ctx, `${nm} ${fmtShort(t)}`, x, h - 10, C.sunInk, 'center', 11.5, 600);
  });
  label(ctx, '월령', pad, 34, '#7a7c86', 'left', 10.5, 400);
}
let betaCache = null;
function drawBetaChart(ctx, w, h) {
  const narrow = w < 560;
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
  const pad = { l: 46, r: 16, t: 44, b: 22 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const xs = (t) => pad.l + ((t - t0) / span) * pw, ys = (b) => pad.t + ph / 2 - (b / 5.6) * (ph / 2);
  label(ctx, narrow ? '삭(노랑)·망(회색) 때 달의 황위 β · 띠 안이면 식' : '삭(노랑)·망(회색) 때 달의 황위 β — 띠 안에 들어오면 식: 노랑 |β| < 1.5°(일식), 빨강 |β| < 1.0°(월식)', pad.l, 13, MUTED, 'left', 11.5, 500);
  ctx.fillStyle = 'rgba(233,165,20,0.14)'; ctx.fillRect(pad.l, ys(1.5), pw, ys(-1.5) - ys(1.5));
  ctx.fillStyle = 'rgba(210,58,80,0.12)'; ctx.fillRect(pad.l, ys(1.0), pw, ys(-1.0) - ys(1.0));
  ctx.strokeStyle = 'rgba(176,122,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, ys(0)); ctx.lineTo(w - pad.r, ys(0)); ctx.stroke();
  [-5, -2.5, 0, 2.5, 5].forEach((b) => label(ctx, `${b > 0 ? '+' : ''}${b}°`, pad.l - 6, ys(b), MUTED, 'right', 10.5, 500));
  for (const p of betaCache.pts) {
    if (p.t < t0 || p.t > t1) continue;
    const x = xs(p.t), y = ys(p.b);
    ctx.strokeStyle = p.isNew ? 'rgba(176,122,0,0.55)' : 'rgba(31,33,41,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, ys(0)); ctx.lineTo(x, y); ctx.stroke();
    dot(ctx, x, y, 3.2, p.isNew ? C.sun : MUTED);
  }
  ctx.strokeStyle = 'rgba(31,33,41,0.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs(st.jd), pad.t - 6); ctx.lineTo(xs(st.jd), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
  for (let k = -1; k <= 1; k++) { const t = st.jd + k * 182; label(ctx, fmtKST(t, false).slice(0, 7), xs(t), h - 9, MUTED, 'center', 10.5, 500); }
  for (const e of eclipses) {
    if (e.t < t0 || e.t > t1) continue;
    const x = xs(e.t);
    placeLabel(ctx, e.type, [[x, 31, 'center'], [x + 4, 31, 'left'], [x - 4, 31, 'right'], [x, pad.t + 6, 'center'], [x, h - 22, 'center']], e.kind === 'solar' ? C.sunInk : C.eclLunar, 11, 600);
  }
}

// ------------------------------------------------------------------ 패널
function drawPhasePanel(ph) {
  const cv = $('#cPhase'), ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  phaseDisk(ctx, cv.width / 2, cv.height / 2, cv.width * 0.42, ph.phaseAngle, ph.elong < 180 ? 0 : Math.PI, true, false);
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
    <span class="k">승교점 황경 Ω</span> ${m.node.toFixed(1)}° · <span class="k">태양–교점</span> ${dNode.toFixed(1)}°${dNode < 17 ? ' <b style="color:var(--accent2)">식 계절</b>' : ''}`;
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
    return `<li class="${e.kind}" data-t="${e.t}"><span class="vis ${e.vis !== '안 보임' ? 'on' : ''}">서울 ${e.vis}</span><span class="ty">${e.type}</span> ${fmtKST(e.t, false)}<br><span class="note">${detail}</span></li>`;
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
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
  beginLayout(0, 0, w, h - barReserve());
  blockElement($('#cMain'), $('.canvas-main .overlay-tl'));
  if (st.view === 'phase') drawPhaseView(ctx, w, h, ph);
  else if (st.view === 'month') drawMonthView(ctx, w, h);
  else drawEclipseView(ctx, w, h, ph);
  drawSub();
  if ((tick += dt) > 0.15) { tick = 0; renderPanel(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
