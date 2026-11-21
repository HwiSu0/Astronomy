// =====================================================================
//  training.js — 적경·적위 훈련, 계산 문제, 개념 퀴즈
// =====================================================================
import { SkyScene } from './skyscene.js';
import * as A from './astro.js';
import { STARS } from './stars.js';
import { GENERATORS, parseAnswer, checkAnswer, fmtAns, QUIZ } from './problems.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const TZ = 9;

const sky = new SkyScene($('#sky'), {
  lat: 37.5665, lon: 126.978, tz: TZ, pickable: false,
  show: { shell: false, zenith: false, sun: false, planets: false, starNames: true, constellations: true, ground: true },
});
sky.hideHud = true;
sky.setView('observer');
sky.lookAt(180, 40, 100);
window.sky = sky;

const LEVELS = {
  easy: { name: '쉬움', desc: '적경·적위 격자, 천구의 적도, 자오선, 별 이름이 보입니다.', show: { eqGrid: true, equator: true, meridian: true, poles: true, starNames: true, constellations: true } },
  normal: { name: '보통', desc: '격자 없이 천구의 적도와 자오선, 별 이름만 보입니다.', show: { eqGrid: false, equator: true, meridian: true, poles: true, starNames: true, constellations: true } },
  hard: { name: '어려움', desc: '별과 별자리 선, 방위만 보입니다. 실제 밤하늘과 같은 조건!', show: { eqGrid: false, equator: false, meridian: false, poles: false, starNames: false, constellations: true } },
};
let mode = 'find', level = 'normal';
let round = null;
const hist = { find: [], read: [] };

// ------------------------------------------------------------------ 공통
function applyLevel() {
  sky.setShow({ ...LEVELS[level].show, trails: false });
  sky.hideSelName = level === 'hard';
}
function randomNight() {
  const y = 2026;
  for (let k = 0; k < 50; k++) {
    const jd = A.jdFromCivil(y, 1, 1, 0, TZ) + Math.floor(Math.random() * 365) + (19 + Math.random() * 10) / 24;
    const s = A.sunPosition(jd);
    if (A.eqToHor(A.norm360(A.lstDeg(jd, sky.lon) - s.ra), s.dec, sky.lat).alt < -15) return jd;
  }
  return A.jdFromCivil(y, 12, 1, 22, TZ);
}
function look(what) {
  if (what === 'zenith') return sky.lookAt(sky.obsAz, 89);
  const az = +what;
  sky.lookAt(az, az === 0 ? 37 : 35, sky.obsFov);
}
$$('#lookSeg button').forEach((b) => b.addEventListener('click', () => look(b.dataset.look)));
function clock() {
  const c = A.civilFromJD(sky.jd, TZ);
  $('#clock').innerHTML = `서울 (37.6°N) · <b>${A.fmtDate(c)} ${A.fmtHM(c.hours)}</b><br>지방 항성시 <b>LST = ${A.fmtRA(sky.lst, false)}</b>`;
}
sky.on('update', clock);
function scoreFor(err) { return Math.max(0, Math.round(100 - 8 * err)); }
function grade(avg) { return avg < 1.5 ? '천문 올림피아드급' : avg < 3 ? '아주 정확함' : avg < 6 ? '좋음' : avg < 10 ? '조금 더 연습!' : '천구 모형부터 다시 확인해 보자'; }
function nearestBright(ra, dec) {
  let best = null;
  for (const s of STARS) {
    if (s.mag > 2.5) continue;
    const e = A.precess(s.ra, s.dec, sky.epoch), d = A.angularDistance(ra, dec, e.ra, e.dec);
    if (!best || d < best.d) best = { s, d };
  }
  return best;
}
const levelPicker = () => `
  <div class="field"><div class="lab-title">난이도</div>
  <div class="seg" id="lvSeg">${Object.entries(LEVELS).map(([k, v]) => `<button data-lv="${k}" class="${k === level ? 'on' : ''}">${v.name}</button>`).join('')}</div>
  <p class="note" style="margin:6px 0 0">${LEVELS[level].desc}</p></div>`;
function bindLevel(onChange) {
  $$('#lvSeg button').forEach((b) => b.addEventListener('click', () => { level = b.dataset.lv; onChange(); }));
}
function histHtml(arr) {
  if (!arr.length) return '';
  const avg = arr.reduce((s, x) => s + x.err, 0) / arr.length, pts = arr.reduce((s, x) => s + x.score, 0);
  return `<div class="score"><div>문제 <b>${arr.length}</b></div><div>점수 <b>${pts}</b></div><div>평균 오차 <b>${avg.toFixed(1)}°</b></div></div>
    <div class="hist">${arr.slice(-20).map((x) => `<span style="color:${x.err < 3 ? 'var(--good)' : x.err < 8 ? 'var(--accent2)' : 'var(--bad)'}">${x.err.toFixed(1)}°</span>`).join('')}</div>
    ${arr.length >= 10 ? `<div class="box">최근 10문제 평균 ${(arr.slice(-10).reduce((s, x) => s + x.err, 0) / 10).toFixed(2)}° → <b>${grade(arr.slice(-10).reduce((s, x) => s + x.err, 0) / 10)}</b></div>` : ''}`;
}

// ------------------------------------------------------------------ 1. 하늘에서 찾기
function renderFindPanel(feedback = '') {
  $('#panelBody').innerHTML = `
    <h3>하늘에서 좌표 찾기</h3>
    <p class="note" style="font-size:14px!important">화면 위쪽에 주어진 <b>적경·적위</b>에 해당하는 하늘의 지점을 클릭하세요. 하늘을 끌어 둘러볼 수 있습니다.</p>
    ${levelPicker()}
    <div class="box readout">
      <b>요령</b><br>① 지금의 항성시 LST가 자오선(남쪽)을 지나는 적경이다.<br>② 시간각 H = LST − α → H &gt; 0 이면 자오선의 서쪽(오른쪽), H &lt; 0 이면 동쪽(왼쪽)으로 |H| × 15°.<br>③ 적위는 천구의 적도에서부터. 천구의 적도는 동점·서점과 남쪽 고도 90° − φ(≈ 52.4°)를 지난다.<br>④ 적위가 높은 곳에서는 1h의 적경 차가 15° × cos δ로 좁아진다.</div>
    <div id="fb">${feedback}</div>
    <div class="row" style="margin:10px 0"><button class="btn primary" id="btnNext">${round && !round.done ? '건너뛰기' : '새 문제'}</button></div>
    ${histHtml(hist.find)}`;
  bindLevel(() => { applyLevel(); renderFindPanel(); newFindRound(); });
  $('#btnNext').addEventListener('click', newFindRound);
}
function newFindRound() {
  sky.setMarkers([]);
  sky.select(null);
  applyLevel();
  sky.setJD(randomNight());
  sky.update();
  let ra, dec, alt = 0, az = 180;
  for (let k = 0; k < 200; k++) {
    const a0 = 22 + Math.random() * 50, z0 = Math.random() * 360;
    const e = A.horToEq(a0, z0, sky.lat);
    ra = Math.round(A.norm360(sky.lst - e.ha) / 2.5) * 2.5; // 10분 단위
    dec = Math.round(e.dec);
    const h = A.eqToHor(A.norm360(sky.lst - ra), dec, sky.lat);
    alt = h.alt; az = h.az;
    if (alt > 18 && alt < 78) break;
  }
  round = { kind: 'find', ra, dec, done: false, az, alt };
  $('#targetBox').classList.remove('hidden');
  $('#tbTitle').textContent = '이 좌표를 하늘에서 클릭하세요 (그날 분점 기준)';
  $('#tbMain').textContent = `α = ${A.fmtRA(ra, false)}   δ = ${A.fmtDMS(dec, true, false)}`;
  const lookAz = level === 'easy' ? az : A.norm360(az + (Math.random() - 0.5) * 120);
  sky.lookAt(lookAz, 38, 100);
  renderFindPanel();
}
sky.on('click', ({ coords }) => {
  if (!coords) return;
  if (mode === 'find' && round && round.kind === 'find' && !round.done) {
    round.done = true;
    const err = A.angularDistance(coords.ra, coords.dec, round.ra, round.dec);
    const dRA = A.norm180(coords.ra - round.ra) / 15, dDec = coords.dec - round.dec;
    const score = scoreFor(err);
    hist.find.push({ err, score });
    sky.setMarkers([
      { ra: round.ra, dec: round.dec, color: '#ffcc4d', text: '정답' },
      { ra: coords.ra, dec: coords.dec, color: '#ff4081', text: '선택' },
    ], { ra1: round.ra, dec1: round.dec, ra2: coords.ra, dec2: coords.dec });
    sky.setShow({ eqGrid: true, equator: true, meridian: true });
    const nb = nearestBright(round.ra, round.dec);
    const H = A.norm360(sky.lst - round.ra);
    const cls = err < 3 ? 'good' : err < 8 ? 'mid' : 'bad';
    renderFindPanel(`<div class="feedback ${cls}"><b>오차 ${err.toFixed(2)}°</b> → ${score}점<br>
      선택한 곳: α = ${A.fmtRA(coords.ra, false)}, δ = ${A.fmtDMS(coords.dec, true, false)}<br>
      적경 차 ${dRA >= 0 ? '+' : '−'}${A.fmtHours(Math.abs(dRA)).replace('−', '')} (${dRA >= 0 ? '너무 동쪽' : '너무 서쪽'}) · 적위 차 ${dDec >= 0 ? '+' : ''}${dDec.toFixed(1)}° (${dDec >= 0 ? '너무 북쪽' : '너무 남쪽'})<br>
      <span class="note">정답의 시간각 H = LST − α = ${A.fmtRA(H, false)} (${H < 180 ? `자오선 서쪽 ${(H).toFixed(0)}°` : `자오선 동쪽 ${(360 - H).toFixed(0)}°`}), 고도 ${round.alt.toFixed(0)}°, 방위각 ${round.az.toFixed(0)}°<br>
      근처의 밝은 별: ${nb ? `${nb.s.ko} (${nb.d.toFixed(1)}° 거리)` : '-'}</span></div>`);
    $('#tbTitle').textContent = '정답과 선택한 위치 (분홍 호: 오차)';
  }
});

// ------------------------------------------------------------------ 2. 좌표 읽기
function renderReadPanel(feedback = '') {
  $('#panelBody').innerHTML = `
    <h3>별의 좌표 읽기</h3>
    <p class="note" style="font-size:14px!important">흰 고리로 표시된 별의 <b>적경과 적위</b>를 어림해 입력하세요. 항성시(아래 시계)와 방위·고도를 단서로 쓰세요.</p>
    ${levelPicker()}
    <div class="read-inputs">
      <div><div class="note">적경 α (예: 5 55 또는 5h55m 또는 5.9)</div><input id="inRA" placeholder="h m"></div>
      <div><div class="note">적위 δ (예: +7 24 또는 7.4)</div><input id="inDec" placeholder="± ° ′"></div>
    </div>
    <div class="row"><button class="btn primary" id="btnCheck">확인</button><button class="btn" id="btnNext">${round && !round.done ? '건너뛰기' : '새 문제'}</button></div>
    <div id="fb">${feedback}</div>
    ${histHtml(hist.read)}`;
  bindLevel(() => { applyLevel(); renderReadPanel(); newReadRound(); });
  $('#btnNext').addEventListener('click', newReadRound);
  $('#btnCheck').addEventListener('click', checkRead);
  ['#inRA', '#inDec'].forEach((s) => $(s).addEventListener('keydown', (e) => { if (e.key === 'Enter') checkRead(); }));
}
function newReadRound() {
  sky.setMarkers([]);
  applyLevel();
  sky.setArcs({ hor: false, eq: false, ha: false, circles: false, ecl: false, gal: false });
  sky.setJD(randomNight());
  sky.update();
  const cands = STARS.filter((s) => s.mag < 2.6).map((s) => {
    const e = A.precess(s.ra, s.dec, sky.epoch);
    return { s, e, h: A.eqToHor(A.norm360(sky.lst - e.ra), e.dec, sky.lat) };
  }).filter((c) => c.h.alt > 20 && c.h.alt < 80);
  const c = cands[Math.floor(Math.random() * cands.length)];
  round = { kind: 'read', id: c.s.id, ra: c.e.ra, dec: c.e.dec, done: false };
  sky.select({ kind: 'star', id: c.s.id });
  sky.lookAt(A.norm360(c.h.az + (Math.random() - 0.5) * 30), Math.min(60, c.h.alt + 5), 95);
  $('#targetBox').classList.remove('hidden');
  $('#tbTitle').textContent = '흰 고리 안의 별';
  $('#tbMain').textContent = '적경·적위는?';
  renderReadPanel();
  setTimeout(() => $('#inRA') && $('#inRA').focus(), 50);
}
function checkRead() {
  if (!round || round.kind !== 'read' || round.done) return;
  const ra = A.parseRA($('#inRA').value), dec = A.parseDec($('#inDec').value);
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) { $('#fb').innerHTML = '<div class="feedback bad">적경과 적위를 모두 숫자로 입력하세요.</div>'; return; }
  round.done = true;
  const err = A.angularDistance(ra, dec, round.ra, round.dec);
  const score = scoreFor(err);
  hist.read.push({ err, score });
  const s = STARS[round.id], H = A.norm360(sky.lst - round.ra);
  sky.setMarkers([{ ra, dec, color: '#ff4081', text: '내 답' }], { ra1: round.ra, dec1: round.dec, ra2: ra, dec2: dec });
  sky.setShow({ eqGrid: true, equator: true, meridian: true, starNames: true });
  sky.hideSelName = false;
  sky.setArcs({ eq: true, ha: true });
  const cls = err < 3 ? 'good' : err < 8 ? 'mid' : 'bad';
  $('#tbTitle').textContent = `${s.ko} (${s.bayer})`;
  $('#tbMain').textContent = `α = ${A.fmtRA(round.ra, false)}   δ = ${A.fmtDMS(round.dec, true, false)}`;
  renderReadPanel(`<div class="feedback ${cls}"><b>${s.ko}</b> (${s.bayer}, ${s.mag}등급)<br>
    정답: α = <b>${A.fmtRA(round.ra, false)}</b>, δ = <b>${A.fmtDMS(round.dec, true, false)}</b> <span class="note">(J2000: ${A.fmtRA(s.ra, false)}, ${A.fmtDMS(s.dec, true, false)})</span><br>
    내 답: α = ${A.fmtRA(ra, false)}, δ = ${A.fmtDMS(dec, true, false)} → 각거리 오차 <b>${err.toFixed(2)}°</b> (${score}점)<br>
    <span class="note">풀이: LST = ${A.fmtRA(sky.lst, false)}, 이 별의 시간각 H = ${A.fmtRA(H, false)} → α = LST − H. 주황 호가 시간각, 빨간 호가 적경·적위이다.</span></div>`);
}

// ------------------------------------------------------------------ 3. 계산 문제
let calcLevel = 'basic', calcTopic = 'all', curProb = null, calcStats = { n: 0, ok: 0 };
function renderCalcPanel() {
  const gens = GENERATORS.filter((g) => calcLevel === 'all' || g.level === calcLevel);
  $('#panelBody').innerHTML = `
    <h3>계산 문제</h3>
    <p class="note" style="font-size:14px!important">값이 매번 바뀌는 문제입니다. 답을 입력하면 채점하고 단계별 풀이를 보여 줍니다.</p>
    <div class="field"><div class="lab-title">수준</div>
      <div class="seg" id="calcLv"><button data-l="basic" class="${calcLevel === 'basic' ? 'on' : ''}">기본 (하이탑)</button><button data-l="adv" class="${calcLevel === 'adv' ? 'on' : ''}">심화 (올림피아드)</button><button data-l="all" class="${calcLevel === 'all' ? 'on' : ''}">전체</button></div></div>
    <div class="field"><div class="lab-title">주제</div>
      <select id="calcTopic" style="width:100%"><option value="all">무작위</option>${gens.map((g) => `<option value="${g.id}" ${g.id === calcTopic ? 'selected' : ''}>${g.topic}</option>`).join('')}</select></div>
    <div class="score"><div>푼 문제 <b>${calcStats.n}</b></div><div>정답 <b>${calcStats.ok}</b></div><div>정답률 <b>${calcStats.n ? Math.round((100 * calcStats.ok) / calcStats.n) : 0}%</b></div></div>
    <div class="box readout"><b>답 입력 형식</b><br>각도: 35.5 또는 35 30 (35°30′)<br>시간: 2.5 또는 2h 30m 또는 2:30<br>시각: 20:30</div>`;
  $$('#calcLv button').forEach((b) => b.addEventListener('click', () => { calcLevel = b.dataset.l; calcTopic = 'all'; renderCalcPanel(); newProblem(); }));
  $('#calcTopic').addEventListener('change', (e) => { calcTopic = e.target.value; newProblem(); });
}
function newProblem() {
  let gens = GENERATORS.filter((g) => calcLevel === 'all' || g.level === calcLevel);
  if (calcTopic !== 'all') gens = gens.filter((g) => g.id === calcTopic);
  const g = gens[Math.floor(Math.random() * gens.length)];
  curProb = { ...g.gen(), level: g.level, topic: g.topic, answered: false };
  $('#probWrap').innerHTML = `
    <h2 style="margin-top:0">계산 문제 <span class="level ${curProb.level === 'adv' ? 'adv' : 'basic'}">${curProb.level === 'adv' ? '심화' : '기본'}</span> <span class="note" style="font-size:15px!important">${curProb.topic}</span></h2>
    <div class="problem">
      <div class="qtext">${curProb.q}</div>
      <div class="answer-row"><input id="ans" placeholder="답" autocomplete="off"><span class="note">${curProb.unit}</span>
        <button class="btn primary" id="btnAns">확인</button><button class="btn" id="btnSol">풀이 보기</button><button class="btn" id="btnNew">다음 문제 ▶</button></div>
      <div id="ansFb"></div>
      <div class="solution hidden" id="sol"><b>풀이</b><br>${curProb.sol}<br><br><b>정답</b>: ${fmtAns(curProb)}</div>
    </div>
    <p class="note">관련 시뮬레이션: <a href="celestial.html?step=13">천문 삼각형</a> · <a href="celestial.html?step=8">위도와 일주 운동</a> · <a href="planets.html">행성의 운동</a> · <a href="kepler.html">케플러 법칙</a></p>`;
  const submit = () => {
    if (curProb.answered) return;
    const v = parseAnswer($('#ans').value, curProb.kind);
    if (!Number.isFinite(v)) { $('#ansFb').innerHTML = '<div class="feedback bad">숫자를 입력하세요.</div>'; return; }
    curProb.answered = true;
    const ok = checkAnswer(curProb, v);
    calcStats.n++; if (ok) calcStats.ok++;
    $('#ansFb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'}">${ok ? '정답입니다.' : `아쉽습니다. 정답은 <b>${fmtAns(curProb)}</b>`}</div>`;
    $('#sol').classList.remove('hidden');
    renderCalcPanel();
  };
  $('#btnAns').addEventListener('click', submit);
  $('#ans').addEventListener('keydown', (e) => { if (e.key === 'Enter') { curProb.answered ? newProblem() : submit(); } });
  $('#btnSol').addEventListener('click', () => $('#sol').classList.remove('hidden'));
  $('#btnNew').addEventListener('click', newProblem);
  setTimeout(() => $('#ans') && $('#ans').focus(), 30);
}

// ------------------------------------------------------------------ 4. 개념 퀴즈
let quizLevel = 'basic', quizOrder = [], quizIdx = 0, quizStats = { n: 0, ok: 0 };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderQuizPanel() {
  $('#panelBody').innerHTML = `
    <h3>개념 퀴즈</h3>
    <p class="note" style="font-size:14px!important">헷갈리기 쉬운 개념을 객관식으로 확인합니다. 답을 고르면 해설이 나옵니다.</p>
    <div class="field"><div class="lab-title">수준</div>
      <div class="seg" id="quizLv"><button data-l="basic" class="${quizLevel === 'basic' ? 'on' : ''}">기본</button><button data-l="adv" class="${quizLevel === 'adv' ? 'on' : ''}">심화</button><button data-l="all" class="${quizLevel === 'all' ? 'on' : ''}">전체</button></div></div>
    <div class="score"><div>푼 문제 <b>${quizStats.n}</b></div><div>정답 <b>${quizStats.ok}</b></div><div>진행 <b>${Math.min(quizIdx + 1, quizOrder.length)} / ${quizOrder.length}</b></div></div>`;
  $$('#quizLv button').forEach((b) => b.addEventListener('click', () => { quizLevel = b.dataset.l; startQuiz(); }));
}
function startQuiz() {
  quizOrder = shuffle(QUIZ.map((q, i) => i).filter((i) => quizLevel === 'all' || QUIZ[i].lv === quizLevel));
  quizIdx = 0;
  renderQuizPanel();
  showQuiz();
}
function showQuiz() {
  if (quizIdx >= quizOrder.length) {
    $('#probWrap').innerHTML = `<h2>퀴즈 완료!</h2><div class="problem"><p class="qtext">${quizStats.n}문제 중 ${quizStats.ok}문제 정답 (${Math.round((100 * quizStats.ok) / Math.max(1, quizStats.n))}%)</p><button class="btn primary" id="btnRe">다시 풀기</button></div>`;
    $('#btnRe').addEventListener('click', startQuiz);
    return;
  }
  const q = QUIZ[quizOrder[quizIdx]];
  const order = shuffle(q.o.map((_, i) => i));
  $('#probWrap').innerHTML = `
    <h2 style="margin-top:0">개념 퀴즈 <span class="level ${q.lv === 'adv' ? 'adv' : 'basic'}">${q.lv === 'adv' ? '심화' : '기본'}</span> <span class="note" style="font-size:15px!important">${quizIdx + 1} / ${quizOrder.length}</span></h2>
    <div class="problem"><div class="qtext">${q.q}</div>
      <div class="choices">${order.map((i, k) => `<button data-i="${i}">${'①②③④'[k]} ${q.o[i]}</button>`).join('')}</div>
      <div id="qfb"></div></div>`;
  $$('.choices button').forEach((b) => b.addEventListener('click', () => {
    if ($('.choices').dataset.done) return;
    $('.choices').dataset.done = '1';
    const ok = +b.dataset.i === q.a;
    quizStats.n++; if (ok) quizStats.ok++;
    $$('.choices button').forEach((x) => { if (+x.dataset.i === q.a) x.classList.add('correct'); });
    if (!ok) b.classList.add('wrong');
    $('#qfb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'}">${ok ? '정답! ' : '오답. '}${q.e}</div><button class="btn primary" id="btnQn">다음 ▶</button>`;
    $('#btnQn').addEventListener('click', () => { quizIdx++; renderQuizPanel(); showQuiz(); });
    renderQuizPanel();
  }));
}

// ------------------------------------------------------------------ 모드 전환
function setMode(m) {
  mode = m;
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  const skyMode = m === 'find' || m === 'read';
  $('#probArea').classList.toggle('hidden', skyMode);
  $('#targetBox').classList.toggle('hidden', !skyMode);
  $('#sky').style.visibility = skyMode ? 'visible' : 'hidden';
  sky.paused = !skyMode;
  sky.setMarkers([]);
  if (m === 'find') { sky.select(null); newFindRound(); }
  if (m === 'read') newReadRound();
  if (m === 'calc') { renderCalcPanel(); newProblem(); }
  if (m === 'quiz') startQuiz();
  history.replaceState(null, '', `?mode=${m}`);
}
$$('.tabs button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
const p = new URLSearchParams(location.search).get('mode');
setMode(['find', 'read', 'calc', 'quiz'].includes(p) ? p : 'find');
