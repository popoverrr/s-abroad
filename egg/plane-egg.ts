/**
 * S ABROAD — пасхалка «поймай самолётик».
 * Самодостаточный модуль без зависимостей: звено из трёх бумажных самолётиков,
 * сложенных из посадочного талона, пролетает по экрану с мёртвой петлёй.
 * Если пользователь ловит самолётик — конфетти из обрывков талона, штамп и вызов onCatch().
 *
 * Стили — в plane-egg.css. Цвета берутся из CSS-переменных сайта (--lime, --pink, …).
 */

export interface PlaneEggLabels {
  /** aria-label кнопки-самолётика, напр. «Поймать самолётик» */
  catchAria: string;
  /** текст на штампе, напр. «ПОЙМАН» */
  stamp: string;
}

export interface PlaneEggOptions {
  /** Вызывается после анимации поимки: открыть контакты (выбор менеджера). */
  onCatch: () => void;
  /** true — сейчас запускать нельзя (открыт диалог и т.п.). Проверяется перед каждым вылетом. */
  isBlocked?: () => boolean;
  /** Включён ли звук переключателем сайта. Свист пролёта играет только при true. */
  soundEnabled?: () => boolean;
  /** Общий AudioContext сайта, если есть. Иначе модуль создаст свой по жесту пользователя. */
  getAudioContext?: () => AudioContext | null;
  /** Элементы, которые самолётики не должны перекрывать (талон, главная кнопка). */
  avoid?: () => Array<Element | null | undefined>;
  /** Вызывается, когда звено вылетело, а звук выключен: можно подсветить кнопку звука. */
  onFlyby?: (info: { soundOn: boolean }) => void;
  labels: PlaneEggLabels | (() => PlaneEggLabels);
  /** Задержка первого вылета, мс. По умолчанию 7000. */
  firstDelayMs?: number;
  /** Пауза между вылетами, если не поймали, мс. По умолчанию 40000. */
  repeatEveryMs?: number;
  /** Сколько всего вылетов за загрузку страницы. По умолчанию 3. */
  maxPasses?: number;
  /** Куда вставить слой. По умолчанию document.body. */
  container?: HTMLElement;
}

export interface PlaneEggHandle {
  /** Запустить звено прямо сейчас (для отладки: window.__egg.launchNow()). */
  launchNow: () => void;
  destroy: () => void;
}

type Variant = 'white' | 'lime' | 'pink';

interface Plane {
  el: HTMLButtonElement;
  variant: Variant;
  offset: number; // боковое смещение от траектории ведущего, px
  delay: number; // отставание от ведущего, мс
  scale: number;
  lastDash: number;
  done: boolean;
  speed: number; // множитель скорости (после поимки остальные улетают быстрее)
  progress: number; // 0..1
  phase: number;
  x: number;
  y: number;
}

const INK = '#0B0B0B';
const PAPER: Record<Variant, [paper: string, stripe: string, under: string]> = {
  white: ['#FFFFFF', 'var(--lime,#D2FF3A)', '#BDBDBD'],
  lime: ['var(--lime,#D2FF3A)', INK, '#9CC41C'],
  pink: ['var(--pink,#FF3D7F)', '#FFFFFF', '#C81F5A'],
};

function planeSvg(v: Variant): string {
  const [paper, stripe, under] = PAPER[v];
  const bars = [20, 23.2, 25.6, 29, 31.4, 34.8, 37.4]
    .map((x, i) => {
      const top = 44 + (40 - x) * 0.722 + 2.2;
      const bot = 70 - (x - 4) * 0.321 - 2.4;
      return `<line x1="${x}" y1="${top.toFixed(1)}" x2="${x}" y2="${bot.toFixed(1)}" stroke="${INK}" stroke-width="${i % 3 === 0 ? 2.2 : 1.2}"/>`;
    })
    .join('');
  const body =
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    `<polygon points="116,34 10,8 44,36" fill="${paper}"/>` +
    `<polygon points="116,34 44,36 40,44" fill="${under}"/>` +
    `<polygon points="116,34 40,44 4,70" fill="${paper}"/></g>` +
    `<polygon points="40.6,20.7 72.4,28.5 71.2,33.3 39.4,25.5" fill="${stripe}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<line x1="22.5" y1="13.5" x2="45" y2="32" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2.5 3.2" stroke-linecap="round"/>` +
    bars +
    `<circle cx="62" cy="46.2" r="3.4" fill="${stripe}" stroke="${INK}" stroke-width="1.4"/>`;
  // тень — тот же силуэт, чёрный, со смещением; без blur
  const shadow =
    `<g class="egg-plane-shadow" fill="${INK}" fill-opacity=".28">` +
    `<polygon points="116,34 10,8 44,36"/><polygon points="116,34 40,44 4,70"/></g>`;
  return (
    `<svg class="egg-plane-svg" viewBox="-6 -6 132 104" aria-hidden="true" focusable="false" shape-rendering="geometricPrecision">` +
    shadow +
    `<g class="egg-plane-body">${body}</g></svg>`
  );
}

/* ───────────── траектория ───────────── */

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function buildPath(w: number, h: number, avoid: DOMRect[]): { d: string; duration: number } {
  const mobile = w < 768;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  if (mobile) {
    // полоса над талоном: от шапки до верхней границы «запретных» элементов
    let ceil = h * 0.46;
    for (const r of avoid) if (r.bottom > 0 && r.top < h && r.top > 90) ceil = Math.min(ceil, r.top - 28);
    const b: Box = { x0: 0, y0: 64, x1: w, y1: Math.max(ceil, 190) };
    const bh = b.y1 - b.y0;
    const r = clamp(bh * 0.24, 26, 46);
    const S = { x: -110, y: b.y0 + bh * 0.82 };
    const E = { x: w * 0.56, y: b.y0 + bh * 0.5 + r };
    const T = { x: E.x, y: E.y - 2 * r };
    const X = { x: w + 130, y: b.y0 + bh * 0.12 };
    const d =
      `M ${S.x} ${S.y} C ${S.x + w * 0.3} ${S.y - bh * 0.5}, ${E.x - 110} ${E.y}, ${E.x} ${E.y} ` +
      `A ${r} ${r} 0 0 0 ${T.x} ${T.y} A ${r} ${r} 0 0 0 ${E.x} ${E.y} ` +
      `C ${E.x + 90} ${E.y}, ${X.x - 150} ${X.y + 50}, ${X.x} ${X.y}`;
    return { d, duration: 4300 };
  }
  // десктоп: слева-снизу → петля над героем → уход вверх, не заходя на талон
  let xLimit = w;
  for (const r of avoid) if (r.width > 0 && r.left > w * 0.4) xLimit = Math.min(xLimit, r.left - 48);
  const b: Box = { x0: 0, y0: 0, x1: Math.max(xLimit, w * 0.45), y1: h };
  const bw = b.x1 - b.x0;
  const r = clamp(Math.min(bw, h) * 0.11, 48, 92);
  const S = { x: -150, y: h * 0.8 };
  const E = { x: bw * 0.52, y: h * 0.44 + r };
  const T = { x: E.x, y: E.y - 2 * r };
  const X = { x: b.x1 - 70, y: -170 };
  const d =
    `M ${S.x} ${S.y} C ${S.x + bw * 0.28} ${S.y - h * 0.3}, ${E.x - 200} ${E.y}, ${E.x} ${E.y} ` +
    `A ${r} ${r} 0 0 0 ${T.x} ${T.y} A ${r} ${r} 0 0 0 ${E.x} ${E.y} ` +
    `C ${E.x + 170} ${E.y}, ${X.x - 30} ${X.y + 300}, ${X.x} ${X.y}`;
  return { d, duration: 5400 };
}

/* ───────────── звук (WebAudio, без файлов) ───────────── */

class EggAudio {
  private own: AudioContext | null = null;
  constructor(private ext?: () => AudioContext | null) {}

  ctx(create: boolean): AudioContext | null {
    const e = this.ext?.();
    if (e) return e;
    if (!this.own && create) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.own = new AC();
    }
    if (this.own?.state === 'suspended') void this.own.resume();
    return this.own;
  }

  private noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** Пролёт: шум через bandpass с «доплером» и панорамой слева направо. */
  whoosh(durationMs: number, gain = 0.07): void {
    const ctx = this.ctx(false);
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const dur = durationMs / 1000;
    const src = this.noise(ctx, dur + 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(2300, t + dur * 0.55); // петля
    bp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(gain * 1.3, t + dur * 0.52);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last: AudioNode = g;
    if (typeof ctx.createStereoPanner === 'function') {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.9, t);
      pan.pan.linearRampToValueAtTime(0.9, t + dur);
      g.connect(pan);
      last = pan;
    }
    src.connect(bp).connect(g);
    last.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  /** Поимка: хруст бумаги + «тук» штампа + восходящий аэропортовый перезвон. */
  catchChime(): void {
    const ctx = this.ctx(true);
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    // хруст бумаги: три коротких всплеска шума через highpass
    [0, 0.045, 0.1].forEach((dt, i) => {
      const n = this.noise(ctx, 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2600 + i * 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16 - i * 0.04, t + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.045);
      n.connect(hp).connect(g).connect(ctx.destination);
      n.start(t + dt);
      n.stop(t + dt + 0.06);
    });
    // «тук» штампа
    const th = ctx.createOscillator();
    const thg = ctx.createGain();
    th.type = 'sine';
    th.frequency.setValueAtTime(150, t + 0.16);
    th.frequency.exponentialRampToValueAtTime(52, t + 0.3);
    thg.gain.setValueAtTime(0.32, t + 0.16);
    thg.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    th.connect(thg).connect(ctx.destination);
    th.start(t + 0.16);
    th.stop(t + 0.36);
    // перезвон: E5 → G5 → C6
    [659.25, 783.99, 1046.5].forEach((f, i) => {
      const at = t + 0.3 + i * 0.13;
      [1, 2.01].forEach((mul, k) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = k === 0 ? 'sine' : 'triangle';
        o.frequency.value = f * mul;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(k === 0 ? 0.13 : 0.03, at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.9 : 0.42));
        o.connect(g).connect(ctx.destination);
        o.start(at);
        o.stop(at + 1);
      });
    });
  }
}

/* ───────────── основной модуль ───────────── */

export function initPlaneEgg(opts: PlaneEggOptions): PlaneEggHandle {
  const firstDelay = opts.firstDelayMs ?? 7000;
  const repeatEvery = opts.repeatEveryMs ?? 40000;
  const maxPasses = opts.maxPasses ?? 3;
  const labels = () => (typeof opts.labels === 'function' ? opts.labels() : opts.labels);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const audio = new EggAudio(opts.getAudioContext);

  const layer = document.createElement('div');
  layer.className = 'egg-layer';
  (opts.container ?? document.body).appendChild(layer);

  const svgNS = 'http://www.w3.org/2000/svg';
  const helperSvg = document.createElementNS(svgNS, 'svg');
  helperSvg.setAttribute('class', 'egg-helper');
  helperSvg.setAttribute('aria-hidden', 'true');
  const pathEl = document.createElementNS(svgNS, 'path');
  helperSvg.appendChild(pathEl);
  layer.appendChild(helperSvg);

  let passes = 0;
  let caught = false;
  let destroyed = false;
  let flying = false;
  let raf = 0;
  let timer = 0;
  let visibleMs = 0;
  let lastTick = performance.now();
  let nextAt = firstDelay;

  /* планировщик: считает только время, когда вкладка видима */
  const tick = () => {
    if (destroyed) return;
    const now = performance.now();
    if (!document.hidden) visibleMs += Math.min(now - lastTick, 1000);
    lastTick = now;
    if (!flying && !caught && passes < maxPasses && visibleMs >= nextAt) {
      if (opts.isBlocked?.()) nextAt = visibleMs + 1500;
      else launch();
    }
    timer = window.setTimeout(tick, 250);
  };

  function makePlane(variant: Variant, offset: number, delay: number, scale: number, phase: number): Plane {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `egg-plane egg-plane--${variant}`;
    el.tabIndex = -1;
    el.setAttribute('aria-label', labels().catchAria);
    el.innerHTML = planeSvg(variant);
    el.style.setProperty('--egg-scale', String(scale));
    layer.appendChild(el);
    const p: Plane = { el, variant, offset, delay, scale, lastDash: 0, done: false, speed: 1, progress: 0, phase, x: -999, y: -999 };
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      onCaught(p);
    });
    return p;
  }

  function spawnDash(x: number, y: number, angle: number, variant: Variant): void {
    const d = document.createElement('i');
    d.className = `egg-dash egg-dash--${variant}`;
    d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
    layer.appendChild(d);
    const a = d.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 950, easing: 'linear' });
    a.onfinish = () => d.remove();
  }

  let planes: Plane[] = [];

  function launch(): void {
    if (destroyed || flying || caught) return;
    if (reduced) {
      parkStatic();
      passes = maxPasses;
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const avoid = (opts.avoid?.() ?? []).filter((e): e is Element => !!e).map((e) => e.getBoundingClientRect());
    const { d, duration } = buildPath(w, h, avoid);
    pathEl.setAttribute('d', d);
    const total = pathEl.getTotalLength();
    const mobile = w < 768;
    const base = mobile ? 0.82 : 1;
    planes = [
      makePlane('white', 0, 0, base, 0),
      makePlane('lime', mobile ? 28 : 42, 430, base * 0.86, 1.7),
      makePlane('pink', mobile ? -26 : -38, 780, base * 0.76, 3.1),
    ];
    flying = true;
    passes++;
    const soundOn = opts.soundEnabled?.() ?? false;
    if (soundOn) audio.whoosh(duration + 600);
    opts.onFlyby?.({ soundOn });

    let prev = performance.now();
    const frame = (now: number) => {
      if (destroyed) return;
      const dt = Math.min(now - prev, 50);
      prev = now;
      let alive = 0;
      for (const p of planes) {
        if (p.done) continue;
        if (p.delay > 0) {
          p.delay -= dt;
          alive++;
          continue;
        }
        p.progress += (dt / duration) * p.speed;
        if (p.progress >= 1) {
          p.done = true;
          p.el.remove();
          continue;
        }
        alive++;
        // почти равномерно, с мягким разгоном и торможением
        const t = p.progress;
        const s = total * (0.7 * t + 0.3 * t * t * (3 - 2 * t));
        const a = pathEl.getPointAtLength(s);
        const b = pathEl.getPointAtLength(Math.min(s + 2, total));
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const wob = Math.sin(now / 210 + p.phase);
        const x = a.x + nx * (p.offset + wob * 3);
        const y = a.y + ny * (p.offset + wob * 3);
        p.x = x;
        p.y = y;
        const deg = (ang * 180) / Math.PI;
        const roll = 1 - 0.1 * (0.5 + 0.5 * Math.sin(now / 330 + p.phase * 2));
        p.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) rotate(${deg.toFixed(1)}deg) scale(${p.scale},${(p.scale * roll).toFixed(3)})`;
        // тень всегда «падает» вниз-вправо на экране, независимо от поворота самолётика
        const k = 132 / p.el.offsetWidth / p.scale; // px экрана → единицы viewBox
        const sx = 6 * k;
        const sy = 9 * k;
        p.el.style.setProperty('--egg-sx', `${(Math.cos(ang) * sx + Math.sin(ang) * sy).toFixed(1)}px`);
        p.el.style.setProperty('--egg-sy', `${((-Math.sin(ang) * sx + Math.cos(ang) * sy) / roll).toFixed(1)}px`);
        // пунктирный след
        if (s - p.lastDash > 17) {
          p.lastDash = s;
          const tail = 34 * p.scale;
          spawnDash(x - Math.cos(ang) * tail, y - Math.sin(ang) * tail, deg, p.variant);
        }
      }
      if (alive > 0) raf = requestAnimationFrame(frame);
      else endPass();
    };
    raf = requestAnimationFrame(frame);
  }

  function endPass(): void {
    flying = false;
    planes = [];
    nextAt = visibleMs + repeatEvery;
  }

  function onCaught(p: Plane): void {
    if (caught) return;
    caught = true;
    audio.catchChime();
    // остальные улетают быстрее
    for (const o of planes) {
      if (o !== p) {
        o.speed = 2.4;
        o.el.style.pointerEvents = 'none';
      }
    }
    p.done = true;
    const x = p.x;
    const y = p.y;
    p.el.style.pointerEvents = 'none';
    const cur = p.el.style.transform;
    const pop = p.el.animate(
      [
        { transform: cur },
        { transform: `${cur} scale(1.35)`, offset: 0.35 },
        { transform: `${cur} scale(0.05) rotate(40deg)`, opacity: 0 },
      ],
      { duration: 260, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'forwards' },
    );
    pop.onfinish = () => p.el.remove();
    burst(x, y);
    stamp(x, y);
    window.setTimeout(() => {
      if (!destroyed) opts.onCatch();
    }, 720);
  }

  function burst(x: number, y: number): void {
    const colors = ['var(--lime,#D2FF3A)', 'var(--pink,#FF3D7F)', 'var(--orange,#FF7A1A)', 'var(--violet,#6A4DFF)', '#FFFFFF'];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      const kind = i % 3 === 0 ? 'star' : i % 3 === 1 ? 'ticket' : 'dot';
      el.className = `egg-bit egg-bit--${kind}`;
      el.style.background = colors[i % colors.length];
      layer.appendChild(el);
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 90;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const rot = (Math.random() - 0.5) * 720;
      const a = el.animate(
        [
          { transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(0deg) scale(.3)`, opacity: 1 },
          { transform: `translate(${x + dx * 0.8}px,${y + dy * 0.8 - 22}px) translate(-50%,-50%) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${x + dx}px,${y + dy + 70}px) translate(-50%,-50%) rotate(${rot}deg) scale(.85)`, opacity: 0 },
        ],
        { duration: 820 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
      );
      a.onfinish = () => el.remove();
    }
  }

  function stamp(x: number, y: number): void {
    const el = document.createElement('div');
    el.className = 'egg-stamp';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<span class="egg-stamp-ring"></span><span class="egg-stamp-text">${labels().stamp}</span>`;
    const m = 60;
    const cx = Math.max(m, Math.min(window.innerWidth - m, x));
    const cy = Math.max(m, Math.min(window.innerHeight - m, y));
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    layer.appendChild(el);
    const a = el.animate(
      [
        { transform: 'translate(-50%,-50%) rotate(-10deg) scale(1.9)', opacity: 0 },
        { transform: 'translate(-50%,-50%) rotate(-10deg) scale(.94)', opacity: 1, offset: 0.16 },
        { transform: 'translate(-50%,-50%) rotate(-10deg) scale(1)', opacity: 1, offset: 0.24 },
        { transform: 'translate(-50%,-50%) rotate(-10deg) scale(1)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%,-50%) rotate(-10deg) scale(1.08)', opacity: 0 },
      ],
      { duration: 1150, easing: 'ease-out', fill: 'forwards', delay: 120 },
    );
    a.onfinish = () => el.remove();
  }

  /** prefers-reduced-motion: один неподвижный самолётик в углу, по нажатию — то же, что поимка. */
  function parkStatic(): void {
    const p = makePlane('white', 0, 0, 0.8, 0);
    p.el.classList.add('egg-plane--parked');
    p.el.tabIndex = 0;
    const r = p.el.getBoundingClientRect();
    p.x = r.left + r.width / 2;
    p.y = r.top + r.height / 2;
    p.el.addEventListener('click', () => onCaught(p));
  }

  tick();

  return {
    launchNow: () => {
      caught = false;
      if (!flying) launch();
    },
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      layer.remove();
    },
  };
}
