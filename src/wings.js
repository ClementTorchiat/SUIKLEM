/**
 * Interactive & 100% useless side-wing gadgets for wide screens.
 * Keeps all simulation/canvas state isolated from core game physics.
 */

import { createVendingCanSvg } from './icons.js';

const FORBIDDEN_QUIPS = [
  'On avait dit NE PAS TOUCHER.',
  'Bravo, tu viens de déclencher exactement rien.',
  'Effet obtenu : +0,00% de productivité.',
  'Tentation détectée. Amende morale : 1 cornichon.',
  'Le bouton t’a jugé en silence.',
  'Erreur 418 : je suis une théière inutile.',
];

const RECEIPT_LINES = [
  '1x BONK PHYSIQUE ...... 0,00€',
  'AUDIT CRINGE .......... REFUSÉ',
  'TVA CHAUSSETTE 20% ..... 42,00€',
  'LICENCE POULPE 5G ...... EXPIRÉE',
  'SAUCE QUANTIQUE ........ TROP TARD',
  'MAINTENANCE CERVEAU .... CRITIQUE',
  'TEST PLACEBO ........... NÉGATIF',
  'IMPÔT SUR LA GRAVITÉ ... 99,99€',
  'CALIBRAGE TACO ......... ILLÉGAL',
  'CERTIFIÉ 100% INUTILE .. VALIDÉ',
];

const RADAR_LABELS = ['Chaussette', 'Poulpe 5G', 'Cornichon', 'Micro-ondes', 'Taco fuyard'];

const VENDING_DRINKS = {
  A1: { name: 'Jus Cornichon', color: '#a6ff2e' },
  B2: { name: 'Cola Mutant', color: '#00f5d4' },
  C3: { name: 'Cringe Fizz', color: '#ff2bd6' },
};

const GEIGER_VERDICTS = [
  'Air : 84% Taco Illégal',
  'Mutagène léger détecté',
  'Fuite de cornichons !',
  'Cringe ambiant : CRITIQUE',
  'Odeur de GPU cramé',
];

const POLYGRAPH_VERDICTS = [
  { text: '99% Pipeau quantique', badge: 'MYTHO 99%', lie: true },
  { text: 'Validé par le poulpe', badge: 'VRAI 100%', lie: false },
  { text: 'Excuse : rejetée !', badge: 'MYTHO 87%', lie: true },
  { text: 'Vérité : pur hasard', badge: 'VRAI 62%', lie: false },
  { text: 'Preuve : 1 cornichon', badge: 'MYTHO 94%', lie: true },
  { text: 'Alibi : presque crédible', badge: 'VRAI 78%', lie: false },
];

export class WingsController {
  constructor({ audio, moodEl }) {
    this.audio = audio;
    this.moodEl = moodEl;

    // Placebo + Forbidden Button
    this.placeboBtn = document.getElementById('placebo-toggle-btn');
    this.placeboStatusEl = document.getElementById('placebo-status');
    this.dontTouchBtn = document.getElementById('dont-touch-btn');
    this.temptationCountEl = document.getElementById('temptation-count');
    this.placeboActive = false;
    this.temptations = 0;

    // Useless Mixer Console
    this.mixerSliders = Array.from(document.querySelectorAll('.mixer-slider'));
    this.mixerNeedleEl = document.getElementById('mixer-needle');
    this.mixerReadoutEl = document.getElementById('mixer-readout');

    // GPU Cerveau Fan
    this.fanCardEl = document.getElementById('fan-card');
    this.fanModeBtn = document.getElementById('fan-mode-btn');
    this.fanTempEl = document.getElementById('fan-temp');
    this.fanSpeeds = ['normal', 'turbo', 'off'];
    this.fanIndex = 0;

    // Octopus Radar
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas?.getContext('2d') ?? null;
    this.radarPingBtn = document.getElementById('radar-ping-btn');
    this.radarTargetEl = document.getElementById('radar-target');
    this.radarAngle = 0;
    this.radarPingWave = 0;
    this.radarBlips = [
      { angle: 0.9, dist: 0.62, label: RADAR_LABELS[0] },
      { angle: 2.6, dist: 0.42, label: RADAR_LABELS[1] },
      { angle: 4.5, dist: 0.78, label: RADAR_LABELS[2] },
    ];

    // Cornichon Stock Market
    this.marketCanvas = document.getElementById('market-canvas');
    this.marketCtx = this.marketCanvas?.getContext('2d') ?? null;
    this.marketPriceEl = document.getElementById('market-price');
    this.marketWalletEl = document.getElementById('market-wallet');
    this.marketBuyBtn = document.getElementById('market-buy-btn');
    this.marketSellBtn = document.getElementById('market-sell-btn');
    this.marketHistory = Array.from({ length: 24 }, (_, i) => 42 + Math.sin(i * 0.45) * 14);
    this.marketTickAcc = 0;
    this.picklesOwned = 0;

    // Receipt Printer
    this.printerFeedEl = document.getElementById('receipt-feed');
    this.printerBtn = document.getElementById('printer-btn');
    this.receipts = ['TICKET #001 • BIENVENUE', 'ZÉRO CHILL • TVA 420%'];

    // Geiger Counter
    this.geigerBtn = document.getElementById('geiger-btn');
    this.geigerNeedleEl = document.getElementById('geiger-needle');
    this.geigerValueEl = document.getElementById('geiger-value');
    this.geigerStatusEl = document.getElementById('geiger-status');
    this.geigerSpike = 0;

    // Vending Machine
    this.vendingBtns = Array.from(document.querySelectorAll('.vending-key'));
    this.vendingTrayCanEl = document.getElementById('vending-tray-can');
    this.vendingDisplayEl = document.getElementById('vending-display');
    this.vendingCount = 0;

    // Doomsday Clock
    this.doomsdayCardEl = document.getElementById('doomsday-card');
    this.doomsdayTimeEl = document.getElementById('doomsday-time');
    this.doomsdaySubEl = document.getElementById('doomsday-sub');
    this.doomsdayBadgeEl = document.getElementById('doomsday-badge');
    this.doomsdayMinusBtn = document.getElementById('doomsday-minus-btn');
    this.doomsdayPlusBtn = document.getElementById('doomsday-plus-btn');
    this.doomsdayResetBtn = document.getElementById('doomsday-reset-btn');
    this.doomsdayRemaining = 18;
    this.doomsdayTickAcc = 0;

    // Polygraph (Lie Detector)
    this.polygraphCardEl = document.getElementById('polygraph-card');
    this.polygraphBadgeEl = document.getElementById('polygraph-badge');
    this.polygraphVerdictEl = document.getElementById('polygraph-verdict');
    this.polygraphBtn = document.getElementById('polygraph-btn');

    this._bindEvents();
    this._syncMixer();
    this._syncFan();
    this._renderReceipts();
    this._syncMarketText();
    this._syncDoomsday();
  }

  _bindEvents() {
    this.placeboBtn?.addEventListener('click', () => {
      this.placeboActive = !this.placeboActive;
      this.placeboBtn.setAttribute('aria-pressed', String(this.placeboActive));
      if (this.placeboStatusEl) {
        this.placeboStatusEl.textContent = this.placeboActive ? 'ACTIF (+0.00%)' : 'INACTIF (0%)';
      }
      this.audio.playSwitchSnap();
    });

    this.dontTouchBtn?.addEventListener('click', () => {
      this.temptations += 1;
      if (this.temptationCountEl) {
        this.temptationCountEl.textContent = String(this.temptations);
      }
      this.audio.playSwitchSnap();
      if (this.moodEl) {
        this.moodEl.textContent = FORBIDDEN_QUIPS[this.temptations % FORBIDDEN_QUIPS.length];
      }
    });

    for (const slider of this.mixerSliders) {
      slider.addEventListener('input', () => this._syncMixer());
      slider.addEventListener('change', () => this.audio.playSwitchSnap());
    }

    this.fanModeBtn?.addEventListener('click', () => {
      this.fanIndex = (this.fanIndex + 1) % this.fanSpeeds.length;
      this._syncFan();
      this.audio.playSwitchSnap();
    });

    this.radarPingBtn?.addEventListener('click', () => {
      this.radarPingWave = 1.0;
      const picked = this.radarBlips[Math.floor(Math.random() * this.radarBlips.length)];
      picked.angle = Math.random() * Math.PI * 2;
      picked.dist = 0.25 + Math.random() * 0.65;
      picked.label = RADAR_LABELS[Math.floor(Math.random() * RADAR_LABELS.length)];
      if (this.radarTargetEl) {
        this.radarTargetEl.textContent = `${picked.label} • ${(picked.dist * 18).toFixed(1)}m`;
      }
      this.audio.playSonarPing();
    });

    this.marketBuyBtn?.addEventListener('click', () => {
      this.picklesOwned += 1;
      this._syncMarketText();
      this.audio.playCashBlip(true);
    });

    this.marketSellBtn?.addEventListener('click', () => {
      this.picklesOwned -= 1;
      this._syncMarketText();
      this.audio.playCashBlip(false);
    });

    this.printerBtn?.addEventListener('click', () => {
      const line = RECEIPT_LINES[Math.floor(Math.random() * RECEIPT_LINES.length)];
      this.receipts.push(line);
      if (this.receipts.length > 3) this.receipts.shift();
      this._renderReceipts();
      this.audio.playPrinterTick();
    });

    this.geigerBtn?.addEventListener('click', () => {
      this.geigerSpike = 1.0;
      const msv = (1.4 + Math.random() * 8.4).toFixed(2);
      if (this.geigerValueEl) this.geigerValueEl.textContent = `${msv} mSv`;
      if (this.geigerStatusEl) {
        this.geigerStatusEl.textContent = GEIGER_VERDICTS[Math.floor(Math.random() * GEIGER_VERDICTS.length)];
      }
      this.audio.playGeigerBurst();
    });

    for (const btn of this.vendingBtns) {
      btn.addEventListener('click', () => {
        const code = btn.dataset.drink;
        const drink = VENDING_DRINKS[code];
        if (!drink) return;
        this.vendingCount += 1;
        if (this.vendingDisplayEl) {
          this.vendingDisplayEl.textContent = `${code}: ${drink.name} (#${this.vendingCount})`;
        }
        if (this.vendingTrayCanEl) {
          this.vendingTrayCanEl.replaceChildren(createVendingCanSvg(code, drink.color));
          this.vendingTrayCanEl.style.setProperty('--can-glow', drink.color);
          this.vendingTrayCanEl.classList.remove('is-dropping');
          void this.vendingTrayCanEl.offsetWidth;
          this.vendingTrayCanEl.classList.add('is-dropping');
        }
        this.audio.playVendingDrop();
      });
    }

    this.doomsdayMinusBtn?.addEventListener('click', () => {
      const wasZero = this.doomsdayRemaining === 0;
      this.doomsdayRemaining = Math.max(0, this.doomsdayRemaining - 1);
      this._syncDoomsday();
      if (this.doomsdayRemaining === 0 && !wasZero) {
        this.audio.playChaosAlert();
      } else {
        this.audio.playSwitchSnap();
      }
    });

    this.doomsdayPlusBtn?.addEventListener('click', () => {
      this.doomsdayRemaining = Math.min(59, this.doomsdayRemaining + 1);
      this._syncDoomsday();
      this.audio.playSwitchSnap();
    });

    this.doomsdayResetBtn?.addEventListener('click', () => {
      this.doomsdayRemaining = 18;
      this._syncDoomsday();
      this.audio.playSwitchSnap();
    });

    this.polygraphBtn?.addEventListener('click', () => {
      const verdict = POLYGRAPH_VERDICTS[Math.floor(Math.random() * POLYGRAPH_VERDICTS.length)];
      if (this.polygraphCardEl) {
        this.polygraphCardEl.classList.toggle('is-lie', verdict.lie);
        this.polygraphCardEl.classList.toggle('is-true', !verdict.lie);
      }
      if (this.polygraphBadgeEl) this.polygraphBadgeEl.textContent = verdict.badge;
      if (this.polygraphVerdictEl) this.polygraphVerdictEl.textContent = verdict.text;
      if (verdict.lie) {
        this.audio.playSonarPing();
      } else {
        this.audio.playCashBlip();
      }
    });
  }

  _syncMixer() {
    if (this.mixerSliders.length === 0) return;
    const sum = this.mixerSliders.reduce((acc, el) => acc + Number(el.value || 0), 0);
    const avg = sum / this.mixerSliders.length;
    const deg = -55 + (avg / 100) * 110;
    if (this.mixerNeedleEl) {
      this.mixerNeedleEl.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    }
    if (this.mixerReadoutEl) {
      this.mixerReadoutEl.textContent = `${Math.round(avg)}%`;
    }
  }

  _syncFan() {
    const mode = this.fanSpeeds[this.fanIndex];
    if (this.fanCardEl) {
      this.fanCardEl.dataset.fanMode = mode;
    }
    const labels = {
      normal: ['NORMAL', '68.4 °C'],
      turbo: ['TURBO', '19.2 °C'],
      off: ['OFF (!)', '104.8 °C'],
    };
    const [btnLabel, tempLabel] = labels[mode];
    if (this.fanModeBtn) this.fanModeBtn.textContent = btnLabel;
    if (this.fanTempEl) this.fanTempEl.textContent = tempLabel;
  }

  _syncMarketText() {
    const latest = this.marketHistory[this.marketHistory.length - 1] ?? 42;
    const delta = ((latest - 40) * 11.3).toFixed(1);
    const sign = Number(delta) >= 0 ? '+' : '';
    if (this.marketPriceEl) {
      this.marketPriceEl.textContent = `${sign}${delta}%`;
    }
    if (this.marketWalletEl) {
      this.marketWalletEl.textContent = String(this.picklesOwned);
    }
  }

  _renderReceipts() {
    if (!this.printerFeedEl) return;
    this.printerFeedEl.textContent = '';
    for (const text of this.receipts) {
      const li = document.createElement('li');
      li.textContent = text;
      this.printerFeedEl.appendChild(li);
    }
  }

  _syncDoomsday() {
    const rem = this.doomsdayRemaining;
    const isMidnight = rem === 0;
    if (this.doomsdayCardEl) {
      this.doomsdayCardEl.classList.toggle('is-midnight', isMidnight);
    }
    if (this.doomsdayTimeEl) {
      this.doomsdayTimeEl.textContent = isMidnight
        ? '00:00:00'
        : `23:59:${String(60 - rem).padStart(2, '0')}`;
    }
    if (this.doomsdayBadgeEl) {
      this.doomsdayBadgeEl.textContent = isMidnight ? 'MINUIT' : `T-${rem}s`;
    }
    if (this.doomsdaySubEl) {
      if (isMidnight) {
        this.doomsdaySubEl.textContent = 'MINUIT ! Rien ne s’est passé.';
      } else if (rem <= 5) {
        this.doomsdaySubEl.textContent = `Minuit dans ${rem}s • ALERTE MOLLUSQUE`;
      } else {
        this.doomsdaySubEl.textContent = `Minuit dans ${rem}s • Tout va bien`;
      }
    }
  }

  update(dt, palette, monochrome, reducedMotion) {
    // Geiger needle tremor
    if (this.geigerSpike > 0) {
      this.geigerSpike = Math.max(0, this.geigerSpike - dt * 0.9);
    }
    if (this.geigerNeedleEl) {
      const baseAngle = -36 + this.geigerSpike * 68;
      const jitter = reducedMotion ? 0 : (Math.random() - 0.5) * (4 + this.geigerSpike * 18);
      this.geigerNeedleEl.style.transform = `rotate(${(baseAngle + jitter).toFixed(1)}deg)`;
    }

    // Doomsday clock passive creep when wings visible
    if (this.doomsdayCardEl && this.doomsdayCardEl.offsetParent !== null) {
      this.doomsdayTickAcc += dt;
      if (this.doomsdayTickAcc >= 7.5) {
        this.doomsdayTickAcc = 0;
        if (this.doomsdayRemaining > 1) {
          this.doomsdayRemaining -= 1;
          this._syncDoomsday();
        }
      }
    }

    // Only redraw wings when visible (>= 1360px and stats not hidden)
    if (this.radarCanvas && this.radarCanvas.offsetParent !== null) {
      if (!reducedMotion) {
        this.radarAngle = (this.radarAngle + dt * 1.65) % (Math.PI * 2);
      }
      if (this.radarPingWave > 0) {
        this.radarPingWave = Math.max(0, this.radarPingWave - dt * 1.15);
      }
      this._renderRadar(palette, monochrome);
    }

    this.marketTickAcc += dt;
    if (this.marketTickAcc >= 0.45) {
      this.marketTickAcc = 0;
      const last = this.marketHistory[this.marketHistory.length - 1];
      const next = Math.max(12, Math.min(88, last + (Math.random() - 0.48) * 18));
      this.marketHistory.shift();
      this.marketHistory.push(next);
      this._syncMarketText();
      if (this.marketCanvas && this.marketCanvas.offsetParent !== null) {
        this._renderMarket(palette, monochrome);
      }
    }
  }

  _renderRadar(pal, mono) {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = Math.min(cx, cy) - 6;
    const strokeMain = mono ? '#ffffff' : pal.cyan;
    const strokeBlip = mono ? '#ffffff' : pal.lime;

    ctx.clearRect(0, 0, w, h);

    // Range rings + crosshair
    ctx.strokeStyle = mono ? 'rgba(255,255,255,0.45)' : 'rgba(0, 245, 212, 0.28)';
    ctx.lineWidth = 1;
    for (const frac of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Sweeping beam wedge
    if (!mono) {
      ctx.fillStyle = 'rgba(0, 245, 212, 0.16)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, this.radarAngle - 0.55, this.radarAngle);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.radarAngle) * r, cy + Math.sin(this.radarAngle) * r);
    ctx.stroke();

    // Active ping ripple
    if (this.radarPingWave > 0) {
      const pr = r * (1 - this.radarPingWave);
      ctx.strokeStyle = mono ? '#ffffff' : pal.yellow;
      ctx.globalAlpha = this.radarPingWave;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Blips
    for (const b of this.radarBlips) {
      const bx = cx + Math.cos(b.angle) * (r * b.dist);
      const by = cy + Math.sin(b.angle) * (r * b.dist);
      ctx.fillStyle = strokeBlip;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderMarket(pal, mono) {
    const ctx = this.marketCtx;
    if (!ctx) return;
    const w = this.marketCanvas.width;
    const h = this.marketCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle horizontal grid
    ctx.strokeStyle = mono ? 'rgba(255,255,255,0.25)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    const len = this.marketHistory.length;
    const up = this.marketHistory[len - 1] >= this.marketHistory[len - 2];
    ctx.strokeStyle = mono ? '#ffffff' : (up ? pal.lime : pal.pink);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * (w - 6) + 3;
      const y = h - 4 - (this.marketHistory[i] / 100) * (h - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
