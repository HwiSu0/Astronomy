// =====================================================================
//  labels.js — 2D 캔버스 라벨 도우미 (행성·달·케플러 실험실 공용)
//
//  한 캔버스를 그리는 동안 라벨과 주요 도형이 차지한 사각형을 모아 두고,
//  place()는 후보 위치 가운데 겹침이 없는(없으면 가장 적은) 자리에 라벨을 놓는다.
//  사용법: 매 프레임 캔버스를 그리기 전에 begin()을 부르고,
//          고정된 그림·라벨을 먼저 그린 다음, 위치를 옮겨도 되는 라벨을 place()로 놓는다.
// =====================================================================
export const INK = '#1f2129';
export const FONT = (size, weight) => `${Math.min(weight, 700)} ${size}px 'IBM Plex Sans KR', sans-serif`;
const HALO = 'rgba(251,250,248,0.94)'; // 종이색 테두리: 선 위에 놓여도 글자가 읽히게 한다

let boxes = [];
let bounds = { x: 0, y: 0, w: 1e9, h: 1e9 };

/** 새 캔버스(또는 새 프레임)를 시작한다. (x, y, w, h)는 라벨이 들어가야 하는 영역 */
export function begin(x, y, w, h) { boxes = []; bounds = { x, y, w, h }; }
export function block(x, y, w, h) { boxes.push({ x, y, w, h }); }
export function blockCircle(x, y, r) { block(x - r, y - r, 2 * r, 2 * r); }
/** 선(점 [x, y] 목록)을 따라 작은 사각형을 막아 라벨이 선 위에 얹히지 않게 한다 */
export function blockPath(pts, r = 3) { for (const p of pts) block(p[0] - r, p[1] - r, 2 * r, 2 * r); }
/** 캔버스 위에 떠 있는 HTML 요소(버튼 묶음 등)가 차지한 자리를 막는다. 요소의 아래쪽 y를 돌려준다 */
export function blockElement(cv, el) {
  if (!el) return 0;
  const c = cv.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (!r.width) return 0;
  block(r.left - c.left - 4, r.top - c.top - 4, r.width + 8, r.height + 8);
  return r.bottom - c.top;
}

export function textBox(ctx, text, x, y, align, size, weight) {
  ctx.font = FONT(size, weight);
  const tw = ctx.measureText(text).width;
  const x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  return { x: x0 - 3, y: y - size * 0.72, w: tw + 6, h: size * 1.44 };
}
export function overlapArea(a, b) {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return dx > 0 && dy > 0 ? dx * dy : 0;
}
/** 사각형이 비어 있는 자리인가 */
export const isFree = (rect) => !boxes.some((b) => overlapArea(b, rect) > 0);
function outsideArea(a) {
  const b = bounds;
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return a.w * a.h - ix * iy;
}

/** 라벨을 그리고 그 자리를 기록한다 */
export function label(ctx, text, x, y, color = INK, align = 'left', size = 13, weight = 600, halo = true) {
  ctx.font = FONT(size, weight);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (halo) { ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = HALO; ctx.strokeText(text, x, y); }
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  boxes.push(textBox(ctx, text, x, y, align, size, weight));
}

/** cands: [[x, y, align], …] 가운데 겹침이 가장 적은 자리에 라벨을 놓는다 (앞쪽 후보 우선) */
export function place(ctx, text, cands, color = INK, size = 13, weight = 600) {
  let best = cands[0], bestScore = Infinity;
  for (const c of cands) {
    const b = textBox(ctx, text, c[0], c[1], c[2] || 'center', size, weight);
    const score = boxes.reduce((s, o) => s + overlapArea(b, o), 0) + outsideArea(b) * 4;
    if (score < bestScore - 0.5) { bestScore = score; best = c; if (score === 0) break; }
  }
  label(ctx, text, best[0], best[1], color, best[2] || 'center', size, weight);
  return best;
}

/** 점 (x, y) 둘레의 후보 자리: 오른쪽 → 왼쪽 → 위 → 아래 → 대각선 */
export const around = (x, y, d) => [
  [x + d, y, 'left'], [x - d, y, 'right'], [x, y - d, 'center'], [x, y + d, 'center'],
  [x + d * 0.75, y - d * 0.75, 'left'], [x - d * 0.75, y - d * 0.75, 'right'], [x + d * 0.75, y + d * 0.75, 'left'], [x - d * 0.75, y + d * 0.75, 'right'],
];
