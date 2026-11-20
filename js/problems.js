// =====================================================================
//  problems.js — 무작위 계산 문제 생성기와 개념 퀴즈 문제 은행
// =====================================================================
import * as A from './astro.js';

const R = (a, b, step = 1) => +(a + step * Math.floor(Math.random() * (Math.floor((b - a) / step + 1e-9) + 1))).toFixed(6);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sg = (d) => `${d >= 0 ? '+' : '−'}${Math.abs(d)}`;
const hm = (h) => { const t = Math.round(A.norm24(h) * 60) % 1440; return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`; };
const clock = (h) => A.fmtHM(h);
const E0 = A.OBLIQUITY;

/**
 * 각 생성기는 { q, ans, unit, tol, sol, kind } 를 돌려준다.
 * kind: 'deg' | 'hours' | 'clock' | 'num'   (입력 해석 방법)
 */
export const GENERATORS = [
  // ---------------------------------------------------------------- 기본
  { id: 'culm', level: 'basic', topic: '남중 고도', gen() {
    const phi = R(30, 45), dec = R(-30, 60, 5), h = 90 - Math.abs(phi - dec);
    return { q: `북위 ${phi}°인 곳에서 적위 ${sg(dec)}°인 별의 <b>남중 고도</b>는 몇 도인가?`, ans: h, unit: '°', tol: 0.5, kind: 'deg',
      sol: `남중 고도 h = 90° − |φ − δ| = 90° − |${phi}° − (${sg(dec)}°)| = <b>${h}°</b><br>δ ${dec < phi ? '<' : '>'} φ 이므로 천정의 ${dec < phi ? '남' : '북'}쪽에서 남중한다.` };
  } },
  { id: 'polar', level: 'basic', topic: '천구의 극과 위도', gen() {
    const hp = R(25, 60);
    return { q: `어느 지역에서 북극성의 고도가 ${hp}°로 관측되었다. 이 지역에서 <b>천구의 적도가 자오선과 만나는 점(남쪽)의 고도</b>는?`, ans: 90 - hp, unit: '°', tol: 0.5, kind: 'deg',
      sol: `북극성의 고도 ≈ 천구 북극의 고도 = 위도 φ = ${hp}°.<br>천구의 적도는 천구 북극에서 90° 떨어진 대원이므로 남쪽 자오선과 만나는 점의 고도는 90° − φ = <b>${90 - hp}°</b>.` };
  } },
  { id: 'circum', level: 'basic', topic: '주극성 조건', gen() {
    const phi = R(25, 65);
    return { q: `북위 ${phi}°인 곳에서 별이 <b>주극성</b>이 되려면 적위가 최소 몇 도 이상이어야 하는가?`, ans: 90 - phi, unit: '°', tol: 0.5, kind: 'deg',
      sol: `주극성은 하방 정중(북중) 때에도 지평선 위에 있어야 한다: |φ + δ| − 90° ≥ 0 → δ ≥ 90° − φ = <b>${90 - phi}°</b>.<br>(같은 원리로 δ ≤ −(90° − φ) = −${90 - phi}° 인 별은 전혀 뜨지 않는다.)` };
  } },
  { id: 'hourangle', level: 'basic', topic: '시간각', gen() {
    const lst = R(0, 23.75, 0.25), ra = R(0, 23.5, 1 / 6), H = A.norm24(lst - ra);
    return { q: `지방 항성시가 ${hm(lst)}일 때, 적경 ${hm(ra)}인 별의 <b>시간각</b>은? (0h~24h, 예: 2h 30m 또는 2.5)`, ans: H, unit: 'h', tol: 0.02, kind: 'hours', circular: 24,
      sol: `H = LST − α = ${hm(lst)} − ${hm(ra)} = <b>${hm(H)}</b><br>${H < 12 ? `H < 12h → 남중한 지 ${hm(H)} 지난 별 (자오선의 서쪽)` : `H > 12h → ${hm(24 - H)} 후에 남중할 별 (자오선의 동쪽)`}` };
  } },
  { id: 'untiltransit', level: 'basic', topic: '항성시와 남중', gen() {
    const a1 = R(0, 23.5, 1 / 12), d = R(0.5, 6, 1 / 12), a2 = A.norm24(a1 + d);
    return { q: `적경 ${hm(a1)}인 별 X가 지금 남중하고 있다. 적경 ${hm(a2)}인 별 Y가 남중하려면 앞으로 약 몇 시간(항성시)이 지나야 하는가?`, ans: d, unit: 'h', tol: 0.02, kind: 'hours',
      sol: `별 X가 남중 → 지금 LST = α<sub>X</sub> = ${hm(a1)}.<br>별 Y는 LST = α<sub>Y</sub> = ${hm(a2)}일 때 남중하므로 ${hm(a2)} − ${hm(a1)} = <b>${hm(d)}</b> 후 (항성시 기준, 태양시로는 ×0.9973).` };
  } },
  { id: 'annual', level: 'basic', topic: '별의 연주 운동', gen() {
    const T = R(20, 24, 0.5), n = pick([10, 15, 30, 45, 60, 90]), dt = n * (3 + 56 / 60) / 60, ans = A.norm24(T - dt);
    return { q: `어떤 별이 오늘 밤 ${clock(T)}에 남중하였다. <b>${n}일 후</b> 이 별이 남중하는 시각은? (예: 20:30)`, ans, unit: '시각', tol: 0.06, kind: 'clock', circular: 24,
      sol: `별은 매일 약 3분 56초(≈ 4분)씩 일찍 남중한다 (항성일 = 23h 56m 4s).<br>${n}일 × 3분 56초 = ${(n * 236 / 60).toFixed(1)}분 = ${hm(dt)}<br>${clock(T)} − ${hm(dt)} = <b>${clock(ans)}</b>` };
  } },
  { id: 'trail', level: 'basic', topic: '일주 운동', gen() {
    const ang = pick([15, 30, 45, 60, 75, 90, 120, 150]);
    return { q: `북쪽 하늘을 향해 카메라를 고정하고 장시간 노출 사진을 찍었더니 별의 궤적이 북극성을 중심으로 <b>${ang}°</b>인 원호를 그렸다. 노출 시간은 약 몇 시간인가?`, ans: ang / 15, unit: 'h', tol: 0.05, kind: 'hours',
      sol: `천구는 1시간에 15°씩 회전한다 (정확히는 항성일 23h 56m에 360°).<br>${ang}° ÷ 15°/h = <b>${(ang / 15).toFixed(2)}시간</b>` };
  } },
  { id: 'sunnoon', level: 'basic', topic: '태양의 남중 고도', gen() {
    const phi = R(30, 45, 0.5), s = pick([['하짓날', E0], ['춘분날', 0], ['추분날', 0], ['동짓날', -E0]]);
    const h = 90 - phi + s[1];
    return { q: `북위 ${phi}°인 곳에서 <b>${s[0]}</b> 태양의 남중 고도는? (황도 경사 23.4°)`, ans: h, unit: '°', tol: 0.3, kind: 'deg',
      sol: `${s[0]} 태양의 적위 δ☉ = ${s[1] === 0 ? '0°' : s[1] > 0 ? '+23.4°' : '−23.4°'}<br>h = 90° − φ + δ☉ = 90° − ${phi}° ${s[1] >= 0 ? '+' : '−'} ${Math.abs(s[1]).toFixed(1)}° = <b>${h.toFixed(1)}°</b>` };
  } },
  { id: 'synout', level: 'basic', topic: '회합 주기 (외행성)', gen() {
    const [n, P] = pick([['화성', 1.881], ['목성', 11.86], ['토성', 29.46], ['어떤 소행성', R(2.5, 4.5, 0.1)], ['가상의 외행성', R(1.3, 3, 0.1)]]);
    const S = 1 / (1 - 1 / P);
    return { q: `공전 주기가 ${P}년인 ${n}의 <b>회합 주기</b>는 몇 일인가? (1년 = 365.25일)`, ans: S * 365.25, unit: '일', tol: S * 365.25 * 0.01, kind: 'num',
      sol: `외행성: 1/S = 1/E − 1/P = 1/1 − 1/${P} = ${(1 - 1 / P).toFixed(4)} /년<br>S = ${S.toFixed(4)}년 = <b>${(S * 365.25).toFixed(1)}일</b>` };
  } },
  { id: 'synin', level: 'basic', topic: '회합 주기 (내행성)', gen() {
    const [n, P] = pick([['수성', 87.97], ['금성', 224.7], ['가상의 내행성', R(100, 300, 5)]]);
    const S = 1 / (1 / P - 1 / 365.25);
    return { q: `공전 주기가 ${P}일인 ${n}의 <b>회합 주기</b>는 몇 일인가? (지구 공전 주기 365.25일)`, ans: S, unit: '일', tol: S * 0.01, kind: 'num',
      sol: `내행성: 1/S = 1/P − 1/E = 1/${P} − 1/365.25 = ${(1 / P - 1 / 365.25).toFixed(6)} /일<br>S = <b>${S.toFixed(1)}일</b>` };
  } },
  { id: 'synrev', level: 'basic', topic: '회합 주기 → 공전 주기', gen() {
    const S = R(370, 800, 5), P = 1 / (1 / 365.25 - 1 / S);
    return { q: `어떤 외행성의 회합 주기가 ${S}일이다. 이 행성의 <b>공전 주기</b>는 몇 일인가? (지구 365.25일)`, ans: P, unit: '일', tol: P * 0.01, kind: 'num',
      sol: `1/P = 1/E − 1/S = 1/365.25 − 1/${S} = ${(1 / 365.25 - 1 / S).toFixed(6)} /일<br>P = <b>${P.toFixed(1)}일</b> (${(P / 365.25).toFixed(2)}년)` };
  } },
  { id: 'elong', level: 'basic', topic: '최대 이각', gen() {
    const E = R(18, 50, 0.5), a = A.sind(E);
    return { q: `어떤 내행성의 최대 이각이 ${E}°였다. 이 행성의 <b>궤도 반지름</b>은 몇 AU인가? (원 궤도 가정)`, ans: a, unit: 'AU', tol: 0.005, kind: 'num',
      sol: `최대 이각일 때 지구에서 본 시선이 행성 궤도에 접하므로 ∠태양–행성–지구 = 90°.<br>sin E = a / 1 AU → a = sin ${E}° = <b>${a.toFixed(3)} AU</b>` };
  } },
  { id: 'k3', level: 'basic', topic: '케플러 제3법칙', gen() {
    const a = pick([R(1.5, 9.5, 0.5), 4, 9, 16, 2.5]);
    return { q: `태양 둘레를 도는 소천체의 궤도 긴반지름이 ${a} AU이다. <b>공전 주기</b>는 몇 년인가?`, ans: Math.pow(a, 1.5), unit: '년', tol: Math.pow(a, 1.5) * 0.01, kind: 'num',
      sol: `P² = a³ (년, AU) → P = a<sup>3/2</sup> = ${a}<sup>1.5</sup> = <b>${Math.pow(a, 1.5).toFixed(2)}년</b>` };
  } },

  // ---------------------------------------------------------------- 심화
  { id: 'daylen', level: 'adv', topic: '출몰 시간각과 낮의 길이', gen() {
    const s = pick([['하짓날 태양', E0], ['동짓날 태양', -E0], ['적위 +40°인 별', 40], ['적위 −20°인 별', -20]]);
    let phi = R(30, 60);
    while (Math.abs(A.tand(phi) * A.tand(s[1])) > 0.97) phi = R(30, 45); // 주극성·전몰성이 되지 않게
    const H0 = A.acosd(-A.tand(phi) * A.tand(s[1]));
    const len = (2 * H0) / 15;
    return { q: `북위 ${phi}°에서 <b>${s[0]}</b>이 지평선 위에 떠 있는 시간은 몇 시간인가? (대기차 무시, 항성시·태양시 차이 무시)`, ans: len, unit: 'h', tol: 0.05, kind: 'hours',
      sol: `출몰(h = 0): 0 = sin φ sin δ + cos φ cos δ cos H₀ → cos H₀ = −tan φ tan δ<br>cos H₀ = −tan ${phi}° × tan(${s[1].toFixed(1)}°) = ${(-A.tand(phi) * A.tand(s[1])).toFixed(4)} → H₀ = ${H0.toFixed(2)}° = ${hm(H0 / 15)}<br>떠 있는 시간 = 2H₀ = <b>${hm(len)} (${len.toFixed(2)}h)</b>` };
  } },
  { id: 'riseaz', level: 'adv', topic: '출몰 방위각', gen() {
    const dec = pick([E0, -E0, R(-30, 40, 5)]);
    let phi = R(30, 60);
    while (Math.abs(A.sind(dec) / A.cosd(phi)) > 0.97) phi = R(30, 40);
    const A0 = A.acosd(A.sind(dec) / A.cosd(phi));
    return { q: `북위 ${phi}°에서 적위 ${dec.toFixed(1)}°인 천체가 <b>뜨는 방위각</b>은? (북점 기준 시계 방향, 대기차 무시)`, ans: A0, unit: '°', tol: 0.3, kind: 'deg',
      sol: `h = 0을 sin δ = sin φ sin h + cos φ cos h cos A 에 넣으면 cos A = sin δ / cos φ<br>cos A = sin(${dec.toFixed(1)}°)/cos ${phi}° = ${(A.sind(dec) / A.cosd(phi)).toFixed(4)} → A = <b>${A0.toFixed(1)}°</b> (${A0 < 90 ? '동쪽에서 북쪽으로' : '동쪽에서 남쪽으로'} ${Math.abs(90 - A0).toFixed(1)}°)` };
  } },
  { id: 'alt', level: 'adv', topic: '좌표 변환 (고도)', gen() {
    const phi = R(30, 50), dec = R(-20, 60, 5), Hh = R(1, 5, 0.5), H = Hh * 15;
    const sh = A.sind(phi) * A.sind(dec) + A.cosd(phi) * A.cosd(dec) * A.cosd(H);
    return { q: `북위 ${phi}°에서 적위 ${sg(dec)}°인 별의 시간각이 ${Hh}h일 때 이 별의 <b>고도</b>는?`, ans: A.asind(sh), unit: '°', tol: 0.3, kind: 'deg',
      sol: `H = ${Hh}h = ${H}°<br>sin h = sin φ sin δ + cos φ cos δ cos H<br>= sin ${phi}° sin(${dec}°) + cos ${phi}° cos(${dec}°) cos ${H}° = ${sh.toFixed(4)}<br>h = <b>${A.asind(sh).toFixed(1)}°</b>` };
  } },
  { id: 'az', level: 'adv', topic: '좌표 변환 (방위각)', gen() {
    const phi = R(30, 50), dec = R(-20, 30, 5), Hh = R(1, 4, 0.5), H = Hh * 15;
    const hz = A.eqToHor(H, dec, phi);
    return { q: `북위 ${phi}°에서 적위 ${sg(dec)}°인 별의 시간각이 ${Hh}h(서쪽)일 때 <b>방위각</b>(북점 기준 시계 방향)은?`, ans: hz.az, unit: '°', tol: 0.5, kind: 'deg',
      sol: `tan A = −cos δ sin H / (sin δ cos φ − cos δ sin φ cos H)<br>분자 = ${(-A.cosd(dec) * A.sind(H)).toFixed(4)}, 분모 = ${(A.sind(dec) * A.cosd(phi) - A.cosd(dec) * A.sind(phi) * A.cosd(H)).toFixed(4)}<br>사분면에 주의하면(분자 < 0 → 서쪽) A = <b>${hz.az.toFixed(1)}°</b> (고도 ${hz.alt.toFixed(1)}°)` };
  } },
  { id: 'sundec', level: 'adv', topic: '태양의 적도 좌표', gen() {
    const lam = R(10, 350, 5);
    const dec = A.asind(A.sind(E0) * A.sind(lam));
    return { q: `태양의 황경이 ${lam}°일 때 태양의 <b>적위</b>는? (ε = 23.44°)`, ans: dec, unit: '°', tol: 0.15, kind: 'deg',
      sol: `태양의 황위 β = 0 → sin δ = sin ε sin λ = sin 23.44° × sin ${lam}° = ${(A.sind(E0) * A.sind(lam)).toFixed(4)}<br>δ = <b>${dec.toFixed(2)}°</b><br>(적경은 tan α = cos ε tan λ 로 구한다: α = ${A.fmtRA(A.eclToEq(lam, 0).ra, false)})` };
  } },
  { id: 'primev', level: 'adv', topic: '묘유선 통과', gen() {
    const phi = R(35, 55), dec = R(5, phi - 5, 5);
    const H = A.acosd(A.tand(dec) / A.tand(phi)), h = A.asind(A.sind(dec) / A.sind(phi));
    return { q: `북위 ${phi}°에서 적위 +${dec}°인 별이 서쪽에서 <b>묘유선(정서쪽 수직권)</b>을 지날 때의 시간각은 몇 시간인가?`, ans: H / 15, unit: 'h', tol: 0.02, kind: 'hours',
      sol: `묘유선에서 A = 270° → cos A = 0 → sin δ = sin φ sin h → sin h = sin δ / sin φ = ${(A.sind(dec) / A.sind(phi)).toFixed(4)} (h = ${h.toFixed(1)}°)<br>이를 코사인 법칙에 넣어 정리하면 cos H = tan δ / tan φ = ${(A.tand(dec) / A.tand(phi)).toFixed(4)}<br>H = ${H.toFixed(2)}° = <b>${hm(H / 15)}</b><br>(0 < δ < φ 일 때만 지평선 위에서 묘유선을 지난다)` };
  } },
  { id: 'lst', level: 'adv', topic: '항성시 계산', gen() {
    const g0 = R(0, 23.75, 0.25), ut = R(10, 20, 0.5), lon = R(124, 131, 0.5);
    const lst = A.norm24(g0 + ut * 1.00273791 + lon / 15);
    return { q: `어느 날 세계시 0h의 그리니치 항성시가 ${hm(g0)}이다. 같은 날 세계시 ${ut}h에 동경 ${lon}°인 곳의 <b>지방 항성시</b>는?`, ans: lst, unit: 'h', tol: 0.02, kind: 'hours', circular: 24,
      sol: `항성시는 태양시보다 1.0027379배 빠르게 흐른다 (하루 약 3분 56초 앞섬).<br>GMST = ${hm(g0)} + ${ut}h × 1.0027379 = ${hm(g0 + ut * 1.00273791)}<br>LST = GMST + λ/15 = ${hm(g0 + ut * 1.00273791)} + ${hm(lon / 15)} = <b>${hm(lst)}</b>` };
  } },
  { id: 'solday', level: 'adv', topic: '항성일과 태양일', gen() {
    const rot = R(10, 30, 0.5), orb = R(40, 400, 10);
    const sol = 1 / (1 / rot - 1 / (orb * 24));
    return { q: `어떤 행성이 자전 주기(항성일) ${rot}시간으로 자전하고, 같은 방향으로 ${orb}일 주기로 공전한다. 이 행성의 <b>태양일</b>은 몇 시간인가?`, ans: sol, unit: '시간', tol: sol * 0.004, kind: 'num',
      sol: `자전과 공전 방향이 같으면 태양이 다시 남중하려면 공전한 만큼 더 돌아야 한다.<br>1/T<sub>태양</sub> = 1/T<sub>항성</sub> − 1/P<sub>공전</sub> = 1/${rot} − 1/${orb * 24} (/시간)<br>T<sub>태양</sub> = <b>${sol.toFixed(2)}시간</b><br>(지구: 1/T = 1/23.934 − 1/8766.15 → 24.000시간)` };
  } },
  { id: 'retrorate', level: 'adv', topic: '충에서의 역행 속도', gen() {
    const [n, a] = pick([['화성', 1.524], ['목성', 5.203], ['토성', 9.537], ['소행성', R(2.2, 3.4, 0.1)]]);
    const w = (360 / 365.25) * (1 - 1 / Math.sqrt(a)) / (a - 1);
    return { q: `원 궤도를 가정할 때, 궤도 반지름 ${a} AU인 ${n}이 <b>충</b>에 있을 때 하루에 역행하는 각도는? (°/일)`, ans: w, unit: '°/일', tol: w * 0.03, kind: 'num',
      sol: `충에서 두 행성의 속도는 시선에 수직: 겉보기 각속도 = (v<sub>⊕</sub> − v<sub>P</sub>)/(a − 1)<br>v ∝ a<sup>−1/2</sup>, 지구의 각속도 ω<sub>⊕</sub> = 360°/365.25일 = 0.9856°/일<br>ω = ω<sub>⊕</sub>(1 − a<sup>−1/2</sup>)/(a − 1) = 0.9856 × (1 − ${(1 / Math.sqrt(a)).toFixed(4)})/${(a - 1).toFixed(3)} = <b>${w.toFixed(3)}°/일</b>` };
  } },
  { id: 'retrodur', level: 'adv', topic: '역행 기간', gen() {
    const [n, a] = pick([['화성', 1.524], ['목성', 5.203], ['금성', 0.723], ['토성', 9.537]]);
    const th = A.acosd(Math.sqrt(a) / (a - Math.sqrt(a) + 1));
    const P = Math.pow(a, 1.5), S = 365.25 / Math.abs(1 - 1 / P);
    const T = (2 * th / 360) * S;
    return { q: `원 궤도·같은 평면을 가정할 때 ${n}(a = ${a} AU)의 <b>역행 기간</b>은 약 며칠인가?`, ans: T, unit: '일', tol: T * 0.04, kind: 'num',
      sol: `유(정지)의 조건: a²ω₂ − a(ω₁ + ω₂)cos θ + ω₁ = 0, ω ∝ a<sup>−3/2</sup> → cos θ = √a/(a − √a + 1) = ${(Math.sqrt(a) / (a - Math.sqrt(a) + 1)).toFixed(4)} → θ = ${th.toFixed(2)}°<br>회합 주기 S = ${S.toFixed(1)}일 동안 상대각이 360° 변하므로 역행 기간 = 2θ/360° × S = <b>${T.toFixed(0)}일</b>` };
  } },
  { id: 'visviva', level: 'adv', topic: '활력 방정식', gen() {
    const a = R(1.2, 20, 0.1), e = R(0.1, 0.9, 0.05);
    const v = 29.78 * Math.sqrt((1 + e) / (a * (1 - e)));
    return { q: `궤도 긴반지름 ${a} AU, 이심률 ${e}인 혜성의 <b>근일점 속력</b>은 몇 km/s인가? (지구 평균 공전 속력 29.78 km/s)`, ans: v, unit: 'km/s', tol: v * 0.01, kind: 'num',
      sol: `v² = GM(2/r − 1/a), r = q = a(1 − e) = ${(a * (1 - e)).toFixed(3)} AU<br>→ v<sub>q</sub> = √(GM/a)·√((1 + e)/(1 − e)), √(GM/1 AU) = 29.78 km/s<br>v = 29.78 × √(${(1 + e).toFixed(2)}/(${a} × ${(1 - e).toFixed(2)})) = <b>${v.toFixed(2)} km/s</b>` };
  } },
  { id: 'outerA', level: 'adv', topic: '외행성의 궤도 반지름', gen() {
    const a = R(1.3, 6, 0.1), P = Math.pow(a, 1.5), S = 365.25 / (1 - 1 / P);
    const th = A.acosd(1 / a), t = (th / 360) * S;
    return { q: `어떤 외행성의 회합 주기는 ${S.toFixed(1)}일이고, <b>충에서 동구까지</b> ${t.toFixed(1)}일이 걸렸다. 이 행성의 궤도 반지름(AU)은? (원 궤도)`, ans: a, unit: 'AU', tol: 0.03, kind: 'num',
      sol: `충 이후 t일 동안 지구가 행성보다 θ = 360° × t/S = ${th.toFixed(2)}° 더 돌았다.<br>구일 때 ∠태양–지구–행성 = 90° → cos θ = 1/a<br>a = 1/cos ${th.toFixed(2)}° = <b>${a.toFixed(2)} AU</b> (코페르니쿠스의 방법)` };
  } },
  { id: 'prec', level: 'adv', topic: '세차 운동', gen() {
    const p = pick([50.3, 50.29, 50.0]);
    return { q: `춘분점이 황도를 따라 1년에 ${p}″씩 서쪽으로 이동한다면, 천구 북극이 황도 북극 둘레를 한 바퀴 도는 데 걸리는 시간은 약 몇 년인가?`, ans: 1296000 / p, unit: '년', tol: 1296000 / p * 0.005, kind: 'num',
      sol: `360° = 1,296,000″ → 1,296,000″ ÷ ${p}″/년 = <b>${(1296000 / p).toFixed(0)}년</b> (약 2만 6천 년)` };
  } },
];

/** 답 입력 해석: "2h 30m", "2:30", "2 30", "2.5", "35° 30′" 등 */
export function parseAnswer(str, kind) {
  const s = String(str).trim().replace(/[−–]/g, '-');
  if (!s) return NaN;
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const neg = s.startsWith('-');
  const nums = s.replace(/^[+-]/, '').match(/\d+(\.\d+)?/g);
  if (!nums) return NaN;
  const v = (+nums[0] || 0) + (+nums[1] || 0) / 60 + (+nums[2] || 0) / 3600;
  return (neg ? -v : v) * (kind === 'num' ? 1 : 1);
}
export function checkAnswer(p, val) {
  if (!Number.isFinite(val)) return false;
  let d = Math.abs(val - p.ans);
  if (p.circular) d = Math.min(d, Math.abs(p.circular - d));
  return d <= p.tol;
}
export function fmtAns(p) {
  if (p.kind === 'hours') return `${hm(p.ans)} (${p.ans.toFixed(3)} h)`;
  if (p.kind === 'clock') return clock(p.ans);
  if (p.kind === 'deg') return `${p.ans.toFixed(2)}°`;
  return `${p.ans.toFixed(p.ans < 10 ? 3 : 1)} ${p.unit}`;
}

// ---------------------------------------------------------------- 개념 퀴즈
export const QUIZ = [
  { lv: 'basic', q: '천구 북극의 고도와 항상 같은 값은?', o: ['관측자의 경도', '관측자의 위도', '천구의 적도의 남중 고도', '90° − 관측자의 위도'], a: 1, e: '천구 북극의 고도 h<sub>P</sub> = 위도 φ. 천구의 적도의 남중 고도는 90° − φ이다.' },
  { lv: 'basic', q: '관측 장소와 시각이 바뀌어도 별마다 (거의) 일정한 좌표는?', o: ['고도와 방위각', '시간각과 적위', '적경과 적위', '고도와 시간각'], a: 2, e: '적경·적위는 천구에 고정된 좌표계이므로 일주 운동에 따라 변하지 않는다. 시간각은 시간에 따라 변하고, 고도·방위각은 장소와 시각에 따라 변한다.' },
  { lv: 'basic', q: '적경을 재는 방향으로 옳은 것은?', o: ['춘분점에서 천구의 적도를 따라 서쪽으로', '춘분점에서 천구의 적도를 따라 동쪽으로', '자오선에서 천구의 적도를 따라 서쪽으로', '북점에서 지평선을 따라 동쪽으로'], a: 1, e: '적경은 춘분점에서 동쪽(시계 반대 방향, 태양의 연주 운동 방향)으로 0h~24h. ③은 시간각, ④는 방위각의 정의이다.' },
  { lv: 'basic', q: '항성시(LST)의 정의는?', o: ['태양의 시간각', '춘분점의 시간각', '춘분점의 적경', '그리니치의 평균 태양시'], a: 1, e: 'LST = 춘분점의 시간각. 임의의 천체에 대해 H = LST − α 이며, 남중(H = 0)한 천체의 적경이 곧 항성시이다.' },
  { lv: 'basic', q: '북위 37.5°에서 주극성이 되는 별의 적위 조건은?', o: ['δ ≥ +37.5°', 'δ ≥ +52.5°', 'δ ≥ +23.5°', 'δ ≥ 0°'], a: 1, e: '주극성 조건 δ ≥ 90° − φ = 52.5°. 예) 북두칠성의 두베(+61.8°)는 주극성, 베가(+38.8°)는 아니다.' },
  { lv: 'basic', q: '적도(위도 0°)에서 관측한 일주 운동에 대한 설명으로 옳은 것은?', o: ['북극성이 천정 근처에 있다', '주극성이 많다', '모든 별이 지평선과 수직으로 뜨고 진다', '천구의 적도가 지평선과 일치한다'], a: 2, e: '적도에서는 천구의 극이 북점·남점에 있어 일주권이 지평선에 수직이고, 모든 별이 약 12시간씩 떠 있다. ④는 극지방의 모습이다.' },
  { lv: 'basic', q: '북반구 중위도에서 북쪽 하늘의 별은 어떻게 움직이는가?', o: ['북극성을 중심으로 시계 방향', '북극성을 중심으로 시계 반대 방향', '왼쪽에서 오른쪽으로 지평선과 나란히', '오른쪽 위로 비스듬히'], a: 1, e: '북쪽 하늘에서는 북극성을 중심으로 시계 반대 방향으로 1시간에 15°씩 돈다. ③은 남쪽 하늘, ④는 동쪽 하늘의 모습이다.' },
  { lv: 'basic', q: '매일 같은 시각에 관측하면 별자리의 위치는 어떻게 변하는가?', o: ['하루에 약 1°씩 동쪽으로', '하루에 약 1°씩 서쪽으로', '하루에 약 15°씩 서쪽으로', '변하지 않는다'], a: 1, e: '지구 공전 때문에 같은 별은 매일 약 4분씩 일찍 남중하므로, 같은 시각에 보면 약 1°씩 서쪽으로 이동해 있다(한 달에 약 30°).' },
  { lv: 'basic', q: '항성일이 태양일보다 약 4분 짧은 까닭은?', o: ['지구의 자전 속도가 변하기 때문', '지구가 공전하기 때문', '세차 운동 때문', '지구 궤도가 타원이기 때문'], a: 1, e: '지구가 하루에 약 1° 공전하므로 태양이 다시 남중하려면 약 361°를 돌아야 한다. 360° 자전한 시간이 항성일(23h 56m 4s)이다.' },
  { lv: 'basic', q: '서울(37.5°N)에서 하짓날 태양의 남중 고도는?', o: ['52.5°', '76°', '29°', '90°'], a: 1, e: 'h = 90° − φ + δ☉ = 90° − 37.5° + 23.4° ≈ 75.9°. 동짓날은 90° − 37.5° − 23.4° ≈ 29.1°.' },
  { lv: 'basic', q: '춘분날 태양이 뜨는 방향은? (지구의 어느 곳이든)', o: ['정동쪽', '동쪽에서 북쪽으로 치우친 곳', '동쪽에서 남쪽으로 치우친 곳', '위도에 따라 다르다'], a: 0, e: 'δ = 0이면 cos A = sin δ / cos φ = 0 → A = 90°. 천구의 적도는 어느 위도에서나 동점과 서점을 지나기 때문이다.' },
  { lv: 'basic', q: '하지점의 적경과 적위는?', o: ['0h, 0°', '6h, +23.4°', '12h, 0°', '18h, −23.4°'], a: 1, e: '춘분점(0h, 0°) → 하지점(6h, +23.4°) → 추분점(12h, 0°) → 동지점(18h, −23.4°).' },
  { lv: 'basic', q: '내행성이 관측되지 않는 위치를 모두 고르면?', o: ['내합과 외합', '동방 최대 이각', '서방 최대 이각', '충'], a: 0, e: '내합·외합에는 태양과 같은 방향에 있어 관측할 수 없다. 내행성에는 충과 구가 없다.' },
  { lv: 'basic', q: '금성이 초저녁 서쪽 하늘에서 가장 높이 보이는 위치는?', o: ['내합', '외합', '동방 최대 이각', '서방 최대 이각'], a: 2, e: '태양의 동쪽에 있으면 해가 진 뒤 서쪽 하늘에서 보인다. 이각이 최대일 때 가장 높다. 이때 반달 모양.' },
  { lv: 'basic', q: '외행성이 가장 밝고 밤새도록 보이는 위치는?', o: ['합', '충', '동구', '서구'], a: 1, e: '충일 때 지구와 가장 가깝고 태양의 반대쪽에 있어 자정 무렵 남중한다. 이 무렵 역행한다.' },
  { lv: 'basic', q: '동구에 있는 외행성이 남중하는 시각은?', o: ['자정 무렵', '해 뜰 무렵', '해 질 무렵', '정오 무렵'], a: 2, e: '태양보다 동쪽으로 90° → 태양보다 약 6시간 늦게 남중 → 18시 무렵(해 질 무렵). 서구는 6시 무렵.' },
  { lv: 'basic', q: '공전 주기가 1.88년인 화성의 회합 주기는 약 얼마인가?', o: ['0.88년', '1.88년', '2.14년', '3.76년'], a: 2, e: '1/S = 1 − 1/1.88 = 0.468 → S ≈ 2.14년 ≈ 780일. 그래서 화성의 충은 약 2년 2개월마다 돌아온다.' },
  { lv: 'basic', q: '케플러 제2법칙에 따르면 행성의 공전 속력은?', o: ['어디서나 같다', '근일점에서 가장 빠르다', '원일점에서 가장 빠르다', '궤도 긴반지름에 비례한다'], a: 1, e: '면적 속도 일정 → 태양에 가까운 근일점에서 빠르고 원일점에서 느리다. v<sub>근</sub>/v<sub>원</sub> = (1 + e)/(1 − e).' },
  { lv: 'basic', q: '궤도 긴반지름이 4 AU인 소행성의 공전 주기는?', o: ['2년', '4년', '8년', '16년'], a: 2, e: 'P² = a³ = 64 → P = 8년.' },
  { lv: 'basic', q: '금성이 보름달에 가까운 둥근 모양으로 보이는 위치는?', o: ['내합 부근', '동방 최대 이각', '외합 부근', '서방 최대 이각'], a: 2, e: '외합 부근에서는 태양 빛을 받는 면이 거의 다 보여 둥글지만 가장 멀어 작게 보인다. 갈릴레이의 이 관측은 지구중심설로 설명할 수 없었다.' },
  { lv: 'adv', q: '은하 북극이 위치한 별자리는?', o: ['큰곰자리', '머리털자리', '궁수자리', '백조자리'], a: 1, e: '은하 북극: α ≈ 12h 51m, δ ≈ +27.1° (머리털자리). 은하 중심은 궁수자리(α ≈ 17h 46m, δ ≈ −28.9°).' },
  { lv: 'adv', q: '은하면과 천구의 적도가 이루는 각은 약 얼마인가?', o: ['23.4°', '45°', '62.9°', '90°'], a: 2, e: '은하 북극의 적위가 약 27.1°이므로 두 평면의 경사각 = 90° − 27.1° ≈ 62.9°.' },
  { lv: 'adv', q: '세차 운동의 결과로 나타나지 않는 것은?', o: ['북극성이 바뀐다', '춘분점이 황도를 따라 서쪽으로 이동한다', '별의 적경·적위가 변한다', '별의 황위가 크게 변한다'], a: 3, e: '세차는 주로 자전축(천구의 적도와 춘분점)이 움직이는 현상이므로 황도 좌표계에서 별의 황경만 일정하게 증가하고 황위는 거의 변하지 않는다(행성 세차에 의한 아주 작은 변화만 있음).' },
  { lv: 'adv', q: '천문 삼각형 PZX에서 천정 거리 z = 90° − h 에 해당하는 변은?', o: ['PZ', 'ZX', 'PX', '해당하는 변이 없다'], a: 1, e: 'PZ = 90° − φ(여위도), PX = 90° − δ(극거리), ZX = 90° − h(천정 거리). ∠P = 시간각 H, ∠Z = 방위각, ∠X = 시차각 q.' },
  { lv: 'adv', q: '위도 φ에서 적위 δ인 별의 출몰 시간각 H₀를 구하는 식은? (대기차 무시)', o: ['cos H₀ = tan φ tan δ', 'cos H₀ = −tan φ tan δ', 'sin H₀ = sin δ / cos φ', 'cos H₀ = sin δ / cos φ'], a: 1, e: 'h = 0을 sin h = sin φ sin δ + cos φ cos δ cos H 에 넣으면 cos H₀ = −tan φ tan δ. ④는 출몰 방위각 cos A = sin δ / cos φ.' },
  { lv: 'adv', q: '적위 +60°인 두 별의 적경이 1h 차이 날 때 두 별 사이의 각거리는 약?', o: ['15°', '7.5°', '13°', '30°'], a: 1, e: '같은 적위의 일주권 반지름은 cos δ 배로 줄어든다: 15° × cos 60° = 7.5° (정확히는 대원 거리 2 asin(cos δ sin 7.5°) ≈ 7.49°). 적경 차를 각거리로 착각하지 말자.' },
  { lv: 'adv', q: '시드니(34°S)에서 북쪽 하늘을 볼 때 별의 일주 운동 방향은?', o: ['왼쪽에서 오른쪽으로', '오른쪽에서 왼쪽으로', '천구 북극을 중심으로 시계 반대 방향', '움직이지 않는다'], a: 1, e: '어디서나 별은 동→서로 움직인다. 북쪽을 보면 오른쪽이 동쪽이므로 오른쪽에서 왼쪽으로 움직인다(남반구에서 북쪽 하늘은 북반구의 남쪽 하늘과 같은 역할).' },
  { lv: 'adv', q: '지구가 근일점을 지나는 시기는?', o: ['1월 초', '3월 하순', '7월 초', '12월 하순'], a: 0, e: '근일점은 1월 3~5일 무렵, 원일점은 7월 초. 그래서 북반구의 겨울(근일점 무렵)이 여름보다 며칠 짧다(케플러 제2법칙).' },
  { lv: 'adv', q: '외행성이 ‘유(留)’로 보이는 순간의 조건으로 옳은 것은?', o: ['행성이 충에 있을 때', '지구에 대한 행성의 상대 속도가 시선 방향과 나란할 때', '행성이 근일점에 있을 때', '이각이 90°일 때'], a: 1, e: '시선 방향의 회전율(겉보기 각속도)이 0 → 상대 속도에 시선에 수직인 성분이 없다. 원 궤도이면 cos θ = √a/(a − √a + 1) 인 상대각 θ에서 일어난다.' },
  { lv: 'adv', q: '북위 φ(> 0)에서 적위 δ인 별이 지평선 위에서 묘유선을 지나려면?', o: ['δ > φ', '0 < δ < φ', 'δ < 0', '모든 별이 지난다'], a: 1, e: '묘유선 통과 시 sin h = sin δ / sin φ. h > 0이고 |sin h| ≤ 1이려면 0 < δ < φ. δ > φ인 별은 늘 묘유선보다 북쪽에 머문다.' },
  { lv: 'adv', q: '균시차(시태양시 − 평균 태양시)의 원인을 모두 옳게 고른 것은?', o: ['지구 궤도의 이심률과 황도 경사', '세차 운동과 장동', '대기차와 시차', '지구 자전 속도의 감소'], a: 0, e: '① 타원 궤도 때문에 태양의 황경 증가 속도가 일정하지 않고(이심률), ② 황도가 적도에 기울어 있어 같은 황경 변화라도 적경 변화가 다르다(황도 경사). 두 효과가 합쳐져 최대 약 ±16분, 아날렘마의 8자 모양을 만든다.' },
  { lv: 'adv', q: '수성과 금성의 최대 이각이 매번 조금씩 다른 가장 큰 이유는?', o: ['지구의 자전축이 기울어서', '행성 궤도가 타원이라서', '대기차 때문에', '세차 운동 때문에'], a: 1, e: '최대 이각일 때 sin E = r/R(행성과 지구의 일심 거리비). 궤도가 타원이면 r, R이 매번 달라진다. 특히 이심률이 큰 수성은 약 18°~28°로 크게 변한다.' },
];
