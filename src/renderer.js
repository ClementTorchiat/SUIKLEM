import { FRUITS, CHAOS_PALETTES } from './fruits.js';
import { JAR_BOUNDS } from './physics.js';

const RANDOM_STICKERS = [
  'WTF?!',
  'FEU!!',
  'AU SECOURS',
  'BRUH',
  'BONK!',
  'OMG',
  'SKIBIDI',
  'POURQUOI?!',
  'MAMA MIA',
  'NO CAP!',
  'CRINGE!',
];

/**
 * Draws any of the 16 multicolor brainrot mutants with asymmetrical googly eyes.
 */
export function drawFruitShape(ctx, tier, radius, options = {}) {
  const def = FRUITS[tier];
  const {
    mood = 'idle',
    isBlinking = false,
    squashX = 1,
    squashY = 1,
    time = 0,
    showFace = true,
    monochrome = false,
    mystery = false,
    gameboy = false,
  } = options;

  ctx.save();
  ctx.scale(squashX, squashY);

  if (mystery) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    if (monochrome) {
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
    } else {
      const mGrad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, radius * 0.1, 0, 0, radius);
      mGrad.addColorStop(0, '#7b2cbf');
      mGrad.addColorStop(1, '#240046');
      ctx.fillStyle = mGrad;
      ctx.fill();
      ctx.lineWidth = Math.max(2.5, radius * 0.1);
      ctx.strokeStyle = '#ffe600';
      ctx.stroke();
      ctx.fillStyle = '#ffe600';
    }
    ctx.font = `700 ${Math.max(12, Math.round(radius * 1.15))}px "Pixelify Sans", ui-monospace, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
    ctx.restore();
    return;
  }

  if (monochrome) {
    // Pure 1-bit white disc with black outline & generic face — distinguishable ONLY by size!
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    if (showFace) {
      _drawCursedFace(ctx, -1, radius, mood, isBlinking, time, true);
    }
    ctx.restore();
    return;
  }

  if (gameboy) {
    // 1989 DMG 4-tone olive LCD circle with crisp inner ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = tier % 2 === 0 ? '#9bbc0f' : '#8bac0f';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0f380f';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, radius * 0.78), 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#306230';
    ctx.stroke();
    if (showFace) {
      _drawCursedFace(ctx, tier, radius, mood, isBlinking, time, true);
    }
    ctx.restore();
    return;
  }

  // Offset comic shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(radius * 0.06, radius * 0.1, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.fill();
  ctx.restore();

  const grad = ctx.createRadialGradient(
    -radius * 0.3,
    -radius * 0.3,
    radius * 0.1,
    0,
    0,
    radius,
  );
  if (tier === 15) {
    grad.addColorStop(0, '#ffe600');
    grad.addColorStop(0.42, '#ff006e');
    grad.addColorStop(0.75, '#00f5d4');
    grad.addColorStop(1, '#8338ec');
  } else {
    grad.addColorStop(0, def.highlight);
    grad.addColorStop(0.58, def.color);
    grad.addColorStop(1, def.shade);
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = Math.max(2, radius * 0.065);
  ctx.strokeStyle = '#090314';
  ctx.stroke();

  _drawWeirdDetails(ctx, tier, radius, time);

  ctx.beginPath();
  ctx.ellipse(-radius * 0.35, -radius * 0.38, radius * 0.22, radius * 0.1, -Math.PI / 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.46)';
  ctx.fill();

  if (showFace) {
    _drawCursedFace(ctx, tier, radius, mood, isBlinking, time);
  }

  ctx.restore();
}

function _drawWeirdDetails(ctx, tier, r, time) {
  ctx.save();
  switch (tier) {
    case 0: // Atome Sus: glowing cyan orbiting electron ring
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.18, r * 0.42, 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 1: // Cornichon Sigma: bumpy warts
      ctx.fillStyle = '#147a00';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.25 + 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 2: // Canard Énervé: orange duck beak
      ctx.fillStyle = '#ff7b00';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.38, r * 0.35, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 3: // Nugget Suspect: crispy crumb spots
      ctx.fillStyle = '#78350f';
      for (const [cx, cy] of [[-0.45, -0.45], [0.5, -0.32], [-0.48, 0.38], [0.42, 0.48]]) {
        ctx.beginPath();
        ctx.arc(cx * r, cy * r, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 4: // Poulpe WiFi: cyan WiFi bars
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(0, -r * 0.52, r * 0.18 * i, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
      }
      break;

    case 5: // Taco Illégal: neon lettuce ridge
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath();
      ctx.arc(0, -r * 0.14, r * 0.72, -Math.PI * 0.85, -Math.PI * 0.15);
      ctx.stroke();
      break;

    case 6: // Chaussette Mouillée: green stink waves + heel patch
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-r * 0.45, r * 0.42, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a6ff2e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.92);
      ctx.quadraticCurveTo(-r * 0.4, -r * 1.15, -r * 0.2, -r * 1.25);
      ctx.moveTo(r * 0.2, -r * 0.92);
      ctx.quadraticCurveTo(r * 0.05, -r * 1.15, r * 0.25, -r * 1.25);
      ctx.stroke();
      break;

    case 7: // Aubergine Cursed: green calyx crown
      ctx.fillStyle = '#39ff14';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, -r * 0.78);
      ctx.lineTo(0, -r * 1.15);
      ctx.lineTo(r * 0.32, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 8: // Donut Toxique: glowing slime hole + sprinkles
      ctx.fillStyle = '#39ff14';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, r * 0.36, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const [sx, sy, col] of [[-0.5, -0.45, '#00f5d4'], [0.48, -0.42, '#ffe600'], [0.55, 0.2, '#39ff14']]) {
        ctx.fillStyle = col;
        ctx.fillRect(sx * r - 3, sy * r - 2, 6, 3);
      }
      break;

    case 9: // Fromage Nuclear: glowing green holes
      ctx.fillStyle = '#39ff14';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 1.6;
      for (const [hx, hy, hr] of [[-0.46, -0.42, 0.14], [0.46, 0.36, 0.16], [-0.42, 0.44, 0.1]]) {
        ctx.beginPath();
        ctx.arc(hx * r, hy * r, hr * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;

    case 10: // Piment Enragé: flame crown stem
      ctx.fillStyle = '#ffe600';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.85);
      ctx.lineTo(0, -r * 1.24);
      ctx.lineTo(r * 0.22, -r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 11: // Pizza Ananas: melted cheese + pineapple chunks
      ctx.fillStyle = '#ffe600';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + 0.2;
        ctx.fillRect(Math.cos(a) * r * 0.56 - 4, Math.sin(a) * r * 0.56 - 4, 8, 8);
      }
      break;

    case 12: // Boule Disco Satan: sparkling disco grid
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.lineWidth = 1.5;
      for (let y = -r; y <= r; y += r * 0.35) {
        ctx.beginPath();
        ctx.moveTo(-r, y);
        ctx.lineTo(r, y);
        ctx.stroke();
      }
      for (let x = -r; x <= r; x += r * 0.35) {
        ctx.beginPath();
        ctx.moveTo(x, -r);
        ctx.lineTo(x, r);
        ctx.stroke();
      }
      ctx.restore();
      break;

    case 13: // Cerveau Cramé: squiggly brain folds + lightning bolt
      ctx.strokeStyle = '#9d174d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.42, -r * 0.42, r * 0.22, 0, Math.PI);
      ctx.arc(r * 0.42, -r * 0.42, r * 0.22, 0, Math.PI);
      ctx.stroke();
      break;

    case 14: // Shrek Cosmique: trumpet ogre ears
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 2.2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.84, -r * 0.28);
        ctx.lineTo(side * r * 1.2, -r * 0.62);
        ctx.lineTo(side * r * 1.14, -r * 0.34);
        ctx.lineTo(side * r * 0.86, -r * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;

    case 15: // PASTÈQUE 3000: chaotic rainbow waves
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = r * 0.09;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, -r);
        ctx.quadraticCurveTo(i * r * 0.5 + Math.sin(time * 5) * 6, 0, i * r * 0.36, r);
        ctx.stroke();
      }
      ctx.restore();
      break;
  }
  ctx.restore();
}

function _drawCursedFace(ctx, tier, r, mood, isBlinking, time, monochrome = false) {
  const eyeX = r * 0.3;
  const eyeY = -r * 0.1;
  const leftEyeR = Math.max(2.8, r * 0.17);
  const rightEyeR = monochrome ? leftEyeR : Math.max(2.4, r * (tier % 2 === 0 ? 0.13 : 0.21));
  const ink = monochrome ? '#000000' : '#090314';
  const accentFill = monochrome ? '#000000' : '#ff2bd6';

  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.7, r * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tier === 15 && mood !== 'worried') {
    ctx.fillStyle = ink;
    const gw = r * 0.42;
    const gh = r * 0.2;
    ctx.fillRect(-eyeX - gw * 0.55, eyeY - gh * 0.5, gw, gh);
    ctx.fillRect(eyeX - gw * 0.45, eyeY - gh * 0.5, gw, gh);
    ctx.fillRect(-eyeX, eyeY - gh * 0.35, eyeX * 2, gh * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-eyeX - gw * 0.35, eyeY - gh * 0.28, gw * 0.22, gh * 0.24);
    ctx.fillRect(eyeX - gw * 0.25, eyeY - gh * 0.28, gw * 0.22, gh * 0.24);
  } else if (mood === 'bonked') {
    for (const [cx, er] of [[-eyeX, leftEyeR * 0.65], [eyeX, rightEyeR * 0.65]]) {
      ctx.beginPath();
      ctx.moveTo(cx - er, eyeY - er);
      ctx.lineTo(cx + er, eyeY + er);
      ctx.moveTo(cx + er, eyeY - er);
      ctx.lineTo(cx - er, eyeY + er);
      ctx.stroke();
    }
  } else if (isBlinking && mood !== 'worried') {
    ctx.beginPath();
    ctx.moveTo(-eyeX - leftEyeR, eyeY);
    ctx.lineTo(-eyeX + leftEyeR, eyeY);
    ctx.moveTo(eyeX - rightEyeR, eyeY);
    ctx.lineTo(eyeX + rightEyeR, eyeY);
    ctx.stroke();
  } else {
    const bulge = mood === 'worried' ? 1.28 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, leftEyeR * bulge, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, rightEyeR * bulge, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const spin = mood === 'worried' ? time * 18 : time * 2.5 + tier;
    const lx = -eyeX + Math.cos(spin) * leftEyeR * 0.36;
    const ly = eyeY + Math.sin(spin) * leftEyeR * 0.36;
    const rx = eyeX - Math.cos(spin * 1.3) * rightEyeR * 0.36;
    const ry = eyeY + Math.sin(spin * 1.3) * rightEyeR * 0.36;

    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(lx, ly, leftEyeR * 0.46, 0, Math.PI * 2);
    ctx.arc(rx, ry, rightEyeR * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tier === 1 || tier === 2 || tier === 10 || tier === 14) {
    ctx.beginPath();
    ctx.moveTo(-eyeX - leftEyeR, eyeY - leftEyeR * 1.15);
    ctx.lineTo(-eyeX + leftEyeR * 0.7, eyeY - leftEyeR * 0.6);
    ctx.moveTo(eyeX + rightEyeR, eyeY - rightEyeR * 1.15);
    ctx.lineTo(eyeX - rightEyeR * 0.7, eyeY - rightEyeR * 0.6);
    ctx.stroke();
  }

  const mouthY = eyeY + r * 0.36;
  if (tier === 2) return;

  if (mood === 'worried') {
    ctx.beginPath();
    ctx.ellipse(0, mouthY, r * 0.18, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = accentFill;
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'happy' || mood === 'falling') {
    ctx.beginPath();
    ctx.arc(0, mouthY - r * 0.06, r * 0.24, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.stroke();

    if (!monochrome) {
      ctx.beginPath();
      ctx.ellipse(r * 0.06, mouthY + r * 0.14, r * 0.11, r * 0.14, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = accentFill;
      ctx.fill();
      ctx.stroke();
    }
  } else if (!monochrome && tier % 3 === 0) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, mouthY);
    ctx.quadraticCurveTo(0, mouthY + r * 0.16, r * 0.22, mouthY - r * 0.04);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.06, mouthY + r * 0.02, r * 0.12, r * 0.1);
    ctx.strokeRect(-r * 0.06, mouthY + r * 0.02, r * 0.12, r * 0.1);
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, mouthY);
    ctx.quadraticCurveTo(r * 0.05, mouthY + r * 0.12, r * 0.2, mouthY - r * 0.05);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r * 0.08, mouthY + r * 0.05, r * 0.08, 0, Math.PI);
    ctx.fillStyle = accentFill;
    ctx.fill();
    ctx.stroke();
  }
}

export class GameRenderer {
  constructor(canvas, nextCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');

    this.palette = CHAOS_PALETTES[0];
    this.particles = [];
    this.flames = [];
    this.shockwaves = [];
    this.lasers = [];
    this.stars = [];
    this.floatingTexts = [];
    this.speechBubble = null;

    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.glitchTimer = 0;
    this.randomFxTimer = 0.8;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lastRenderedNextTier = -1;
    this.currentViewWidth = JAR_BOUNDS.width;
    this.pixelCanvas = document.createElement('canvas');
    this.pixelCtx = this.pixelCanvas.getContext('2d');

    this._resizeHiDPI(JAR_BOUNDS.width);
  }

  setPalette(palette) {
    this.palette = palette;
  }

  _resizeHiDPI(viewWidth = JAR_BOUNDS.width) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.currentViewWidth = viewWidth;
    this.canvas.width = Math.round(viewWidth * dpr);
    this.canvas.height = Math.round(JAR_BOUNDS.height * dpr);
    this.canvas.style.aspectRatio = `${viewWidth} / ${JAR_BOUNDS.height}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextSize = 44;
    if (this.nextCanvas.width !== nextSize * dpr) {
      this.nextCanvas.width = nextSize * dpr;
      this.nextCanvas.height = nextSize * dpr;
    }
    this.nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resetEffects() {
    this.particles = [];
    this.flames = [];
    this.shockwaves = [];
    this.lasers = [];
    this.stars = [];
    this.floatingTexts = [];
    this.speechBubble = null;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.glitchTimer = 0;
    this.randomFxTimer = 0.8;
  }

  spawnSpeechBubble(bodyId, text, duration = 2.4) {
    this.speechBubble = {
      bodyId,
      text,
      life: duration,
      maxLife: duration,
    };
  }

  triggerShake(intensity = 5, duration = 0.22) {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  triggerGlitch(duration = 0.22) {
    if (this.reducedMotion) return;
    this.glitchTimer = Math.max(this.glitchTimer, duration);
  }

  spawnFlameBurst(x, y, count = 8) {
    if (this.reducedMotion) return;
    const flameColors = ['#ff2a00', '#ff7b00', '#ffe600', this.palette.pink];
    for (let i = 0; i < count; i++) {
      this.flames.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 55,
        vy: -65 - Math.random() * 110,
        size: 6 + Math.random() * 8,
        color: flameColors[i % flameColors.length],
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
      });
    }
  }

  spawnStarBurst(x, y, count = 6) {
    if (this.reducedMotion) return;
    const cols = [this.palette.yellow, this.palette.cyan, this.palette.pink, '#ffffff'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 130;
      this.stars.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 14,
        size: 6 + Math.random() * 6,
        color: cols[i % cols.length],
        life: 0.55 + Math.random() * 0.3,
        maxLife: 0.85,
      });
    }
  }

  spawnMicroExplosion(x, y, color = '#ffe600', label = '') {
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: 54 + Math.random() * 34,
      color,
      life: 0.34,
      maxLife: 0.34,
    });

    const count = this.reducedMotion ? 4 : 14;
    const colors = [color, this.palette.pink, this.palette.cyan, this.palette.yellow, this.palette.orange];
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 85 + Math.random() * 155;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        size: 3 + Math.random() * 5,
        color: colors[i % colors.length],
        life: 0.38 + Math.random() * 0.25,
        maxLife: 0.63,
      });
    }

    if (!this.reducedMotion) {
      this.spawnFlameBurst(x, y, 6);
      this.spawnStarBurst(x, y, 4);
    }

    if (label) {
      this.floatingTexts.push({
        x,
        y: y - 10,
        text: label,
        color,
        tilt: (Math.random() - 0.5) * 0.38,
        life: 0.85,
        maxLife: 0.85,
      });
    }
  }

  spawnLaserBolt(x1, y1, x2, y2, color = '#00f5d4') {
    if (this.reducedMotion) return;
    const pts = [{ x: x1, y: y1 }];
    const segments = 6;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      pts.push({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 32,
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 32,
      });
    }
    pts.push({ x: x2, y: y2 });
    this.lasers.push({ pts, color, life: 0.26, maxLife: 0.26 });
  }

  spawnMergeEffect(x, y, tier, labelText) {
    const def = FRUITS[tier];
    // Double concentric shockwaves!
    this.shockwaves.push({
      x,
      y,
      radius: def.radius * 0.35,
      maxRadius: def.radius * 2.1 + 28,
      color: def.color,
      life: 0.38,
      maxLife: 0.38,
    });
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: def.radius * 1.4 + 16,
      color: this.palette.yellow,
      life: 0.28,
      maxLife: 0.28,
    });

    const count = this.reducedMotion ? 5 : Math.min(28, 10 + tier * 2);
    const palette = [def.highlight, def.color, this.palette.yellow, this.palette.pink, this.palette.cyan];
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 85 + Math.random() * 165;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 45,
        size: 3.5 + Math.random() * 5,
        color: palette[i % palette.length],
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
      });
    }

    this.spawnStarBurst(x, y, Math.min(8, 3 + Math.floor(tier / 2)));

    if (tier >= 4) {
      this.spawnFlameBurst(x, y, 9);
      this.triggerGlitch(0.16);
      this.spawnLaserBolt(
        x,
        y,
        JAR_BOUNDS.left + Math.random() * (JAR_BOUNDS.right - JAR_BOUNDS.left),
        JAR_BOUNDS.top + Math.random() * 140,
        palette[tier % palette.length],
      );
    }

    if (labelText) {
      this.floatingTexts.push({
        x,
        y: y - 10,
        text: labelText,
        color: this.palette.yellow,
        tilt: (Math.random() - 0.5) * 0.3,
        life: 1.05,
        maxLife: 1.05,
      });
    }
  }

  spawnSparkleBridge(x1, y1, x2, y2) {
    this.spawnLaserBolt(x1, y1, x2, y2, this.palette.pink);
    this.spawnLaserBolt(x1, y1, x2, y2, this.palette.cyan);
    this.spawnMicroExplosion(x1, y1, this.palette.cyan);
    this.spawnMicroExplosion(x2, y2, this.palette.pink);
    this.triggerGlitch(0.24);
    this.floatingTexts.push({
      x: (x1 + x2) * 0.5,
      y: Math.min(y1, y2) - 18,
      text: 'ÉCHANGE CURSED !',
      color: this.palette.pink,
      tilt: -0.08,
      life: 1.05,
      maxLife: 1.05,
    });
  }

  updateEffects(dt, world) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer === 0) this.shakeIntensity = 0;
    }
    if (this.glitchTimer > 0) {
      this.glitchTimer = Math.max(0, this.glitchTimer - dt);
    }

    // Nonsense random fires, micro-explosions, wall flames & chain lasers!
    if (!this.reducedMotion && world && world.bodies.length > 0) {
      for (const b of world.bodies) {
        if (b.onFireTimer > 0 && Math.random() < dt * 20) {
          this.spawnFlameBurst(b.x, b.y - b.radius * 0.4, 2);
        }
      }

      // Ambient senseless floor fire sparks during active chaos
      if (world.activeChaos && Math.random() < dt * 9) {
        const fx = world.jarLeft + 20 + Math.random() * (world.jarRight - world.jarLeft - 40);
        this.spawnFlameBurst(fx, JAR_BOUNDS.bottom - 4, 2);
      }

      this.randomFxTimer -= dt;
      if (this.randomFxTimer <= 0) {
        this.randomFxTimer = 0.65 + Math.random() * 1.45;
        const roll = Math.random();
        const rx = world.jarLeft + 28 + Math.random() * (world.jarRight - world.jarLeft - 56);
        const ry = JAR_BOUNDS.top + 70 + Math.random() * (JAR_BOUNDS.bottom - JAR_BOUNDS.top - 100);

        if (roll < 0.35) {
          const b = world.bodies[Math.floor(Math.random() * world.bodies.length)];
          b.onFireTimer = 1.6;
          this.spawnFlameBurst(b.x, b.y, 8);
        } else if (roll < 0.68) {
          const word = RANDOM_STICKERS[Math.floor(Math.random() * RANDOM_STICKERS.length)];
          this.spawnMicroExplosion(rx, ry, this.palette.cyan, word);
        } else if (roll < 0.88 && world.bodies.length >= 2) {
          const a = world.bodies[Math.floor(Math.random() * world.bodies.length)];
          const b = world.bodies[Math.floor(Math.random() * world.bodies.length)];
          if (a !== b) this.spawnLaserBolt(a.x, a.y, b.x, b.y, this.palette.yellow);
        } else {
          this.triggerGlitch(0.14);
          this.spawnStarBurst(rx, ry, 7);
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 290 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.flames.splice(i, 1);
        continue;
      }
      f.x += f.vx * dt + Math.sin(f.life * 22) * 0.7;
      f.y += f.vy * dt;
    }

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const st = this.stars[i];
      st.life -= dt;
      if (st.life <= 0) {
        this.stars.splice(i, 1);
        continue;
      }
      st.vy += 240 * dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.rot += st.spin * dt;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const prog = 1 - sw.life / sw.maxLife;
      sw.radius = 8 + (sw.maxRadius - 8) * prog;
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].life -= dt;
      if (this.lasers[i].life <= 0) this.lasers.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      if (!this.reducedMotion) {
        t.y -= 42 * dt;
      }
    }

    if (this.speechBubble) {
      this.speechBubble.life -= dt;
      const alive = world?.bodies?.some((b) => b.id === this.speechBubble.bodyId);
      if (this.speechBubble.life <= 0 || !alive) {
        this.speechBubble = null;
      }
    }
  }

  renderNextPreview(tier, monochrome = false, mystery = false, gameboy = false) {
    const key = `${tier}:${monochrome ? 1 : 0}:${mystery ? 1 : 0}:${gameboy ? 1 : 0}`;
    if (key === this.lastRenderedNextTier) return;
    this.lastRenderedNextTier = key;

    const ctx = this.nextCtx;
    ctx.clearRect(0, 0, 44, 44);
    ctx.save();
    ctx.translate(22, 24);
    const previewRadius = mystery ? 14 : Math.min(15, Math.max(10, FRUITS[tier].radius * 0.44));
    drawFruitShape(ctx, tier, previewRadius, { showFace: true, monochrome, mystery, gameboy });
    ctx.restore();
  }

  render({
    world,
    aimX,
    currentTier,
    canDrop,
    showDropTimer = true,
    dropTimerRatio = 1,
    time,
    powerMode = null,
    hoveredFruitId = null,
    pointerPos = null,
    isFever = false,
  }) {
    if (Math.abs(world.viewWidth - this.currentViewWidth) > 0.5) {
      this._resizeHiDPI(world.viewWidth);
    }

    const ctx = this.ctx;
    const { height, top, dangerY, dropY } = JAR_BOUNDS;
    const bottom = world.jarBottom ?? JAR_BOUNDS.bottom;
    const left = world.jarLeft;
    const right = world.jarRight;
    const offsetX = (world.viewWidth - JAR_BOUNDS.width) * 0.5;
    const chaosId = world.activeChaos?.id ?? null;
    const mono = chaosId === 'monochrome';
    const gameboy = chaosId === 'gameboy';

    ctx.clearRect(0, 0, world.viewWidth, height);
    ctx.save();
    ctx.translate(offsetX, 0);

    if (!this.reducedMotion) {
      let sx = 0;
      let sy = 0;
      if (this.shakeTimer > 0) {
        sx += (Math.random() - 0.5) * this.shakeIntensity * 2;
        sy += (Math.random() - 0.5) * this.shakeIntensity * 2;
      }
      if (chaosId === 'quake') {
        sx += Math.sin(time * 42) * 4;
        sy += Math.cos(time * 37) * 3;
      }
      ctx.translate(sx, sy);
    }

    if (chaosId === 'zoom') {
      const zoomScale = this.reducedMotion ? 1.35 : 1.8;
      const focusX = aimX ?? 190;
      const focusY = 260;
      ctx.translate(focusX, focusY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-focusX, -focusY);
    }

    this._drawJarBackdrop(ctx, left, right, top, bottom, dangerY, world, time, mono, gameboy);

    if (chaosId === 'bullet_time' && !mono) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 255, 102, 0.22)';
      ctx.font = '700 12px "Pixelify Sans", ui-monospace, monospace';
      for (let col = 0; col < 10; col++) {
        const cx = left + 18 + col * 36;
        const dropY = top + (((time * (65 + (col % 3) * 28) + col * 73)) % (bottom - top));
        ctx.fillText(col % 2 === 0 ? '01' : 'WTF', cx, dropY);
      }
      ctx.restore();
    }

    if (chaosId === 'helium') {
      ctx.save();
      ctx.fillStyle = mono ? 'rgba(255,255,255,0.18)' : 'rgba(56, 189, 248, 0.22)';
      for (let i = 0; i < 14; i++) {
        const bx = left + 20 + ((i * 53) % (right - left - 40));
        const by = bottom - ((time * (28 + (i % 4) * 11) + i * 67) % (bottom - top));
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 3) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = mono ? '#ffffff' : '#38bdf8';
      ctx.font = '800 11px "Pixelify Sans", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('0.00 G • APESANTEUR', right - 12, top + 18);
      ctx.restore();
    }

    if (chaosId === 'disco' && !mono) {
      const center = (left + right) * 0.5;
      const ballY = top + 34;
      const colors = ['#00f5d4', '#ff2bd6', '#ffe600', '#a6ff2e'];
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const angle = time * (2.1 + i * 0.4) + i * 1.57;
        const tx = center + Math.sin(angle) * 190;
        ctx.fillStyle = colors[i];
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        ctx.moveTo(center, ballY);
        ctx.lineTo(tx - 38, bottom);
        ctx.lineTo(tx + 38, bottom);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center, top);
      ctx.lineTo(center, ballY - 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(center, ballY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#ff2bd6';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    if (chaosId === 'defrag' && world.activeChaos) {
      const scanX = world.activeChaos.defragScanX ?? left;
      ctx.save();
      ctx.strokeStyle = mono ? '#ffffff' : '#00f5d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(scanX, top + 6);
      ctx.lineTo(scanX, bottom - 6);
      ctx.stroke();
      ctx.fillStyle = mono ? 'rgba(255,255,255,0.18)' : 'rgba(0, 245, 212, 0.14)';
      ctx.fillRect(Math.max(left, scanX - 18), top + 6, 18, bottom - top - 12);
      ctx.restore();
    }

    if (chaosId === 'pinball' && Array.isArray(world.activeChaos?.bumpers)) {
      ctx.save();
      for (const bm of world.activeChaos.bumpers) {
        const pulse = bm.flash > 0 ? 1 + bm.flash * 0.18 : 1;
        ctx.save();
        ctx.translate(bm.x, bm.y);
        ctx.scale(pulse, pulse);
        if (bm.flash > 0 && !mono) {
          ctx.beginPath();
          ctx.arc(0, 0, bm.r + 10, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 230, 0, ${bm.flash * 0.45})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, 0, bm.r, 0, Math.PI * 2);
        ctx.fillStyle = bm.flash > 0.2 ? '#ffe600' : (mono ? '#ffffff' : '#ff2bd6');
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = mono ? '#000000' : '#00f5d4';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, bm.r * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = '#090314';
        ctx.fill();
        ctx.fillStyle = '#ffe600';
        ctx.font = '900 10px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('25', 0, 0.5);
        ctx.restore();
      }
      ctx.restore();
    }

    if (bottom < JAR_BOUNDS.bottom - 1) {
      ctx.save();
      ctx.fillStyle = mono ? '#ffffff' : this.palette.yellow;
      ctx.fillRect(left + 12, bottom + 6, right - left - 24, 8);
      ctx.fillStyle = mono ? '#000000' : '#090314';
      for (let sx = left + 16; sx < right - 24; sx += 24) {
        ctx.fillRect(sx, bottom + 6, 12, 8);
      }
      ctx.fillStyle = mono ? '#ffffff' : this.palette.pink;
      ctx.fillRect((left + right) * 0.5 - 12, bottom + 14, 24, JAR_BOUNDS.bottom - bottom - 14);
      ctx.restore();
    }

    if (chaosId === 'magnet') {
      this._drawMagnetArcs(ctx, world);
    }

    if (chaosId === 'blackhole') {
      const bx = world.activeChaos.blackholeX;
      const by = world.activeChaos.blackholeY;
      ctx.save();
      const horizonR = 54 + (this.reducedMotion ? 0 : Math.sin(time * 9) * 5);
      if (!mono) {
        const bhGrad = ctx.createRadialGradient(bx, by, 8, bx, by, horizonR);
        bhGrad.addColorStop(0, '#000000');
        bhGrad.addColorStop(0.45, '#5a189a');
        bhGrad.addColorStop(1, 'rgba(255, 43, 214, 0)');
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(bx, by, horizonR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = mono ? '#ffffff' : this.palette.pink;
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const a = (this.reducedMotion ? 0 : time * (4 + i)) + i * 2.1;
        ctx.beginPath();
        ctx.arc(bx, by, 28 + i * 11, a, a + Math.PI * 1.1);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = mono ? '#ffffff' : (i % 2 === 0 ? this.palette.cyan : this.palette.yellow);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Aiming guide, held fruit & 1-second forced drop ring!
    if (!powerMode && canDrop && currentTier !== null) {
      const heldDef = FRUITS[currentTier];
      const isMystery = chaosId === 'mystery';
      const heldVisualTier = chaosId === 'cosplay' ? world.activeChaos.cosplayTier : currentTier;
      const heldVisualRadius = isMystery ? 20 : heldDef.radius;
      const landingY = world.raycastDropY(aimX, heldDef.radius);

      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = mono
        ? '#ffffff'
        : chaosId === 'mirror'
          ? this.palette.pink
          : this.palette.cyan;
      ctx.globalAlpha = mono ? 1 : 0.55;
      ctx.beginPath();
      ctx.moveTo(aimX, dropY + heldVisualRadius + 4);
      ctx.lineTo(aimX, landingY);
      ctx.stroke();

      ctx.setLineDash(mono ? [4, 4] : []);
      ctx.globalAlpha = mono ? 1 : 0.28;
      ctx.beginPath();
      ctx.arc(aimX, landingY, heldVisualRadius, 0, Math.PI * 2);
      ctx.strokeStyle = mono ? '#ffffff' : this.palette.yellow;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const bob = this.reducedMotion ? 0 : Math.sin(time * 8) * 2.5;
      const urgent = showDropTimer && dropTimerRatio < 0.35;
      ctx.save();
      ctx.translate(aimX, dropY + bob);

      if (showDropTimer) {
        const ringR = heldVisualRadius + 7;
        if (!mono) {
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, dropTimerRatio));
        ctx.strokeStyle = mono ? '#ffffff' : (urgent ? this.palette.pink : this.palette.yellow);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      drawFruitShape(ctx, heldVisualTier, heldVisualRadius, {
        mood: urgent || chaosId === 'mirror' ? 'worried' : 'idle',
        time,
        monochrome: mono,
        mystery: isMystery,
        gameboy,
      });
      ctx.restore();
    }

    // Track biggest mutant in jar to give it a silly floating crown
    let biggestBody = null;
    for (const b of world.bodies) {
      if (!biggestBody || b.tier > biggestBody.tier) biggestBody = b;
    }

    for (const b of world.bodies) {
      const renderTier = chaosId === 'cosplay' ? world.activeChaos.cosplayTier : b.tier;
      const renderRadius = chaosId === 'faketier' ? 32 : b.radius;
      const isGhostMode = chaosId === 'ghost';
      const ghostFlash = Math.max(0, Math.min(1, (b.ghostFlashTimer || 0) / 0.45));
      const ghostAlpha = isGhostMode ? (0.03 + ghostFlash * 0.97) : 1;
      const speed = Math.hypot(b.vx, b.vy);
      if (!mono && !this.reducedMotion && speed > 180 && (!isGhostMode || ghostFlash > 0.2)) {
        ctx.save();
        ctx.globalAlpha = 0.28 * ghostAlpha;
        ctx.beginPath();
        ctx.arc(b.x - b.vx * 0.025, b.y - b.vy * 0.025, renderRadius * 0.92, 0, Math.PI * 2);
        ctx.fillStyle = FRUITS[renderTier].color;
        ctx.fill();
        ctx.restore();
      }

      if (!mono && this.glitchTimer > 0 && !this.reducedMotion) {
        ctx.save();
        ctx.globalAlpha = 0.32 * ghostAlpha;
        ctx.beginPath();
        ctx.arc(b.x - 4, b.y, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#00f5d4';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x + 4, b.y, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff2bd6';
        ctx.fill();
        ctx.restore();
      }

      if (isGhostMode && mono && ghostFlash <= 0.1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, renderRadius, 0, Math.PI * 2);
        ctx.setLineDash([2, 9]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        if (isGhostMode && !mono) {
          ctx.globalAlpha = ghostAlpha;
        }
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        drawFruitShape(ctx, renderTier, renderRadius, {
          mood: b.mood,
          isBlinking: b.isBlinking,
          squashX: b.squashX,
          squashY: b.squashY,
          time,
          monochrome: mono,
          gameboy,
        });
        ctx.restore();
      }

      if (chaosId === 'hotpotato' && b.id === world.activeChaos.potatoId) {
        const rem = Math.max(0, world.activeChaos.potatoTimer);
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, renderRadius + 6, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = mono ? '#ffffff' : '#ff2a00';
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = mono ? '#000000' : '#ff2a00';
        ctx.strokeStyle = mono ? '#ffffff' : '#090314';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x - 24, b.y - renderRadius - 22, 48, 17);
        ctx.strokeRect(b.x - 24, b.y - renderRadius - 22, 48, 17);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`💣 ${rem.toFixed(1)}s`, b.x, b.y - renderRadius - 13);
        ctx.restore();
      }

      if (!mono && b === biggestBody && b.tier >= 5 && chaosId !== 'cosplay' && !isGhostMode) {
        ctx.save();
        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const crownBob = this.reducedMotion ? 0 : Math.sin(time * 5) * 2;
        ctx.fillText('👑', b.x, b.y - renderRadius - 8 + crownBob);
        ctx.restore();
      }

      if (powerMode === 'clone' && b.id === hoveredFruitId) {
        if (b.tier <= 6) {
          this._drawTargetHalo(ctx, b, mono ? '#ffffff' : this.palette.cyan, '×2', true);
        } else {
          this._drawTargetHalo(ctx, b, mono ? '#ffffff' : this.palette.pink, 'NO', true);
        }
      } else if (powerMode === 'nuke' && pointerPos && Math.hypot(b.x - pointerPos.x, b.y - pointerPos.y) <= 105 + b.radius * 0.35) {
        this._drawTargetHalo(ctx, b, mono ? '#ffffff' : this.palette.pink, 'X', true);
      }
    }

    if (chaosId === 'wall') {
      const wallTop = top + 30;
      const wallHeight = Math.max(0, bottom - wallTop);
      ctx.save();
      ctx.fillStyle = mono ? '#ffffff' : this.palette.yellow;
      ctx.fillRect(183, wallTop, 14, wallHeight);
      ctx.fillStyle = mono ? '#000000' : '#090314';
      for (let sy = wallTop; sy < bottom - 8; sy += 22) {
        ctx.fillRect(185, sy + 4, 10, 9);
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = mono ? '#000000' : this.palette.pink;
      ctx.strokeRect(183, wallTop, 14, wallHeight);
      ctx.restore();
    }

    if (chaosId === 'strike') {
      let signsDrawn = 0;
      for (let i = 0; i < world.bodies.length && signsDrawn < 6; i++) {
        for (let j = i + 1; j < world.bodies.length && signsDrawn < 6; j++) {
          const a = world.bodies[i];
          const b = world.bodies[j];
          if (a.tier !== b.tier) continue;
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          if (dist <= a.radius + b.radius + 4) {
            signsDrawn++;
            const sx = (a.x + b.x) * 0.5;
            const sy = (a.y + b.y) * 0.5 - 18;
            ctx.save();
            ctx.fillStyle = mono ? '#ffffff' : '#ff2bd6';
            ctx.strokeStyle = mono ? '#000000' : '#090314';
            ctx.lineWidth = 2;
            ctx.fillRect(sx - 24, sy - 9, 48, 16);
            ctx.strokeRect(sx - 24, sy - 9, 48, 16);
            ctx.fillStyle = mono ? '#000000' : '#ffffff';
            ctx.font = '700 10px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GRÈVE!', sx, sy - 0.5);
            ctx.restore();
          }
        }
      }
    }

    if (powerMode === 'nuke' && pointerPos) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pointerPos.x, pointerPos.y, 105, 0, Math.PI * 2);
      if (!mono) {
        ctx.fillStyle = 'rgba(255, 43, 214, 0.14)';
        ctx.fill();
      }
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = mono ? '#ffffff' : this.palette.pink;
      ctx.stroke();
      ctx.restore();
    }

    // Flames
    for (const f of this.flames) {
      const ratio = Math.max(0, f.life / f.maxLife);
      ctx.save();
      ctx.globalAlpha = mono ? 1 : ratio * 0.92;
      ctx.fillStyle = mono ? '#ffffff' : f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * ratio, 0, Math.PI * 2);
      ctx.fill();
      if (mono) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
      ctx.restore();
    }

    // Spinning comic stars
    for (const st of this.stars) {
      const ratio = Math.max(0, st.life / st.maxLife);
      ctx.save();
      ctx.globalAlpha = mono ? 1 : ratio;
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.fillStyle = mono ? '#ffffff' : st.color;
      ctx.strokeStyle = mono ? '#000000' : '#090314';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = (i % 2 === 0 ? st.size : st.size * 0.42) * (mono ? ratio : 1);
        const a = (i * Math.PI) / 4;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Shockwave rings
    for (const sw of this.shockwaves) {
      const ratio = Math.max(0, sw.life / sw.maxLife);
      ctx.save();
      ctx.globalAlpha = mono ? 1 : ratio;
      ctx.strokeStyle = mono ? '#ffffff' : sw.color;
      ctx.lineWidth = 4 * ratio;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Lasers
    for (const l of this.lasers) {
      const ratio = Math.max(0, l.life / l.maxLife);
      ctx.save();
      ctx.globalAlpha = mono ? 1 : ratio;
      ctx.strokeStyle = mono ? '#ffffff' : l.color;
      ctx.lineWidth = mono ? 3 : 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      l.pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    if (world.windTimer > 0 || world.activeChaos?.id === 'tornado') {
      this._drawWindOverlay(ctx, left, right, top, bottom, world, time);
    }

    for (const p of this.particles) {
      const ratio = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = mono ? 1 : ratio;
      ctx.fillStyle = mono ? '#ffffff' : p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const t of this.floatingTexts) {
      const alpha = mono ? 1 : Math.min(1, (t.life / t.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y);
      ctx.rotate(t.tilt || 0);
      ctx.font = '700 16px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = mono ? '#000000' : '#090314';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = mono ? '#ffffff' : t.color;
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }

    if (chaosId === 'ufo') {
      const ux = world.activeChaos.ufoX;
      const uy = world.activeChaos.ufoY;
      ctx.save();
      if (world.activeChaos.ufoPhase === 'carry' && world.activeChaos.ufoTargetId) {
        const target = world.bodies.find((b) => b.id === world.activeChaos.ufoTargetId);
        if (target) {
          ctx.beginPath();
          ctx.moveTo(ux - 14, uy + 10);
          ctx.lineTo(target.x + target.radius * 0.8, target.y);
          ctx.lineTo(target.x - target.radius * 0.8, target.y);
          ctx.closePath();
          ctx.fillStyle = mono ? 'rgba(255, 255, 255, 0.25)' : 'rgba(166, 255, 46, 0.28)';
          if (mono) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = mono ? '#ffffff' : '#00f5d4';
      ctx.strokeStyle = mono ? '#000000' : '#090314';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ux, uy - 5, 13, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = mono ? '#ffffff' : '#ff2bd6';
      ctx.beginPath();
      ctx.ellipse(ux, uy + 2, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (bottom > JAR_BOUNDS.bottom + 8) {
      ctx.save();
      if (!mono) {
        const abyssGrad = ctx.createLinearGradient(0, height - 64, 0, height);
        abyssGrad.addColorStop(0, 'rgba(9, 3, 20, 0)');
        abyssGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = abyssGrad;
        ctx.fillRect(left + 4, height - 64, right - left - 8, 64);
      }
      const depthPx = Math.round(bottom - JAR_BOUNDS.bottom);
      ctx.fillStyle = mono ? '#ffffff' : this.palette.yellow;
      ctx.font = '700 12px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⬇ ABYSSE (-${depthPx} px HORS ÉCRAN) ⬇`, (left + right) * 0.5, height - 12);
      ctx.restore();
    }

    if (chaosId === 'lag') {
      ctx.save();
      ctx.fillStyle = mono ? '#ffffff' : '#ff2a00';
      ctx.strokeStyle = mono ? '#000000' : '#090314';
      ctx.lineWidth = 2.5;
      ctx.fillRect(right - 134, top + 8, 124, 24);
      ctx.strokeRect(right - 134, top + 8, 124, 24);
      ctx.fillStyle = mono ? '#000000' : '#ffffff';
      ctx.font = '700 11px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📡 PING : 999 ms', right - 72, top + 20);
      ctx.restore();
    }

    if (chaosId === 'tiltfloor' && world.activeChaos) {
      const ang = world.activeChaos.tiltAngle || 0;
      ctx.save();
      ctx.fillStyle = mono ? 'rgba(255,255,255,0.22)' : 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(left + 4, bottom - 34 + ang * 70);
      ctx.lineTo(right - 4, bottom - 34 - ang * 70);
      ctx.lineTo(right - 4, bottom - 4);
      ctx.lineTo(left + 4, bottom - 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (chaosId === 'laser' && world.activeChaos) {
      const ly = world.activeChaos.laserY ?? 320;
      ctx.save();
      if (world.activeChaos.laserPhase === 'fire') {
        ctx.fillStyle = mono ? '#ffffff' : 'rgba(255, 43, 214, 0.85)';
        ctx.fillRect(left + 2, ly - 10, right - left - 4, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(left + 2, ly - 4, right - left - 4, 8);
      } else {
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = mono ? '#ffffff' : '#ff2a00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left + 4, ly);
        ctx.lineTo(right - 4, ly);
        ctx.stroke();
        ctx.fillStyle = '#ffe600';
        ctx.font = '800 11px "Pixelify Sans", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('LASER DÉ-ÉVOLUTIF...', left + 12, ly - 8);
      }
      ctx.restore();
    }

    if (chaosId === 'kraken' && world.activeChaos?.krakenPhase === 'grab' && world.activeChaos.krakenTargetId) {
      const target = world.bodies.find((b) => b.id === world.activeChaos.krakenTargetId);
      if (target) {
        const hitsLeft = Math.max(1, world.activeChaos.krakenMaxHits - world.activeChaos.krakenHits);
        ctx.save();
        ctx.strokeStyle = mono ? '#ffffff' : '#9333ea';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(right - 2, Math.max(top + 40, target.y - 45));
        ctx.quadraticCurveTo((target.x + right) * 0.5, target.y - 30 + Math.sin(time * 8) * 14, target.x, target.y);
        ctx.stroke();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffe600';
        ctx.font = '900 11px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CLIQUE ${hitsLeft}× !`, target.x, target.y - target.radius - 14);
        ctx.restore();
      }
    }

    if (chaosId === 'mosquitos' && Array.isArray(world.activeChaos?.mosquitos)) {
      ctx.save();
      for (const m of world.activeChaos.mosquitos) {
        if (!m.alive) continue;
        const wingY = Math.sin(time * 42 + m.phase) * 4;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.fillStyle = mono ? '#ffffff' : 'rgba(0, 245, 212, 0.72)';
        ctx.beginPath();
        ctx.ellipse(-6, -4 + wingY, 6, 3, -0.4, 0, Math.PI * 2);
        ctx.ellipse(6, -4 - wingY, 6, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 2, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = mono ? '#000000' : '#ff2bd6';
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    if (chaosId === 'meteors' && Array.isArray(world.activeChaos?.meteors)) {
      ctx.save();
      for (const met of world.activeChaos.meteors) {
        ctx.beginPath();
        ctx.moveTo(met.x, met.y);
        ctx.lineTo(met.x - met.vx * 0.09, met.y - met.vy * 0.09);
        ctx.strokeStyle = mono ? '#ffffff' : '#ff7b00';
        ctx.lineWidth = met.r * 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(met.x, met.y, met.r, 0, Math.PI * 2);
        ctx.fillStyle = mono ? '#ffffff' : '#ffe600';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = mono ? '#000000' : '#dc2626';
        ctx.stroke();
      }
      ctx.restore();
    }

    if (chaosId === 'pong' && world.activeChaos) {
      const c = world.activeChaos;
      ctx.save();
      ctx.strokeStyle = mono ? 'rgba(255,255,255,0.28)' : 'rgba(0, 245, 212, 0.25)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left + 12, c.paddleY);
      ctx.lineTo(right - 12, c.paddleY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.pongFlash > 0.2 ? '#ffe600' : (mono ? '#ffffff' : '#00f5d4');
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(c.paddleX - c.paddleHalfW, c.paddleY - c.paddleHalfH, c.paddleHalfW * 2, c.paddleHalfH * 2, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (chaosId === 'pacman' && world.activeChaos) {
      const c = world.activeChaos;
      const mouth = Math.abs(Math.sin(time * 16)) * 0.65 + 0.08;
      ctx.save();
      ctx.translate(c.pacX, c.pacY);
      ctx.rotate(c.pacAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 18, mouth, Math.PI * 2 - mouth);
      ctx.closePath();
      ctx.fillStyle = mono ? '#ffffff' : '#ffe600';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = mono ? '#000000' : '#ff2bd6';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, -8, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#090314';
      ctx.fill();
      ctx.restore();
    }

    if (chaosId === 'dvd_bounce' && world.activeChaos) {
      const c = world.activeChaos;
      const dvdPalette = ['#00f5d4', '#ff2bd6', '#ffe600', '#a6ff2e', '#ff7b00'];
      const col = mono ? '#ffffff' : dvdPalette[c.dvdColorIdx % dvdPalette.length];
      ctx.save();
      ctx.translate(c.dvdX, c.dvdY);
      ctx.fillStyle = mono ? '#000000' : '#090314';
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-c.dvdW * 0.5, -c.dvdH * 0.5, c.dvdW, c.dvdH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = '900 13px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DVD', 0, -4);
      ctx.font = '700 8px "Pixelify Sans", monospace';
      ctx.fillText('SUIKLEM', 0, 9);
      ctx.restore();
    }

    if (isFever) {
      ctx.save();
      ctx.strokeStyle = mono ? '#ffffff' : (Math.sin(time * 14) >= 0 ? '#ffe600' : '#ff2bd6');
      ctx.lineWidth = mono ? 3 : 6;
      ctx.globalAlpha = mono ? 1 : 0.45;
      ctx.strokeRect(left + 4, top + 4, right - left - 8, Math.min(bottom, height) - top - 8);
      ctx.restore();
    }

    if (this.speechBubble) {
      const speaker = world.bodies.find((b) => b.id === this.speechBubble.bodyId);
      if (speaker && speaker.y < height - 10) {
        const text = this.speechBubble.text;
        ctx.save();
        ctx.font = '700 11px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
        const padX = 9;
        const boxW = Math.min(200, ctx.measureText(text).width + padX * 2);
        const boxH = 22;
        const bx = Math.max(left + boxW * 0.5 + 8, Math.min(right - boxW * 0.5 - 8, speaker.x));
        const by = Math.max(top + 22, speaker.y - speaker.radius - 16);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(bx - boxW * 0.5, by - boxH * 0.5, boxW, boxH, 9);
        ctx.fill();
        ctx.stroke();

        // Tail pointing toward speaker
        const tailX = Math.max(bx - boxW * 0.35, Math.min(bx + boxW * 0.35, speaker.x));
        ctx.beginPath();
        ctx.moveTo(tailX - 4, by + boxH * 0.5 - 1);
        ctx.lineTo(tailX, by + boxH * 0.5 + 6);
        ctx.lineTo(tailX + 5, by + boxH * 0.5 - 1);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx, by + 0.5);
        ctx.restore();
      }
    }

    this._drawJarForeground(ctx, left, right, top, bottom, world, time, mono, gameboy);
    ctx.restore();

    if (gameboy) {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 56, 15, 0.28)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < world.viewWidth; gx += 4) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (chaosId === 'vhs') {
      const wPx = this.canvas.width;
      const hPx = this.canvas.height;
      if (this.pixelCanvas.width !== wPx || this.pixelCanvas.height !== hPx) {
        this.pixelCanvas.width = wPx;
        this.pixelCanvas.height = hPx;
      }
      this.pixelCtx.clearRect(0, 0, wPx, hPx);
      this.pixelCtx.drawImage(this.canvas, 0, 0);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, wPx, hPx);
      const tearY = ((time * 180) % hPx);
      const sliceH = 14;
      for (let y = 0; y < hPx; y += sliceH) {
        const wave = Math.sin(time * 22 + y * 0.09) * 3.5;
        const glitchTear = Math.abs(y - tearY) < 28 ? (Math.sin(time * 65 + y) * 16) : 0;
        ctx.drawImage(this.pixelCanvas, 0, y, wPx, sliceH, wave + glitchTear, y, wPx, sliceH);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let y = 0; y < hPx; y += 6) {
        ctx.fillRect(0, y, wPx, 2);
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#090314';
      ctx.fillRect(left + 10, top + 8, 128, 22);
      ctx.fillStyle = '#a6ff2e';
      ctx.font = '800 12px "Pixelify Sans", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('PLAY >  SP 1993', left + 16, top + 19);
      ctx.restore();
    }

    if (chaosId === 'pixelate') {
      const pw = Math.max(48, Math.round(76 * (world.viewWidth / JAR_BOUNDS.width)));
      const ph = 112;
      if (this.pixelCanvas.width !== pw || this.pixelCanvas.height !== ph) {
        this.pixelCanvas.width = pw;
        this.pixelCanvas.height = ph;
      }
      this.pixelCtx.imageSmoothingEnabled = false;
      this.pixelCtx.clearRect(0, 0, pw, ph);
      this.pixelCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, pw, ph);

      ctx.save();
      ctx.clearRect(0, 0, world.viewWidth, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.pixelCanvas, 0, 0, pw, ph, 0, 0, world.viewWidth, height);
      ctx.restore();
    }
  }

  _drawMagnetArcs(ctx, world) {
    ctx.save();
    ctx.strokeStyle = this.palette.pink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < world.bodies.length; i++) {
      for (let j = i + 1; j < world.bodies.length; j++) {
        const a = world.bodies[i];
        const b = world.bodies[j];
        if (a.tier !== b.tier) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < 250) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  _drawJarBackdrop(ctx, left, right, top, bottom, dangerY, world, time, mono = false, gameboy = false) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom - 22);
    ctx.quadraticCurveTo(left, bottom, left + 22, bottom);
    ctx.lineTo(right - 22, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - 22);
    ctx.lineTo(right, top);

    ctx.fillStyle = mono
      ? '#000000'
      : (gameboy ? '#0f380f' : (world.activeChaos ? this.palette.jarChaosBg : this.palette.jarBg));
    ctx.fill();

    if (!mono) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = world.activeChaos ? this.palette.pink : this.palette.cyan;
      ctx.globalAlpha = world.activeChaos ? 0.16 : 0.1;
      ctx.lineWidth = 1;
      for (let x = left; x <= right; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      for (let y = top; y <= bottom; y += 28) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    const dangerAlpha = mono
      ? 1
      : (world.isDangerActive ? 0.65 + Math.sin(time * 9) * 0.25 : 0.38);
    ctx.setLineDash([8, 5]);
    ctx.lineWidth = world.isDangerActive ? 3 : 2;
    ctx.globalAlpha = dangerAlpha;
    ctx.strokeStyle = mono
      ? '#ffffff'
      : (world.isDangerActive ? this.palette.pink : this.palette.yellow);
    ctx.beginPath();
    ctx.moveTo(left + 8, dangerY);
    ctx.lineTo(right - 8, dangerY);
    ctx.stroke();

    if (world.maxDangerRatio > 0.15) {
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
      ctx.strokeStyle = mono ? '#ffffff' : this.palette.pink;
      ctx.beginPath();
      ctx.moveTo(left + 8, dangerY);
      ctx.lineTo(left + 8 + (right - left - 16) * world.maxDangerRatio, dangerY);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawJarForeground(ctx, left, right, top, bottom, world, time, mono = false) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom - 22);
    ctx.quadraticCurveTo(left, bottom, left + 22, bottom);
    ctx.lineTo(right - 22, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - 22);
    ctx.lineTo(right, top);

    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    if (mono) {
      ctx.strokeStyle = '#ffffff';
    } else if (world.activeChaos) {
      ctx.strokeStyle = Math.sin(time * 6) >= 0 ? this.palette.pink : this.palette.yellow;
    } else {
      ctx.strokeStyle = this.palette.cyan;
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawTargetHalo(ctx, body, color, badgeText, dashed) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(body.x, body.y, body.radius + 6, 0, Math.PI * 2);
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.setLineDash([]);
    const bx = body.x + body.radius * 0.72;
    const by = body.y - body.radius * 0.72;
    ctx.beginPath();
    ctx.arc(bx, by, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#090314';
    ctx.stroke();

    ctx.fillStyle = '#090314';
    ctx.font = '700 11px "Pixelify Sans", ui-monospace, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, bx, by + 0.5);
    ctx.restore();
  }

  _drawWindOverlay(ctx, left, right, top, bottom, world, time) {
    const cx = (left + right) * 0.5;
    const cy = (top + bottom) * 0.54;
    const dur = world.activeChaos?.id === 'tornado' ? world.activeChaos.duration : world.windDuration;
    const rem = world.activeChaos?.id === 'tornado' ? world.activeChaos.remaining : world.windTimer;
    const progress = 1 - rem / Math.max(0.1, dur);
    const fade = Math.min(1, rem * 2.5) * Math.min(1, progress * 6 + 0.25);

    ctx.save();
    ctx.globalAlpha = fade * 0.75;
    ctx.strokeStyle = this.palette.cyan;
    ctx.lineCap = 'round';

    const rot = this.reducedMotion ? 0 : time * 7 * (Math.sin(progress * 6) >= 0 ? 1 : -1);
    for (let i = 0; i < 4; i++) {
      const r = 48 + i * 36;
      const start = rot + i * 1.4;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + Math.PI * 0.85);
      ctx.stroke();
    }

    if (!this.reducedMotion) {
      const cols = [this.palette.pink, this.palette.yellow, this.palette.cyan, this.palette.lime];
      for (let i = 0; i < 12; i++) {
        const angle = rot * 1.25 + (i * Math.PI * 2) / 12;
        const dist = 38 + ((i * 31) % 120);
        const bx = cx + Math.cos(angle) * dist;
        const by = cy + Math.sin(angle) * dist * 1.15;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (i % 3) * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
