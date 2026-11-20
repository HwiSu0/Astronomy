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
//  달의 위치 — Meeus, Astronomical Algorithms 47장 (ELP-2000/82 축약판)
//  주요 항만 남긴 계열: 황경·황위 오차 약 0.01°, 거리 오차 수 km
// ---------------------------------------------------------------------
// [D, M, M′, F, Σl(10⁻⁶°), Σr(10⁻³ km)]
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884], [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0], [2, 0, -1, -2, 0, 8752],
];
// [D, M, M′, F, Σb(10⁻⁶°)]
const MOON_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833],
];
export const SYNODIC_MONTH = 29.530589, SIDEREAL_MONTH = 27.321662, DRACONIC_MONTH = 27.212221, ANOMALISTIC_MONTH = 27.554550;
export const R_EARTH = 6378.14, R_MOON = 1737.4, AU_KM = 149597870.7;

/** 달의 지심 위치 (그날의 평균 춘분점 기준 황경·황위, 적경·적위, 거리 km, 지평 시차, 시반경) */
export function moonPosition(jd) {
  const T = (jd - J2000) / 36525, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000);
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000);
  const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.290 * T, A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, l, r] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F, e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sl += l * e * sind(arg); sr += r * e * cosd(arg);
  }
  for (const [d, m, mp, f, b] of MOON_B) {
    const arg = d * D + m * M + mp * Mp + f * F, e = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sb += b * e * sind(arg);
  }
  sl += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
  sb += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F) + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);
  const lon = norm360(Lp + sl / 1e6), lat = sb / 1e6, dist = 385000.56 + sr / 1000;
  const eps = OBLIQUITY - 0.0130042 * T;
  const eq = eclToEq(lon, lat, eps);
  const node = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T2); // 평균 승교점 황경
  return { lon, lat, dist, ra: eq.ra, dec: eq.dec, eps, node, par: asind(R_EARTH / dist), sd: asind(R_MOON / dist), Mp, F };
}

/** 달의 위상: elong = λ☾ − λ☉ (0 삭, 90 상현, 180 망, 270 하현), 위상각, 밝은 면 비율 */
export function moonPhase(jd) {
  const m = moonPosition(jd), s = sunPosition(jd);
  const elong = norm360(m.lon - s.lon);
  const psi = acosd(cosd(m.lat) * cosd(m.lon - s.lon)); // 지구에서 본 태양–달 각거리
  const R = s.dist * AU_KM;
  const i = atan2d(R * sind(psi), m.dist - R * cosd(psi)); // 위상각 (태양–달–지구)
  return { moon: m, sun: s, elong, psi, phaseAngle: i, illum: (1 + cosd(i)) / 2 };
}
/** jdStart 이후 처음으로 elong = target(°)이 되는 시각 */
export function findMoonPhase(jdStart, target) {
  let t = jdStart + norm360(target - moonPhase(jdStart).elong) / 12.19;
  for (let k = 0; k < 12; k++) {
    const diff = norm180(target - moonPhase(t).elong);
    t += diff / 12.19;
    if (Math.abs(diff) < 1e-7) break;
  }
  return t < jdStart - 1e-6 ? findMoonPhase(jdStart + 1, target) : t;
}
export function moonPhaseName(elong) {
  const e = norm360(elong);
  if (e < 7 || e > 353) return '삭 (신월)';
  if (e < 83) return '초승달';
  if (e <= 97) return '상현달';
  if (e < 173) return '상현망 사이 (차오르는 볼록달)';
  if (e <= 187) return '보름달 (망)';
  if (e < 263) return '하현망 사이 (기우는 볼록달)';
  if (e <= 277) return '하현달';
  return '그믐달';
}
/** 지심 적경·적위 → 관측자 기준(토포센트릭) 적경·적위. 구형 지구 근사 */
export function topocentric(ra, dec, distKm, lat, lst) {
  const v = radecToVec(ra, dec).map((x) => x * distKm);
  const t = [v[0] - R_EARTH * cosd(lat) * cosd(lst), v[1] - R_EARTH * cosd(lat) * sind(lst), v[2] - R_EARTH * sind(lat)];
  const r = vecToRadec(t);
  return { ra: r.ra, dec: r.dec, dist: Math.hypot(t[0], t[1], t[2]) };
}
/** 관측자에게 보이는 달의 지평 좌표 */
export function moonHorizontal(jd, lat, lon) {
  const m = moonPosition(jd), lst = lstDeg(jd, lon);
  const tp = topocentric(m.ra, m.dec, m.dist, lat, lst);
  return { ...eqToHor(norm360(lst - tp.ra), tp.dec, lat), ra: tp.ra, dec: tp.dec, ha: norm180(lst - tp.ra), moon: m };
}
/** 하루(지방시 0~24시) 동안의 월출·남중·월몰 시각 (시 단위, 없으면 null) */
export function moonRiseSet(jd0, lat, lon) {
  const n = 144, f = [], H = [];
  for (let k = 0; k <= n; k++) {
    const h = moonHorizontal(jd0 + k / n, lat, lon);
    f.push(h.alt + 0.5667 + h.moon.sd); // 위쪽 가장자리 + 대기차
    H.push(h.ha);
  }
  const refine = (fn, a, b) => { let fa = fn(a); for (let i = 0; i < 30; i++) { const m = (a + b) / 2, fm = fn(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };
  const out = { rise: null, set: null, transit: null, transitAlt: null };
  for (let k = 0; k < n; k++) {
    const a = jd0 + k / n, b = jd0 + (k + 1) / n;
    if (f[k] < 0 && f[k + 1] >= 0 && out.rise === null) out.rise = (refine((t) => { const h = moonHorizontal(t, lat, lon); return h.alt + 0.5667 + h.moon.sd; }, a, b) - jd0) * 24;
    if (f[k] >= 0 && f[k + 1] < 0 && out.set === null) out.set = (refine((t) => { const h = moonHorizontal(t, lat, lon); return h.alt + 0.5667 + h.moon.sd; }, a, b) - jd0) * 24;
    if (H[k] < 0 && H[k + 1] >= 0 && H[k + 1] - H[k] < 90 && out.transit === null) {
      const tt = refine((t) => moonHorizontal(t, lat, lon).ha, a, b);
      out.transit = (tt - jd0) * 24; out.transitAlt = moonHorizontal(tt, lat, lon).alt;
    }
  }
  return out;
}

// ---------------------------------------------------------------------
//  일식·월식 (지심 기하 + 그림자 반지름. 월식은 Chauvenet 1.02 확대)
// ---------------------------------------------------------------------
function goldenMin(f, a, b) {
  const g = 0.381966;
  let c = a + g * (b - a), d = b - g * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < 50; i++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = a + g * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = b - g * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}
const sunSD = (s) => 0.266563 / s.dist, sunPar = (s) => 8.794 / 3600 / s.dist;

export function lunarEclipseAt(tFull, lat = 37.5665, lon = 126.978) {
  const sep = (t) => { const m = moonPosition(t), s = sunPosition(t); return acosd(-cosd(m.lat) * cosd(m.lon - s.lon)); };
  const t = goldenMin(sep, tFull - 0.3, tFull + 0.3);
  const m = moonPosition(t), s = sunPosition(t), sigma = sep(t);
  const ru = 1.02 * (m.par + sunPar(s) - sunSD(s)), rp = 1.02 * (m.par + sunPar(s) + sunSD(s)), sm = m.sd;
  const umag = (ru + sm - sigma) / (2 * sm), pmag = (rp + sm - sigma) / (2 * sm);
  let type = null;
  if (umag >= 1) type = '개기월식'; else if (umag > 0) type = '부분월식'; else if (pmag > 0) type = '반영월식';
  if (!type) return null;
  // 관측 가능성: 최대 식 ± 반영식 진행 시간 중 달이 떠 있는가
  const half = Math.sqrt(Math.max(0, (rp + sm) ** 2 - sigma ** 2)) / 0.5490 / 24; // 달의 상대 운동 약 0.549°/시
  const alts = [-1, -0.5, 0, 0.5, 1].map((k) => moonHorizontal(t + k * half, lat, lon).alt);
  const vis = alts[2] > 0 ? '보임' : alts.some((a) => a > 0) ? '일부 보임' : '안 보임';
  return { kind: 'lunar', type, t, mag: umag > 0 ? umag : pmag, umag, pmag, gamma: sigma / ru, altMax: alts[2], vis, sigma };
}

export function solarEclipseAt(tNew, lat = 37.5665, lon = 126.978) {
  const sep = (t) => { const m = moonPosition(t), s = sunPosition(t); return acosd(cosd(m.lat) * cosd(m.lon - s.lon)); };
  const t = goldenMin(sep, tNew - 0.3, tNew + 0.3);
  const m = moonPosition(t), s = sunPosition(t), sigma = sep(t);
  const ss = sunSD(s), dPar = m.par - sunPar(s);
  if (sigma >= dPar + m.sd + ss) return null;
  const gamma = sigma / dPar; // 그림자 축이 지구 중심에서 떨어진 거리 (지구 반지름 단위, 근사)
  let type = '부분일식';
  if (gamma < 0.997) {
    const ratio = (m.sd / ss) * (1 + (R_EARTH / m.dist) * Math.sqrt(1 - gamma * gamma));
    type = ratio > 1.0005 ? '개기일식' : ratio > 0.997 ? '혼성일식' : '금환일식';
  }
  // 서울에서의 모습: 토포센트릭 이각이 최소가 되는 순간
  let best = null;
  for (let k = -110; k <= 110; k++) {
    const tt = t + k / 480; // 3분 간격, ±약 4.6시간
    const mm = moonPosition(tt), sn = sunPosition(tt), lst = lstDeg(tt, lon);
    const sunAlt = eqToHor(norm360(lst - sn.ra), sn.dec, lat).alt;
    if (sunAlt < -0.8) continue;
    const tp = topocentric(mm.ra, mm.dec, mm.dist, lat, lst);
    const d = angularDistance(tp.ra, tp.dec, sn.ra, sn.dec), smT = asind(R_MOON / tp.dist), ssT = sunSD(sn);
    if (d < smT + ssT && (!best || d < best.d)) best = { t: tt, d, mag: (smT + ssT - d) / (2 * ssT), sunAlt };
  }
  return { kind: 'solar', type, t, gamma, sigma, ratio: m.sd / ss, local: best, vis: best ? '보임' : '안 보임' };
}

/** jdStart부터 years년 동안의 일식·월식 목록 */
export function findEclipses(jdStart, years, lat, lon) {
  const out = [], end = jdStart + years * 365.25;
  let t = jdStart;
  while (t < end) {
    const tn = findMoonPhase(t, 0), tf = findMoonPhase(t, 180);
    const isNew = tn < tf, ts = isNew ? tn : tf;
    if (ts > end) break;
    // 태양이 교점 근처(약 ±20°)에 있을 때만 자세히 계산
    const m = moonPosition(ts);
    if (Math.abs(m.lat) < 1.75) {
      const ev = isNew ? solarEclipseAt(ts, lat, lon) : lunarEclipseAt(ts, lat, lon);
      if (ev) out.push(ev);
    }
    t = ts + 2;
  }
  return out;
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
