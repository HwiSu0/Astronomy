// =====================================================================
//  skyscene.js — 천구 3D 엔진 (Three.js)
//
//  장면 구조 (부모 → 자식):
//    world     : 지평 좌표계에 고정 (x=동, y=천정, z=남)  — 지평선, 자오선, 격자
//    haGroup   : 시간각 좌표계 (천구 북극이 z축, 위도 φ에 따라 기울어짐)
//    eqGroup   : 그날 분점 기준 적도 좌표계 (항성시 θ만큼 회전) — 적경·적위 격자, 황도, 태양
//    jGroup    : J2000 적도 좌표계 (세차 운동 반영)  — 별, 별자리, 은하 좌표계, 행성
// =====================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import * as A from './astro.js';
import { STARS, STAR_BY_NAME, CON_LINES, SP_COLOR, constellationCenters } from './stars.js';

export const R = 10;
const LY = { SURF: 1, INT: 2, OCC: 3, GROUND: 4 };
const XV = new THREE.Vector3(1, 0, 0), YV = new THREE.Vector3(0, 1, 0), ZV = new THREE.Vector3(0, 0, 1);

// 색은 두 벌을 둔다.
//  COL       : 관측자 시점(밤하늘, 어두운 바탕)용 밝은 색
//  PAPER_COL : 천구 모형(밝은 종이 바탕)용 진한 색 — css/style.css의 좌표계 변수와 같은 계열
// 선·점을 만들 때 색 대신 키 이름('hor', 'eq' …)을 넘기면 시점이 바뀔 때 색이 자동으로 바뀐다.
export const COL = {
  hor: 0x5be39a, horGrid: 0x2f9a63, meridian: 0xf0f0f0, prime: 0xb7c0d6,
  eq: 0xff6b6b, eqGrid: 0xc0504f, axis: 0xff8f8f,
  ecl: 0xffcc4d, eclGrid: 0xb08d2e,
  gal: 0xd08cff, galGrid: 0x8e62b8,
  ha: 0xffa23f, tri: 0x40c4ff, sun: 0xffc94a, con: 0x6f8fc4,
  altArc: 0x8dffb4, azArc: 0x2fd47a, decArc: 0xff9e94, raArc: 0xff4d6d, haArc: 0xffa23f,
  lonArc: 0xffe066, latArc: 0xfff2a8, glArc: 0xd08cff, gbArc: 0xf0c8ff,
  zen: 0xffffff, zAxis: 0xdddddd, obs: 0xffeeb0, prec: 0x7fdbff, err: 0xff4081,
  sumS: 0xff8a65, eqx: 0xffd166, winS: 0x6fb6ff, moonTrail: 0xe8e4d4, shell: 0x6ea8ff, horDisk: 0x1e7a50,
};
export const PAPER_COL = {
  hor: 0x1d8a50, horGrid: 0x52a578, meridian: 0x2f323b, prime: 0x6b6e7a,
  eq: 0xcf3434, eqGrid: 0xd9706f, axis: 0xcf3434,
  ecl: 0xb07a00, eclGrid: 0xc9a245,
  gal: 0x7a45c4, galGrid: 0xa585d8,
  ha: 0xd4650c, tri: 0x0b7fb0, sun: 0xc98a00, con: 0x7d8bab,
  altArc: 0x15804a, azArc: 0x0b5e33, decArc: 0xe0605a, raArc: 0xb01f2d, haArc: 0xd4650c,
  lonArc: 0xb07a00, latArc: 0x8a5a00, glArc: 0x7a45c4, gbArc: 0x5a2e9a,
  zen: 0x23252d, zAxis: 0x6b6e7a, obs: 0x3a3d47, prec: 0x0b7fb0, err: 0xd81b60,
  sumS: 0xd4532b, eqx: 0xb07a00, winS: 0x2a62c9, moonTrail: 0x6b6e7a, shell: 0x7fa3e0, horDisk: 0x1d8a50,
};
// 바탕색: 천구 모형은 밝은 종이색, 관측자 시점은 남색 밤하늘
const PAPER_BG = 0xf1f0ec;
const NIGHT_BG = 0x081226;
const STAR_INK = [0.11, 0.15, 0.27];

export const DEFAULT_SHOW = {
  shell: true, horizon: true, cardinals: true, zenith: true, meridian: true, primeVertical: false, horGrid: false,
  equator: true, poles: true, eqGrid: false, rotationArrows: false,
  ecliptic: false, eclPoints: false, eclGrid: false,
  galactic: false, galGrid: false, milkyway: false,
  stars: true, starNames: true, allStarNames: false, constellations: true, conNames: false,
  sun: true, sunPath: false, seasonPaths: false, planets: true, moon: true,
  observer: true, ground: true, atmosphere: false,
  trails: false, planetTrails: false, precessionCircle: false, triangle: false,
};

// ---------- 좌표 → 3D 벡터 ----------
export function eqLocal(ra, dec, r = R) {
  const c = A.cosd(dec);
  return new THREE.Vector3(r * c * A.cosd(ra), r * c * A.sind(ra), r * A.sind(dec));
}
export function eclLocal(lon, lat, r = R) {
  const e = A.OBLIQUITY, c = A.cosd(lat);
  const x = c * A.cosd(lon), y = c * A.sind(lon), z = A.sind(lat);
  return new THREE.Vector3(r * x, r * (y * A.cosd(e) - z * A.sind(e)), r * (y * A.sind(e) + z * A.cosd(e)));
}
export function galLocal(l, b, r = R) {
  const v = A.galVecToEqVec(A.radecToVec(l, b));
  return new THREE.Vector3(v[0] * r, v[1] * r, v[2] * r);
}
export function horWorld(az, alt, r = R) {
  const c = A.cosd(alt);
  return new THREE.Vector3(r * c * A.sind(az), r * A.sind(alt), -r * c * A.cosd(az));
}
export function worldToHor(v) {
  const n = v.clone().normalize();
  return { alt: A.asind(n.y), az: A.norm360(A.atan2d(n.x, -n.z)) };
}
function curve(fn, t0, t1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(fn(t0 + ((t1 - t0) * i) / n));
  return pts;
}
function slerpArc(a, b, n, r = R) {
  const ua = a.clone().normalize(), ub = b.clone().normalize();
  const ang = ua.angleTo(ub), pts = [];
  const s = Math.sin(ang);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (ang < 1e-6) { pts.push(ua.clone().multiplyScalar(r)); continue; }
    pts.push(ua.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).addScaledVector(ub, Math.sin(t * ang) / s).multiplyScalar(r));
  }
  return pts;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// aColor: 밤하늘용 색, aColor2: 종이 바탕용 색. uPaper = 1이면 종이 모드
const POINT_VS = `
  attribute float aSize; attribute vec3 aColor; attribute vec3 aColor2; varying vec3 vColor;
  uniform float uScale; uniform float uPR; uniform float uPaper;
  void main(){ vColor = mix(aColor, aColor2, uPaper); vec4 mv = modelViewMatrix * vec4(position,1.0);
    gl_PointSize = aSize * uScale * uPR * mix(1.0, 0.62, uPaper); gl_Position = projectionMatrix * mv; }`;
const STAR_FS = `
  uniform float uOpacity; uniform float uPaper; varying vec3 vColor;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.42, d); float glow = exp(-d * d * 6.0);
    vec4 sky = vec4(vColor * (0.6 + 0.6 * core), (0.95 * core + 0.45 * glow) * uOpacity);
    vec4 paper = vec4(vColor, (1.0 - smoothstep(0.7, 0.95, d)) * uOpacity);
    gl_FragColor = mix(sky, paper, uPaper); }`;
const SOFT_FS = `
  uniform float uOpacity; uniform float uPaper; varying vec3 vColor;
  void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; if (d > 1.0) discard;
    gl_FragColor = vec4(vColor, exp(-d * d * 4.0) * uOpacity); }`;

export class SkyScene {
  constructor(container, opts = {}) {
    this.el = container;
    this.lat = opts.lat ?? 37.5665;
    this.lon = opts.lon ?? 126.978;
    this.tz = opts.tz ?? 9;
    this.jd = opts.jd ?? A.jdFromDate(new Date());
    this.show = { ...DEFAULT_SHOW, ...(opts.show || {}) };
    this.arcs = { hor: false, eq: false, ha: false, ecl: false, gal: false, circles: true, ...(opts.arcs || {}) };
    this.view = 'outside';
    this.epochMode = 'date'; this.epochYear = 2000; this.epoch = 2000;
    this.playing = false; this.rate = 600; this.stepMode = 'continuous'; this._acc = 0;
    this.selected = null;
    this.pickable = opts.pickable ?? true;
    this.handlers = {};
    this.obsAz = 180; this.obsAlt = 30; this.obsFov = 80;
    this._outsidePos = new THREE.Vector3();
    this.lineMats = []; this.surfMats = []; this.labels = []; this.regList = [];
    this.themed = []; this.pointMats = []; this.paper = null;
    this.markers = [];
    this.starAlpha = 1;
    this._dirty = true;

    this._initRenderer();
    this._buildScene();
    this._initEvents();
    this.setCameraPreset('default');
    this.setView(opts.view || 'outside');
    this._last = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ------------------------------------------------------------------ 이벤트
  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); return this; }
  emit(evt, data) { (this.handlers[evt] || []).forEach((f) => f(data)); }

  // ------------------------------------------------------------------ 초기화
  _initRenderer() {
    const w = this.el.clientWidth || 800, h = this.el.clientHeight || 600;
    this.w = w; this.h = h;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(PAPER_BG, 1);
    this.el.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    Object.assign(this.labelRenderer.domElement.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
    this.el.appendChild(this.labelRenderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 2000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 13, maxDistance: 90, enablePan: false, rotateSpeed: 0.65 });

    this.hud = document.createElement('div');
    this.hud.className = 'sky-hud';
    this.el.appendChild(this.hud);

    new ResizeObserver(() => this._resize()).observe(this.el);
  }

  _resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    if (this.view === 'outside') this.camera.fov = this._outsideFov();
    this.camera.updateProjectionMatrix();
    this.lineMats.forEach((m) => m.resolution.set(w, h));
  }

  // ------------------------------------------------------------------ 도우미
  _keyOn(k) {
    if (k === '$outside') return this.view === 'outside';
    if (k === '$observer') return this.view === 'observer';
    return !!this.show[k];
  }
  _reg(keys, obj) { if (keys) this.regList.push({ keys: [].concat(keys), obj }); return obj; }
  _add(parent, obj, layer, keys) {
    obj.traverse((o) => o.layers.set(layer));
    parent.add(obj);
    return this._reg(keys, obj);
  }
  _surf(mat, base) { const e = { mat, base }; this.surfMats.push(e); return e; }
  /** 색 키('hor' 등)면 시점에 따라 바뀌도록 등록하고, 지금 쓸 색 값을 돌려준다 */
  _color(mat, c) {
    if (typeof c !== 'string') return c;
    this.themed.push({ mat, sky: COL[c], paper: PAPER_COL[c] });
    return COL[c];
  }
  /** 밤하늘 ↔ 종이 바탕 전환: 선·점·라벨의 색과 혼합 방식을 바꾼다 */
  _applyTheme(paper) {
    if (this.paper === paper) return;
    this.paper = paper;
    for (const t of this.themed) t.mat.color.setHex(paper ? t.paper : t.sky);
    for (const m of this.pointMats) {
      m.uniforms.uPaper.value = paper ? 1 : 0;
      m.blending = paper ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.needsUpdate = true;
    }
    this.trailLines.material.blending = paper ? THREE.NormalBlending : THREE.AdditiveBlending;
    this.trailLines.material.needsUpdate = true;
    this.shellMat.uniforms.uColor.value.setHex(paper ? PAPER_COL.shell : COL.shell);
    this.shellMat.uniforms.uOpacity.value = paper ? 0.42 : 0.16;
    this.horDiskMat.opacity = paper ? 0.1 : 0.2;
    this.el.classList.toggle('paper', paper);
    this._dirty = true;
  }
  _dim(f) {
    for (const e of this.surfMats) {
      if (e.mat.uniforms && e.mat.uniforms.uOpacity) e.mat.uniforms.uOpacity.value = e.base * f;
      else e.mat.opacity = e.base * f;
    }
  }
  _thick(pts, color, width, o = {}) {
    const pos = [];
    pts.forEach((p) => pos.push(p.x, p.y, p.z));
    const g = new LineGeometry();
    g.setPositions(pos);
    const m = new LineMaterial({
      color: 0xffffff, linewidth: width, transparent: true, opacity: o.opacity ?? 1, depthWrite: false,
      dashed: !!o.dashed, dashSize: o.dash ?? 0.28, gapSize: o.gap ?? 0.2,
    });
    m.color.setHex(this._color(m, color));
    m.resolution.set(this.w, this.h);
    this.lineMats.push(m);
    const line = new Line2(g, m);
    if (o.dashed) line.computeLineDistances();
    if (o.surface !== false) this._surf(m, o.opacity ?? 1);
    return line;
  }
  _dynLine(parent, color, width, n, keys, o = {}) {
    const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(i * 1e-4, 0, 0));
    const line = this._thick(pts, color, width, o);
    line.frustumCulled = false;
    line.userData.n = n;
    line.renderOrder = 5;
    this._add(parent, line, o.layer ?? LY.SURF, keys);
    return line;
  }
  _setLine(line, pts) {
    const n = line.userData.n, attr = line.geometry.attributes.instanceStart, arr = attr.data.array;
    const m = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.min(m, Math.round((i * m) / n))], b = pts[Math.min(m, Math.round(((i + 1) * m) / n))];
      arr[i * 6] = a.x; arr[i * 6 + 1] = a.y; arr[i * 6 + 2] = a.z;
      arr[i * 6 + 3] = b.x; arr[i * 6 + 4] = b.y; arr[i * 6 + 5] = b.z;
    }
    attr.data.needsUpdate = true;
  }
  _segments(polylines, color, opacity, surface = true) {
    const arr = [];
    for (const pl of polylines) for (let i = 0; i < pl.length - 1; i++) arr.push(pl[i].x, pl[i].y, pl[i].z, pl[i + 1].x, pl[i + 1].y, pl[i + 1].z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ transparent: true, opacity, depthWrite: false });
    m.color.setHex(this._color(m, color));
    if (surface) this._surf(m, opacity);
    return new THREE.LineSegments(g, m);
  }
  _marker(parent, pos, color, keys, size = 0.13, layer = LY.SURF) {
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: false });
    m.color.setHex(this._color(m, color));
    this._surf(m, 1);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), m);
    mesh.position.copy(pos);
    return this._add(parent, mesh, layer, keys);
  }
  _label(text, cls, keys, parent, pos, html = false) {
    const div = document.createElement('div');
    div.className = 'lbl ' + cls;
    const span = document.createElement('span');
    if (html) span.innerHTML = text; else span.textContent = text;
    div.appendChild(span);
    const obj = new CSS2DObject(div);
    obj.position.copy(pos);
    parent.add(obj);
    const rec = { obj, div, span, keys: [].concat(keys || []), dyn: true, op: 1 };
    this.labels.push(rec);
    return rec;
  }
  _pointsMaterial(base, soft = false, additive = true) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: base }, uScale: { value: 1 }, uPR: { value: this.renderer.getPixelRatio() }, uPaper: { value: 0 } },
      vertexShader: POINT_VS, fragmentShader: soft ? SOFT_FS : STAR_FS,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pointMats.push(m);
    return m;
  }

  // ------------------------------------------------------------------ 장면 구성
  _buildScene() {
    this.scene = new THREE.Scene();
    this.world = new THREE.Group();
    this.haGroup = new THREE.Group();
    this.eqGroup = new THREE.Group();
    this.jGroup = new THREE.Group();
    this.overlay = new THREE.Group();
    this.scene.add(this.world);
    this.world.add(this.haGroup, this.overlay);
    this.haGroup.add(this.eqGroup);
    this.eqGroup.add(this.jGroup);

    this._buildHorizon();
    this._buildEquatorial();
    this._buildEcliptic();
    this._buildGalactic();
    this._buildStars();
    this._buildSolarSystem();
    this._buildOverlays();
    this._buildTrails();
    this._applyShow();
  }

  _buildHorizon() {
    const w = this.world;
    // 구면 (프레넬 효과 유리구)
    const shellMat = (this.shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(COL.shell) }, uOpacity: { value: 0.16 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(uColor, uOpacity * (0.18 + 0.95 * f)); }`,
      transparent: true, depthWrite: false, side: THREE.FrontSide,
    }));
    this._add(w, new THREE.Mesh(new THREE.SphereGeometry(R * 0.999, 96, 64), shellMat), LY.INT, ['shell', '$outside']);

    // 깊이 가림막 (뒤쪽 선을 흐리게 하기 위한 보이지 않는 구)
    const occ = new THREE.Mesh(new THREE.SphereGeometry(R * 0.994, 96, 64), new THREE.MeshBasicMaterial({ colorWrite: false }));
    this._add(w, occ, LY.OCC, ['$outside']);

    // 지평면
    this.horDiskMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    this.horDiskMat.color.setHex(this._color(this.horDiskMat, 'horDisk'));
    const disk = new THREE.Mesh(new THREE.CircleGeometry(R, 160).rotateX(-Math.PI / 2), this.horDiskMat);
    this._add(w, disk, LY.INT, ['horizon', '$outside']);
    this._add(w, this._thick(curve((a) => horWorld(a, 0), 0, 360, 240), 'hor', 2.8), LY.SURF, ['horizon']);
    this._label('지평선', 'lbl-hor', ['horizon'], w, horWorld(205, -3.5));

    // 땅 (관측자 시점)
    this.groundMat = new THREE.MeshBasicMaterial({ color: 0x13251a, side: THREE.BackSide, transparent: true, opacity: 1, depthWrite: true });
    const ground = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 128, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.groundMat);
    this._add(w, ground, LY.GROUND, ['$observer']);

    // 방위
    [[0, '북점 N'], [90, '동점 E'], [180, '남점 S'], [270, '서점 W']].forEach(([az, t]) => {
      this._marker(w, horWorld(az, 0), 'hor', ['cardinals'], 0.14);
      this._label(t, 'lbl-card', ['cardinals'], w, horWorld(az, 0, R * 1.07));
    });

    // 천정·천저
    this._marker(w, new THREE.Vector3(0, R, 0), 'zen', ['zenith'], 0.15);
    this._marker(w, new THREE.Vector3(0, -R, 0), 'zen', ['zenith', '$outside'], 0.15);
    this._label('천정 Z', 'lbl-point', ['zenith'], w, new THREE.Vector3(0, R * 1.07, 0));
    this._label('천저 Z′', 'lbl-point', ['zenith', '$outside'], w, new THREE.Vector3(0, -R * 1.07, 0));
    this._add(w, this._thick([new THREE.Vector3(0, -R, 0), new THREE.Vector3(0, R, 0)], 'zAxis', 1.2, { dashed: true, surface: false, opacity: 0.6 }), LY.INT, ['zenith', '$outside']);

    // 자오선, 묘유선
    this._add(w, this._thick(curve((t) => new THREE.Vector3(0, R * A.sind(t), -R * A.cosd(t)), 0, 360, 240), 'meridian', 1.8, { opacity: 0.9 }), LY.SURF, ['meridian']);
    this._label('자오선', 'lbl-mer', ['meridian'], w, new THREE.Vector3(0, R * A.sind(128), -R * A.cosd(128)));
    this._add(w, this._thick(curve((t) => new THREE.Vector3(R * A.cosd(t), R * A.sind(t), 0), 0, 360, 240), 'prime', 1.5, { dashed: true, opacity: 0.85 }), LY.SURF, ['primeVertical']);
    this._label('묘유선', 'lbl-mer', ['primeVertical'], w, new THREE.Vector3(R * A.cosd(52), R * A.sind(52), 0));

    // 고도·방위각 격자
    const pl = [];
    for (let alt = -80; alt <= 80; alt += 10) if (alt !== 0) pl.push(curve((a) => horWorld(a, alt), 0, 360, 144));
    for (let az = 0; az < 360; az += 15) pl.push(curve((h) => horWorld(az, h), -90, 90, 72));
    this._add(w, this._segments(pl, 'horGrid', 0.42), LY.SURF, ['horGrid']);
    for (let az = 30; az < 360; az += 30) if (az % 90) this._label(`${az}°`, 'lbl-hor', ['horGrid'], w, horWorld(az, 0, R * 1.03));
    for (let alt = 10; alt <= 80; alt += 10) this._label(`${alt}°`, 'lbl-hor', ['horGrid'], w, horWorld(180, alt));

    // 관측자
    const fig = new THREE.Group();
    const fm = new THREE.MeshBasicMaterial();
    fm.color.setHex(this._color(fm, 'obs'));
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.62, 20), fm); body.position.y = 0.31;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), fm); head.position.y = 0.8;
    fig.add(body, head);
    this._add(w, fig, LY.INT, ['observer', '$outside']);
  }

  _buildEquatorial() {
    const ha = this.haGroup, eq = this.eqGroup;
    // 천구의 적도와 극 (시간각 좌표계 안에 둔다)
    this._add(ha, this._thick(curve((a) => eqLocal(a, 0), 0, 360, 240), 'eq', 2.8), LY.SURF, ['equator']);
    this._label('천구의 적도', 'lbl-eq', ['equator'], ha, eqLocal(-28, -3.5));
    this._marker(ha, eqLocal(0, 90), 'eq', ['poles'], 0.16);
    this._marker(ha, eqLocal(0, -90), 'eq', ['poles'], 0.16);
    this._label('천구 북극 P', 'lbl-eq lbl-strong', ['poles'], ha, eqLocal(0, 90, R * 1.08));
    this._label('천구 남극 P′', 'lbl-eq lbl-strong', ['poles'], ha, eqLocal(0, -90, R * 1.08));
    this._add(ha, this._thick([new THREE.Vector3(0, 0, -R * 1.22), new THREE.Vector3(0, 0, R * 1.22)], 'axis', 1.6, { dashed: true, surface: false, opacity: 0.8 }), LY.INT, ['poles', '$outside']);

    // 일주 운동 방향 화살표 (동 → 서)
    const coneG = new THREE.ConeGeometry(0.2, 0.55, 18);
    [60, 20, -20, -60].forEach((a) => {
      const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: false });
      m.color.setHex(this._color(m, 'ha'));
      this._surf(m, 1);
      const cone = new THREE.Mesh(coneG, m);
      cone.position.copy(eqLocal(a, 0));
      cone.quaternion.setFromUnitVectors(YV, new THREE.Vector3(A.sind(a), -A.cosd(a), 0));
      this._add(ha, cone, LY.SURF, ['rotationArrows']);
    });
    this._label('일주 운동 방향 (동 → 서)', 'lbl-ha', ['rotationArrows'], ha, eqLocal(0, 7));

    // 자오선 위 적위 눈금
    for (let d = -80; d <= 80; d += 10) this._label(`${d > 0 ? '+' : ''}${d}°`, 'lbl-eq lbl-small', ['eqGrid'], ha, eqLocal(0, d));

    // 적경·적위 격자 (적도 좌표계에 고정되어 천구와 함께 돈다)
    const pl = [];
    for (let d = -80; d <= 80; d += 10) if (d !== 0) pl.push(curve((a) => eqLocal(a, d), 0, 360, 144));
    for (let h = 0; h < 24; h++) if (h) pl.push(curve((d) => eqLocal(h * 15, d), -80, 80, 64));
    this._add(eq, this._segments(pl, 'eqGrid', 0.45), LY.SURF, ['eqGrid']);
    this._add(eq, this._thick(curve((d) => eqLocal(0, d), -90, 90, 90), 'eq', 1.6, { opacity: 0.9 }), LY.SURF, ['eqGrid']);
    for (let h = 0; h < 24; h++) this._label(`${h}h`, 'lbl-eq lbl-small', ['eqGrid'], eq, eqLocal(h * 15, -3.2));
    this._label('적경 0h 시간권', 'lbl-eq lbl-small', ['eqGrid'], eq, eqLocal(0, 38));
  }

  _buildEcliptic() {
    const eq = this.eqGroup;
    this._add(eq, this._thick(curve((l) => eclLocal(l, 0), 0, 360, 240), 'ecl', 2.8), LY.SURF, ['ecliptic']);
    this._label('황도', 'lbl-ecl lbl-strong', ['ecliptic'], eq, eclLocal(128, 3.5));
    const pts = [[0, '춘분점 ♈ (γ)'], [90, '하지점'], [180, '추분점 ♎'], [270, '동지점']];
    pts.forEach(([l, t]) => {
      this._marker(eq, eclLocal(l, 0), 'ecl', ['eclPoints'], 0.16);
      this._label(t, 'lbl-ecl', ['eclPoints'], eq, eclLocal(l, 0, R * 1.06));
    });
    this._marker(eq, eclLocal(0, 90), 'ecl', ['eclPoints'], 0.13);
    this._marker(eq, eclLocal(0, -90), 'ecl', ['eclPoints'], 0.13);
    this._label('황도 북극', 'lbl-ecl', ['eclPoints'], eq, eclLocal(0, 90, R * 1.06));
    this._label('황도 남극', 'lbl-ecl', ['eclPoints'], eq, eclLocal(0, -90, R * 1.06));

    const pl = [];
    for (let b = -75; b <= 75; b += 15) if (b) pl.push(curve((l) => eclLocal(l, b), 0, 360, 144));
    for (let l = 0; l < 360; l += 30) pl.push(curve((b) => eclLocal(l, b), -80, 80, 64));
    this._add(eq, this._segments(pl, 'eclGrid', 0.45), LY.SURF, ['eclGrid']);
    for (let l = 30; l < 360; l += 30) if (l % 90) this._label(`λ ${l}°`, 'lbl-ecl lbl-small', ['eclGrid'], eq, eclLocal(l, -3.2));
  }

  _buildGalactic() {
    const j = this.jGroup;
    this._add(j, this._thick(curve((l) => galLocal(l, 0), 0, 360, 240), 'gal', 2.8), LY.SURF, ['galactic']);
    this._label('은하 적도 (은하면)', 'lbl-gal lbl-strong', ['galactic'], j, galLocal(62, 3.5));
    [[0, 0, '은하 중심 (l = 0°)'], [180, 0, '은하 반중심'], [0, 90, '은하 북극'], [0, -90, '은하 남극']].forEach(([l, b, t]) => {
      this._marker(j, galLocal(l, b), 'gal', ['galactic'], 0.16);
      this._label(t, 'lbl-gal', ['galactic'], j, galLocal(l, b, R * 1.06));
    });
    const pl = [];
    for (let b = -75; b <= 75; b += 15) if (b) pl.push(curve((l) => galLocal(l, b), 0, 360, 144));
    for (let l = 0; l < 360; l += 30) pl.push(curve((b) => galLocal(l, b), -80, 80, 64));
    this._add(j, this._segments(pl, 'galGrid', 0.45), LY.SURF, ['galGrid']);
    for (let l = 30; l < 360; l += 30) if (l !== 180) this._label(`l ${l}°`, 'lbl-gal lbl-small', ['galGrid'], j, galLocal(l, -3.2));

    // 은하수 (은하 좌표 기반으로 만든 빛의 띠)
    const rnd = mulberry32(20261120);
    const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const N = 18000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const l = rnd() < 0.5 ? rnd() * 360 : A.norm360(gauss() * 45);
      const lc = A.norm180(l);
      const width = 3.5 + 8 * Math.exp(-((lc / 28) ** 2));
      let b = gauss() * width * 0.55;
      // 백조자리~궁수자리 '암흑대' 흉내: 은하면 바로 위 일부를 비운다
      if (lc > 10 && lc < 75 && b > -1.5 && b < 2.5 && rnd() < 0.55) b += (rnd() < 0.5 ? -1 : 1) * 4;
      const p = galLocal(l, b, R * 0.998);
      pos.set([p.x, p.y, p.z], i * 3);
      const br = 0.35 + 0.65 * Math.exp(-((lc / 55) ** 2));
      col.set([0.72 * br, 0.78 * br, 1.0 * br], i * 3);
      size[i] = 5 + rnd() * 11;
    }
    const col2 = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) col2.set([0.42, 0.5, 0.7], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.mwMat = this._pointsMaterial(0.07, true);
    this.mwSurf = this._surf(this.mwMat, 0.07);
    this._add(j, new THREE.Points(g, this.mwMat), LY.SURF, ['milkyway']);
  }

  _buildStars() {
    const j = this.jGroup;
    const n = STARS.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), col2 = new Float32Array(n * 3), size = new Float32Array(n);
    this.starLocal = [];
    STARS.forEach((s, i) => {
      const p = eqLocal(s.ra, s.dec, R * 0.999);
      this.starLocal.push(p);
      pos.set([p.x, p.y, p.z], i * 3);
      const c = new THREE.Color(SP_COLOR[s.sp] || '#ffffff');
      col.set([c.r, c.g, c.b], i * 3);
      col2.set(STAR_INK, i * 3);
      size[i] = A.clamp(16.5 - 3.1 * s.mag, 5, 26);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.starMat = this._pointsMaterial(1);
    this.starSurf = this._surf(this.starMat, 1);
    this.starPoints = new THREE.Points(g, this.starMat);
    this._add(j, this.starPoints, LY.SURF, ['stars']);

    const bright = new Set(['Polaris', 'Mintaka', 'Alpheratz', 'Mizar', 'Thuban', 'Alcyone', 'Algol', 'Polaris Australis']);
    this.starLabels = STARS.map((s) => {
      const keys = s.mag <= 1.6 || bright.has(s.en) ? ['stars', 'starNames'] : ['stars', 'allStarNames'];
      return this._label(s.ko, 'lbl-star', keys, j, eqLocal(s.ra, s.dec));
    });

    const pl = [];
    for (const [a, b] of CON_LINES) {
      const sa = STAR_BY_NAME[a], sb = STAR_BY_NAME[b];
      if (!sa || !sb) { console.warn('별자리 선 오류', a, b); continue; }
      const va = eqLocal(sa.ra, sa.dec), vb = eqLocal(sb.ra, sb.dec);
      pl.push(slerpArc(va, vb, Math.max(2, Math.ceil(va.angleTo(vb) * A.RAD / 3)), R * 0.999));
    }
    this.conMat = this._segments(pl, 'con', 0.6);
    this._add(j, this.conMat, LY.SURF, ['constellations']);
    constellationCenters().forEach((c) => this._label(c.ko, 'lbl-con', ['conNames'], j, eqLocal(c.ra, c.dec)));

    // 세차 원: 천구 북극이 J2000 황도 북극 둘레로 그리는 원
    this._add(j, this._thick(curve((l) => eclLocal(l, 90 - A.OBLIQUITY), 0, 360, 240), 'prec', 1.8, { dashed: true }), LY.SURF, ['precessionCircle']);
    this._marker(j, eclLocal(0, 90), 'ecl', ['precessionCircle'], 0.13);
    this._label('황도 북극 (J2000)', 'lbl-ecl lbl-small', ['precessionCircle'], j, eclLocal(0, 90, R * 1.04));
    [-3000, 2000, 4000, 7500, 10000, 14000].forEach((y) => {
      const p = eclLocal(90 - A.PREC_RATE * (y - 2000), 90 - A.OBLIQUITY);
      this._marker(j, p, 'prec', ['precessionCircle'], 0.1);
      this._label(y < 0 ? `기원전 ${-y}년` : `${y}년`, 'lbl-prec', ['precessionCircle'], j, p.clone().multiplyScalar(1.035));
    });
  }

  _buildSolarSystem() {
    // 태양
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(255,190,60,0.28)'; ctx.beginPath(); ctx.arc(64, 64, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.arc(64, 64, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c47f00'; ctx.lineWidth = 3; ctx.stroke();
    const sm = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
    this._surf(sm, 1);
    this.sunSprite = new THREE.Sprite(sm);
    this.sunSprite.scale.set(1.5, 1.5, 1);
    this._add(this.eqGroup, this.sunSprite, LY.SURF, ['sun']);
    this.sunLabel = this._label('태양', 'lbl-sun', ['sun'], this.eqGroup, new THREE.Vector3());
    this.sunPathLine = this._dynLine(this.haGroup, 'sun', 2, 180, ['sun', 'sunPath'], { opacity: 0.95 });

    // 계절별 태양의 일주권
    [[A.OBLIQUITY, 'sumS', '하지 (δ = +23.4°)'], [0, 'eqx', '춘분·추분 (δ = 0°)'], [-A.OBLIQUITY, 'winS', '동지 (δ = −23.4°)']].forEach(([d, c, t]) => {
      this._add(this.haGroup, this._thick(curve((a) => eqLocal(a, d, R * 1.002), 0, 360, 200), c, 2.2), LY.SURF, ['seasonPaths']);
      this._label(t, 'lbl-season', ['seasonPaths'], this.haGroup, eqLocal(-12, d + 2.5));
    });

    // 달 (위상을 그린 스프라이트, 크기는 약 8배 과장)
    this.moonCanvas = document.createElement('canvas');
    this.moonCanvas.width = this.moonCanvas.height = 128;
    this.moonTex = new THREE.CanvasTexture(this.moonCanvas);
    const mm = new THREE.SpriteMaterial({ map: this.moonTex, transparent: true, depthWrite: false, opacity: 1 });
    this._surf(mm, 1);
    this.moonSprite = new THREE.Sprite(mm);
    this.moonSprite.scale.set(0.8, 0.8, 1);
    this.moonSprite.renderOrder = 3;
    this._add(this.eqGroup, this.moonSprite, LY.SURF, ['moon']);
    this.moonLabel = this._label('달', 'lbl-moon', ['moon'], this.eqGroup, new THREE.Vector3());
    this._moonPhaseDrawn = null;
    {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8000 * 3), 3));
      geo.setDrawRange(0, 0);
      const m = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false });
      m.color.setHex(this._color(m, 'moonTrail'));
      this._surf(m, 0.8);
      const line = new THREE.Line(geo, m);
      line.frustumCulled = false;
      this._add(this.eqGroup, line, LY.SURF, ['moon', 'planetTrails']);
      this.moonTrail = { line, n: 0, last: null };
    }

    // 행성
    const keys = A.PLANET_KEYS;
    const pos = new Float32Array(keys.length * 3), col = new Float32Array(keys.length * 3), col2 = new Float32Array(keys.length * 3), size = new Float32Array(keys.length);
    const sz = { mercury: 13, venus: 21, mars: 16, jupiter: 19, saturn: 16, uranus: 9, neptune: 8 };
    keys.forEach((k, i) => {
      const c = new THREE.Color(A.PLANETS[k].color), c2 = new THREE.Color(A.PLANETS[k].ink);
      col.set([c.r, c.g, c.b], i * 3);
      col2.set([c2.r, c2.g, c2.b], i * 3);
      size[i] = sz[k];
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.planetMat = this._pointsMaterial(1);
    this.planetSurf = this._surf(this.planetMat, 1);
    this.planetPoints = new THREE.Points(g, this.planetMat);
    this.planetPoints.frustumCulled = false;
    this._add(this.jGroup, this.planetPoints, LY.SURF, ['planets']);
    this.planetLabels = keys.map((k) => this._label(A.PLANETS[k].ko, 'lbl-planet', ['planets'], this.jGroup, new THREE.Vector3()));
    this.planetGeo = {};
    this._lastPlanetJD = null;

    // 행성 이동 경로 (별을 배경으로 한 겉보기 운동 → 역행 관찰)
    this.planetTrails = {};
    keys.forEach((k) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8000 * 3), 3));
      geo.setDrawRange(0, 0);
      const m = new THREE.LineBasicMaterial({ color: A.PLANETS[k].color, transparent: true, opacity: 0.85, depthWrite: false });
      this.themed.push({ mat: m, sky: new THREE.Color(A.PLANETS[k].color).getHex(), paper: new THREE.Color(A.PLANETS[k].ink).getHex() });
      this._surf(m, 0.85);
      const line = new THREE.Line(geo, m);
      line.frustumCulled = false;
      this._add(this.jGroup, line, LY.SURF, ['planets', 'planetTrails']);
      this.planetTrails[k] = { line, n: 0, last: null };
    });
  }

  _buildOverlays() {
    const o = this.overlay;
    const K = ['$sel'];
    this.ov = {
      vert: this._dynLine(o, 'hor', 1.5, 180, K, { opacity: 0.75 }),
      hour: this._dynLine(o, 'eq', 1.5, 180, K, { opacity: 0.75 }),
      diurnal: this._dynLine(o, 'ha', 1.8, 180, K, { opacity: 0.85 }),
      alt: this._dynLine(o, 'altArc', 4.5, 64, K),
      az: this._dynLine(o, 'azArc', 4.5, 96, K),
      dec: this._dynLine(o, 'decArc', 4.5, 64, K),
      ra: this._dynLine(o, 'raArc', 4.5, 96, K),
      ha: this._dynLine(o, 'haArc', 4.5, 96, K),
      lon: this._dynLine(o, 'lonArc', 4.5, 96, K),
      lat: this._dynLine(o, 'latArc', 4.5, 64, K),
      gl: this._dynLine(o, 'glArc', 4.5, 96, K),
      gb: this._dynLine(o, 'gbArc', 4.5, 64, K),
      pz: this._dynLine(o, 'tri', 3.2, 64, K),
      zx: this._dynLine(o, 'tri', 3.2, 64, K),
      px: this._dynLine(o, 'tri', 3.2, 64, K),
      err: this._dynLine(o, 'err', 3, 64, K),
    };
    const L = (cls) => this._label('', 'lbl-arc ' + cls, [], o, new THREE.Vector3());
    this.ovl = {
      ring: this._label('', 'sel-ring', [], o, new THREE.Vector3()),
      name: this._label('', 'lbl-selname', [], o, new THREE.Vector3()),
      alt: L('arc-alt'), az: L('arc-az'), dec: L('arc-dec'), ra: L('arc-ra'), ha: L('arc-ha'),
      lon: L('arc-lon'), lat: L('arc-lat'), gl: L('arc-gl'), gb: L('arc-gb'),
      tP: L('arc-tri'), tZ: L('arc-tri'), tX: L('arc-tri'), sPZ: L('arc-tri'), sZX: L('arc-tri'), sPX: L('arc-tri'),
      vert: this._label('수직권', 'lbl-hor lbl-small', [], o, new THREE.Vector3()),
      hour: this._label('시간권', 'lbl-eq lbl-small', [], o, new THREE.Vector3()),
      diurnal: this._label('일주권', 'lbl-ha lbl-small', [], o, new THREE.Vector3()),
    };
    // 사용자 표시점 (훈련 모드)
    this.markerGroup = new THREE.Group();
    this.world.add(this.markerGroup);
  }

  _buildTrails() {
    const cap = STARS.length * 180 * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    this._surf(m, 0.95);
    this.trailLines = new THREE.LineSegments(g, m);
    this.trailLines.frustumCulled = false;
    this._add(this.eqGroup, this.trailLines, LY.SURF, ['trails', 'stars']);
    this.trailStart = null;
  }

  _applyShow() {
    for (const { keys, obj } of this.regList) {
      obj.visible = keys.every((k) => (k === '$sel' ? obj.visible : this._keyOn(k)));
    }
    this.groundMat.opacity = this.show.ground ? 1 : 0.42;
    this._dirty = true;
  }

  // ------------------------------------------------------------------ 공개 API
  setShow(key, val) {
    if (typeof key === 'object') { Object.assign(this.show, key); if (key.trails) this.resetTrails(); if (key.planetTrails) this.resetPlanetTrails(); }
    else {
      const was = this.show[key];
      this.show[key] = val;
      if (key === 'trails' && val && !was) this.resetTrails();
      if (key === 'planetTrails' && val && !was) this.resetPlanetTrails();
    }
    this._applyShow();
  }
  setArcs(obj) { Object.assign(this.arcs, obj); this._dirty = true; }
  setLocation(lat, lon, tz) {
    if (lat != null) this.lat = A.clamp(lat, -90, 90);
    if (lon != null) this.lon = lon;
    if (tz != null) this.tz = tz;
    this._dirty = true;
  }
  setJD(jd) { this.jd = jd; this._dirty = true; }
  setEpoch(mode, year) { this.epochMode = mode; if (year != null) this.epochYear = year; this._dirty = true; }
  setPlaying(p) { this.playing = p; this._acc = 0; this.emit('play', p); }
  setSpeed(mode, rate) { this.stepMode = mode; this.rate = rate; this._acc = 0; }
  resetTrails() { this.trailStart = A.lstContinuous(this.jd, this.lon); this._dirty = true; }
  resetPlanetTrails() {
    for (const t of [...Object.values(this.planetTrails), this.moonTrail]) { t.n = 0; t.last = null; t.line.geometry.setDrawRange(0, 0); }
    this._dirty = true;
  }

  /** 천구 모형 시야각: 세로로 긴 화면에서도 천구가 양옆으로 잘리지 않게 넓힌다 */
  _outsideFov() {
    const a = (this.w || 1) / (this.h || 1);
    return a >= 1 ? 42 : 2 * Math.atan(Math.tan(21 * A.DEG) / a) * A.RAD;
  }
  setView(v) {
    if (this.view === 'outside' && v === 'observer') this._outsidePos.copy(this.camera.position);
    this.view = v;
    if (v === 'outside') {
      this.controls.enabled = true;
      this.camera.fov = this._outsideFov();
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(this._outsidePos.lengthSq() > 1 ? this._outsidePos : new THREE.Vector3(20, 14, 26));
      this.controls.target.set(0, 0, 0);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    } else {
      this.controls.enabled = false;
      this._applyObserverCamera();
    }
    this._applyTheme(v === 'outside');
    this._applyShow();
    this.emit('view', v);
  }
  lookAt(az, alt, fov) {
    this.obsAz = az; this.obsAlt = alt; if (fov) this.obsFov = fov;
    if (this.view === 'observer') this._applyObserverCamera();
  }
  _applyObserverCamera() {
    const d = horWorld(this.obsAz, A.clamp(this.obsAlt, -89.5, 89.5), 1);
    this.camera.position.set(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(d);
    this.camera.fov = this.obsFov;
    this.camera.updateProjectionMatrix();
  }
  setCameraPreset(name) {
    const P = {
      default: [150, 24, 34], south: [180, 12, 34], east: [90, 12, 34], north: [0, 12, 34], west: [270, 12, 34],
      top: [180, 89, 34], polar: [0, 0, 34],
    };
    let [az, alt, dist] = P[name] || P.default;
    if (name === 'polar') { // 천구 북극 위에서 내려다보기
      const p = this.haGroup.localToWorld(new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(dist);
      this._outsidePos.copy(p);
    } else this._outsidePos.copy(horWorld(az, alt, dist));
    if (this.view === 'outside') { this.camera.position.copy(this._outsidePos); this.controls.update(); }
  }

  select(desc) {
    this.selected = desc;
    this._dirty = true;
    this.emit('select', desc);
  }
  selectByName(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return false;
    if (q === '태양' || q === 'sun') { this.select({ kind: 'sun' }); return true; }
    if (q === '달' || q === 'moon') { this.select({ kind: 'moon' }); return true; }
    for (const k of A.PLANET_KEYS) if (A.PLANETS[k].ko === q || A.PLANETS[k].en.toLowerCase() === q) { this.select({ kind: 'planet', key: k }); return true; }
    const s = STARS.find((s) => s.ko.toLowerCase() === q || s.en.toLowerCase() === q || s.bayer.toLowerCase() === q)
      || STARS.find((s) => s.ko.toLowerCase().includes(q) || s.en.toLowerCase().includes(q));
    if (s) { this.select({ kind: 'star', id: s.id }); return true; }
    return false;
  }
  objectName(desc = this.selected) {
    if (!desc) return '';
    if (desc.kind === 'sun') return '태양';
    if (desc.kind === 'moon') return '달';
    if (desc.kind === 'planet') return A.PLANETS[desc.key].ko;
    const s = STARS[desc.id];
    return `${s.ko} (${s.bayer})`;
  }

  /** 선택 천체의 그날 분점 기준 적경·적위 */
  objectEq(desc = this.selected) {
    if (!desc) return null;
    if (desc.kind === 'sun') { const s = this.sunData || A.sunPosition(this.jd); return { ra: s.ra, dec: s.dec }; }
    if (desc.kind === 'moon') { if (!this.moonData) this._updateMoon(); return { ra: this.moonData.topo.ra, dec: this.moonData.topo.dec }; }
    if (desc.kind === 'planet') {
      const g = this.planetGeo[desc.key] || A.geocentric(desc.key, this.jd);
      return A.precess(g.ra, g.dec, this.epoch);
    }
    const s = STARS[desc.id];
    return A.precess(s.ra, s.dec, this.epoch);
  }
  objectJ2000(desc = this.selected) {
    if (!desc) return null;
    if (desc.kind === 'star') return { ra: STARS[desc.id].ra, dec: STARS[desc.id].dec };
    if (desc.kind === 'planet') { const g = this.planetGeo[desc.key] || A.geocentric(desc.key, this.jd); return { ra: g.ra, dec: g.dec }; }
    const e = this.objectEq(desc);
    return A.unprecess(e.ra, e.dec, this.epoch);
  }

  /** 선택 천체의 모든 좌표와 출몰 정보 */
  getInfo(desc = this.selected) {
    if (!desc) return null;
    const eq = this.objectEq(desc), j = this.objectJ2000(desc);
    const H = A.norm360(this.lst - eq.ra);
    const hor = A.eqToHor(H, eq.dec, this.lat);
    const ecl = A.eqToEcl(eq.ra, eq.dec);
    const gal = A.eqToGal(j.ra, j.dec);
    const culm = A.culmination(eq.dec, this.lat);
    const rs = A.riseSet(eq.dec, this.lat);
    const rsRef = A.riseSet(eq.dec, this.lat, -0.5667);
    const q = A.parallacticAngle(H, eq.dec, this.lat);
    const c = A.civilFromJD(this.jd, this.tz);
    const jd0 = A.jdFromCivil(c.y, c.m, c.d, 0, this.tz);
    const lst0 = A.lstDeg(jd0, this.lon);
    const transit = (A.norm360(eq.ra - lst0) / 15) * A.SIDEREAL_RATIO;
    const out = { name: this.objectName(desc), desc, eq, j2000: j, H, hor, ecl, gal, culm, rs, rsRef, q, transit };
    if (rs.type === 'normal') { out.rise = transit - (rs.H0 / 15) * A.SIDEREAL_RATIO; out.set = transit + (rs.H0 / 15) * A.SIDEREAL_RATIO; }
    if (desc.kind === 'star') out.mag = STARS[desc.id].mag;
    if (desc.kind === 'planet') out.planet = this.planetGeo[desc.key];
    if (desc.kind === 'moon') {
      out.moon = this.moonData;
      const rs = A.moonRiseSet(jd0, this.lat, this.lon);
      out.moonRS = rs;
    }
    return out;
  }

  /** 화면 좌표(클라이언트 픽셀) → 하늘 방향의 모든 좌표 */
  coordsAtClient(cx, cy) {
    const dir = this._dirFromClient(cx, cy);
    return dir ? this.coordsFromWorldDir(dir) : null;
  }
  coordsFromWorldDir(dir) {
    const hor = worldToHor(dir);
    const qe = this.eqGroup.getWorldQuaternion(new THREE.Quaternion()).invert();
    const ve = dir.clone().applyQuaternion(qe);
    const eq = A.vecToRadec([ve.x, ve.y, ve.z]);
    const ecl = A.eqToEcl(eq.ra, eq.dec);
    const qj = this.jGroup.getWorldQuaternion(new THREE.Quaternion()).invert();
    const vj = dir.clone().applyQuaternion(qj);
    const j = A.vecToRadec([vj.x, vj.y, vj.z]);
    const gal = A.eqToGal(j.ra, j.dec);
    return { dir: dir.clone(), alt: hor.alt, az: hor.az, ra: eq.ra, dec: eq.dec, ha: A.norm360(this.lst - eq.ra), lon: ecl.lon, lat: ecl.lat, l: gal.l, b: gal.b, ra2000: j.ra, dec2000: j.dec };
  }
  /** 그날 분점 적경·적위 → 월드 방향 벡터(단위) */
  eqToWorldDir(ra, dec) { return this.eqGroup.localToWorld(eqLocal(ra, dec, 1)).normalize(); }
  starWorldDir(id) { return this.jGroup.localToWorld(this.starLocal[id].clone()).normalize(); }
  worldToScreen(v) {
    const p = v.clone().multiplyScalar(R).project(this.camera);
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h, behind: p.z > 1 };
  }

  /** 훈련용 표시점: [{ra, dec, color, text}] (그날 분점 기준) 와 두 점을 잇는 오차 호 */
  setMarkers(list = [], errorArc = null) {
    for (const m of this.markers) { m.obj.parent.remove(m.obj); this.labels.splice(this.labels.indexOf(m), 1); }
    this.markers = list.map((m) => {
      const rec = this._label(m.text || '', 'lbl-marker', [], this.eqGroup, eqLocal(m.ra, m.dec), true);
      rec.div.style.setProperty('--mk', m.color || '#ff4081');
      return rec;
    });
    this._errorArc = errorArc;
    this._dirty = true;
  }

  // ------------------------------------------------------------------ 갱신
  update() {
    const lat = this.lat;
    this.lst = A.lstDeg(this.jd, this.lon);
    const cf = A.cosd(lat), sf = A.sind(lat);
    const m = new THREE.Matrix4().set(0, 1, 0, 0, cf, 0, sf, 0, sf, 0, -cf, 0, 0, 0, 0, 1);
    this.haGroup.quaternion.setFromRotationMatrix(m);
    this.eqGroup.quaternion.setFromAxisAngle(ZV, -this.lst * A.DEG);
    this.epoch = this.epochMode === 'date' ? A.epochFromJD(this.jd) : this.epochYear;
    const dl = A.PREC_RATE * (this.epoch - 2000) * A.DEG, e = A.OBLIQUITY * A.DEG;
    const qa = new THREE.Quaternion().setFromAxisAngle(XV, e);
    const qb = new THREE.Quaternion().setFromAxisAngle(ZV, dl);
    const qc = new THREE.Quaternion().setFromAxisAngle(XV, -e);
    this.jGroup.quaternion.copy(qa).multiply(qb).multiply(qc);
    this.scene.updateMatrixWorld(true);

    this._updateSun();
    this._updateMoon();
    this._updatePlanets();
    this._updateTrails();
    this._updateSelection();
    this._updateSky();
    this.emit('update', this);
  }

  _updateSun() {
    const s = (this.sunData = A.sunPosition(this.jd));
    this.sunSprite.position.copy(eqLocal(s.ra, s.dec, R * 0.99));
    this.sunLabel.obj.position.copy(eqLocal(s.ra, s.dec, R * 1.0));
    this._setLine(this.sunPathLine, curve((a) => eqLocal(a, s.dec, R * 1.001), 0, 360, 180));
    this.sunHor = A.eqToHor(A.norm360(this.lst - s.ra), s.dec, this.lat);
  }

  _updateMoon() {
    const ph = A.moonPhase(this.jd), m = ph.moon;
    const lst = this.lst ?? A.lstDeg(this.jd, this.lon);
    const topo = A.topocentric(m.ra, m.dec, m.dist, this.lat, lst); // 관측자 위치의 시차(최대 약 1°) 반영
    this.moonData = { ...ph, topo, age: null };
    const p = eqLocal(topo.ra, topo.dec, R * 0.985);
    this.moonSprite.position.copy(p);
    this.moonLabel.obj.position.copy(eqLocal(topo.ra, topo.dec, R));
    if (this._moonPhaseDrawn === null || Math.abs(this._moonPhaseDrawn - ph.phaseAngle) > 0.7) {
      this._moonPhaseDrawn = ph.phaseAngle;
      this._drawMoonTexture(ph.phaseAngle);
    }
    if (this.show.planetTrails && this.show.moon) {
      const t = this.moonTrail;
      if (!t.last || A.angularDistance(t.last.ra, t.last.dec, topo.ra, topo.dec) > 0.15) {
        if (t.n >= 8000) { t.line.geometry.attributes.position.array.copyWithin(0, 3 * 2000); t.n -= 2000; }
        t.line.geometry.attributes.position.setXYZ(t.n++, p.x, p.y, p.z);
        t.line.geometry.attributes.position.needsUpdate = true;
        t.line.geometry.setDrawRange(0, t.n);
        t.last = { ra: topo.ra, dec: topo.dec };
      }
    }
  }
  /** 위상각 i(0 = 보름)에 맞춰 달 텍스처를 그린다. 밝은 쪽이 텍스처의 +x */
  _drawMoonTexture(i) {
    const ctx = this.moonCanvas.getContext('2d'), c = 64, r = 58;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(52,56,70,0.92)';
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    const k = Math.cos(i * A.DEG);
    const g = ctx.createRadialGradient(c - 18, c - 18, 6, c, c, r);
    g.addColorStop(0, '#fffbee'); g.addColorStop(1, '#d9d2bc');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(c, c - r);
    ctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(c, c, Math.max(0.01, Math.abs(r * k)), r, 0, Math.PI / 2, (3 * Math.PI) / 2, k < 0);
    ctx.fill();
    // 바다(어두운 무늬) 약간
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(120,115,100,0.22)';
    [[c - 14, c - 16, 15], [c + 12, c - 6, 12], [c - 4, c + 14, 10], [c + 20, c + 18, 8]].forEach(([x, y, rr]) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(40,42,52,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
    this.moonTex.needsUpdate = true;
  }
  /** 화면에서 달의 밝은 쪽이 태양을 향하도록 스프라이트를 돌린다 */
  _orientMoon() {
    if (!this.moonSprite.visible) return;
    const mp = this.moonSprite.getWorldPosition(new THREE.Vector3());
    const m = mp.clone().normalize(), s = this.sunSprite.getWorldPosition(new THREE.Vector3()).normalize();
    const t = s.clone().sub(m.clone().multiplyScalar(s.dot(m)));
    if (t.lengthSq() < 1e-12) return;
    t.normalize();
    const p2 = m.clone().addScaledVector(t, 0.02).multiplyScalar(mp.length());
    const a = mp.clone().project(this.camera), b = p2.project(this.camera);
    this.moonSprite.material.rotation = Math.atan2((b.y - a.y) * this.h, (b.x - a.x) * this.w);
  }

  _updatePlanets() {
    if (this._lastPlanetJD !== null && Math.abs(this.jd - this._lastPlanetJD) < 2e-4) return;
    this._lastPlanetJD = this.jd;
    const attr = this.planetPoints.geometry.attributes.position;
    A.PLANET_KEYS.forEach((k, i) => {
      const g = A.geocentric(k, this.jd);
      this.planetGeo[k] = g;
      const p = eqLocal(g.ra, g.dec, R * 0.997);
      attr.setXYZ(i, p.x, p.y, p.z);
      this.planetLabels[i].obj.position.copy(eqLocal(g.ra, g.dec));
      if (this.show.planetTrails) {
        const t = this.planetTrails[k];
        if (!t.last || A.angularDistance(t.last.ra, t.last.dec, g.ra, g.dec) > 0.03) {
          if (t.n >= 8000) { const arr = t.line.geometry.attributes.position.array; arr.copyWithin(0, 3 * 2000); t.n -= 2000; }
          t.line.geometry.attributes.position.setXYZ(t.n++, p.x, p.y, p.z);
          t.line.geometry.attributes.position.needsUpdate = true;
          t.line.geometry.setDrawRange(0, t.n);
          t.last = { ra: g.ra, dec: g.dec };
        }
      }
    });
    attr.needsUpdate = true;
  }

  _updateTrails() {
    const geo = this.trailLines.geometry;
    if (!this.show.trails || this.trailStart === null) { geo.setDrawRange(0, 0); return; }
    let delta = A.lstContinuous(this.jd, this.lon) - this.trailStart;
    delta = A.clamp(delta, -360, 360);
    if (Math.abs(delta) < 0.25) { geo.setDrawRange(0, 0); return; }
    const n = Math.min(180, Math.ceil(Math.abs(delta) / 2));
    const pos = geo.attributes.position.array, col = geo.attributes.color.array;
    const q = this.jGroup.quaternion;
    const v = new THREE.Vector3();
    let k = 0;
    const cols = this.starPoints.geometry.attributes.aColor.array;
    const paper = this.paper, bg = new THREE.Color(PAPER_BG);
    // 밤하늘: 별 색 × 밝기(가산 혼합) / 종이: 바탕색 → 먹색 사이를 밝기만큼 섞는다
    const put = (idx, i, f) => {
      if (paper) {
        col[idx] = bg.r + (STAR_INK[0] - bg.r) * f; col[idx + 1] = bg.g + (STAR_INK[1] - bg.g) * f; col[idx + 2] = bg.b + (STAR_INK[2] - bg.b) * f;
      } else { col[idx] = cols[i * 3] * f; col[idx + 1] = cols[i * 3 + 1] * f; col[idx + 2] = cols[i * 3 + 2] * f; }
    };
    STARS.forEach((s, i) => {
      v.copy(this.starLocal[i]).applyQuaternion(q);
      const br = A.clamp(1.15 - 0.22 * s.mag, 0.25, 1.0);
      let px = v.x, py = v.y, pz = v.z, pf = br;
      for (let j = 1; j <= n; j++) {
        const d = (delta * j) / n * A.DEG, c = Math.cos(d), sn = Math.sin(d);
        const x = v.x * c - v.y * sn, y = v.x * sn + v.y * c;
        const f = br * Math.pow(1 - j / n, 0.6);
        pos[k * 3] = px; pos[k * 3 + 1] = py; pos[k * 3 + 2] = pz;
        put(k * 3, i, pf); k++;
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = v.z;
        put(k * 3, i, f); k++;
        px = x; py = y; pz = v.z; pf = f;
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, k);
  }

  _updateSelection() {
    const ov = this.ov, L = this.ovl;
    const sel = this.selected;
    const setVis = (name, on) => { if (ov[name]) ov[name].visible = on; if (L[name]) L[name].dyn = on; };
    Object.keys(ov).forEach((k) => (ov[k].visible = false));
    Object.keys(L).forEach((k) => (L[k].dyn = false));
    this._updateErrorArc();
    if (!sel) return;

    const eq = this.objectEq(sel);
    const toW = (grp, v) => grp.localToWorld(v.clone());
    const X = toW(this.eqGroup, eqLocal(eq.ra, eq.dec));
    const hor = worldToHor(X);
    const H = A.norm360(this.lst - eq.ra);
    const lbl = (rec, pos, html) => { rec.obj.position.copy(pos); rec.span.innerHTML = html; rec.dyn = true; };
    const mid = (pts, k = 1.07) => pts[Math.floor(pts.length / 2)].clone().multiplyScalar(k);

    L.ring.obj.position.copy(X); L.ring.dyn = true;
    if (!this.hideSelName) lbl(L.name, X, this.objectName(sel));

    if (this.arcs.hor) {
      const u = horWorld(hor.az, 0, 1);
      this._setLine(ov.vert, curve((t) => u.clone().multiplyScalar(R * A.cosd(t)).addScaledVector(YV, R * A.sind(t)), 0, 360, 180));
      setVis('vert', true);
      L.vert.obj.position.copy(horWorld(hor.az, Math.min(hor.alt + 25, 80)).multiplyScalar(1.0)); L.vert.dyn = true;
      const pa = curve((t) => horWorld(hor.az, t, R * 1.004), 0, hor.alt, 64);
      this._setLine(ov.alt, pa); setVis('alt', true); lbl(L.alt, mid(pa), `h = ${hor.alt.toFixed(1)}°`);
      const pz = curve((t) => horWorld(t, 0, R * 1.004), 0, hor.az, 96);
      this._setLine(ov.az, pz); setVis('az', true); lbl(L.az, mid(pz, 1.1), `A = ${hor.az.toFixed(1)}°`);
    }
    if (this.arcs.eq || this.arcs.ha) {
      const u = eqLocal(eq.ra, 0, 1);
      this._setLine(ov.hour, curve((t) => toW(this.eqGroup, u.clone().multiplyScalar(R * A.cosd(t)).addScaledVector(ZV, R * A.sind(t))), -90, 90, 180));
      setVis('hour', true);
      L.hour.obj.position.copy(toW(this.eqGroup, eqLocal(eq.ra, eq.dec > 0 ? eq.dec - 22 : eq.dec + 22))); L.hour.dyn = true;
    }
    if (this.arcs.eq) {
      const pd = curve((t) => toW(this.eqGroup, eqLocal(eq.ra, t, R * 1.004)), 0, eq.dec, 64);
      this._setLine(ov.dec, pd); setVis('dec', true); lbl(L.dec, mid(pd), `δ = ${A.fmtDMS(eq.dec, true, false)}`);
      const pr = curve((t) => toW(this.eqGroup, eqLocal(t, 0, R * 1.004)), 0, eq.ra, 96);
      this._setLine(ov.ra, pr); setVis('ra', true); lbl(L.ra, mid(pr, 1.1), `α = ${A.fmtRA(eq.ra, false)}`);
    }
    if (this.arcs.ha) {
      const ph = curve((t) => toW(this.eqGroup, eqLocal(this.lst - t, 0, R * 1.008)), 0, H, 96);
      this._setLine(ov.ha, ph); setVis('ha', true); lbl(L.ha, mid(ph, 1.13), `H = ${A.fmtRA(H, false)}`);
    }
    if (this.arcs.circles) {
      this._setLine(ov.diurnal, curve((a) => toW(this.eqGroup, eqLocal(a, eq.dec, R * 1.002)), 0, 360, 180));
      setVis('diurnal', true);
      L.diurnal.obj.position.copy(toW(this.haGroup, eqLocal(30, eq.dec))); L.diurnal.dyn = true;
    }
    if (this.arcs.ecl) {
      const e = A.eqToEcl(eq.ra, eq.dec);
      const pl = curve((t) => toW(this.eqGroup, eclLocal(t, 0, R * 1.006)), 0, e.lon, 96);
      this._setLine(ov.lon, pl); setVis('lon', true); lbl(L.lon, mid(pl, 1.1), `λ = ${e.lon.toFixed(1)}°`);
      const pb = curve((t) => toW(this.eqGroup, eclLocal(e.lon, t, R * 1.006)), 0, e.lat, 64);
      this._setLine(ov.lat, pb); setVis('lat', true); lbl(L.lat, mid(pb), `β = ${e.lat >= 0 ? '+' : ''}${e.lat.toFixed(1)}°`);
    }
    if (this.arcs.gal) {
      const j = this.objectJ2000(sel), g = A.eqToGal(j.ra, j.dec);
      const pl = curve((t) => toW(this.jGroup, galLocal(t, 0, R * 1.006)), 0, g.l, 96);
      this._setLine(ov.gl, pl); setVis('gl', true); lbl(L.gl, mid(pl, 1.1), `l = ${g.l.toFixed(1)}°`);
      const pb = curve((t) => toW(this.jGroup, galLocal(g.l, t, R * 1.006)), 0, g.b, 64);
      this._setLine(ov.gb, pb); setVis('gb', true); lbl(L.gb, mid(pb), `b = ${g.b >= 0 ? '+' : ''}${g.b.toFixed(1)}°`);
    }
    if (this.show.triangle) {
      const P = toW(this.haGroup, new THREE.Vector3(0, 0, R)), Zp = new THREE.Vector3(0, R, 0);
      const a1 = slerpArc(P, Zp, 64, R * 1.01), a2 = slerpArc(Zp, X, 64, R * 1.01), a3 = slerpArc(P, X, 64, R * 1.01);
      this._setLine(ov.pz, a1); this._setLine(ov.zx, a2); this._setLine(ov.px, a3);
      setVis('pz', true); setVis('zx', true); setVis('px', true);
      const angP = H <= 180 ? H : 360 - H, angZ = hor.az <= 180 ? hor.az : 360 - hor.az;
      const q = Math.abs(A.parallacticAngle(H, eq.dec, this.lat));
      const inside = (V, others) => V.clone().multiplyScalar(0.86).add(others.reduce((s, o) => s.add(o.clone().multiplyScalar(0.07)), new THREE.Vector3())).normalize().multiplyScalar(R);
      lbl(L.tP, inside(P, [Zp, X]), `∠P = H = ${angP.toFixed(1)}°`);
      lbl(L.tZ, inside(Zp, [P, X]), `∠Z = ${angZ.toFixed(1)}°`);
      lbl(L.tX, inside(X, [P, Zp]), `∠X = q = ${q.toFixed(1)}°`);
      lbl(L.sPZ, mid(a1, 1.05), `PZ = 90°−φ = ${(90 - this.lat).toFixed(1)}°`);
      lbl(L.sZX, mid(a2, 1.05), `ZX = z = ${(90 - hor.alt).toFixed(1)}°`);
      lbl(L.sPX, mid(a3, 1.05), `PX = 90°−δ = ${(90 - eq.dec).toFixed(1)}°`);
    }
  }

  _updateErrorArc() {
    const ea = this._errorArc;
    if (!ea) { this.ov.err.visible = false; return; }
    const a = this.eqToWorldDir(ea.ra1, ea.dec1), b = this.eqToWorldDir(ea.ra2, ea.dec2);
    this._setLine(this.ov.err, slerpArc(a, b, 64, R * 1.004));
    this.ov.err.visible = true;
  }

  _updateSky() {
    const observer = this.view === 'observer';
    this._applyTheme(!observer);
    let night = new THREE.Color(observer ? NIGHT_BG : PAPER_BG);
    let starF = 1;
    if (observer && this.show.atmosphere) {
      const h = this.sunHor.alt;
      const day = A.clamp((h + 12) / 18, 0, 1);
      const dayCol = new THREE.Color(0x5b90cf), twi = new THREE.Color(0x2a3a66);
      night = day < 0.5 ? night.clone().lerp(twi, day * 2) : twi.clone().lerp(dayCol, (day - 0.5) * 2);
      starF = 1 - 0.94 * A.clamp((h + 14) / 12, 0, 1);
      this.groundMat.color.set(0x13251a).lerp(new THREE.Color(0x2c5032), day);
    } else this.groundMat.color.set(0x13251a);
    this.renderer.setClearColor(night, 1);
    this.starSurf.base = starF;
    this.mwSurf.base = (observer ? 0.07 : 0.045) * starF;
    this.planetSurf.base = Math.max(starF, 0.35);
    const scale = observer ? A.clamp(Math.pow(75 / this.obsFov, 0.55), 0.8, 2.4) : 1;
    this.starMat.uniforms.uScale.value = scale;
    this.planetMat.uniforms.uScale.value = scale;
    this.mwMat.uniforms.uScale.value = scale;
  }

  // ------------------------------------------------------------------ 입력
  _dirFromClient(cx, cy) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const o = this.raycaster.ray.origin, d = this.raycaster.ray.direction;
    if (this.view === 'observer') return d.clone().normalize();
    const b = o.dot(d), c = o.lengthSq() - R * R, disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    return o.clone().addScaledVector(d, t).normalize();
  }

  _initEvents() {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    this.raycaster = new THREE.Raycaster();
    let down = null;
    const pointers = new Map();
    dom.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = { x: e.clientX, y: e.clientY, az: this.obsAz, alt: this.obsAlt, moved: false, fov: this.obsFov };
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        down.pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
      if (this.view === 'observer') dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.hypot(dx, dy) > 5) down.moved = true;
        if (this.view === 'observer') {
          if (pointers.size === 2 && down.pinch) {
            const [p1, p2] = [...pointers.values()];
            this.obsFov = A.clamp(down.fov * down.pinch / Math.max(20, Math.hypot(p1.x - p2.x, p1.y - p2.y)), 10, 120);
            this._applyObserverCamera();
          } else if (down.moved) {
            const k = this.camera.fov / this.h;
            this.obsAz = A.norm360(down.az - dx * k);
            this.obsAlt = A.clamp(down.alt + dy * k, -89.5, 89.5);
            this._applyObserverCamera();
          }
          this.emit('look', { az: this.obsAz, alt: this.obsAlt, fov: this.obsFov });
        }
      }
      this._hover(e);
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (down && !down.moved && e.type === 'pointerup') this._click(e);
      if (pointers.size === 0) down = null;
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('pointerleave', () => { this.hud.classList.remove('on'); this.emit('hover', null); });
    dom.addEventListener('wheel', (e) => {
      if (this.view !== 'observer') return;
      e.preventDefault();
      this.obsFov = A.clamp(this.obsFov * Math.exp(e.deltaY * 0.0012), 10, 120);
      this._applyObserverCamera();
      this.emit('look', { az: this.obsAz, alt: this.obsAlt, fov: this.obsFov });
    }, { passive: false });
  }

  _hover(e) {
    const c = this.coordsAtClient(e.clientX, e.clientY);
    this.emit('hover', c);
    if (!c || this.hideHud) { this.hud.classList.remove('on'); return; }
    this.hud.classList.add('on');
    this.hud.innerHTML =
      `<b>커서 위치</b>` +
      `<span class="c-hor">고도 ${c.alt.toFixed(1)}° · 방위각 ${c.az.toFixed(1)}° (${A.azName(c.az)})</span>` +
      `<span class="c-eq">적경 ${A.fmtRA(c.ra, false)} · 적위 ${A.fmtDMS(c.dec, true, false)} · 시간각 ${A.fmtRA(c.ha, false)}</span>` +
      (this.show.ecliptic || this.show.eclGrid ? `<span class="c-ecl">황경 ${c.lon.toFixed(1)}° · 황위 ${c.lat.toFixed(1)}°</span>` : '') +
      (this.show.galactic || this.show.galGrid ? `<span class="c-gal">은경 ${c.l.toFixed(1)}° · 은위 ${c.b.toFixed(1)}°</span>` : '');
  }

  _click(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cam = this.camera.position;
    let best = null, bestD = 16;
    const test = (wv, desc) => {
      if (this.view === 'outside') { if (wv.dot(cam) < R * R * 1.0) return; }
      else if (this.show.ground && wv.y < -0.02 * R) return;
      const p = wv.clone().project(this.camera);
      if (p.z > 1 || p.z < -1) return;
      const d = Math.hypot(((p.x + 1) / 2) * this.w - mx, ((1 - p.y) / 2) * this.h - my);
      if (d < bestD) { bestD = d; best = desc; }
    };
    if (this.show.stars) STARS.forEach((s, i) => test(this.jGroup.localToWorld(this.starLocal[i].clone()), { kind: 'star', id: i }));
    if (this.show.planets) A.PLANET_KEYS.forEach((k) => { const g = this.planetGeo[k]; if (g) test(this.jGroup.localToWorld(eqLocal(g.ra, g.dec)), { kind: 'planet', key: k }); });
    if (this.show.sun && this.sunData) test(this.eqGroup.localToWorld(eqLocal(this.sunData.ra, this.sunData.dec)), { kind: 'sun' });
    if (this.show.moon && this.moonData) test(this.eqGroup.localToWorld(eqLocal(this.moonData.topo.ra, this.moonData.topo.dec)), { kind: 'moon' });
    const coords = this.coordsAtClient(e.clientX, e.clientY);
    this.emit('click', { object: best, coords });
    if (this.pickable && best) this.select(best);
  }

  // ------------------------------------------------------------------ 렌더링
  _updateLabels() {
    const cam = this.camera.position;
    const outside = this.view === 'outside';
    const hideBelow = !outside && this.show.ground;
    const v = new THREE.Vector3();
    for (const rec of this.labels) {
      let vis = rec.dyn !== false && rec.keys.every((k) => this._keyOn(k));
      let op = 1;
      if (vis) {
        rec.obj.getWorldPosition(v);
        if (hideBelow && v.y < -0.03 * R) vis = false;
        else if (outside && v.lengthSq() > 4) {
          const s = v.clone().setLength(R);
          if (s.dot(cam) < R * R) op = 0.28;
        }
      }
      rec.obj.visible = vis;
      if (vis && rec.op !== op) { rec.div.style.opacity = op; rec.op = op; }
    }
  }

  _render() {
    const r = this.renderer, cam = this.camera;
    this._orientMoon();
    if (this.view === 'outside') {
      r.autoClear = false;
      r.clear();
      this._dim(0.24);
      cam.layers.set(LY.SURF); cam.layers.enable(LY.INT);
      r.render(this.scene, cam);
      r.clearDepth();
      this._dim(1);
      cam.layers.set(LY.OCC); cam.layers.enable(LY.SURF);
      r.render(this.scene, cam);
    } else {
      r.autoClear = true;
      this._dim(1);
      cam.layers.set(LY.SURF); cam.layers.enable(LY.INT); cam.layers.enable(LY.GROUND);
      r.render(this.scene, cam);
    }
    cam.layers.enableAll();
    this._updateLabels();
    this.labelRenderer.render(this.scene, cam);
  }

  _loop(now) {
    const dt = Math.min(0.25, (now - this._last) / 1000);
    this._last = now;
    if (this.playing) {
      if (this.stepMode === 'continuous') this.jd += (this.rate * dt) / 86400;
      else {
        this._acc += this.rate * dt;
        const n = Math.floor(this._acc);
        if (n > 0) { this._acc -= n; this.jd += n * (this.stepMode === 'sidereal' ? A.SIDEREAL_RATIO : 1); }
      }
      this._dirty = true;
    }
    if (!this.paused) {
      if (this._dirty) { this._dirty = false; this.update(); }
      if (this.view === 'outside') this.controls.update();
      this._render();
    }
    requestAnimationFrame((t) => this._loop(t));
  }
}
