// =====================================================================
//  astro.js — 천문 계산 엔진 (좌표 변환, 시간, 태양·행성 위치)
//  모든 각도의 단위는 도(°)이며, 적경도 내부적으로는 도(0~360°)로 다룬다.
//  (표시할 때만 시·분·초로 바꾼다. 1h = 15°)
// =====================================================================

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const J2000 = 2451545.0;            // 2000년 1월 1일 12시(TT)의 율리우스일
export const OBLIQUITY = 23.4392911;        // J2000 황도 경사 ε (°)
export const SIDEREAL_RATIO = 0.9972695663; // 항성일 / 평균 태양일
export const PREC_RATE = 50.29 / 3600;      // 일반 세차 (황경 방향) °/년

export const sind = (x) => Math.sin(x * DEG);
export const cosd = (x) => Math.cos(x * DEG);
export const tand = (x) => Math.tan(x * DEG);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const asind = (x) => Math.asin(clamp(x, -1, 1)) * RAD;
export const acosd = (x) => Math.acos(clamp(x, -1, 1)) * RAD;
export const atan2d = (y, x) => Math.atan2(y, x) * RAD;
export const norm360 = (x) => ((x % 360) + 360) % 360;
export const norm180 = (x) => { const y = norm360(x); return y > 180 ? y - 360 : y; };
export const norm24 = (h) => ((h % 24) + 24) % 24;

// ---------------------------------------------------------------------
//  시간
// ---------------------------------------------------------------------
export const jdFromDate = (d) => d.getTime() / 86400000 + 2440587.5;
export const dateFromJD = (jd) => new Date(Math.round((jd - 2440587.5) * 86400000));

/** 지방 표준시(시간대 tz 시간)로 주어진 날짜·시각 → 율리우스일 */
export function jdFromCivil(y, m, d, hours = 0, tz = 0) {
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  t.setUTCHours(0, 0, 0, 0);
  return t.getTime() / 86400000 + 2440587.5 + (hours - tz) / 24;
}

/** 율리우스일 → 지방 표준시(tz)의 연·월·일·시각(시간 단위 실수) */
export function civilFromJD(jd, tz = 0) {
  const d = dateFromJD(jd + tz / 24);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    hours: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3.6e6,
  };
}

/** 그리니치 평균 항성시 (°) — IAU 1982 식 */
export function gmstDeg(jd) {
  const d = jd - J2000, T = d / 36525;
  return norm360(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000);
}
/** 지방 항성시 (°). 경도 lon은 동경 +, 서경 − */
export const lstDeg = (jd, lon) => norm360(gmstDeg(jd) + lon);
/** 360°로 접지 않은 연속 항성시 (궤적 계산용) */
export const lstContinuous = (jd, lon) => 280.46061837 + 360.98564736629 * (jd - J2000) + lon;
export const epochFromJD = (jd) => 2000 + (jd - J2000) / 365.25;

// ---------------------------------------------------------------------
//  벡터와 좌표 변환
// ---------------------------------------------------------------------
export function radecToVec(ra, dec) {
  const c = cosd(dec);
  return [c * cosd(ra), c * sind(ra), sind(dec)];
}
export function vecToRadec(v) {
  const r = Math.hypot(v[0], v[1], v[2]);
  return { ra: norm360(atan2d(v[1], v[0])), dec: asind(v[2] / r) };
}
export function angularDistance(ra1, dec1, ra2, dec2) {
  return acosd(sind(dec1) * sind(dec2) + cosd(dec1) * cosd(dec2) * cosd(ra1 - ra2));
}

/**
 * 적도 좌표(시간각 H, 적위 δ) → 지평 좌표(고도 h, 방위각 A)
 * 방위각은 북점을 기준으로 동쪽(시계 방향)으로 잰다: 북 0°, 동 90°, 남 180°, 서 270°
 *   sin h = sin φ sin δ + cos φ cos δ cos H
 *   tan A = −cos δ sin H / (sin δ cos φ − cos δ sin φ cos H)
 */
export function eqToHor(ha, dec, lat) {
  const sh = sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(ha);
  const alt = asind(sh);
  const az = norm360(atan2d(-cosd(dec) * sind(ha), sind(dec) * cosd(lat) - cosd(dec) * sind(lat) * cosd(ha)));
  return { alt, az };
}
/** 지평 좌표 → 적도 좌표(시간각, 적위) */
export function horToEq(alt, az, lat) {
  const dec = asind(sind(lat) * sind(alt) + cosd(lat) * cosd(alt) * cosd(az));
  const ha = norm360(atan2d(-sind(az) * cosd(alt), cosd(lat) * sind(alt) - sind(lat) * cosd(alt) * cosd(az)));
  return { ha, dec };
}
/** 적도 → 황도 좌표 */
export function eqToEcl(ra, dec, eps = OBLIQUITY) {
  const lat = asind(sind(dec) * cosd(eps) - cosd(dec) * sind(eps) * sind(ra));
  const lon = norm360(atan2d(sind(ra) * cosd(dec) * cosd(eps) + sind(dec) * sind(eps), cosd(ra) * cosd(dec)));
  return { lon, lat };
}
/** 황도 → 적도 좌표 */
export function eclToEq(lon, lat, eps = OBLIQUITY) {
  const dec = asind(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon));
  const ra = norm360(atan2d(sind(lon) * cosd(lat) * cosd(eps) - sind(lat) * sind(eps), cosd(lon) * cosd(lat)));
  return { ra, dec };
}

/** J2000 적도 좌표 → 은하 좌표 회전 행렬 (Hipparcos/IAU 정의) */
export const EQ2GAL = [
  [-0.0548755604162154, -0.8734370902348850, -0.4838350155487132],
  [+0.4941094278755837, -0.4448296299600112, +0.7469822444972189],
  [-0.8676661490190047, -0.1980763734312015, +0.4559837761750669],
];
export const NGP = { ra: 192.85948, dec: 27.12825 };  // 은하 북극 (J2000)
export const GC = { ra: 266.40499, dec: -28.93617 };   // 은하 중심 (l=0, b=0)

const mulMV = (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
const mulMtV = (M, v) => [0, 1, 2].map((i) => M[0][i] * v[0] + M[1][i] * v[1] + M[2][i] * v[2]);

export function eqToGal(ra, dec) {
  const g = mulMV(EQ2GAL, radecToVec(ra, dec));
  return { l: norm360(atan2d(g[1], g[0])), b: asind(g[2]) };
}
export function galToEq(l, b) {
  return vecToRadec(mulMtV(EQ2GAL, radecToVec(l, b)));
}
export function galVecToEqVec(g) { return mulMtV(EQ2GAL, g); }

// ---------------------------------------------------------------------
//  세차 운동 (교육용 근사)
//  별은 황도에 대해 고정되어 있고, 춘분점이 황도를 따라 연 50.29″씩 서쪽으로
//  이동한다고 보는 모형. 황도 경사는 일정(23.44°)하다고 둔다.
//  → 수천 년 범위에서 천구 북극이 황도 북극 둘레로 그리는 원을 잘 보여 준다.
// ---------------------------------------------------------------------
export function precess(ra, dec, year) {
  const e = eqToEcl(ra, dec);
  return eclToEq(e.lon + PREC_RATE * (year - 2000), e.lat);
}
export function unprecess(ra, dec, year) {
  const e = eqToEcl(ra, dec);
  return eclToEq(e.lon - PREC_RATE * (year - 2000), e.lat);
}

// ---------------------------------------------------------------------
//  태양의 위치 (천문연감 저정밀식, 정확도 약 0.01°)
// ---------------------------------------------------------------------
export function sunPosition(jd) {
  const n = jd - J2000;
  const L = norm360(280.460 + 0.9856474 * n);  // 평균 황경
  const g = norm360(357.528 + 0.9856003 * n);  // 평균 근점 이각
  const lon = norm360(L + 1.915 * sind(g) + 0.020 * sind(2 * g));
  const eps = 23.439 - 0.0000004 * n;
  const ra = norm360(atan2d(cosd(eps) * sind(lon), cosd(lon)));
  const dec = asind(sind(eps) * sind(lon));
  const dist = 1.00014 - 0.01671 * cosd(g) - 0.00014 * cosd(2 * g);
  const eot = norm180(L - ra) * 4; // 균시차 (분) = 평균 태양 − 시태양
  return { lon, lat: 0, ra, dec, dist, eot, eps, L, g };
}

// ---------------------------------------------------------------------
//  케플러 방정식  E − e sin E = M  (뉴턴 반복법, 라디안)
// ---------------------------------------------------------------------
export function solveKepler(M, e) {
  M = Math.atan2(Math.sin(M), Math.cos(M));
  let E = e < 0.8 ? M : Math.PI * Math.sign(M || 1);
  for (let i = 0; i < 60; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}
/** 이심 근점 이각 E → 진근점 이각 ν (라디안) */
export const trueFromEcc = (E, e) => 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

// ---------------------------------------------------------------------
//  행성의 위치 — JPL 'Approximate Positions of the Planets' (Standish)
//  표 1 (1800~2050년 유효). 궤도 요소: a, e, I, L, ϖ, Ω  (+ 세기당 변화율)
// ---------------------------------------------------------------------
export const PLANETS = {
  mercury: { ko: '수성', en: 'Mercury', color: '#c9c0b3', diam: 4879, period: 87.969, inner: true,
    el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    rt: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  venus: { ko: '금성', en: 'Venus', color: '#fff1c1', diam: 12104, period: 224.701, inner: true,
    el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    rt: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
  earth: { ko: '지구', en: 'Earth', color: '#5fa8ff', diam: 12742, period: 365.256,
    el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    rt: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
  mars: { ko: '화성', en: 'Mars', color: '#ff7b54', diam: 6779, period: 686.980,
    el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rt: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  jupiter: { ko: '목성', en: 'Jupiter', color: '#f3d3a3', diam: 139820, period: 4332.59,
    el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rt: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  saturn: { ko: '토성', en: 'Saturn', color: '#e8d18c', diam: 116460, period: 10759.22,
    el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rt: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  uranus: { ko: '천왕성', en: 'Uranus', color: '#a6ecec', diam: 50724, period: 30688.5,
    el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    rt: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  neptune: { ko: '해왕성', en: 'Neptune', color: '#7fa6ff', diam: 49244, period: 60182,
    el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rt: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
};
export const PLANET_KEYS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export function orbitalElements(key, jd) {
  const p = PLANETS[key], T = (jd - J2000) / 36525;
  const v = p.el.map((x, i) => x + p.rt[i] * T);
  return { a: v[0], e: v[1], I: v[2], L: v[3], wbar: v[4], node: v[5] };
}

/** 일심 황도 직교 좌표 (J2000 황도, AU) */
export function heliocentric(key, jd) {
  const { a, e, I, L, wbar, node } = orbitalElements(key, jd);
  const w = wbar - node;
  const M = norm180(L - wbar) * DEG;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = cosd(w), sw = sind(w), cO = cosd(node), sO = sind(node), cI = cosd(I), sI = sind(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}
export function eclVecToEqVec(v, eps = OBLIQUITY) {
  const c = cosd(eps), s = sind(eps);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}

/** 지구에서 본 행성: 황경·황위(J2000), 적경·적위(J2000), 거리, 이각, 위상각 등 */
export function geocentric(key, jd) {
  const P = heliocentric(key, jd), E = heliocentric('earth', jd);
  const g = [P[0] - E[0], P[1] - E[1], P[2] - E[2]];
  const dist = Math.hypot(g[0], g[1], g[2]);
  const r = Math.hypot(P[0], P[1], P[2]);
  const rE = Math.hypot(E[0], E[1], E[2]);
  const lon = norm360(atan2d(g[1], g[0]));
  const lat = asind(g[2] / dist);
  const eq = vecToRadec(eclVecToEqVec(g));
  const sunLon = norm360(atan2d(-E[1], -E[0]));
  const elong = acosd((-E[0] * g[0] - E[1] * g[1] - E[2] * g[2]) / (rE * dist));
  const phase = acosd((r * r + dist * dist - rE * rE) / (2 * r * dist));
  return {
    helio: P, earth: E, geo: g, dist, r, rE, lon, lat, ra: eq.ra, dec: eq.dec, sunLon,
    elong, side: norm180(lon - sunLon) >= 0 ? 'E' : 'W',
    phase, illum: (1 + cosd(phase)) / 2,
    diam: (2 * Math.atan(PLANETS[key].diam / 2 / (dist * 149597870.7)) * RAD) * 3600, // 각지름(″)
  };
}

// ---------------------------------------------------------------------
//  출몰·남중
// ---------------------------------------------------------------------
/** 남중 고도(위), 하culmination 고도(아래) */
export function culmination(dec, lat) {
  return {
    upper: 90 - Math.abs(lat - dec),
    lower: Math.abs(lat + dec) - 90,
    dir: dec < lat ? '남' : dec > lat ? '북' : '천정',
  };
}
/** 출몰 시간각 H₀ 와 출몰 방위각. h0: 출몰 기준 고도(기하학적 0°, 대기차 고려 시 −0.5667°) */
export function riseSet(dec, lat, h0 = 0) {
  const cl = cosd(lat), cd = cosd(dec);
  if (cl < 1e-9 || cd < 1e-9) {
    // 극점(또는 천구의 극에 있는 천체): 고도가 하루 종일 일정하다
    return culmination(dec, lat).upper > h0 ? { type: 'circumpolar' } : { type: 'never' };
  }
  const cosH = (sind(h0) - sind(lat) * sind(dec)) / (cl * cd);
  if (cosH < -1) return { type: 'circumpolar' };
  if (cosH > 1) return { type: 'never' };
  const H0 = acosd(cosH);
  const azRise = acosd((sind(dec) - sind(lat) * sind(h0)) / (cl * cosd(h0)));
  return { type: 'normal', H0, azRise, azSet: 360 - azRise };
}
/** 시차각 q (천체에서 천구 북극 방향과 천정 방향 사이의 각) */
export function parallacticAngle(ha, dec, lat) {
  return atan2d(sind(ha), tand(lat) * cosd(dec) - sind(dec) * cosd(ha));
}

// ---------------------------------------------------------------------
//  형식 변환 (표시용)
// ---------------------------------------------------------------------
const pad = (n, w = 2) => String(n).padStart(w, '0');
export function fmtRA(deg, withSec = true) {
  const totalSec = Math.round((norm360(deg) / 15) * 3600 * (withSec ? 10 : 1 / 60));
  if (withSec) {
    const t = totalSec % (24 * 36000);
    const h = Math.floor(t / 36000), m = Math.floor((t % 36000) / 600), s = (t % 600) / 10;
    return `${h}h ${pad(m)}m ${s.toFixed(1).padStart(4, '0')}s`;
  }
  const t = totalSec % (24 * 60);
  return `${Math.floor(t / 60)}h ${pad(t % 60)}m`;
}
export function fmtDMS(deg, withSign = true, withSec = true) {
  const sign = deg < 0 ? '−' : withSign ? '+' : '';
  const a = Math.abs(deg);
  if (!withSec) {
    const t = Math.round(a * 60);
    return `${sign}${Math.floor(t / 60)}° ${pad(t % 60)}′`;
  }
  const t = Math.round(a * 3600);
  return `${sign}${Math.floor(t / 3600)}° ${pad(Math.floor((t % 3600) / 60))}′ ${pad(t % 60)}″`;
}
export const fmtDeg = (deg, d = 1) => `${deg.toFixed(d)}°`;
export function fmtHM(hours) {
  const t = Math.round(norm24(hours) * 60) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
export function fmtHours(hours) { // 시간각 등: 부호 있는 시·분
  const sign = hours < 0 ? '−' : '';
  const t = Math.round(Math.abs(hours) * 60);
  return `${sign}${Math.floor(t / 60)}h ${pad(t % 60)}m`;
}
export function fmtDate(c) { return `${c.y}-${pad(c.m)}-${pad(c.d)}`; }
export function azName(az) {
  const names = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  return names[Math.round(norm360(az) / 22.5) % 16];
}
/** 적경(시 단위) 문자열 "5h 55m 10s" 또는 "5 55 10" → 도 */
export function parseRA(str) {
  const nums = String(str).replace(/[hms:]/gi, ' ').trim().split(/\s+/).map(Number);
  if (nums.some(isNaN)) return NaN;
  return ((nums[0] || 0) + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600) * 15;
}
export function parseDec(str) {
  const s = String(str).trim();
  const neg = /^[-−]/.test(s);
  const nums = s.replace(/^[+\-−]/, '').replace(/[°′″'"]/g, ' ').trim().split(/\s+/).map(Number);
  if (nums.some(isNaN)) return NaN;
  const v = (nums[0] || 0) + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;
  return neg ? -v : v;
}
