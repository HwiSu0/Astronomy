// =====================================================================
//  celestial.js — 천구·좌표계 실험실 UI
// =====================================================================
import { SkyScene, DEFAULT_SHOW } from './skyscene.js';
import * as A from './astro.js';
import { STARS } from './stars.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const LOCATIONS = [
  { name: '서울 (37.57°N, 126.98°E)', lat: 37.5665, lon: 126.978, tz: 9 },
  { name: '부산 (35.18°N)', lat: 35.1796, lon: 129.0756, tz: 9 },
  { name: '제주 (33.50°N)', lat: 33.4996, lon: 126.5312, tz: 9 },
  { name: '북극점 (90°N)', lat: 90, lon: 0, tz: 0 },
  { name: '북극권 (66.56°N, 핀란드 로바니에미)', lat: 66.56, lon: 25.73, tz: 2 },
  { name: '북회귀선 (23.44°N, 대만 자이 부근)', lat: 23.44, lon: 120.45, tz: 8 },
  { name: '적도 (0°, 에콰도르 키토 부근)', lat: 0, lon: -78.5, tz: -5 },
  { name: '시드니 (33.87°S)', lat: -33.8688, lon: 151.2093, tz: 10 },
  { name: '남극점 (90°S)', lat: -90, lon: 0, tz: 0 },
  { name: '그리니치 (51.48°N, 0°)', lat: 51.4769, lon: 0, tz: 0 },
];

function tonightJD(tz = 9) {
  const c = A.civilFromJD(A.jdFromDate(new Date()), tz);
  return A.jdFromCivil(c.y, c.m, c.d, 21, tz);
}

const params = new URLSearchParams(location.search);
const sky = new SkyScene($('#sky'), { lat: LOCATIONS[0].lat, lon: LOCATIONS[0].lon, tz: 9, jd: tonightJD(9) });
window.sky = sky; // 콘솔에서 실험해 볼 수 있도록

// ------------------------------------------------------------------ 표시 항목
const ESSENTIAL = { shell: true, horizon: true, cardinals: true, zenith: true, stars: true, starNames: true, constellations: true, observer: true, ground: true, sun: true, planets: true };
const BASE_OFF = Object.fromEntries(Object.keys(DEFAULT_SHOW).map((k) => [k, false]));
const PRESETS = {
  min: {},
  hor: { meridian: true, primeVertical: true, horGrid: true },
  eq: { meridian: true, equator: true, poles: true, eqGrid: true, eclPoints: true, rotationArrows: true },
  ecl: { equator: true, poles: true, ecliptic: true, eclPoints: true, eclGrid: true },
  gal: { equator: true, poles: true, galactic: true, galGrid: true, milkyway: true },
  all: { meridian: true, primeVertical: true, horGrid: true, equator: true, poles: true, eqGrid: true, ecliptic: true, eclPoints: true, galactic: true, milkyway: true, rotationArrows: true },
};
const GROUPS = [
  { title: '지평좌표계', color: 'var(--hor)', items: [['horizon', '지평선·지평면'], ['cardinals', '방위(동서남북)'], ['zenith', '천정·천저'], ['meridian', '자오선'], ['primeVertical', '묘유선'], ['horGrid', '고도·방위각 격자']] },
  { title: '적도좌표계', color: 'var(--eq)', items: [['equator', '천구의 적도'], ['poles', '천구의 극·자전축'], ['eqGrid', '적경·적위 격자'], ['rotationArrows', '일주 운동 방향']] },
  { title: '황도좌표계', color: 'var(--ecl)', items: [['ecliptic', '황도'], ['eclPoints', '춘·추분점, 하·동지점'], ['eclGrid', '황경·황위 격자']] },
  { title: '은하좌표계', color: 'var(--gal)', items: [['galactic', '은하 적도·중심·극'], ['galGrid', '은경·은위 격자'], ['milkyway', '은하수']] },
  { title: '천체', color: '#cfd8ff', items: [['stars', '별'], ['starNames', '밝은 별 이름'], ['allStarNames', '모든 별 이름'], ['constellations', '별자리 선'], ['conNames', '별자리 이름'], ['sun', '태양'], ['sunPath', '오늘 태양의 일주권'], ['seasonPaths', '계절별 태양 일주권'], ['planets', '행성']] },
  { title: '기타', color: 'var(--accent)', items: [['shell', '천구 구면'], ['observer', '관측자'], ['ground', '땅 가리기(관측자 시점)'], ['atmosphere', '낮 하늘 표현(관측자 시점)'], ['precessionCircle', '세차 원'], ['triangle', '천문 삼각형 PZX'], ['trails', '별의 일주 궤적'], ['planetTrails', '행성 이동 경로']] },
];

$('#dispGroups').innerHTML = GROUPS.map((g) => `
  <div class="group-title" style="--c:${g.color}">${g.title}</div>
  <div class="check-group">${g.items.map(([k, t]) => `<label><input type="checkbox" data-show="${k}"> ${t}</label>`).join('')}</div>`).join('');

function syncChecks() {
  $$('input[data-show]').forEach((el) => (el.checked = !!sky.show[el.dataset.show]));
  $$('input[data-arc]').forEach((el) => (el.checked = !!sky.arcs[el.dataset.arc]));
}
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('input[data-show]')) { sky.setShow(el.dataset.show, el.checked); syncChecks(); }
  if (el.matches('input[data-arc]')) { sky.setArcs({ [el.dataset.arc]: el.checked }); }
});
$$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  sky.setShow({ ...BASE_OFF, ...ESSENTIAL, ...PRESETS[b.dataset.preset], trails: sky.show.trails, planetTrails: sky.show.planetTrails });
  syncChecks();
}));

// ------------------------------------------------------------------ 탭
$$('.tabs button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));
function openTab(name) {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x.dataset.tab === name));
  $$('.tab').forEach((x) => x.classList.toggle('on', x.id === 'tab-' + name));
}

// ------------------------------------------------------------------ 시점
$$('#viewSeg button').forEach((b) => b.addEventListener('click', () => sky.setView(b.dataset.view)));
sky.on('view', (v) => {
  $$('#viewSeg button').forEach((x) => x.classList.toggle('on', x.dataset.view === v));
  $('#camSeg').classList.toggle('hidden', v !== 'outside');
  $('#lookSeg').classList.toggle('hidden', v !== 'observer');
});
$$('#camSeg button').forEach((b) => b.addEventListener('click', () => sky.setCameraPreset(b.dataset.cam)));
$$('#lookSeg button').forEach((b) => b.addEventListener('click', () => look(b.dataset.look)));
function look(what) {
  if (what === 'zenith') return sky.lookAt(sky.obsAz, 89.5);
  if (what === 'pole') return sky.lookAt(sky.lat >= 0 ? 0 : 180, Math.abs(sky.lat));
  const az = Number(what);
  sky.lookAt(az, az === 0 || az === 180 ? 30 : 25);
}

// ------------------------------------------------------------------ 관측 장소
$('#loc').innerHTML = LOCATIONS.map((l, i) => `<option value="${i}">${l.name}</option>`).join('') + '<option value="custom">직접 입력</option>';
$('#loc').addEventListener('change', (e) => {
  if (e.target.value === 'custom') return;
  const l = LOCATIONS[+e.target.value];
  sky.setLocation(l.lat, l.lon, l.tz);
  sky.resetTrails();
  syncUI();
});
$('#latQuick').innerHTML = [[90, '90°N'], [66.56, '66.6°N'], [37.57, '37.6°N'], [23.44, '23.4°N'], [0, '0°'], [-33.87, '33.9°S'], [-90, '90°S']]
  .map(([v, t]) => `<button class="btn small" data-setlat="${v}">${t}</button>`).join('');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-setlat]');
  if (b) { setLat(+b.dataset.setlat); }
});
function setLat(v) { sky.setLocation(v, null, null); $('#loc').value = 'custom'; sky.resetTrails(); syncUI(); }
$('#lat').addEventListener('input', (e) => { sky.setLocation(+e.target.value); $('#loc').value = 'custom'; syncUI(); });
$('#lon').addEventListener('input', (e) => { sky.setLocation(null, +e.target.value); $('#loc').value = 'custom'; syncUI(); });
$('#tz').addEventListener('change', (e) => { sky.setLocation(null, null, +e.target.value); syncUI(); });

// ------------------------------------------------------------------ 날짜·시각
const civil = () => A.civilFromJD(sky.jd, sky.tz);
let draggingTime = false;
$('#time').addEventListener('input', (e) => {
  draggingTime = true;
  const c = civil();
  sky.setJD(A.jdFromCivil(c.y, c.m, c.d, +e.target.value / 60, sky.tz));
  $('#timeOut').textContent = A.fmtHM(+e.target.value / 60);
});
$('#time').addEventListener('change', () => (draggingTime = false));
$('#date').addEventListener('change', (e) => {
  const [y, m, d] = e.target.value.split('-').map(Number);
  if (!y) return;
  sky.setJD(A.jdFromCivil(y, m, d, civil().hours, sky.tz));
});
$('#btnNow').addEventListener('click', () => sky.setJD(A.jdFromDate(new Date())));
$('#btnTonight').addEventListener('click', () => sky.setJD(tonightJD(sky.tz)));
$$('[data-date]').forEach((b) => b.addEventListener('click', () => {
  const [m, d] = b.dataset.date.split('-').map(Number);
  const c = civil();
  sky.setJD(A.jdFromCivil(c.y, m, d, c.hours, sky.tz));
}));
$$('[data-step]').forEach((b) => b.addEventListener('click', () => sky.setJD(sky.jd + +b.dataset.step / 1440)));
$('#btnClearTrails').addEventListener('click', () => { sky.resetTrails(); sky.resetPlanetTrails(); });

// 재생
$('#btnPlay').addEventListener('click', () => sky.setPlaying(!sky.playing));
sky.on('play', (p) => ($('#btnPlay').textContent = p ? '❚❚' : '▶'));
function applySpeed(v) {
  const [mode, rate] = v.split(':');
  sky.setSpeed(mode, +rate);
  $('#speed').value = v;
}
$('#speed').addEventListener('change', (e) => applySpeed(e.target.value));
applySpeed($('#speed').value);

// 세차
$('#epochDate').addEventListener('change', (e) => {
  $('#epoch').disabled = e.target.checked;
  sky.setEpoch(e.target.checked ? 'date' : 'manual', +$('#epoch').value);
  syncUI();
});
$('#epoch').addEventListener('input', (e) => { sky.setEpoch('manual', +e.target.value); syncUI(); });

// 키보드
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); sky.setPlaying(!sky.playing); }
  if (e.code === 'ArrowRight') sky.setJD(sky.jd + (e.shiftKey ? 60 : 10) / 1440);
  if (e.code === 'ArrowLeft') sky.setJD(sky.jd - (e.shiftKey ? 60 : 10) / 1440);
});

// ------------------------------------------------------------------ 천체 선택
$('#objList').innerHTML = ['태양', ...A.PLANET_KEYS.map((k) => A.PLANETS[k].ko), ...STARS.map((s) => s.ko), ...STARS.map((s) => s.en)]
  .map((n) => `<option value="${n}">`).join('');
$('#objQuick').innerHTML = ['폴라리스(북극성)', '시리우스', '베가(직녀성)', '베텔게우스', '안타레스', '데네브', '태양', '화성', '목성']
  .map((n) => `<button class="btn small" data-sel="${n}">${n}</button>`).join('');
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sel]');
  if (b) { sky.selectByName(b.dataset.sel); openTab('obj'); }
});
$('#btnFind').addEventListener('click', () => { if (!sky.selectByName($('#objSearch').value)) $('#objSearch').select(); });
$('#objSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnFind').click(); });
sky.on('select', (d) => {
  if (d && !sky.arcs.hor && !sky.arcs.eq && !sky.arcs.ha && !sky.arcs.ecl && !sky.arcs.gal) sky.setArcs({ hor: true, eq: true });
  syncChecks();
  renderInfo();
});

// ------------------------------------------------------------------ 정보 표시
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function fmtTZ(tz) { return `UTC${tz >= 0 ? '+' : '−'}${Math.abs(tz)}`; }
function syncUI() {
  const c = civil();
  $('#lat').value = sky.lat; $('#latOut').textContent = `${A.fmtDeg(Math.abs(sky.lat), 2)} ${sky.lat >= 0 ? 'N' : 'S'}`;
  $('#lon').value = sky.lon; $('#lonOut').textContent = `${A.fmtDeg(Math.abs(sky.lon), 2)} ${sky.lon >= 0 ? 'E' : 'W'}`;
  $('#tz').value = sky.tz;
  if (document.activeElement !== $('#date')) $('#date').value = A.fmtDate(c);
  if (!draggingTime) { $('#time').value = Math.floor(c.hours * 60); $('#timeOut').textContent = A.fmtHM(c.hours); }
  $('#epochOut').textContent = sky.epochMode === 'date' ? `${sky.epoch.toFixed(1)} (날짜 연동)` : (sky.epochYear < 0 ? `기원전 ${-sky.epochYear}년` : `${sky.epochYear}년`);
  $('#epoch').value = sky.epochMode === 'date' ? Math.round(sky.epoch) : sky.epochYear;
  syncChecks();
}

function refreshUI() {
  const c = civil();
  const dow = WEEK[new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay()];
  const s = sky.sunData;
  $('#clock').innerHTML = `<b>${A.fmtDate(c)} (${dow}) ${A.fmtHM(c.hours)}</b> ${fmtTZ(sky.tz)} · 위도 ${sky.lat.toFixed(1)}°<br>` +
    `항성시 <b>${A.fmtRA(sky.lst, false)}</b> · 태양 고도 ${sky.sunHor.alt.toFixed(1)}°`;
  if (!draggingTime && document.activeElement !== $('#time')) { $('#time').value = Math.floor(c.hours * 60); $('#timeOut').textContent = A.fmtHM(c.hours); }
  if (document.activeElement !== $('#date')) $('#date').value = A.fmtDate(c);
  const ut = A.civilFromJD(sky.jd, 0);
  const lmt = A.norm24(ut.hours + sky.lon / 15);
  const sunEcl = s.lon;
  $('#timeInfo').innerHTML =
    `<span class="k">지방 항성시 LST</span> <b>${A.fmtRA(sky.lst)}</b><br><span class="note">= 지금 자오선을 지나는(남중하는) 천체의 적경</span><br>` +
    `<span class="k">그리니치 항성시 GMST</span> ${A.fmtRA(A.gmstDeg(sky.jd))}<br>` +
    `<span class="k">세계시 UT</span> ${A.fmtDate(ut)} ${A.fmtHM(ut.hours)} · <span class="k">지방 평균시</span> ${A.fmtHM(lmt)}<br>` +
    `<span class="k">율리우스일 JD</span> ${sky.jd.toFixed(5)}<br>` +
    `<span class="k">태양</span> α ${A.fmtRA(s.ra, false)}, δ ${A.fmtDMS(s.dec, true, false)}, 황경 ${sunEcl.toFixed(2)}°<br>` +
    `<span class="k">태양 고도·방위각</span> ${sky.sunHor.alt.toFixed(1)}°, ${sky.sunHor.az.toFixed(1)}° · <span class="k">균시차</span> ${s.eot >= 0 ? '+' : '−'}${Math.abs(s.eot).toFixed(1)}분`;
  renderInfo();
}

function hoursTxt(h) { return A.fmtHM(h); }
function renderInfo() {
  const info = sky.getInfo();
  if (!info) {
    $('#objInfo').innerHTML = '<div class="box">별이나 행성을 클릭하거나 위에서 이름을 검색해 선택하세요.</div>';
    $('#triInfo').innerHTML = '';
    return;
  }
  const { eq, j2000, H, hor, ecl, gal, culm, rs, rsRef } = info;
  const g = (c) => `class="g" style="--c:${c}"`;
  let rise = '';
  if (rs.type === 'circumpolar') rise = `<b>주극성</b> — 하루 종일 지평선 위에 있다 (δ ≥ 90° − |φ|).`;
  else if (rs.type === 'never') rise = `<b>전몰성</b> — 하루 종일 지평선 아래에 있다.`;
  else {
    const upHours = (2 * rs.H0 / 15) * A.SIDEREAL_RATIO;
    rise = `뜸 <b>${hoursTxt(info.rise)}</b> (방위각 ${rs.azRise.toFixed(1)}°) · 남중 <b>${hoursTxt(info.transit)}</b> · 짐 <b>${hoursTxt(info.set)}</b> (방위각 ${rs.azSet.toFixed(1)}°)<br>` +
      `출몰 시간각 H₀ = ${A.fmtRA(rs.H0, false)} (${rs.H0.toFixed(2)}°) · 지평선 위에 있는 시간 ≈ ${A.fmtHours(upHours)}` +
      (rsRef.type === 'normal' ? `<br><span class="note">대기차(34′)를 고려하면 H₀ = ${rsRef.H0.toFixed(2)}° → 약 ${(((rsRef.H0 - rs.H0) / 15) * 60 * A.SIDEREAL_RATIO).toFixed(1)}분 일찍 뜨고 늦게 진다.</span>` : '');
  }
  let extra = '';
  if (info.desc.kind === 'planet' && info.planet) {
    const p = info.planet;
    extra = `<div class="box readout"><span class="k">지구로부터 거리</span> ${p.dist.toFixed(3)} AU · <span class="k">태양으로부터</span> ${p.r.toFixed(3)} AU<br>` +
      `<span class="k">이각</span> ${p.elong.toFixed(1)}° (${p.side === 'E' ? '동쪽 — 초저녁 서쪽 하늘' : '서쪽 — 새벽 동쪽 하늘'}) · <span class="k">위상</span> ${(p.illum * 100).toFixed(0)}% · <span class="k">각지름</span> ${p.diam.toFixed(1)}″</div>`;
  }
  if (info.desc.kind === 'sun') {
    extra = `<div class="box readout"><span class="k">태양의 황경</span> ${sky.sunData.lon.toFixed(2)}° · <span class="k">지구–태양 거리</span> ${sky.sunData.dist.toFixed(4)} AU<br>` +
      `<span class="k">남중 고도</span> 90° − φ + δ☉ = ${culm.upper.toFixed(1)}°` + (rs.type === 'normal' ? ` · <span class="k">낮의 길이</span> ≈ ${A.fmtHours((2 * rs.H0) / 15)}` : '') + `</div>`;
  }
  $('#objInfo').innerHTML = `
    <h3>${info.name}</h3>
    <div class="meta">${info.mag != null ? `겉보기 등급 ${info.mag.toFixed(2)} · ` : ''}${info.desc.kind === 'star' ? STARS[info.desc.id].en : ''}</div>
    <table class="coord">
      <tr ${g('var(--hor)')}><td>고도 h</td><td>${hor.alt.toFixed(2)}° <span class="note">(천정 거리 z = ${(90 - hor.alt).toFixed(2)}°)</span></td></tr>
      <tr ${g('var(--hor)')}><td>방위각 A <span class="note">(북점 기준)</span></td><td>${hor.az.toFixed(2)}° (${A.azName(hor.az)})</td></tr>
      <tr ${g('var(--eq)')}><td>적경 α</td><td>${A.fmtRA(eq.ra)}</td></tr>
      <tr ${g('var(--eq)')}><td>적위 δ</td><td>${A.fmtDMS(eq.dec)}</td></tr>
      <tr ${g('var(--ha)')}><td>시간각 H = LST − α</td><td>${A.fmtRA(H)} <span class="note">(${H.toFixed(2)}°)</span></td></tr>
      <tr ${g('#7a86b8')}><td>J2000.0 α, δ</td><td>${A.fmtRA(j2000.ra, false)}, ${A.fmtDMS(j2000.dec, true, false)}</td></tr>
      <tr ${g('var(--ecl)')}><td>황경 λ, 황위 β</td><td>${ecl.lon.toFixed(2)}°, ${ecl.lat >= 0 ? '+' : ''}${ecl.lat.toFixed(2)}°</td></tr>
      <tr ${g('var(--gal)')}><td>은경 l, 은위 b</td><td>${gal.l.toFixed(2)}°, ${gal.b >= 0 ? '+' : ''}${gal.b.toFixed(2)}°</td></tr>
    </table>
    <div class="box readout">
      <span class="k">남중(상방 정중) 고도</span> <b>${culm.upper.toFixed(2)}°</b> (${culm.dir}쪽) = 90° − |φ − δ|<br>
      <span class="k">하방 정중 고도</span> ${culm.lower.toFixed(2)}° = |φ + δ| − 90°<br>
      ${rise}
    </div>${extra}`;

  if (sky.show.triangle) {
    const phi = sky.lat, d = eq.dec, h = hor.alt, z = 90 - h;
    const angZ = hor.az <= 180 ? hor.az : 360 - hor.az, angP = H <= 180 ? H : 360 - H, q = Math.abs(info.q);
    const lhs = A.sind(h), rhs = A.sind(phi) * A.sind(d) + A.cosd(phi) * A.cosd(d) * A.cosd(H);
    const r1 = A.sind(angP) / A.sind(z), r2 = A.sind(angZ) / A.sind(90 - d), r3 = A.sind(q) / A.sind(90 - phi);
    $('#triInfo').innerHTML = `<div class="box readout"><b>천문 삼각형 PZX</b><br>
      <span class="k">변</span> PZ = 90° − φ = ${(90 - phi).toFixed(2)}°, PX = 90° − δ = ${(90 - d).toFixed(2)}°, ZX = z = ${z.toFixed(2)}°<br>
      <span class="k">각</span> ∠P = H = ${angP.toFixed(2)}°, ∠Z = ${angZ.toFixed(2)}° (방위각에서), ∠X = q = ${q.toFixed(2)}°<br>
      <span class="k">코사인 법칙</span> <span class="formula">sin h = sin φ sin δ + cos φ cos δ cos H</span><br>
      &nbsp;&nbsp;좌변 ${lhs.toFixed(5)} · 우변 ${rhs.toFixed(5)}<br>
      <span class="k">사인 법칙</span> <span class="formula">sin H / sin z = sin ∠Z / cos δ = sin q / cos φ</span><br>
      &nbsp;&nbsp;${r1.toFixed(5)} = ${r2.toFixed(5)} = ${r3.toFixed(5)}</div>`;
  } else $('#triInfo').innerHTML = '';
}

let pending = false;
sky.on('update', () => {
  if (pending) return;
  pending = true;
  setTimeout(() => { pending = false; refreshUI(); }, 90);
});

// ------------------------------------------------------------------ 학습 가이드
const STEPS = [
  {
    title: '천구와 관측자', level: 'basic',
    show: { meridian: false },
    html: `
      <p>밤하늘의 별들은 지구로부터의 거리가 모두 다르지만, 너무 멀어서 우리 눈에는 <b>방향</b>만 구별된다. 그래서 관측자를 중심으로 반지름이 매우 큰 가상의 구를 생각하고, 모든 천체가 그 안쪽 면에 붙어 있다고 보는데 이것이 <b>천구(天球)</b>다.</p>
      <ul>
        <li><b>천정(Z)</b>: 관측자의 머리 바로 위(고도 90°)에 있는 천구 위의 점</li>
        <li><b>천저(Z′)</b>: 천정의 정반대 점(발 아래)</li>
        <li><b>지평선</b>: 관측자가 선 지평면을 넓혀 천구와 만나는 <b>대원</b>. 천정에서 정확히 90° 떨어져 있다.</li>
        <li><b>대원</b>: 천구의 중심을 지나는 평면이 천구와 만나서 생기는 원 (지평선, 천구의 적도, 자오선, 황도 등)</li>
      </ul>
      <p class="try">👉 마우스로 끌어 천구를 돌려 보고(휠: 확대), 왼쪽 위 <b>🔭 관측자 시점</b>을 눌러 실제로 하늘을 올려다본 모습과 비교해 보자.</p>`,
  },
  {
    title: '천구의 극과 위도', level: 'basic',
    show: { poles: true, meridian: true, rotationArrows: true }, select: ['Polaris'], arcs: { hor: true }, cam: 'east',
    html: `
      <p>지구 자전축을 연장하여 천구와 만나는 두 점이 <b>천구 북극(P)</b>과 <b>천구 남극(P′)</b>이다. 천구는 이 축을 중심으로 하루에 한 바퀴씩 <b>동→서</b>로 도는 것처럼 보인다.</p>
      <div class="key">천구 북극의 고도 h<sub>P</sub> = 관측자의 위도 φ</div>
      <p>천구 북극에서 약 0.7° 떨어진 곳에 <b>북극성</b>이 있으므로, 북반구에서는 <b>북극성의 고도 ≈ 그 지방의 위도</b>이다.</p>
      <div class="quick"><button class="btn small" data-setlat="90">북극 90°</button><button class="btn small" data-setlat="66.56">66.6°N</button><button class="btn small" data-setlat="37.57">서울</button><button class="btn small" data-setlat="0">적도</button><button class="btn small" data-setlat="-33.87">시드니</button></div>
      <p class="try">👉 위 버튼(또는 ‘관측 설정’의 위도 슬라이더)으로 위도를 바꾸며 천구 북극의 고도(초록 호)를 확인하자. 북극에서는 천정에, 적도에서는 북점에 온다. 남반구에서는 천구 북극이 지평선 아래로 내려간다.</p>
      <details class="deep"><summary>🔭 심화: 왜 h<sub>P</sub> = φ 일까?</summary>
        위도 φ는 지구 중심에서 본 관측자 위치(=천정 방향)가 적도면과 이루는 각이다. 천구 북극 방향은 적도면에 수직이므로 천정과 천구 북극 사이의 각(천정 거리)은 90° − φ, 따라서 천구 북극의 고도는 90° − (90° − φ) = φ.<br>
        이 논리는 별이 무한히 멀어서 지구 중심과 관측자에서 본 방향이 같다고 볼 수 있을 때(시차 무시) 성립한다. 북극성은 천구 북극에서 약 0.66°(2026년 기준) 떨어져 있으므로 실제로는 하루 동안 고도가 φ ± 0.66° 범위에서 변한다.</details>`,
  },
  {
    title: '자오선과 묘유선', level: 'basic',
    show: { poles: true, meridian: true, primeVertical: true }, cam: 'default',
    html: `
      <ul>
        <li><b>수직권</b>: 천정과 천저를 지나는 대원. 지평선과 수직으로 만난다.</li>
        <li><b>자오선</b>: 천구 북극·천정·천구 남극·천저를 지나는 수직권. 지평선과 <b>북점·남점</b>에서 만난다.</li>
        <li><b>묘유선</b>: 천정과 <b>동점·서점</b>을 지나며 자오선과 수직인 수직권.</li>
      </ul>
      <p>천체가 자오선을 지나는 순간을 <b>정중</b>이라 한다. 천구 북극보다 남쪽(위쪽)에서 지날 때를 <b>남중(상방 정중)</b>이라 하며, 이때 하루 중 고도가 가장 높다.</p>
      <div class="key">남중 고도 = 90° − |φ − δ| &nbsp;(천구의 적도의 남중 고도 = 90° − φ)</div>
      <p class="try">👉 ‘관측자 시점’으로 바꾸고 <b>남</b> 버튼을 누르면 자오선이 남점에서 천정으로 곧게 올라가는 선으로 보인다.</p>`,
  },
  {
    title: '지평좌표계: 고도와 방위각', level: 'basic',
    show: { meridian: true, horGrid: true }, select: ['Vega', 'Arcturus', 'Capella', 'Sirius', 'Altair', 'Deneb', 'Betelgeuse'], arcs: { hor: true },
    html: `
      <p>관측자의 <b>지평선</b>을 기준으로 천체의 위치를 나타내는 좌표계이다.</p>
      <ul>
        <li><b>고도(h)</b>: 지평선에서 천체까지 <b>수직권</b>을 따라 잰 각 (−90° ~ +90°). 천정 거리 z = 90° − h</li>
        <li><b>방위각(A)</b>: <b>북점</b>을 기준으로 지평선을 따라 <b>시계 방향(북→동→남→서)</b>으로 천체를 지나는 수직권까지 잰 각 (0° ~ 360°)</li>
      </ul>
      <table class="mini"><tr><th>방위</th><th>북</th><th>동</th><th>남</th><th>서</th></tr><tr><td>방위각</td><td>0°</td><td>90°</td><td>180°</td><td>270°</td></tr></table>
      <div class="key">장점: 관측자가 바로 쓰기 쉽다 · 단점: 같은 천체라도 관측 장소와 시각에 따라 값이 계속 변한다</div>
      <p class="try">👉 하단 ▶ 버튼으로 시간을 흐르게 하면 초록색 호(h, A)가 계속 변한다. ‘천체 정보’ 탭의 숫자도 함께 보자.</p>
      <p class="note">※ 남점을 기준으로 서쪽으로 재는 방식을 쓰는 책도 있다. 문제에서 방위각의 정의를 꼭 확인하자.</p>`,
  },
  {
    title: '적도좌표계: 적경과 적위', level: 'basic',
    show: { meridian: true, equator: true, poles: true, eqGrid: true, ecliptic: true, eclPoints: true }, select: ['Betelgeuse', 'Sirius', 'Regulus', 'Spica', 'Altair', 'Fomalhaut', 'Aldebaran'], arcs: { eq: true },
    html: `
      <p>천구의 적도와 춘분점을 기준으로 하는 좌표계로, 별의 ‘주소’ 역할을 한다.</p>
      <ul>
        <li><b>천구의 적도</b>: 지구의 적도면을 넓혀 천구와 만나는 대원</li>
        <li><b>춘분점(γ)</b>: 황도와 천구의 적도가 만나는 두 점 중 태양이 남→북으로 지나가는 점</li>
        <li><b>적경(α)</b>: 춘분점에서 천구의 적도를 따라 <b>시계 반대 방향(서→동)</b>으로 천체의 시간권까지 잰 각. 0h ~ 24h (1h = 15°, 1m = 15′, 1s = 15″)</li>
        <li><b>적위(δ)</b>: 천구의 적도에서 시간권을 따라 천체까지 잰 각. 북쪽 +, 남쪽 − (−90° ~ +90°)</li>
      </ul>
      <div class="key">적경·적위는 천구에 고정 → 관측 장소·시각이 달라도 (거의) 변하지 않는다</div>
      <p class="try">👉 ▶ 재생: 빨간 격자가 별과 함께 돌아가므로 별의 α, δ는 그대로다. 지평좌표(h, A)와 비교해 보자.</p>
      <details class="deep"><summary>🔭 심화: ‘거의’ 변하지 않는 이유</summary>
        춘분점 자체가 세차 운동으로 매년 약 50.3″씩 황도를 따라 서쪽으로 이동하므로 별의 적경·적위는 천천히 변한다. 그래서 성표에는 <b>기준 분점(epoch)</b>을 함께 적는다(예: J2000.0). 이 밖에 고유 운동, 장동, 광행차, 연주 시차도 아주 작은 변화를 만든다.</details>`,
  },
  {
    title: '시간각과 항성시', level: 'basic',
    show: { meridian: true, equator: true, poles: true, eqGrid: true, eclPoints: true }, select: ['Sirius', 'Betelgeuse', 'Regulus', 'Spica', 'Altair', 'Vega', 'Arcturus'], arcs: { eq: true, ha: true }, speed: 'continuous:600',
    html: `
      <ul>
        <li><b>시간권</b>: 천구 북극과 남극, 천체를 지나는 대원</li>
        <li><b>시간각(H)</b>: <b>자오선</b>에서 천체의 시간권까지 천구의 적도를 따라 <b>서쪽(시계 방향)</b>으로 잰 각. 1시간에 15°씩 일정하게 증가</li>
        <li><b>항성시(LST)</b>: <b>춘분점의 시간각</b></li>
      </ul>
      <div class="key">H = LST − α &nbsp;·&nbsp; 남중할 때 H = 0 이므로 LST = α</div>
      <p>즉 <b>지금 자오선을 지나는 별의 적경 = 지금의 항성시</b>다. 항성시는 별을 기준으로 한 시계라서 별이 다시 남중하는 주기인 <b>항성일(23h 56m 4s)</b>마다 0h부터 다시 시작한다.</p>
      <p class="try">👉 ▶ 재생하면 주황색 시간각 호가 늘어난다. 별이 자오선(흰 선)에 올 때 하단의 항성시와 별의 적경이 같아지는지 확인하자.</p>
      <details class="deep"><summary>🔭 심화: 항성시 계산</summary>
        그리니치 평균 항성시 GMST(°) = 280.46061837 + 360.98564736629·d (d = J2000.0으로부터의 날수, 고차항 생략). 지방 항성시 LST = GMST + λ(동경 +).<br>
        ‘관측 설정’ 탭의 JD와 GMST로 직접 계산해서 확인해 보자.</details>`,
  },
  {
    title: '일주 운동', level: 'basic',
    view: 'observer', look: [0, 38], show: { meridian: true, equator: true, poles: true, trails: true, ground: true }, speed: 'continuous:3600', play: true,
    html: `
      <p>지구가 서→동으로 자전하므로, 천구는 천구 북극·남극을 잇는 축을 중심으로 <b>동→서</b>로 1시간에 15°씩 도는 것처럼 보인다.</p>
      <ul>
        <li>모든 별은 천구의 적도와 나란한 원(<b>일주권</b>)을 그린다.</li>
        <li><b>북쪽 하늘</b>: 북극성을 중심으로 <b>시계 반대 방향</b>으로 회전</li>
        <li><b>동쪽 하늘</b>: 지평선에서 오른쪽 위로 비스듬히 떠오름</li>
        <li><b>남쪽 하늘</b>: 왼쪽(동)에서 오른쪽(서)으로, 지평선과 나란하게 호를 그림</li>
        <li><b>서쪽 하늘</b>: 오른쪽 아래로 비스듬히 짐</li>
      </ul>
      <div class="key">일주권과 지평선이 이루는 각 = 90° − φ</div>
      <p class="try">👉 왼쪽 위 <b>북·동·남·서</b> 버튼으로 방향을 바꿔 가며 궤적을 비교하자. 화면을 끌어 둘러볼 수 있고, 휠로 시야를 넓힐 수 있다.</p>`,
  },
  {
    title: '위도에 따른 일주 운동', level: 'basic',
    view: 'outside', cam: 'default', show: { equator: true, poles: true, trails: true, rotationArrows: true }, speed: 'continuous:3600', play: true,
    html: `
      <ul>
        <li><b>북극 (φ = 90°)</b>: 천구의 적도 = 지평선. 별은 지평선과 나란히 돌며 뜨지도 지지도 않는다.</li>
        <li><b>중위도 (0° &lt; φ &lt; 90°)</b>: 일주권이 지평선에 (90° − φ) 기울어져 있다. 주극성·출몰성·전몰성이 모두 있다.</li>
        <li><b>적도 (φ = 0°)</b>: 일주권이 지평선에 수직. 모든 별이 약 12시간씩 떠 있고 주극성이 없다.</li>
      </ul>
      <div class="quick"><button class="btn small" data-setlat="90">북극 90°</button><button class="btn small" data-setlat="66.56">66.6°N</button><button class="btn small" data-setlat="37.57">서울 37.6°N</button><button class="btn small" data-setlat="0">적도 0°</button><button class="btn small" data-setlat="-33.87">시드니 33.9°S</button><button class="btn small" data-setlat="-90">남극</button></div>
      <table class="mini"><tr><th></th><th>북반구 (φ &gt; 0)</th></tr>
        <tr><td>주극성</td><td>δ ≥ 90° − φ</td></tr><tr><td>출몰성</td><td>−(90° − φ) &lt; δ &lt; 90° − φ</td></tr><tr><td>전몰성</td><td>δ ≤ −(90° − φ)</td></tr></table>
      <p class="try">👉 위도 버튼을 누르면 궤적이 새로 그려진다. 남반구에서는 별이 천구 남극을 중심으로 <b>시계 방향</b>으로 도는 것도 확인하자.</p>`,
  },
  {
    title: '태양의 연주 운동과 황도', level: 'basic',
    show: { equator: true, poles: true, ecliptic: true, eclPoints: true, sunPath: true, seasonPaths: true }, speed: 'daily:5', play: true, cam: 'default',
    html: `
      <p>지구가 공전하므로 태양은 별자리 사이를 하루 약 1°씩 <b>서→동</b>으로 이동하여 1년에 천구를 한 바퀴 돈다. 이 길이 <b>황도</b>이며, 천구의 적도와 약 <b>23.4°</b> 기울어져 있다(황도 경사 ε).</p>
      <table class="mini"><tr><th>점</th><th>날짜(무렵)</th><th>적경</th><th>적위</th></tr>
        <tr><td>춘분점</td><td>3월 21일</td><td>0h</td><td>0°</td></tr>
        <tr><td>하지점</td><td>6월 21일</td><td>6h</td><td>+23.4°</td></tr>
        <tr><td>추분점</td><td>9월 23일</td><td>12h</td><td>0°</td></tr>
        <tr><td>동지점</td><td>12월 22일</td><td>18h</td><td>−23.4°</td></tr></table>
      <p>태양의 적위가 계절마다 바뀌므로 <b>남중 고도, 낮의 길이, 뜨고 지는 방위</b>가 달라진다(색 원: 계절별 태양의 일주권).</p>
      <div class="key">태양의 남중 고도 = 90° − φ + δ☉ (북반구, δ☉ &lt; φ)</div>
      <p class="try">👉 ‘매일 같은 시각’ 속도로 재생 중이다. 태양(노란 빛)이 황도를 따라 동쪽으로 이동하고, 태양의 일주권(주황 원)이 하지와 동지 사이를 오르내리는 것을 보자.</p>`,
  },
  {
    title: '별의 연주 운동과 항성일', level: 'basic',
    view: 'observer', look: [180, 35], show: { meridian: true, equator: true, ecliptic: true, conNames: true }, speed: 'daily:1', play: true,
    html: `
      <p>매일 <b>같은 시각</b>에 하늘을 보면 별자리는 하루에 약 1°씩 서쪽으로 이동한다. 한 달이면 약 30°(2시간), 1년이면 제자리로 돌아온다. → 계절마다 보이는 별자리가 다르다.</p>
      <ul>
        <li><b>항성일</b> = 23시간 56분 4초: 별이 다시 남중할 때까지 = 지구의 실제 자전 주기(360°)</li>
        <li><b>태양일</b> = 24시간: 태양이 다시 남중할 때까지. 그 사이 지구가 약 1° 공전하므로 약 361°를 돌아야 한다.</li>
      </ul>
      <div class="key">같은 별은 매일 약 4분(3분 56초)씩 일찍 남중한다</div>
      <div class="quick"><button class="btn small" data-speed="daily:1">같은 시각 · 1일/초</button><button class="btn small" data-speed="sidereal:2">항성일 간격 · 2일/초</button></div>
      <p class="try">👉 ‘항성일 간격’으로 바꾸면 별은 제자리에 멈춰 있고 태양만 황도를 따라 움직인다. 왜 그런지 설명해 보자.</p>`,
  },
  {
    title: '황도좌표계', level: 'basic',
    show: { equator: true, poles: true, ecliptic: true, eclPoints: true, eclGrid: true }, select: ['@planet'], arcs: { ecl: true }, cam: 'default',
    html: `
      <ul>
        <li><b>황경(λ)</b>: 춘분점에서 <b>황도</b>를 따라 동쪽으로 잰 각 (0° ~ 360°)</li>
        <li><b>황위(β)</b>: 황도에서 천체까지 남북으로 잰 각 (−90° ~ +90°)</li>
        <li><b>황도 북극</b>: 천구 북극에서 23.4° 떨어진 용자리에 있다(적경 18h, 적위 +66.6°).</li>
      </ul>
      <p>태양의 황위는 항상 0°이고, 행성과 달은 궤도면이 황도면과 거의 같아서 황도 근처(|β|가 작음)에서 움직인다. 그래서 황도좌표계는 태양계 천체를 다룰 때 편리하다.</p>
      <details class="deep"><summary>🔭 심화: 적도 ↔ 황도 변환</summary>
        x축(춘분점 방향)을 축으로 ε만큼 회전한 관계이다.<br>
        <span class="formula">sin β = sin δ cos ε − cos δ sin ε sin α</span><br>
        <span class="formula">cos β cos λ = cos δ cos α</span><br>
        <span class="formula">cos β sin λ = sin δ sin ε + cos δ cos ε sin α</span><br>
        태양(β = 0)이면 <span class="formula">sin δ☉ = sin ε sin λ☉</span>, <span class="formula">tan α☉ = cos ε tan λ☉</span>.</details>`,
  },
  {
    title: '은하좌표계', level: 'basic',
    show: { equator: true, poles: true, galactic: true, galGrid: true, milkyway: true }, select: ['Deneb', 'Altair', 'Antares', 'Sirius', 'Capella'], arcs: { gal: true }, cam: 'default',
    html: `
      <ul>
        <li><b>은하 적도</b>: 우리은하 원반(은하면)이 천구와 만나는 대원. 은하수가 흐르는 길이다.</li>
        <li><b>은경(l)</b>: <b>은하 중심</b>(궁수자리 방향, α ≈ 17h 45.6m, δ ≈ −28.9°)에서 은하 적도를 따라 동쪽으로 잰 각 (0° ~ 360°)</li>
        <li><b>은위(b)</b>: 은하면에서 남북으로 잰 각</li>
        <li><b>은하 북극</b>: 머리털자리 (α ≈ 12h 51.4m, δ ≈ +27.1°)</li>
      </ul>
      <div class="key">은하면은 천구의 적도와 약 62.9° 기울어져 있다</div>
      <p>별, 성단, 성운의 우리은하 안에서의 분포를 연구할 때 쓴다. 예를 들어 산개 성단은 |b|가 작은 곳에, 구상 성단은 은하 중심 방향 하늘에 넓게 퍼져 있다.</p>
      <details class="deep"><summary>🔭 심화: 회전 행렬로 변환</summary>
        은하 좌표는 J2000 적도 좌표 벡터에 고정된 회전 행렬을 곱해서 얻는다. 은하 북극 (α<sub>G</sub>, δ<sub>G</sub>) = (192.859°, +27.128°), 천구 북극의 은경 l<sub>NCP</sub> = 122.932°일 때<br>
        <span class="formula">sin b = sin δ sin δ<sub>G</sub> + cos δ cos δ<sub>G</sub> cos(α − α<sub>G</sub>)</span><br>
        <span class="formula">cos b sin(l<sub>NCP</sub> − l) = cos δ sin(α − α<sub>G</sub>)</span></details>`,
  },
  {
    title: '천문 삼각형과 좌표 변환', level: 'adv',
    show: { meridian: true, equator: true, poles: true, triangle: true }, select: ['Arcturus', 'Vega', 'Capella', 'Sirius', 'Altair', 'Regulus', 'Betelgeuse'], arcs: { hor: true, ha: true }, cam: 'default',
    html: `
      <p><b>천구 북극(P)</b>, <b>천정(Z)</b>, <b>천체(X)</b>를 대원 호로 이은 구면 삼각형을 <b>천문 삼각형</b>이라 한다.</p>
      <table class="mini"><tr><th>변</th><th>크기</th><th>마주 보는 각</th></tr>
        <tr><td>PZ</td><td>90° − φ</td><td>∠X = q (시차각)</td></tr>
        <tr><td>PX</td><td>90° − δ</td><td>∠Z = A (또는 360° − A)</td></tr>
        <tr><td>ZX</td><td>90° − h = z</td><td>∠P = H (또는 360° − H)</td></tr></table>
      <p>구면 코사인 법칙을 변 ZX에 적용하면</p>
      <div class="key formula">sin h = sin φ sin δ + cos φ cos δ cos H</div>
      <p>변 PX에 적용하면 <span class="formula">sin δ = sin φ sin h + cos φ cos h cos A</span>, 사인 법칙은 <span class="formula">sin H / sin z = sin A / cos δ</span>.</p>
      <p class="try">👉 ‘천체 정보’ 탭에서 좌변과 우변이 실제로 같은지 확인하고, 시간을 흐르게 하며 삼각형의 모양 변화를 관찰하자.</p>
      <details class="deep"><summary>🔭 응용</summary>
        <b>출몰</b>(h = 0): cos H₀ = −tan φ tan δ, cos A = sin δ / cos φ<br>
        <b>남중</b>(H = 0): h = 90° − |φ − δ|<br>
        <b>묘유선 통과</b>(A = 90°, 270°): sin h = sin δ / sin φ, cos H = tan δ / tan φ (0 &lt; δ &lt; φ 일 때만 지평선 위에서 지난다 — δ &gt; φ 인 별은 왜 묘유선을 지나지 않을까?)<br>
        <b>최대 방위각</b>(주극성, q = 90°): sin A<sub>max</sub> = cos δ / cos φ</details>`,
  },
  {
    title: '세차 운동', level: 'adv',
    show: { equator: true, poles: true, ecliptic: true, eclPoints: true, precessionCircle: true, allStarNames: true }, epoch: 2000, cam: 'polar', select: ['Polaris'], arcs: { eq: true },
    html: `
      <p>지구는 적도 쪽이 부푼 회전 타원체이므로 달과 태양의 인력이 자전축을 세우려는 돌림힘을 만든다. 그 결과 자전축은 팽이처럼 <b>약 25,800년 주기</b>로 황도 북극 둘레를 돈다(<b>세차 운동</b>).</p>
      <ul>
        <li>천구 북극이 황도 북극을 중심으로 반지름 23.4°인 원(점선)을 따라 별 사이를 이동</li>
        <li>춘분점이 황도를 따라 매년 약 <b>50.3″</b>씩 <b>서쪽</b>으로 이동 → 별의 적경·적위가 변함</li>
        <li>기원전 3000년경 북극성: <b>투반</b>(용자리 α) / 현재: <b>폴라리스</b>(2100년경 최근접, 약 0.45°) / 서기 14000년경: <b>베가</b> 부근</li>
      </ul>
      <div class="field"><label>기준 연도 <output id="gEpochOut">2000년</output></label><input type="range" id="gEpoch" min="-13000" max="15000" step="50" value="2000"></div>
      <div class="quick"><button class="btn small" data-epoch="-2800">기원전 2800년</button><button class="btn small" data-epoch="2000">2000년</button><button class="btn small" data-epoch="7500">7500년</button><button class="btn small" data-epoch="14000">14000년</button></div>
      <p class="try">👉 슬라이더를 움직이면 천구 북극(빨간 점)과 춘분점이 별 사이를 이동한다. 폴라리스의 적경·적위가 크게 바뀌는 것을 ‘천체 정보’ 탭에서 확인하자.</p>
      <p class="note">※ 이 시뮬레이션은 황도가 고정되고 황도 경사가 23.44°로 일정하다고 보는 근사 모형이다. 실제로는 행성 세차와 황도 경사 변화(약 22.1°~24.5°, 주기 약 41,000년)도 있다.</p>`,
  },
  {
    title: '실전: 밤하늘에 천구 그리기', level: 'adv',
    view: 'observer', look: [180, 40], fov: 100, show: { meridian: true, equator: true, poles: true, eqGrid: true, ecliptic: true, eclPoints: true }, now: true,
    html: `
      <p>실제 하늘에서 천구의 구성 요소를 떠올리는 순서:</p>
      <ol>
        <li><b>북극성 찾기</b>: 북두칠성 국자 끝 두 별(메라크→두베)의 간격을 약 5배 연장하거나, 카시오페이아자리 W의 바깥 두 변을 연장해 만나는 점에서 가운데 별 쪽으로 약 5배.</li>
        <li><b>천구 북극의 고도 = 위도</b> (서울 약 37.5° ≈ 주먹 약 4개 높이)</li>
        <li><b>자오선</b>: 북점 → 북극성 → 천정 → 남점을 잇는 선</li>
        <li><b>천구의 적도</b>: <b>동점과 서점</b>을 지나고, 남쪽 자오선에서 고도 <b>90° − φ</b>(서울 약 52.5°)인 점을 지나는 큰 원. 오리온자리 삼태성의 <b>민타카(δ ≈ −0.3°)</b>가 거의 적도 위에 있다.</li>
        <li><b>항성시 알기</b>: 지금 자오선 위에 있는 별의 적경 = 항성시. 예) 시리우스(6h 45m)가 남중하면 LST ≈ 6h 45m</li>
        <li><b>적경 읽기</b>: 자오선에서 동쪽으로 갈수록 적경이 커진다(1h = 15°). 적위는 천구의 적도에서 극 쪽으로 잰다.</li>
      </ol>
      <div class="key">손으로 각도 재기 (팔을 쭉 폈을 때): 새끼손가락 폭 ≈ 1°, 주먹 ≈ 10°, 엄지~새끼손가락 활짝 ≈ 20~25°</div>
      <p class="try">👉 지금 서울의 하늘이다(낮이라면 오늘 밤 9시). 빈 하늘에 마우스를 올리면 그 지점의 좌표가 나온다. 남쪽 하늘에서 적도와 자오선의 교점을 찾고, 그 근처 별의 적경과 항성시를 비교해 보자. ‘적경·적위 훈련’ 페이지에서 실력을 시험할 수 있다.</p>`,
  },
];

function visibleStarFrom(names) {
  sky.update();
  if (names[0] === '@planet') {
    const order = ['jupiter', 'saturn', 'mars', 'venus', 'mercury'];
    for (const k of order) {
      const g = A.geocentric(k, sky.jd), eq = A.precess(g.ra, g.dec, sky.epoch);
      if (A.eqToHor(A.norm360(sky.lst - eq.ra), eq.dec, sky.lat).alt > 5) return { kind: 'planet', key: k };
    }
    return { kind: 'planet', key: 'jupiter' };
  }
  const list = names.map((n) => STARS.find((s) => s.en === n)).filter(Boolean);
  const alt = (s) => { const e = A.precess(s.ra, s.dec, sky.epoch); return A.eqToHor(A.norm360(sky.lst - e.ra), e.dec, sky.lat).alt; };
  const pick = list.find((s) => alt(s) > 20) || list.find((s) => alt(s) > 0) || list[0];
  return { kind: 'star', id: pick.id };
}

let stepIdx = 0;
function applyStep(i, rebuildHtml = true) {
  stepIdx = Math.max(0, Math.min(STEPS.length - 1, i));
  const st = STEPS[stepIdx];
  sky.setPlaying(false);
  sky.setEpoch(st.epoch != null ? 'manual' : 'date', st.epoch ?? sky.epochYear);
  if (st.now) {
    // 지금이 밤이면 현재 시각, 낮이면 오늘 21시의 하늘
    const now = A.jdFromDate(new Date()), sun = A.sunPosition(now);
    const sunAlt = A.eqToHor(A.norm360(A.lstDeg(now, sky.lon) - sun.ra), sun.dec, sky.lat).alt;
    sky.setJD(sunAlt < -12 ? now : tonightJD(sky.tz));
  }
  sky.setShow({ ...BASE_OFF, ...ESSENTIAL, ...(st.show || {}) });
  sky.setArcs({ hor: false, eq: false, ha: false, ecl: false, gal: false, circles: false, ...(st.arcs || {}) });
  sky.setView(st.view || 'outside');
  sky.update();
  if ((st.view || 'outside') === 'outside') sky.setCameraPreset(st.cam || 'default');
  if (st.look) sky.lookAt(st.look[0], st.look[1], st.fov || 80);
  sky.select(st.select ? visibleStarFrom(st.select) : null);
  if (st.arcs) sky.setArcs({ ...st.arcs });
  if (st.speed) applySpeed(st.speed);
  if (st.show && st.show.trails) sky.resetTrails();
  if (st.play) sky.setPlaying(true);

  if (rebuildHtml) {
    $('#gSteps').innerHTML = STEPS.map((s, k) => `<button class="${k === stepIdx ? 'on' : ''} ${s.level === 'adv' ? 'adv' : ''}" data-gstep="${k}" title="${s.title}">${k + 1}</button>`).join('');
    $('#gBody').innerHTML = `<h3><span class="level ${st.level === 'adv' ? 'adv' : 'basic'}">${st.level === 'adv' ? '심화' : '기본'}</span>${stepIdx + 1}. ${st.title}</h3>${st.html}`;
    $('#gCount').textContent = `${stepIdx + 1} / ${STEPS.length}`;
    const ge = $('#gEpoch');
    if (ge) {
      const setE = (y) => { sky.setEpoch('manual', y); ge.value = y; $('#gEpochOut').textContent = y < 0 ? `기원전 ${-y}년` : `${y}년`; syncUI(); };
      ge.addEventListener('input', () => setE(+ge.value));
      $$('[data-epoch]', $('#gBody')).forEach((b) => b.addEventListener('click', () => setE(+b.dataset.epoch)));
    }
    $$('[data-speed]', $('#gBody')).forEach((b) => b.addEventListener('click', () => { applySpeed(b.dataset.speed); sky.setPlaying(true); }));
    history.replaceState(null, '', `?step=${stepIdx + 1}`);
  }
  $('#epochDate').checked = sky.epochMode === 'date';
  $('#epoch').disabled = sky.epochMode === 'date';
  syncUI();
}
$('#gPrev').addEventListener('click', () => applyStep(stepIdx - 1));
$('#gNext').addEventListener('click', () => applyStep(stepIdx + 1));
$('#gApply').addEventListener('click', () => applyStep(stepIdx));
$('#gSteps').addEventListener('click', (e) => { const b = e.target.closest('[data-gstep]'); if (b) applyStep(+b.dataset.gstep); });

// ------------------------------------------------------------------ 시작
const startStep = parseInt(params.get('step') || '1', 10) - 1;
applyStep(Number.isFinite(startStep) ? startStep : 0);
if (params.get('lat')) setLat(parseFloat(params.get('lat')));
if (params.get('star')) sky.selectByName(params.get('star'));
syncUI();
