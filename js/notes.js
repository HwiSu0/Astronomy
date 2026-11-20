// =====================================================================
//  notes.js — 개념 노트: 목차, 수식 렌더링, 별 목록
// =====================================================================
import * as A from './astro.js';
import { STARS, CONSTELLATIONS } from './stars.js';

const $ = (s, el = document) => el.querySelector(s);

// 목차
const toc = $('#toc');
const heads = [...document.querySelectorAll('#doc h2, #doc h3')];
toc.innerHTML = '<div class="toc-h">목차</div>' + heads.map((h) => `<a href="#${h.id}" class="${h.tagName === 'H3' ? 'sub' : ''}">${h.textContent.replace('심화', '').trim()}</a>`).join('');
const links = [...toc.querySelectorAll('a')];
const io = new IntersectionObserver((ents) => {
  ents.forEach((en) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-70px 0px -75% 0px' });
heads.forEach((h) => io.observe(h));

// 수식 (KaTeX 자동 렌더링)
function renderMath() {
  if (!window.renderMathInElement) return setTimeout(renderMath, 100);
  window.renderMathInElement($('#doc'), {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
    throwOnError: false,
  });
}
renderMath();

// 별 목록
let sortKey = 'mag', sortDir = 1;
function renderCatalog() {
  const q = ($('#catQ').value || '').trim().toLowerCase();
  const rows = STARS.filter((s) => !q || s.ko.toLowerCase().includes(q) || s.en.toLowerCase().includes(q) || s.bayer.toLowerCase().includes(q) || (CONSTELLATIONS[s.con] || '').includes(q))
    .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
  const th = (k, t) => `<th data-k="${k}">${t}${sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  $('#catalog').innerHTML = `<tr>${th('ko', '이름')}${th('bayer', '부호')}${th('con', '별자리')}${th('ra', '적경 α')}${th('dec', '적위 δ')}${th('mag', '등급')}${th('sp', '분광형')}</tr>` +
    rows.map((s) => `<tr><td><a href="celestial.html?step=5&star=${encodeURIComponent(s.en)}">${s.ko}</a></td><td>${s.bayer}</td><td>${CONSTELLATIONS[s.con] || s.con}</td><td>${A.fmtRA(s.ra, false)}</td><td>${A.fmtDMS(s.dec, true, false)}</td><td>${s.mag.toFixed(2)}</td><td>${s.sp}</td></tr>`).join('');
  $('#catN').textContent = `${rows.length}개`;
}
$('#catQ').addEventListener('input', renderCatalog);
$('#catalog').addEventListener('click', (e) => {
  const th = e.target.closest('th[data-k]');
  if (!th) return;
  if (sortKey === th.dataset.k) sortDir *= -1; else { sortKey = th.dataset.k; sortDir = 1; }
  renderCatalog();
});
renderCatalog();
