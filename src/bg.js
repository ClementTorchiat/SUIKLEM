import { CHAOS_PALETTES } from './fruits.js';

const DVD_EMOJIS = ['🔥', '💀', '🦆', '🌮', '⚡', '🧦', '🍕', '🤪', '🧀', '🌶️'];

/**
 * Animated psychedelic brainrot background canvas.
 * Adapts to the active DA palette and respects prefers-reduced-motion.
 */
export class BackgroundRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.palette = CHAOS_PALETTES[0];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.width = window.innerWidth || 1280;
    this.height = window.innerHeight || 800;

    this.floaters = DVD_EMOJIS.map((emoji, i) => ({
      emoji,
      x: ((i + 1) * 173) % this.width,
      y: ((i + 1) * 97) % this.height,
      vx: (i % 2 === 0 ? 1 : -1) * (42 + (i % 4) * 18),
      vy: (i % 3 === 0 ? 1 : -1) * (36 + (i % 3) * 16),
      size: 26 + (i % 3) * 10,
      rot: i * 0.7,
      spin: (i % 2 === 0 ? 1 : -1) * (0.6 + (i % 3) * 0.4),
    }));

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setPalette(palette) {
    this.palette = palette;
  }

  setMonochrome(enabled) {
    this.monochrome = Boolean(enabled);
  }

  setRetroTheme(theme = null) {
    this.retroTheme = theme;
  }

  resize() {
    this.width = window.innerWidth || 1280;
    this.height = window.innerHeight || 800;
    // Render at 1x CSS pixels for smooth low-overhead full-screen visuals
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  render(dt, time, intensity = 1) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pal = this.palette;

    ctx.clearRect(0, 0, w, h);

    if (this.monochrome) {
      // Pure 1-bit background: strictly #000000 and #ffffff, zero gray!
      const step = 96;
      const scroll = this.reducedMotion ? 0 : (time * 42) % step;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 10]);
      for (let x = -step + scroll; x < w + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -step + scroll; y < h + step; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (this.retroTheme === 'chill') {
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#fff7ea');
      grad.addColorStop(1, '#fbe6cc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const cols = ['#ffd1dc', '#ffe4b5', '#d9f2d9', '#cfe9ff'];
      for (let i = 0; i < 14; i++) {
        const bx = ((i * 193 + (this.reducedMotion ? 0 : time * 10 * ((i % 3) + 1))) % (w + 120)) - 60;
        const by = ((i * 131 + (this.reducedMotion ? 0 : time * 6)) % (h + 120)) - 60;
        ctx.fillStyle = cols[i % cols.length];
        ctx.globalAlpha = 0.38;
        ctx.beginPath();
        ctx.arc(bx, by, 26 + (i % 4) * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (this.retroTheme === 'gameboy' || this.retroTheme === 'matrix') {
      const isGb = this.retroTheme === 'gameboy';
      const step = isGb ? 48 : 56;
      const scroll = this.reducedMotion ? 0 : (time * (isGb ? 24 : 78)) % step;
      ctx.save();
      ctx.strokeStyle = isGb ? '#306230' : '#00ff66';
      ctx.globalAlpha = isGb ? 0.35 : 0.22;
      ctx.lineWidth = isGb ? 2 : 1.5;
      for (let x = -step + scroll; x < w + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      if (isGb) {
        for (let y = -step + scroll; y < h + step; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }

    // 1. Rotating psychedelic sunburst rays from center
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(w, h) * 0.65;
    const rayCount = 16;
    const baseRot = this.reducedMotion ? 0 : time * 0.28 * intensity;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseRot);
    for (let i = 0; i < rayCount; i++) {
      if (i % 2 === 1) continue;
      const a1 = (i * Math.PI * 2) / rayCount;
      const a2 = ((i + 1) * Math.PI * 2) / rayCount;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a1) * maxR, Math.sin(a1) * maxR);
      ctx.lineTo(Math.cos(a2) * maxR, Math.sin(a2) * maxR);
      ctx.closePath();
      ctx.fillStyle = i % 4 === 0 ? pal.pink : pal.cyan;
      ctx.globalAlpha = 0.08;
      ctx.fill();
    }
    ctx.restore();

    // 2. Scrolling diagonal neon arcade grid
    const step = 64;
    const scroll = this.reducedMotion ? 0 : (time * 38 * intensity) % step;
    ctx.save();
    ctx.strokeStyle = pal.yellow;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1.5;
    for (let x = -step + scroll; x < w + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = -step + scroll; y < h + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Wavy ribbon streaks across background
    if (!this.reducedMotion) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.16;
      const waveColors = [pal.pink, pal.cyan, pal.orange];
      for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = waveColors[b];
        ctx.beginPath();
        const baseY = h * (0.22 + b * 0.28);
        for (let x = 0; x <= w; x += 40) {
          const y = baseY + Math.sin(x * 0.009 + time * (1.8 + b * 0.5) + b) * 32;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Bouncing DVD-style cursed emojis
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      if (!this.reducedMotion) {
        f.x += f.vx * dt * intensity;
        f.y += f.vy * dt * intensity;
        f.rot += f.spin * dt * intensity;

        if (f.x < 24) {
          f.x = 24;
          f.vx = Math.abs(f.vx);
        } else if (f.x > w - 24) {
          f.x = w - 24;
          f.vx = -Math.abs(f.vx);
        }
        if (f.y < 24) {
          f.y = 24;
          f.vy = Math.abs(f.vy);
        } else if (f.y > h - 24) {
          f.y = h - 24;
          f.vy = -Math.abs(f.vy);
        }
      }

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.font = `${f.size}px system-ui, sans-serif`;
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
}
