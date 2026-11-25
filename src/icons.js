/**
 * Custom hardware/neon SVG icon factory for UI chrome, roulette slots, and vending cans.
 * Uses pure SVG DOM construction (createElementNS) with zero HTML string injection.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}

function makeSvg(viewBox, size, className = 'ui-svg-icon') {
  const svg = el('svg', {
    viewBox,
    width: size,
    height: size,
    class: className,
    'aria-hidden': 'true',
    focusable: 'false',
  });
  return svg;
}

const CHAOS_GLYPHS = {
  monochrome: (s) => {
    s.append(
      el('rect', { x: 2, y: 2, width: 16, height: 16, rx: 3, fill: '#111827', stroke: '#ffffff', 'stroke-width': 1.5 }),
      el('rect', { x: 4, y: 4, width: 6, height: 6, fill: '#ffffff' }),
      el('rect', { x: 10, y: 10, width: 6, height: 6, fill: '#ffffff' }),
    );
  },
  stretch: (s) => {
    s.append(
      el('rect', { x: 2, y: 5, width: 16, height: 10, rx: 3, fill: '#1e293b', stroke: '#00f5d4', 'stroke-width': 1.5 }),
      el('path', { d: 'M8 10H4M4 10L6 8M4 10L6 12M12 10H16M16 10L14 8M16 10L14 12', fill: 'none', stroke: '#ffe600', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  spamclick: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 7, fill: 'none', stroke: '#ff2bd6', 'stroke-width': 1.6 }),
      el('path', { d: 'M10 1.5V5M10 15V18.5M1.5 10H5M15 10H18.5', stroke: '#ffe600', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('circle', { cx: 10, cy: 10, r: 2.2, fill: '#ff2bd6' }),
    );
  },
  antigrav: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 8, fill: '#1e1b4b', stroke: '#a6ff2e', 'stroke-width': 1.5 }),
      el('path', { d: 'M10 15V5M6.5 8.5L10 5L13.5 8.5', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  bouncy: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 9, r: 6.5, fill: '#ff7b00', stroke: '#090314', 'stroke-width': 1.5 }),
      el('path', { d: 'M4.5 9H15.5M10 3V15', fill: 'none', stroke: '#ffe600', 'stroke-width': 1.3 }),
      el('path', { d: 'M5 17.5Q10 15.5 15 17.5', fill: 'none', stroke: '#00f5d4', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    );
  },
  tornado: (s) => {
    s.append(
      el('path', { d: 'M3 4.5H17M5 8H15M7 11.5H13.5M8.5 15H12M9.5 17.5L10.5 18', fill: 'none', stroke: '#00f5d4', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    );
  },
  sideways: (s) => {
    s.append(
      el('path', { d: 'M2 6H14C16 6 16 3.5 14 3.5M2 10.5H17M2 15H12C14 15 14 17.5 12 17.5', fill: 'none', stroke: '#38bdf8', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  inflate: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 9, r: 7, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.5 }),
      el('ellipse', { cx: 7.5, cy: 6.5, rx: 2, ry: 1.2, fill: '#ffffff', opacity: 0.75 }),
      el('path', { d: 'M10 16L9 19', stroke: '#ffe600', 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
    );
  },
  mirror: (s) => {
    s.append(
      el('path', { d: 'M10 2V18', stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }),
      el('polygon', { points: '3,10 8,6 8,14', fill: '#00f5d4' }),
      el('polygon', { points: '17,10 12,6 12,14', fill: '#ff2bd6' }),
    );
  },
  popcorn: (s) => {
    s.append(
      el('path', { d: 'M10 2L12.2 6.8L17.5 7.5L13.5 11.2L14.5 16.5L10 13.8L5.5 16.5L6.5 11.2L2.5 7.5L7.8 6.8Z', fill: '#ffe600', stroke: '#ff7b00', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }),
    );
  },
  rain: (s) => {
    s.append(
      el('path', { d: 'M6 4L4.5 9M10.5 3L9 8M15 4.5L13.5 9.5M7 12L5.5 17M13 12L11.5 17', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    );
  },
  quake: (s) => {
    s.append(
      el('path', { d: 'M2 10H5L7 4L10 16L13 6L15 12L18 10', fill: 'none', stroke: '#ff7b00', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  magnet: (s) => {
    s.append(
      el('path', { d: 'M5 4V11A5 5 0 0 0 15 11V4', fill: 'none', stroke: '#ef4444', 'stroke-width': 3.2, 'stroke-linecap': 'butt' }),
      el('rect', { x: 3.4, y: 2.5, width: 3.2, height: 3, fill: '#e2e8f0' }),
      el('rect', { x: 13.4, y: 2.5, width: 3.2, height: 3, fill: '#e2e8f0' }),
    );
  },
  flashlight: (s) => {
    s.append(
      el('polygon', { points: '8,11 18,3 18,17', fill: '#ffe600', opacity: 0.72 }),
      el('rect', { x: 2, y: 8.5, width: 7, height: 5, rx: 1.5, fill: '#94a3b8', stroke: '#090314', 'stroke-width': 1.2 }),
    );
  },
  cosplay: (s) => {
    s.append(
      el('rect', { x: 2.5, y: 5, width: 15, height: 10, rx: 4, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.5 }),
      el('circle', { cx: 7, cy: 10, r: 2, fill: '#090314' }),
      el('circle', { cx: 13, cy: 10, r: 2, fill: '#090314' }),
    );
  },
  faketier: (s) => {
    s.append(
      el('rect', { x: 3, y: 6, width: 14, height: 8, rx: 1.5, fill: '#facc15', stroke: '#090314', 'stroke-width': 1.4 }),
      el('path', { d: 'M6 6V10M10 6V11.5M14 6V10', stroke: '#090314', 'stroke-width': 1.4 }),
    );
  },
  mystery: (s) => {
    s.append(
      el('rect', { x: 3, y: 3, width: 14, height: 14, rx: 3, fill: '#7e22ce', stroke: '#ffe600', 'stroke-width': 1.6 }),
      el('path', { d: 'M8 7.5A2 2 0 1 1 11.5 9C11.5 10.2 10 10.6 10 12', fill: 'none', stroke: '#ffffff', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('circle', { cx: 10, cy: 14.5, r: 1, fill: '#ffe600' }),
    );
  },
  popups: (s) => {
    s.append(
      el('rect', { x: 2.5, y: 3.5, width: 15, height: 13, rx: 2, fill: '#cbd5e1', stroke: '#090314', 'stroke-width': 1.4 }),
      el('rect', { x: 2.5, y: 3.5, width: 15, height: 4, fill: '#2563eb' }),
      el('path', { d: 'M8 10L12 14M12 10L8 14', stroke: '#ef4444', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  upsidedown: (s) => {
    s.append(
      el('path', { d: 'M4 8A6 6 0 0 1 16 8M16 12A6 6 0 0 1 4 12', fill: 'none', stroke: '#ff2bd6', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('polygon', { points: '17,9 14,5 18,5', fill: '#ffe600' }),
      el('polygon', { points: '3,11 6,15 2,15', fill: '#00f5d4' }),
    );
  },
  zoom: (s) => {
    s.append(
      el('circle', { cx: 8.5, cy: 8.5, r: 5.2, fill: '#082f49', stroke: '#00f5d4', 'stroke-width': 1.8 }),
      el('line', { x1: 12.5, y1: 12.5, x2: 17.5, y2: 17.5, stroke: '#ffe600', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    );
  },
  wall: (s) => {
    s.append(
      el('rect', { x: 3, y: 3, width: 14, height: 14, rx: 1.5, fill: '#c2410c', stroke: '#090314', 'stroke-width': 1.4 }),
      el('path', { d: 'M3 8H17M3 12.5H17M10 3V8M6.5 8V12.5M13.5 8V12.5M10 12.5V17', stroke: '#fde68a', 'stroke-width': 1.1 }),
    );
  },
  strike: (s) => {
    s.append(
      el('polygon', { points: '6,2 14,2 18,6 18,14 14,18 6,18 2,14 2,6', fill: '#dc2626', stroke: '#090314', 'stroke-width': 1.4 }),
      el('line', { x1: 6, y1: 10, x2: 14, y2: 10, stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-linecap': 'round' }),
    );
  },
  elevator: (s) => {
    s.append(
      el('rect', { x: 3, y: 3, width: 14, height: 14, rx: 2, fill: '#1e293b', stroke: '#94a3b8', 'stroke-width': 1.4 }),
      el('polygon', { points: '7,9 10,5 13,9', fill: '#a6ff2e' }),
      el('polygon', { points: '7,11 10,15 13,11', fill: '#ff2bd6' }),
    );
  },
  pixelate: (s) => {
    s.append(
      el('rect', { x: 3, y: 5, width: 4, height: 4, fill: '#a6ff2e' }),
      el('rect', { x: 13, y: 5, width: 4, height: 4, fill: '#a6ff2e' }),
      el('rect', { x: 5, y: 8, width: 10, height: 6, fill: '#00f5d4' }),
      el('rect', { x: 7, y: 9.5, width: 2, height: 2, fill: '#090314' }),
      el('rect', { x: 11, y: 9.5, width: 2, height: 2, fill: '#090314' }),
    );
  },
  ghost: (s) => {
    s.append(
      el('path', { d: 'M4 17V9A6 6 0 0 1 16 9V17L13.5 15L11.5 17L10 15L8.5 17L6.5 15Z', fill: '#e2e8f0', stroke: '#00f5d4', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }),
      el('circle', { cx: 8, cy: 9, r: 1.3, fill: '#090314' }),
      el('circle', { cx: 12, cy: 9, r: 1.3, fill: '#090314' }),
    );
  },
  runaway: (s) => {
    s.append(
      el('path', { d: 'M3 10H14M10 5L16 10L10 15', fill: 'none', stroke: '#ffe600', 'stroke-width': 2.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      el('line', { x1: 2, y1: 6, x2: 7, y2: 6, stroke: '#ff2bd6', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
      el('line', { x1: 2, y1: 14, x2: 7, y2: 14, stroke: '#00f5d4', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    );
  },
  lag: (s) => {
    s.append(
      el('path', { d: 'M5 14A7 7 0 0 1 15 14M7.5 11.5A3.5 3.5 0 0 1 12.5 11.5', fill: 'none', stroke: '#ff7b00', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('circle', { cx: 10, cy: 15.5, r: 1.8, fill: '#ef4444' }),
      el('path', { d: 'M14.5 3.5L11.5 7.5L13.5 7.5L11 10.5', fill: 'none', stroke: '#ffe600', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  blackhole: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 7.5, fill: '#090314', stroke: '#a855f7', 'stroke-width': 1.8 }),
      el('circle', { cx: 10, cy: 10, r: 4.5, fill: '#000000', stroke: '#ff2bd6', 'stroke-width': 1.3 }),
      el('circle', { cx: 10, cy: 10, r: 2, fill: '#ffffff' }),
    );
  },
  ufo: (s) => {
    s.append(
      el('ellipse', { cx: 10, cy: 10.5, rx: 7.5, ry: 3, fill: '#94a3b8', stroke: '#090314', 'stroke-width': 1.3 }),
      el('path', { d: 'M6.5 9.5A3.5 3.5 0 0 1 13.5 9.5', fill: '#00f5d4', stroke: '#090314', 'stroke-width': 1.2 }),
      el('polygon', { points: '7,13.5 13,13.5 15,18 5,18', fill: '#a6ff2e', opacity: 0.6 }),
    );
  },
  hotpotato: (s) => {
    s.append(
      el('circle', { cx: 9, cy: 11.5, r: 5.8, fill: '#1f2937', stroke: '#ef4444', 'stroke-width': 1.6 }),
      el('path', { d: 'M12.5 6.5L15 4', stroke: '#ffe600', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('circle', { cx: 16, cy: 3.5, r: 1.6, fill: '#ff7b00' }),
    );
  },
  swap: (s) => {
    s.append(
      el('path', { d: 'M4 7H15L12.5 4.5M16 13H5L7.5 15.5', fill: 'none', stroke: '#00f5d4', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  talljar: (s) => {
    s.append(
      el('path', { d: 'M5 3V17M15 3V17M10 5V15.5M7 12.5L10 15.5L13 12.5', fill: 'none', stroke: '#facc15', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  fourthwall: (s) => {
    s.append(
      el('rect', { x: 2.5, y: 3, width: 15, height: 11, rx: 3, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.4 }),
      el('polygon', { points: '6,14 9,14 5.5,18', fill: '#ff2bd6' }),
      el('circle', { cx: 7, cy: 8.5, r: 1.2, fill: '#ffffff' }),
      el('circle', { cx: 10, cy: 8.5, r: 1.2, fill: '#ffffff' }),
      el('circle', { cx: 13, cy: 8.5, r: 1.2, fill: '#ffffff' }),
    );
  },
  'slot-ready': (s) => {
    s.append(
      el('rect', { x: 2.5, y: 4, width: 15, height: 12, rx: 2.5, fill: '#451a03', stroke: '#ffe600', 'stroke-width': 1.6 }),
      el('line', { x1: 7.5, y1: 5, x2: 7.5, y2: 15, stroke: '#92400e', 'stroke-width': 1.1 }),
      el('line', { x1: 12.5, y1: 5, x2: 12.5, y2: 15, stroke: '#92400e', 'stroke-width': 1.1 }),
      el('path', { d: 'M4 8.5H6L4.5 12M9 8.5H11L9.5 12M14 8.5H16L14.5 12', fill: 'none', stroke: '#ffe600', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  'zen-breath': (s) => {
    s.append(
      el('path', { d: 'M10 17C5 16 3 11 5 6C9 4 14 5 16 9C16 14 13 17 10 17Z', fill: '#22c55e', stroke: '#052e16', 'stroke-width': 1.4 }),
      el('path', { d: 'M7 14C9.5 11.5 12 9 14 7', fill: 'none', stroke: '#bbf7d0', 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
    );
  },
  'zen-lotus': (s) => {
    s.append(
      el('path', { d: 'M10 3C8 7 8 11 10 14C12 11 12 7 10 3Z', fill: '#38bdf8' }),
      el('path', { d: 'M10 14C6 12 4 9 4 6C7 7 9 9.5 10 14ZM10 14C14 12 16 9 16 6C13 7 11 9.5 10 14Z', fill: '#00f5d4', opacity: 0.85 }),
      el('line', { x1: 4, y1: 16, x2: 16, y2: 16, stroke: '#a6ff2e', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  'zen-melon': (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 7, fill: '#16a34a', stroke: '#052e16', 'stroke-width': 1.5 }),
      el('path', { d: 'M6 5C7.5 8 7.5 12 6 15M10 3.5C11 8 11 12 10 16.5M14 5C12.5 8 12.5 12 14 15', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 1.3 }),
    );
  },
  pinball: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 7.2, fill: '#ff2bd6', stroke: '#ffe600', 'stroke-width': 1.8 }),
      el('circle', { cx: 10, cy: 10, r: 3.4, fill: '#00f5d4', stroke: '#090314', 'stroke-width': 1.3 }),
    );
  },
  tiltfloor: (s) => {
    s.append(
      el('path', { d: 'M2 13Q6 10 10 13T18 13', fill: 'none', stroke: '#38bdf8', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      el('path', { d: 'M4 8L16 11L14.5 14L5.5 12Z', fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }),
    );
  },
  kraken: (s) => {
    s.append(
      el('path', { d: 'M4 16C5 9 9 4 14 5C17 6 17 10 14 11C12 11.5 11.5 9.5 13 9', fill: 'none', stroke: '#a855f7', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      el('circle', { cx: 6.5, cy: 12, r: 1.1, fill: '#ffe600' }),
      el('circle', { cx: 9, cy: 8.5, r: 1.1, fill: '#ffe600' }),
    );
  },
  laser: (s) => {
    s.append(
      el('line', { x1: 2, y1: 10, x2: 18, y2: 10, stroke: '#ff2bd6', 'stroke-width': 3.2, 'stroke-linecap': 'round' }),
      el('line', { x1: 2, y1: 10, x2: 18, y2: 10, stroke: '#ffffff', 'stroke-width': 1.1 }),
      el('polygon', { points: '5,6 2,10 5,14', fill: '#ffe600' }),
    );
  },
  mosquitos: (s) => {
    s.append(
      el('ellipse', { cx: 7, cy: 7, rx: 3.5, ry: 2, transform: 'rotate(-25 7 7)', fill: '#00f5d4', opacity: 0.7 }),
      el('ellipse', { cx: 13, cy: 7, rx: 3.5, ry: 2, transform: 'rotate(25 13 7)', fill: '#00f5d4', opacity: 0.7 }),
      el('circle', { cx: 10, cy: 11.5, r: 3.2, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.4 }),
      el('line', { x1: 10, y1: 14.5, x2: 10, y2: 18.5, stroke: '#ffe600', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    );
  },
  meteors: (s) => {
    s.append(
      el('path', { d: 'M16 3L9 10M17.5 6.5L12 12M12.5 2.5L7.5 7.5', stroke: '#ff7b00', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
      el('circle', { cx: 7, cy: 13, r: 4.5, fill: '#ffe600', stroke: '#dc2626', 'stroke-width': 1.8 }),
    );
  },
  bullet_time: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 10, r: 7.5, fill: '#052e16', stroke: '#22c55e', 'stroke-width': 1.8 }),
      el('path', { d: 'M10 5.5V10L13.5 12', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  dna_glitch: (s) => {
    s.append(
      el('path', { d: 'M6 3C14 6 6 14 14 17M14 3C6 6 14 14 6 17', fill: 'none', stroke: '#00f5d4', 'stroke-width': 1.9, 'stroke-linecap': 'round' }),
      el('line', { x1: 7.5, y1: 7, x2: 12.5, y2: 7, stroke: '#ff2bd6', 'stroke-width': 1.5 }),
      el('line', { x1: 7.5, y1: 13, x2: 12.5, y2: 13, stroke: '#ffe600', 'stroke-width': 1.5 }),
    );
  },
  defrag: (s) => {
    s.append(
      el('rect', { x: 2.5, y: 4, width: 4, height: 12, rx: 1, fill: '#00f5d4' }),
      el('rect', { x: 8, y: 4, width: 4, height: 12, rx: 1, fill: '#ffe600' }),
      el('rect', { x: 13.5, y: 4, width: 4, height: 12, rx: 1, fill: '#ff2bd6' }),
    );
  },
  ui_sabotage: (s) => {
    s.append(
      el('rect', { x: 3, y: 6, width: 14, height: 8, rx: 2, fill: '#dc2626', stroke: '#ffe600', 'stroke-width': 1.5, 'stroke-dasharray': '3 1.5' }),
      el('path', { d: 'M8 10H12M10 8V12', stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    );
  },
  gameboy: (s) => {
    s.append(
      el('rect', { x: 4.5, y: 2, width: 11, height: 16, rx: 2, fill: '#9bbc0f', stroke: '#0f380f', 'stroke-width': 1.6 }),
      el('rect', { x: 6.5, y: 4, width: 7, height: 5.5, fill: '#306230', stroke: '#0f380f', 'stroke-width': 1 }),
      el('circle', { cx: 13, cy: 13.5, r: 1.2, fill: '#0f380f' }),
      el('path', { d: 'M7 13.5H9.5M8.25 12.2V14.8', stroke: '#0f380f', 'stroke-width': 1.3, 'stroke-linecap': 'round' }),
    );
  },
  pacman: (s) => {
    s.append(
      el('path', { d: 'M10 10L16.5 6A7.5 7.5 0 1 0 16.5 14Z', fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
      el('circle', { cx: 10.5, cy: 6, r: 1.2, fill: '#090314' }),
      el('circle', { cx: 17, cy: 10, r: 1.4, fill: '#ff2bd6' }),
    );
  },
  pong: (s) => {
    s.append(
      el('rect', { x: 3, y: 12, width: 14, height: 3.5, rx: 1.5, fill: '#00f5d4', stroke: '#090314', 'stroke-width': 1.2 }),
      el('rect', { x: 8, y: 4.5, width: 4, height: 4, rx: 0.8, fill: '#ffffff', stroke: '#ff2bd6', 'stroke-width': 1.2 }),
      el('path', { d: 'M10 10.5V8.5', stroke: '#ffe600', 'stroke-width': 1.4, 'stroke-dasharray': '1.5 1.5' }),
    );
  },
  mitosis: (s) => {
    s.append(
      el('circle', { cx: 6.5, cy: 10, r: 4, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.4 }),
      el('circle', { cx: 13.5, cy: 10, r: 4, fill: '#00f5d4', stroke: '#090314', 'stroke-width': 1.4 }),
      el('path', { d: 'M10 4V16', stroke: '#ffe600', 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }),
    );
  },
  lightning: (s) => {
    s.append(
      el('polygon', { points: '11.5,2 5,11 9.5,11 8,18 15,9 10.5,9', fill: '#ffe600', stroke: '#ff7b00', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }),
    );
  },
  helium: (s) => {
    s.append(
      el('circle', { cx: 10, cy: 9, r: 6.5, fill: 'none', stroke: '#38bdf8', 'stroke-width': 1.8 }),
      el('path', { d: 'M10 13V5M7.5 7.5L10 5L12.5 7.5', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      el('circle', { cx: 4, cy: 4.5, r: 1.2, fill: '#ffe600' }),
      el('circle', { cx: 16, cy: 15, r: 1.2, fill: '#ff2bd6' }),
    );
  },
  double_drop: (s) => {
    s.append(
      el('circle', { cx: 6.5, cy: 12, r: 4.2, fill: '#a6ff2e', stroke: '#090314', 'stroke-width': 1.4 }),
      el('circle', { cx: 13.5, cy: 12, r: 4.2, fill: '#ff2bd6', stroke: '#090314', 'stroke-width': 1.4 }),
      el('path', { d: 'M6.5 3V6M13.5 3V6', stroke: '#ffe600', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  vhs: (s) => {
    s.append(
      el('rect', { x: 2.5, y: 5, width: 15, height: 10, rx: 2, fill: '#1e293b', stroke: '#ff2bd6', 'stroke-width': 1.5 }),
      el('circle', { cx: 7, cy: 10, r: 2.2, fill: '#090314', stroke: '#ffffff', 'stroke-width': 1.2 }),
      el('circle', { cx: 13, cy: 10, r: 2.2, fill: '#090314', stroke: '#ffffff', 'stroke-width': 1.2 }),
      el('line', { x1: 7, y1: 10, x2: 13, y2: 10, stroke: '#00f5d4', 'stroke-width': 1.2 }),
    );
  },
  dvd_bounce: (s) => {
    s.append(
      el('ellipse', { cx: 10, cy: 9, rx: 7.5, ry: 4.2, fill: '#090314', stroke: '#00f5d4', 'stroke-width': 1.7 }),
      el('ellipse', { cx: 10, cy: 14, rx: 6, ry: 2, fill: '#ff2bd6' }),
      el('circle', { cx: 10, cy: 14, r: 1, fill: '#090314' }),
    );
  },
  disco: (s) => {
    s.append(
      el('line', { x1: 10, y1: 2, x2: 10, y2: 5, stroke: '#e2e8f0', 'stroke-width': 1.5 }),
      el('circle', { cx: 10, cy: 11, r: 5.8, fill: '#cbd5e1', stroke: '#ff2bd6', 'stroke-width': 1.5 }),
      el('path', { d: 'M5 11H15M10 5.2V16.8M6 7.5H14M6 14.5H14', stroke: '#0f172a', 'stroke-width': 1 }),
      el('circle', { cx: 8, cy: 9, r: 1, fill: '#ffe600' }),
    );
  },
};

export function createChaosIconSvg(id, size = 16, className = 'ui-svg-icon') {
  const svg = makeSvg('0 0 20 20', size, className);
  const draw = CHAOS_GLYPHS[id];
  if (draw) {
    draw(svg);
  } else {
    svg.append(
      el('circle', { cx: 10, cy: 10, r: 6.5, fill: 'none', stroke: '#ff2bd6', 'stroke-width': 2 }),
      el('circle', { cx: 10, cy: 10, r: 2.5, fill: '#ffe600' }),
    );
  }
  return svg;
}

export function createVendingCanSvg(code = '?', color = '#94a3b8') {
  const svg = makeSvg('0 0 20 24', 18, 'vending-can-svg');
  svg.append(
    el('rect', { x: 4, y: 4, width: 12, height: 17, rx: 3, fill: color, stroke: '#090314', 'stroke-width': 1.6 }),
    el('rect', { x: 5.5, y: 2, width: 9, height: 2.5, rx: 1, fill: '#e2e8f0', stroke: '#090314', 'stroke-width': 1 }),
    el('rect', { x: 6, y: 6, width: 2.2, height: 13, rx: 1, fill: '#ffffff', opacity: 0.4 }),
  );
  const txt = el('text', {
    x: 10,
    y: 15.5,
    'text-anchor': 'middle',
    'font-size': 6.5,
    'font-weight': 900,
    fill: '#090314',
  });
  txt.textContent = code;
  svg.append(txt);
  return svg;
}

export function createCloseCrossSvg(size = 10) {
  const svg = makeSvg('0 0 12 12', size, 'ui-svg-icon');
  svg.append(
    el('path', { d: 'M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
  );
  return svg;
}

const ACHIEVEMENT_GLYPHS = {
  locked: (s) => {
    s.append(
      el('path', { d: 'M7 10V7.2A5 5 0 0 1 17 7.2V10', fill: 'none', stroke: '#94a3b8', 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
      el('rect', { x: 5, y: 10, width: 14, height: 11, rx: 2.5, fill: '#1e293b', stroke: '#64748b', 'stroke-width': 1.8 }),
      el('circle', { cx: 12, cy: 14.5, r: 1.6, fill: '#94a3b8' }),
      el('line', { x1: 12, y1: 15.8, x2: 12, y2: 18.5, stroke: '#94a3b8', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  first_drop: (s) => {
    s.append(
      el('circle', { cx: 12, cy: 10, r: 5.5, fill: '#00f5d4', stroke: '#090314', 'stroke-width': 1.8 }),
      el('circle', { cx: 10.2, cy: 8.2, r: 1.4, fill: '#ffffff', opacity: 0.75 }),
      el('ellipse', { cx: 12, cy: 19, rx: 7.5, ry: 2.2, fill: 'none', stroke: '#a6ff2e', 'stroke-width': 1.7 }),
    );
  },
  combo_king: (s) => {
    s.append(
      el('polygon', { points: '13.5,2 5.5,12.5 11,12.5 9,22 18.5,10.5 12.8,10.5', fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
      el('path', { d: 'M4 6L6 8M18 16L20 18', stroke: '#00f5d4', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
  fever_mode: (s) => {
    s.append(
      el('path', { d: 'M12 2.5C15 6.5 19 9.5 19 14.5A7 7 0 0 1 5 14.5C5 10.5 7.5 8.5 9 7C9.5 9.5 11 10 12 2.5Z', fill: '#ff7b00', stroke: '#090314', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
      el('path', { d: 'M12 10.5C14 13 15.5 14.5 15.5 16.5A3.5 3.5 0 0 1 8.5 16.5C8.5 14 10.5 12.5 12 10.5Z', fill: '#ffe600' }),
    );
  },
  survival_cringe: (s) => {
    s.append(
      el('path', { d: 'M12 2.5L19.5 5.5V11.5C19.5 16 16 19.5 12 21.5C8 19.5 4.5 16 4.5 11.5V5.5Z', fill: '#4a0736', stroke: '#ff2bd6', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }),
      el('path', { d: 'M6.5 12H9.2L10.8 8.5L13 15.5L14.8 11L17.5 12', fill: 'none', stroke: '#00f5d4', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    );
  },
  wtf_veteran: (s) => {
    s.append(
      el('circle', { cx: 12, cy: 12, r: 8.5, fill: '#1e1b4b', stroke: '#00f5d4', 'stroke-width': 1.8 }),
      el('path', { d: 'M12 6.5A5.5 5.5 0 1 1 7.2 14.5A3.5 3.5 0 1 1 13.8 10.5', fill: 'none', stroke: '#ff2bd6', 'stroke-width': 2.1, 'stroke-linecap': 'round' }),
      el('circle', { cx: 12, cy: 12, r: 1.8, fill: '#ffe600' }),
    );
  },
  master_chef: (s) => {
    s.append(
      el('polygon', { points: '12,2.5 14.9,8.4 21.4,9.3 16.7,13.9 17.8,20.4 12,17.3 6.2,20.4 7.3,13.9 2.6,9.3 9.1,8.4', fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
      el('circle', { cx: 12, cy: 12.2, r: 2.4, fill: '#ff7b00' }),
    );
  },
  negative_iq: (s) => {
    s.append(
      el('path', { d: 'M7 15.5C4.5 15.5 3.5 13 4.5 10.5C4 8 6.5 5.5 9.5 6C11 4.5 14 4.5 15.5 6.5C18.5 6.5 20.5 9 19.5 11.5C20.5 14 18.5 16.5 15.5 16L13 18.5H9.5Z', fill: '#ff7ae5', stroke: '#090314', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
      el('ellipse', { cx: 10, cy: 9.2, rx: 3.2, ry: 1.3, transform: 'rotate(-16 10 9.2)', fill: '#ffffff', opacity: 0.7 }),
    );
  },
  watermelon: (s) => {
    s.append(
      el('polygon', { points: '7,6.5 8.5,2.5 12,4.5 15.5,2.5 17,6.5', fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.3, 'stroke-linejoin': 'round' }),
      el('circle', { cx: 12, cy: 14, r: 7.2, fill: '#16a34a', stroke: '#090314', 'stroke-width': 1.7 }),
      el('path', { d: 'M8.5 8.2C10 12 10 16 8.5 19.8M12 7.2C13 12 13 16 12 20.8M15.5 8.2C14 12 14 16 15.5 19.8', fill: 'none', stroke: '#a6ff2e', 'stroke-width': 1.4 }),
    );
  },
  inferno_runner: (s) => {
    s.append(
      el('path', { d: 'M5 4L8.5 8.5H15.5L19 4L18.5 12.5C18.5 17.5 15.5 20.5 12 20.5C8.5 20.5 5.5 17.5 5.5 12.5Z', fill: '#dc2626', stroke: '#090314', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }),
      el('polygon', { points: '8,12 11,13.5 8.5,14.8', fill: '#ffe600' }),
      el('polygon', { points: '16,12 13,13.5 15.5,14.8', fill: '#ffe600' }),
      el('path', { d: 'M9 17Q12 19 15 17', fill: 'none', stroke: '#090314', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
    );
  },
  click_maniac: (s) => {
    s.append(
      el('rect', { x: 6.5, y: 6, width: 11, height: 15, rx: 5.5, fill: '#1e293b', stroke: '#00f5d4', 'stroke-width': 1.8 }),
      el('line', { x1: 12, y1: 6, x2: 12, y2: 12.5, stroke: '#00f5d4', 'stroke-width': 1.6 }),
      el('line', { x1: 6.5, y1: 12.5, x2: 17.5, y2: 12.5, stroke: '#00f5d4', 'stroke-width': 1.4 }),
      el('path', { d: 'M4 5L6 7M20 5L18 7M12 1.8V4.2', stroke: '#ffe600', 'stroke-width': 1.8, 'stroke-linecap': 'round' }),
    );
  },
};

export function createAchievementIconSvg(id, unlocked = true, size = 24) {
  const svg = makeSvg('0 0 24 24', size, 'achievement-svg-icon ui-svg-icon');
  const key = unlocked ? id : 'locked';
  const draw = ACHIEVEMENT_GLYPHS[key];
  if (draw) {
    draw(svg);
  } else {
    svg.append(
      el('circle', { cx: 12, cy: 12, r: 8, fill: '#ffe600', stroke: '#090314', 'stroke-width': 1.8 }),
      el('circle', { cx: 12, cy: 12, r: 3, fill: '#ff2bd6' }),
    );
  }
  return svg;
}
