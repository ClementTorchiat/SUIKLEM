import {
  FRUITS,
  DROP_MAX_TIER,
  MERGE_QUIPS,
  COMBO_QUIPS,
  GAMEOVER_QUIPS,
  CHAOS_EVENTS,
  CHAOS_PALETTES,
  GAME_MODES,
  ACHIEVEMENTS,
} from './fruits.js';
import { PhysicsWorld, JAR_BOUNDS } from './physics.js';
import { GameRenderer, drawFruitShape } from './renderer.js';
import { BackgroundRenderer } from './bg.js';
import { BrainrotAudio } from './audio.js';

const STORAGE_BEST_KEY = 'suiklem-best-score';
const STORAGE_MUTE_KEY = 'suiklem-muted';
const STORAGE_MUSIC_MUTE_KEY = 'suiklem-music-muted';
const STORAGE_HIDE_STATS_KEY = 'suiklem-hide-stats';
const STORAGE_MODE_KEY = 'suiklem-mode';
const STORAGE_ACHIEVEMENTS_KEY = 'suiklem-achievements';
const CHARGE_PER_GAUGE = 185;
const MAX_GAUGES = 5;
const MAX_CHARGE = CHARGE_PER_GAUGE * MAX_GAUGES;
const CLONE_MAX_TIER = 6;

// --- Top-layer dialog helpers (from modern-web-guidance) ---
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

async function closeTopLayer(dialog, returnValue = '') {
  if (!dialog.open) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  dialog.close(returnValue);
}

function setupDialogSupport(dialog) {
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayer(dialog);
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
  });

  if (!('closedBy' in HTMLDialogElement.prototype) && dialog.getAttribute('closedby') === 'any') {
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) {
        closeTopLayer(dialog);
      }
      pressedOutside = false;
    });
  }
}

function readStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val === null ? fallback : val;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors
  }
}

class SuiklemGame {
  constructor() {
    this.bgCanvas = document.getElementById('bg-canvas');
    this.canvas = document.getElementById('game-canvas');
    this.nextCanvas = document.getElementById('next-canvas');
    this.scoreEl = document.getElementById('score-value');
    this.bestEl = document.getElementById('best-value');
    this.nextNameEl = document.getElementById('next-name');
    this.dangerBanner = document.getElementById('danger-banner');
    this.powerBanner = document.getElementById('power-banner');
    this.powerBannerTextEl = document.getElementById('power-banner-text');
    this.cancelPowerBtn = document.getElementById('cancel-power-btn');
    this.chaosBanner = document.getElementById('chaos-banner');
    this.chaosBannerTextEl = document.getElementById('chaos-banner-text');
    this.chaosTimerTextEl = document.getElementById('chaos-timer-text');
    this.paletteNameTextEl = document.getElementById('palette-name-text');
    this.gaugeSummaryEl = document.getElementById('gauge-summary');
    this.gaugeFills = [
      document.getElementById('gauge-fill-0'),
      document.getElementById('gauge-fill-1'),
      document.getElementById('gauge-fill-2'),
      document.getElementById('gauge-fill-3'),
      document.getElementById('gauge-fill-4'),
    ];
    this.powerNukeBtn = document.getElementById('power-nuke-btn');
    this.powerWindBtn = document.getElementById('power-wind-btn');
    this.powerCloneBtn = document.getElementById('power-clone-btn');
    this.powerPurgeBtn = document.getElementById('power-purge-btn');
    this.powerApocalypseBtn = document.getElementById('power-apocalypse-btn');
    this.moodEl = document.getElementById('jar-mood');
    this.liveEl = document.getElementById('live-announcer');
    this.evolutionListEl = document.getElementById('evolution-list');

    this.statsToggleBtn = document.getElementById('stats-toggle');
    this.soundToggleBtn = document.getElementById('sound-toggle');
    this.musicToggleBtn = document.getElementById('music-toggle');
    this.achievementsBtn = document.getElementById('achievements-btn');
    this.achCountEl = document.getElementById('ach-count');
    this.helpBtn = document.getElementById('help-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.helpDialog = document.getElementById('help-dialog');
    this.gameoverDialog = document.getElementById('gameover-dialog');
    this.achievementsDialog = document.getElementById('achievements-dialog');
    this.achievementsListEl = document.getElementById('achievements-list');
    this.achievementsProgressEl = document.getElementById('achievements-progress');
    this.achievementToastEl = document.getElementById('achievement-toast');
    this.achievementToastEmojiEl = document.getElementById('achievement-toast-emoji');
    this.achievementToastTitleEl = document.getElementById('achievement-toast-title');
    this.achievementToastDescEl = document.getElementById('achievement-toast-desc');
    this.feverPillEl = document.getElementById('fever-pill');
    this.controlsHintEl = document.querySelector('.controls-hint');
    this.modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
    this.helpFruitGridEl = document.getElementById('help-fruit-grid');

    this.finalScoreEl = document.getElementById('final-score');
    this.finalBestEl = document.getElementById('final-best');
    this.finalBiggestEl = document.getElementById('final-biggest');
    this.finalTimeEl = document.getElementById('final-time');
    this.finalMouseEl = document.getElementById('final-mouse');
    this.finalIqEl = document.getElementById('final-iq');
    this.gameoverQuipEl = document.getElementById('gameover-quip');

    this.tickerBar = document.querySelector('.ticker-bar');
    this.tickerToggleBtn = document.getElementById('ticker-toggle');
    this.jarFrameEl = document.querySelector('.jar-frame');
    this.flashlightEl = document.getElementById('flashlight-overlay');
    this.fourthWallActorEl = document.getElementById('fourthwall-actor');
    this.fourthWallBubbleEl = document.getElementById('fourthwall-bubble');
    this.fourthWallCanvasEl = document.getElementById('fourthwall-canvas');
    this.fourthWallCtx = this.fourthWallCanvasEl ? this.fourthWallCanvasEl.getContext('2d') : null;
    this.fourthWallStep = -1;
    this.fourthWallLines = [];
    this.popupsLayerEl = document.getElementById('popups-layer');
    this.popupsSpawnedForChaos = false;
    this.isMystery = false;
    this.lagRenderAcc = 999;
    this.runawayX = 0;
    this.runawayY = 0;
    this.ecgCanvas = document.getElementById('ecg-canvas');
    this.ecgCtx = this.ecgCanvas.getContext('2d');
    this.ecgHistory = new Array(60).fill(0);

    this.telemetryEls = {
      mouse: document.getElementById('stat-mouse'),
      drops: document.getElementById('stat-drops'),
      merges: document.getElementById('stat-merges'),
      bonks: document.getElementById('stat-bonks'),
      time: document.getElementById('stat-time'),
      kcal: document.getElementById('stat-kcal'),
      mass: document.getElementById('stat-mass'),
      energy: document.getElementById('stat-energy'),
      speed: document.getElementById('stat-speed'),
      rpm: document.getElementById('stat-rpm'),
      cringe: document.getElementById('stat-cringe'),
      pressure: document.getElementById('stat-pressure'),
      temp: document.getElementById('stat-temp'),
      wifi: document.getElementById('stat-wifi'),
      salt: document.getElementById('stat-salt'),
      iq: document.getElementById('stat-iq'),
      db: document.getElementById('stat-db'),
      bpm: document.getElementById('stat-bpm'),
      plastic: document.getElementById('stat-plastic'),
      entropy: document.getElementById('stat-entropy'),
      ledFps: document.getElementById('led-fps'),
      ledFill: document.getElementById('led-fill'),
      ledCount: document.getElementById('led-count'),
      ledFires: document.getElementById('led-fires'),
      ledClicks: document.getElementById('led-clicks'),
    };

    this.audio = new BrainrotAudio();
    this.bgRenderer = new BackgroundRenderer(this.bgCanvas);
    this.renderer = new GameRenderer(this.canvas, this.nextCanvas);
    this.world = new PhysicsWorld({
      onBump: (speed) => this.audio.playBump(speed),
      onMerge: (info) => this._handleMerge(info),
      onGameOver: () => this._handleGameOver(),
      onChaosFx: (fx) => this._handleChaosFx(fx),
    });

    this.score = 0;
    this.bestScore = Number(readStorage(STORAGE_BEST_KEY, '0')) || 0;
    this.isMuted = readStorage(STORAGE_MUTE_KEY, 'false') === 'true';
    this.isMusicMuted = readStorage(STORAGE_MUSIC_MUTE_KEY, 'false') === 'true';
    this.hideUselessStats = readStorage(STORAGE_HIDE_STATS_KEY, 'false') === 'true';
    const savedMode = readStorage(STORAGE_MODE_KEY, 'classic');
    this.gameMode = GAME_MODES[savedMode] ? savedMode : 'classic';
    try {
      const rawAch = JSON.parse(readStorage(STORAGE_ACHIEVEMENTS_KEY, '[]'));
      this.unlockedAchievements = new Set(Array.isArray(rawAch) ? rawAch : []);
    } catch {
      this.unlockedAchievements = new Set();
    }
    this.toastTimerId = null;
    this.audio.setMuted(this.isMuted);
    this.audio.setMusicMuted(this.isMusicMuted);
    this.scoreAnim = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.currentTier = 0;
    this.nextTier = 0;
    this.aimX = JAR_BOUNDS.width / 2;
    this.dropCooldown = 0;
    this.hasStartedDropping = false;
    this.autoDropTimer = 1.0;
    this.feverTimer = 0;
    this.chaosSurvivedCount = 0;
    this.hadHighDangerThisRun = false;
    this.speechCooldown = 5.5;
    this.spamDropAcc = 0;
    this.isGameOver = false;
    this.discoveredTiers = new Set([0]);
    this.biggestTier = 0;

    this.comboCount = 0;
    this.comboTimer = 0;
    this.keysHeld = new Set();
    this.activePointerId = null;

    this.powerCharge = 0;
    this.powerNoChargeTimer = 0;
    this.powerMode = null;
    this.hoveredFruitId = null;
    this.pointerWorldPos = null;

    this.chaosCountdown = 11;
    this.lastChaosId = null;
    this.paletteIndex = 0;
    this.isMonochrome = false;

    this.mouseDistancePx = 0;
    this.lastPointerClient = null;
    this.totalClicks = 0;
    this.totalDrops = 0;
    this.totalMerges = 0;
    this.runSeconds = 0;
    this.iqScore = 100;
    this.fpsSmooth = 60;
    this.telemetryAcc = 0;

    this.elapsedTime = 0;
    this.accumulator = 0;
    this.lastFrameTime = performance.now();

    this._initUI();
    this._bindEvents();
    this.startNewGame();
    requestAnimationFrame((now) => this._loop(now));
  }

  _initUI() {
    setupDialogSupport(this.helpDialog);
    setupDialogSupport(this.gameoverDialog);
    setupDialogSupport(this.achievementsDialog);

    this._syncSoundButton();
    this._syncMusicButton();
    this._syncStatsButton();
    this._syncModeButtons();
    this._renderAchievements();
    this.bestEl.textContent = String(this.bestScore);

    this._buildFruitList(this.evolutionListEl, 'evo-item', 18, 8);
    this._buildFruitList(this.helpFruitGridEl, 'help-fruit-item', 20, 8.5);
  }

  _buildFruitList(container, itemClass, boxSize, iconRadius) {
    container.textContent = '';
    for (const fruit of FRUITS) {
      const li = document.createElement('li');
      li.className = itemClass;
      li.dataset.tier = String(fruit.tier);

      const icon = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      icon.width = boxSize * dpr;
      icon.height = boxSize * dpr;
      icon.style.width = `${boxSize}px`;
      icon.style.height = `${boxSize}px`;
      icon.style.flexShrink = '0';
      icon.setAttribute('aria-hidden', 'true');

      const iconCtx = icon.getContext('2d');
      iconCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      iconCtx.translate(boxSize * 0.5, boxSize * 0.54);
      drawFruitShape(iconCtx, fruit.tier, iconRadius, { showFace: false });

      const name = document.createElement('span');
      name.className = 'evo-name';
      name.textContent = fruit.name;

      li.append(icon, name);
      container.appendChild(li);
    }
  }

  _applyPalette(index) {
    this.paletteIndex = index;
    const pal = CHAOS_PALETTES[index];
    const root = document.documentElement.style;
    root.setProperty('--bg-page', pal.bgPage);
    root.setProperty('--surface', pal.surface);
    root.setProperty('--surface-muted', pal.surfaceMuted);
    root.setProperty('--text-main', pal.textMain);
    root.setProperty('--text-muted', pal.textMuted);
    root.setProperty('--cyan', pal.cyan);
    root.setProperty('--pink', pal.pink);
    root.setProperty('--yellow', pal.yellow);
    root.setProperty('--orange', pal.orange);
    root.setProperty('--lime', pal.lime);
    root.setProperty('--focus-ring', pal.yellow);

    this.renderer.setPalette(pal);
    this.bgRenderer.setPalette(pal);
    this.paletteNameTextEl.textContent = `DA : ${pal.name}`;
  }

  _cyclePalette() {
    let next = Math.floor(Math.random() * CHAOS_PALETTES.length);
    if (next === this.paletteIndex) {
      next = (next + 1) % CHAOS_PALETTES.length;
    }
    this._applyPalette(next);
  }

  _bindEvents() {
    this.statsToggleBtn.addEventListener('click', () => this.toggleUselessStats());
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.musicToggleBtn.addEventListener('click', () => this.toggleMusic());
    this.achievementsBtn.addEventListener('click', () => {
      this._renderAchievements();
      this.achievementsDialog.showModal();
    });
    this.helpBtn.addEventListener('click', () => this.helpDialog.showModal());
    this.restartBtn.addEventListener('click', () => this.startNewGame());
    for (const btn of this.modeBtns) {
      btn.addEventListener('click', () => this.setGameMode(btn.dataset.mode));
    }
    this.tickerToggleBtn.addEventListener('click', () => {
      const paused = this.tickerBar.classList.toggle('is-paused');
      this.tickerToggleBtn.textContent = paused ? '▶' : '⏸';
      this.tickerToggleBtn.setAttribute(
        'aria-label',
        paused ? 'Relancer le bandeau' : 'Mettre le bandeau en pause',
      );
    });

    window.addEventListener('pointermove', (e) => {
      if (this.lastPointerClient) {
        this.mouseDistancePx += Math.hypot(
          e.clientX - this.lastPointerClient.x,
          e.clientY - this.lastPointerClient.y,
        );
      }
      this.lastPointerClient = { x: e.clientX, y: e.clientY };
      if (this.flashlightEl) {
        this.flashlightEl.style.setProperty('--flash-x', `${e.clientX}px`);
        this.flashlightEl.style.setProperty('--flash-y', `${e.clientY}px`);
      }
    });

    window.addEventListener('pointerdown', () => {
      this.totalClicks += 1;
      this.audio.unlock();
      if (this.totalClicks >= 250) {
        this._unlockAchievement('click_maniac');
      }
    });

    this.powerNukeBtn.addEventListener('click', () => this._activatePower('nuke'));
    this.powerWindBtn.addEventListener('click', () => this._activatePower('wind'));
    this.powerCloneBtn.addEventListener('click', () => this._activatePower('clone'));
    this.powerPurgeBtn.addEventListener('click', () => this._activatePower('purge'));
    this.powerApocalypseBtn.addEventListener('click', () => this._activatePower('apocalypse'));
    this.cancelPowerBtn.addEventListener('click', () => this._cancelPowerMode());

    this.gameoverDialog.addEventListener('close', () => {
      if (!this.isGameOver) return;
      this.startNewGame();
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.isGameOver) return;
      this.audio.unlock();
      if (this.powerMode) {
        const coords = this._getCanvasCoords(e.clientX, e.clientY);
        if (coords) this._handlePowerCanvasClick(coords.x, coords.y);
        return;
      }
      this.activePointerId = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
      this._updateAimFromClientX(e.clientX);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.isGameOver) return;
      if (this.powerMode || this.world.activeChaos?.id === 'flashlight') {
        this.pointerWorldPos = this._getCanvasCoords(e.clientX, e.clientY);
      }
      if (this.powerMode) {
        const coords = this.pointerWorldPos;
        const hit = coords ? this.world.findFruitAt(coords.x, coords.y) : null;
        this.hoveredFruitId = hit ? hit.id : null;
        return;
      }
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
      this._updateAimFromClientX(e.clientX);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredFruitId = null;
      this.pointerWorldPos = null;
    });

    const handlePointerRelease = (e) => {
      if (this.activePointerId !== e.pointerId) return;
      this._updateAimFromClientX(e.clientX);
      if (this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
      this.activePointerId = null;
      if (!this.powerMode) {
        this.dropCurrentFruit();
      }
    };

    this.canvas.addEventListener('pointerup', handlePointerRelease);
    this.canvas.addEventListener('pointercancel', (e) => {
      if (this.activePointerId === e.pointerId) {
        this.activePointerId = null;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.helpDialog.open || this.gameoverDialog.open || this.achievementsDialog.open) return;

      if (e.key === 'Escape' && this.powerMode) {
        e.preventDefault();
        this._cancelPowerMode();
        return;
      }

      if (e.key === '1') {
        this._activatePower('nuke');
        return;
      }
      if (e.key === '2') {
        this._activatePower('wind');
        return;
      }
      if (e.key === '3') {
        this._activatePower('clone');
        return;
      }
      if (e.key === '4') {
        this._activatePower('purge');
        return;
      }
      if (e.key === '5') {
        this._activatePower('apocalypse');
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        this.keysHeld.add('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.keysHeld.add('right');
      } else if ((e.key === ' ' || e.key === 'ArrowDown') && !this.powerMode) {
        e.preventDefault();
        this.audio.unlock();
        this.dropCurrentFruit();
      } else if (e.key === 'Enter' && document.activeElement === this.canvas && !this.powerMode) {
        e.preventDefault();
        this.audio.unlock();
        this.dropCurrentFruit();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSound();
      } else if (e.key === 'r' || e.key === 'R') {
        this.startNewGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'q' || e.key === 'Q') {
        this.keysHeld.delete('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keysHeld.delete('right');
      }
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
    });
  }

  _getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const offsetX = (this.world.viewWidth - JAR_BOUNDS.width) * 0.5;
    let x = ((clientX - rect.left) / rect.width) * this.world.viewWidth - offsetX;
    let y = ((clientY - rect.top) / rect.height) * JAR_BOUNDS.height;
    if (this.world.activeChaos?.id === 'zoom') {
      const zoomScale = this.reducedMotion ? 1.35 : 1.8;
      x = (x - this.aimX) / zoomScale + this.aimX;
      y = (y - 260) / zoomScale + 260;
    }
    return { x, y };
  }

  _updateAimFromClientX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const offsetX = (this.world.viewWidth - JAR_BOUNDS.width) * 0.5;
    let worldX = ((clientX - rect.left) / rect.width) * this.world.viewWidth - offsetX;
    if (this.world.activeChaos?.id === 'mirror') {
      worldX = JAR_BOUNDS.width - worldX;
    }
    this.aimX = this._clampAimX(worldX, this.currentTier);
  }

  _clampAimX(x, tier) {
    const r = FRUITS[tier].radius;
    return Math.max(this.world.jarLeft + r + 2, Math.min(this.world.jarRight - r - 2, x));
  }

  _pickDropTier() {
    const weights = [24, 23, 20, 15, 11, 7];
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i <= DROP_MAX_TIER; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return 0;
  }

  startNewGame() {
    this.world.reset();
    this.renderer.resetEffects();

    const modeCfg = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.world.setGravityY(modeCfg.gravityY);

    this.score = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.dropCooldown = 0.12;
    this.hasStartedDropping = false;
    this.autoDropTimer = modeCfg.dropLimit ?? 1.0;
    this.feverTimer = 0;
    this.chaosSurvivedCount = 0;
    this.hadHighDangerThisRun = false;
    this.speechCooldown = 5.5;
    this.spamDropAcc = 0;
    this.isGameOver = false;
    this.biggestTier = 0;
    this.discoveredTiers = new Set();
    this.powerCharge = 0;
    this.powerNoChargeTimer = 0;
    this.powerMode = null;
    this.hoveredFruitId = null;
    this.pointerWorldPos = null;
    this.chaosCountdown = modeCfg.chaosEnabled ? modeCfg.chaosMin : 9999;
    this.isMonochrome = false;
    this.isMystery = false;
    this.lagRenderAcc = 999;
    document.body.classList.remove('is-monochrome', 'is-upsidedown', 'is-talljar', 'is-quake', 'is-fever');
    if (this.flashlightEl) this.flashlightEl.hidden = true;
    if (this.fourthWallActorEl) this.fourthWallActorEl.hidden = true;
    this.fourthWallStep = -1;
    this.fourthWallLines = [];
    if (this.feverPillEl) this.feverPillEl.hidden = true;
    this._resetRunawayJar();
    this._clearWin98Popups();
    this.bgRenderer.setMonochrome(false);
    this.totalDrops = 0;
    this.totalMerges = 0;
    this.runSeconds = 0;
    this.iqScore = 100;
    this.ecgHistory.fill(0);

    this._applyPalette(this.paletteIndex);

    this.currentTier = this._pickDropTier();
    this.nextTier = this._pickDropTier();
    this._markDiscovered(this.currentTier);
    this.aimX = JAR_BOUNDS.width / 2;

    if (this.controlsHintEl) {
      this.controlsHintEl.textContent = `${modeCfg.hint} • Espace lâcher • 1–5 pouvoirs`;
    }
    this._syncModeButtons();
    this._updateHUD();
    this._updatePowerUI();
    this._updateTelemetryUI();
    this.dangerBanner.hidden = true;
    this.chaosBanner.hidden = true;
    this.chaosTimerTextEl.textContent = modeCfg.chaosEnabled
      ? 'Clique pour lancer le chaos !'
      : 'Mode Zen : zéro roulette WTF';
    this.moodEl.textContent = modeCfg.startMood;
    this._announce('Nouvelle partie prête. Lâche la première boule pour commencer.');
  }

  setGameMode(modeId) {
    if (!GAME_MODES[modeId] || this.gameMode === modeId) return;
    this.gameMode = modeId;
    writeStorage(STORAGE_MODE_KEY, modeId);
    this.startNewGame();
  }

  _syncModeButtons() {
    for (const btn of this.modeBtns) {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === this.gameMode));
    }
  }

  toggleMusic() {
    this.isMusicMuted = !this.isMusicMuted;
    this.audio.setMusicMuted(this.isMusicMuted);
    if (!this.isMusicMuted) this.audio.unlock();
    writeStorage(STORAGE_MUSIC_MUTE_KEY, this.isMusicMuted);
    this._syncMusicButton();
  }

  _syncMusicButton() {
    if (!this.musicToggleBtn) return;
    this.musicToggleBtn.setAttribute('aria-pressed', String(this.isMusicMuted));
    this.musicToggleBtn.setAttribute(
      'aria-label',
      this.isMusicMuted ? 'Activer la musique chiptune' : 'Couper la musique chiptune',
    );
  }

  _unlockAchievement(id) {
    if (this.unlockedAchievements.has(id)) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;

    this.unlockedAchievements.add(id);
    writeStorage(STORAGE_ACHIEVEMENTS_KEY, JSON.stringify([...this.unlockedAchievements]));
    this.audio.playAchievement();
    this._renderAchievements();

    if (this.achievementToastEl) {
      this.achievementToastEmojiEl.textContent = ach.emoji;
      this.achievementToastTitleEl.textContent = `Succès débloqué : ${ach.title}`;
      this.achievementToastDescEl.textContent = ach.desc;
      this.achievementToastEl.hidden = false;
      clearTimeout(this.toastTimerId);
      this.toastTimerId = setTimeout(() => {
        if (this.achievementToastEl) this.achievementToastEl.hidden = true;
      }, 3400);
    }
  }

  _renderAchievements() {
    const unlockedCount = this.unlockedAchievements.size;
    if (this.achCountEl) {
      this.achCountEl.textContent = `${unlockedCount}/${ACHIEVEMENTS.length}`;
    }
    if (this.achievementsProgressEl) {
      this.achievementsProgressEl.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    }
    if (!this.achievementsListEl) return;
    this.achievementsListEl.textContent = '';
    for (const ach of ACHIEVEMENTS) {
      const unlocked = this.unlockedAchievements.has(ach.id);
      const li = document.createElement('li');
      li.className = `achievement-item${unlocked ? ' is-unlocked' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'achievement-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = unlocked ? ach.emoji : '🔒';
      const info = document.createElement('div');
      info.className = 'achievement-info';
      const title = document.createElement('strong');
      title.textContent = ach.title;
      const desc = document.createElement('span');
      desc.textContent = ach.desc;
      info.append(title, desc);
      li.append(icon, info);
      this.achievementsListEl.appendChild(li);
    }
  }

  _maybeSpawnSpeechBubble(dt) {
    if (!this.hasStartedDropping || this.world.bodies.length < 2) return;
    this.speechCooldown -= dt;
    if (this.speechCooldown > 0 || this.renderer.speechBubble) return;

    this.speechCooldown = 8.0 + Math.random() * 5.0;
    const bodies = this.world.bodies;
    let speaker = null;
    let text = null;

    const worried = bodies.find((b) => b.y - b.radius < JAR_BOUNDS.dangerY + 12);
    const chaosId = this.world.activeChaos?.id ?? null;

    if (worried) {
      speaker = worried;
      text = Math.random() < 0.5 ? 'JE TOUCHE LE PLAFOND !' : 'ÇA SENT LE GAME OVER…';
    } else if (chaosId === 'flashlight') {
      speaker = bodies[Math.floor(Math.random() * bodies.length)];
      text = 'OÙ EST LA LUMIÈRE ?!';
    } else if (chaosId === 'upsidedown') {
      speaker = bodies[Math.floor(Math.random() * bodies.length)];
      text = 'J’AI LA TÊTE À L’ENVERS !';
    } else if (chaosId === 'talljar') {
      speaker = bodies[Math.floor(Math.random() * bodies.length)];
      text = 'ADIEU LE FOND !!';
    } else if (chaosId === 'strike') {
      speaker = bodies[Math.floor(Math.random() * bodies.length)];
      text = 'TOUS EN GRÈVE !';
    } else if (this.feverTimer > 0) {
      speaker = bodies[Math.floor(Math.random() * bodies.length)];
      text = 'FEVER ×2 BABY !!';
    } else {
      const crushed = bodies.find((small) => small.tier <= 2 && bodies.some((big) => big.tier >= 6 && big.y < small.y && Math.abs(big.x - small.x) < big.radius));
      if (crushed) {
        speaker = crushed;
        text = 'AÏE MON DOS !!';
      } else if (Math.random() < 0.35) {
        speaker = bodies[Math.floor(Math.random() * bodies.length)];
        const idleLines = ['MON QI BAISSE…', 'NE ME FUSIONNE PAS', 'J’AI FROID', 'POURQUOI MOI ?'];
        text = idleLines[Math.floor(Math.random() * idleLines.length)];
      }
    }

    if (speaker && text) {
      this.renderer.spawnSpeechBubble(speaker.id, text, 2.35);
    }
  }

  toggleUselessStats() {
    this.hideUselessStats = !this.hideUselessStats;
    writeStorage(STORAGE_HIDE_STATS_KEY, this.hideUselessStats);
    this._syncStatsButton();
    if (!this.hideUselessStats) {
      this._updateTelemetryUI();
    }
  }

  _syncStatsButton() {
    document.body.classList.toggle('hide-useless-stats', this.hideUselessStats);
    this.statsToggleBtn.setAttribute('aria-pressed', String(this.hideUselessStats));
    this.statsToggleBtn.setAttribute(
      'aria-label',
      this.hideUselessStats ? 'Afficher les stats inutiles' : 'Masquer les stats inutiles',
    );
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    this.audio.setMuted(this.isMuted);
    if (!this.isMuted) this.audio.unlock();
    writeStorage(STORAGE_MUTE_KEY, this.isMuted);
    this._syncSoundButton();
  }

  _syncSoundButton() {
    this.soundToggleBtn.setAttribute('aria-pressed', String(this.isMuted));
    this.soundToggleBtn.setAttribute(
      'aria-label',
      this.isMuted ? 'Activer le son' : 'Couper le son',
    );
  }

  dropCurrentFruit({ forced = false, fromSpam = false } = {}) {
    if (this.isGameOver) return;
    if (!fromSpam && (this.dropCooldown > 0 || this.world.activeChaos?.id === 'spamclick')) return;

    this.hasStartedDropping = true;
    this.totalDrops += 1;
    this._unlockAchievement('first_drop');
    if (forced) {
      this.iqScore -= 3;
      if (this.iqScore < 0) this._unlockAchievement('negative_iq');
    }

    const tier = this.currentTier;
    const jitter = fromSpam ? (Math.random() - 0.5) * 44 : 0;
    const x = this._clampAimX(this.aimX + jitter, tier);
    this.world.spawnFruit(tier, x, JAR_BOUNDS.dropY, {
      vy: fromSpam ? 180 : 40,
      mood: 'falling',
      moodTimer: 0.65,
      squashX: 0.9,
      squashY: 1.12,
    });

    if (forced) {
      this.renderer.spawnMicroExplosion(x, JAR_BOUNDS.dropY + 10, '#ff2bd6', 'TROP LENT !');
    } else if (fromSpam) {
      this.renderer.spawnFlameBurst(x, JAR_BOUNDS.dropY + 12, 4);
      this.renderer.triggerGlitch(0.08);
    }

    this.audio.playDrop();
    this._markDiscovered(tier);

    this.currentTier = this.nextTier;
    this.nextTier = this._pickDropTier();
    this.aimX = this._clampAimX(this.aimX, this.currentTier);
    const modeCfg = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.dropCooldown = fromSpam ? 0.08 : 0.22;
    this.autoDropTimer = modeCfg.dropLimit ?? 1.0;
    this._updateHUD();
    this._updatePowerUI();
    this._updateTelemetryUI();
  }

  _handleChaosFx({ type, x, y, tier }) {
    if (type === 'popcorn') {
      this.renderer.spawnMicroExplosion(x, y, '#ff7b00', 'POP!!');
      this.renderer.triggerShake(5, 0.16);
      this.audio.playChomp();
    } else if (type === 'rain') {
      this.renderer.spawnMicroExplosion(x, y, '#00f5d4', 'PLOUF');
    } else if (type === 'bonk') {
      this.renderer.spawnMicroExplosion(x, y, FRUITS[tier].color, 'BONK!');
      this.renderer.triggerShake(3.5, 0.12);
    } else if (type === 'slam') {
      this.audio.playSlam();
      this.renderer.triggerShake(12, 0.42);
      this.renderer.triggerGlitch(0.35);
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', 'CRUSH !!');
      this.renderer.spawnLaserBolt(14, 120, 366, 520, '#ffe600');
      this.renderer.spawnLaserBolt(366, 120, 14, 520, '#00f5d4');
      this.moodEl.textContent = 'CLAC !! LE BOL A CLAQUÉ ! TOUT LE MONDE DANS LA BOÎTE !';
    } else if (type === 'elevatorSlam') {
      this.audio.playSlam();
      this.renderer.triggerShake(13, 0.45);
      this.renderer.triggerGlitch(0.35);
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', 'CRASH ASCENSEUR !!');
      this.renderer.spawnLaserBolt(18, 440, 362, 540, '#ff2bd6');
      this.renderer.spawnLaserBolt(362, 440, 18, 540, '#00f5d4');
      this.moodEl.textContent = 'POUM !! LE PLANCHER A LÂCHÉ D’UN COUP !!';
    } else if (type === 'talljarSnap') {
      this.audio.playSlam();
      this.renderer.triggerShake(14, 0.5);
      this.renderer.triggerGlitch(0.4);
      this.renderer.spawnMicroExplosion(x, y, '#00f5d4', 'RETOUR DE L’ABYSSE !!');
      this.renderer.spawnFlameBurst(190, 520, 14);
      this.moodEl.textContent = 'BOUM !! LE FOND EST REVENU DES PROFONDEURS !!';
    } else if (type === 'potatoBoom') {
      this.audio.playNuke();
      this.renderer.triggerShake(11, 0.35);
      this.renderer.triggerGlitch(0.28);
      this.renderer.spawnMicroExplosion(x, y, '#ff2a00', 'PATATE BOOM !!');
      this.renderer.spawnFlameBurst(x, y, 12);
    } else if (type === 'swap') {
      this.audio.playClone();
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', 'SWAP!');
      this.renderer.triggerGlitch(0.14);
    } else if (type === 'ufoBeam') {
      this.audio.playChomp();
      this.renderer.spawnMicroExplosion(x, y, '#a6ff2e', 'ABDUCTION!');
    } else if (type === 'quakeJolt') {
      this.audio.playBump(380);
      this.renderer.triggerShake(10, 0.22);
      this.renderer.triggerGlitch(0.14);
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', 'SÉISME !!');
    } else if (type === 'fourthwallEscape') {
      this.audio.playClone();
      this.renderer.triggerShake(8, 0.28);
      this.renderer.spawnMicroExplosion(x, y, '#00f5d4', 'ÉVASION !!');
      this.renderer.spawnLaserBolt(x, y, 370, 540, '#ffe600');
      this.fourthWallStep = -1;
      this.fourthWallLines = this._buildFourthWallLines(tier);
    } else if (type === 'fourthwallReturn') {
      this.audio.playSlam();
      this.renderer.triggerShake(11, 0.35);
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', 'RETOUR AU BOCAL !!');
      this.moodEl.textContent = 'RETOUR DE PAUSE CAFÉ ! ATTENTION À LA CHUTE !';
    }
  }

  _buildFourthWallLines(tier) {
    const name = FRUITS[tier]?.name ?? 'Mutant';
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return [
      `Salut toi derrière l’écran ! Oui, TOI avec ta souris. Je suis ${name} et j’étouffais dans ce bocal.`,
      `Franchement, ${Math.round(this.mouseDistancePx)} px de souris et ${this.totalClicks} clics pour ${this.score} pts… on s’ennuie pas à ${heure} ?!`,
      `Tu réalises qu’un dev a codé ça au lieu de dormir ? Pendant ce temps, les autres s’écrasent sans moi là-dedans.`,
      `Bon, mes 10 secondes de RTT sont finies… pousse tes doigts, JE REPLONGE DANS LE BOCAL !!`,
    ];
  }

  _renderFourthWallActor(chaos, mono) {
    if (!this.fourthWallActorEl || !this.fourthWallCtx || !chaos?.escapedBall) return;
    const step = Math.min(3, Math.floor(chaos.elapsed / 2.5));
    if (step !== this.fourthWallStep) {
      this.fourthWallStep = step;
      if (this.fourthWallLines.length === 0) {
        this.fourthWallLines = this._buildFourthWallLines(chaos.escapedBall.tier);
      }
      this.fourthWallBubbleEl.textContent = this.fourthWallLines[step] ?? '';
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 132;
    if (this.fourthWallCanvasEl.width !== size * dpr) {
      this.fourthWallCanvasEl.width = size * dpr;
      this.fourthWallCanvasEl.height = size * dpr;
    }
    const ctx = this.fourthWallCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const talkPulse = this.reducedMotion ? 0 : Math.abs(Math.sin(this.elapsedTime * 11)) * 0.08;
    const bob = this.reducedMotion ? 0 : Math.sin(this.elapsedTime * 4.5) * 4;
    const tilt = this.reducedMotion ? 0 : Math.sin(this.elapsedTime * 3.2) * 0.09;
    ctx.save();
    ctx.translate(size * 0.5, size * 0.55 + bob);
    ctx.rotate(tilt);
    drawFruitShape(ctx, chaos.escapedBall.tier, 46, {
      mood: step === 3 ? 'worried' : 'happy',
      isBlinking: Math.sin(this.elapsedTime * 2.1) > 0.94,
      squashX: 1 + talkPulse,
      squashY: 1 - talkPulse * 0.8,
      time: this.elapsedTime,
      monochrome: mono,
    });
    ctx.restore();
  }

  _resetRunawayJar() {
    this.runawayX = 0;
    this.runawayY = 0;
    if (this.jarFrameEl) {
      this.jarFrameEl.style.setProperty('--jar-tx', '0px');
      this.jarFrameEl.style.setProperty('--jar-ty', '0px');
    }
  }

  _addScore(points) {
    const mult = this.feverTimer > 0 ? 2 : 1;
    const total = points * mult;
    this.score += total;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      writeStorage(STORAGE_BEST_KEY, this.bestScore);
    }
    if (this.gameMode === 'inferno' && this.score >= 500) {
      this._unlockAchievement('inferno_runner');
    }
    if (total > 0) {
      this._bounceScore(total);
    }
    return total;
  }

  _bounceScore(points) {
    if (!this.scoreEl?.animate) return;
    if (this.scoreAnim) {
      this.scoreAnim.cancel();
    }
    const pal = CHAOS_PALETTES[this.paletteIndex];
    const c1 = this.isMonochrome ? '#ffffff' : pal.pink;
    const c2 = this.isMonochrome ? '#ffffff' : pal.yellow;
    const c3 = this.isMonochrome ? '#ffffff' : pal.cyan;
    const c4 = this.isMonochrome ? '#ffffff' : pal.lime;

    if (this.reducedMotion) {
      this.scoreAnim = this.scoreEl.animate(
        [{ color: c1 }, { color: c2 }],
        { duration: 220, easing: 'ease-out' },
      );
      return;
    }

    // Scale & wild multi-axis bounce proportional to points gained!
    const intensity = Math.min(1, points / 120);
    const peakScale = 1.18 + intensity * 0.72;
    const dipScale = 0.88 - intensity * 0.1;
    const tilt = (Math.random() < 0.5 ? 1 : -1) * (3 + intensity * 13);
    const shiftX = (Math.random() - 0.5) * (4 + intensity * 14);
    const shiftY = -(3 + intensity * 10);
    const duration = Math.round(320 + intensity * 260);

    this.scoreAnim = this.scoreEl.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', color: c2 },
        {
          transform: `translate(${shiftX}px, ${shiftY}px) scale(${peakScale}) rotate(${tilt}deg)`,
          color: c1,
          offset: 0.24,
        },
        {
          transform: `translate(${-shiftX * 0.6}px, ${-shiftY * 0.4}px) scale(${dipScale}) rotate(${-tilt * 0.7}deg)`,
          color: c3,
          offset: 0.5,
        },
        {
          transform: `translate(${shiftX * 0.3}px, ${shiftY * 0.25}px) scale(${1 + (peakScale - 1) * 0.35}) rotate(${tilt * 0.35}deg)`,
          color: c4,
          offset: 0.74,
        },
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', color: c2 },
      ],
      { duration, easing: 'ease-out' },
    );
  }

  _handleMerge({ x, y, newTier, isMaxPop, fromPower = false }) {
    if (this.comboTimer > 0) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = 1.15;
    this.totalMerges += 1;
    if (this.comboCount >= 2) this.iqScore += 2;

    const baseScore = isMaxPop ? 300 : FRUITS[newTier].score;
    const comboBonus = this.comboCount > 1 ? Math.min(this.comboCount - 1, 5) * 3 : 0;
    const gained = baseScore + comboBonus;
    if (this.comboCount >= 4) {
      const wasFever = this.feverTimer > 0;
      this.feverTimer = wasFever ? Math.min(8.0, this.feverTimer + 1.4) : 7.0;
      if (!wasFever) {
        this.audio.playFever();
        this._unlockAchievement('fever_mode');
        this._announce('Mode Fever fois 2 activé !');
      }
    }
    if (this.comboCount >= 5) {
      this._unlockAchievement('combo_king');
    }
    if (newTier >= 15 || isMaxPop) {
      this._unlockAchievement('watermelon');
    }

    const addedScore = this._addScore(gained);

    const canChargeFromMerge = !fromPower && this.powerNoChargeTimer <= 0 && this.world.windTimer <= 0;
    if (canChargeFromMerge) {
      const prevGauges = this._availableGauges();
      const chargeGain = gained + (this.comboCount > 1 ? (this.comboCount - 1) * 4 : 0);
      this.powerCharge = Math.min(MAX_CHARGE, this.powerCharge + chargeGain);
      const nextGauges = this._availableGauges();
      if (nextGauges > prevGauges) {
        this.audio.playGaugeReady();
        this._announce(`Jauge ${nextGauges} sur ${MAX_GAUGES} prête.`);
      }
    }

    const isNewDiscovery = !this.discoveredTiers.has(newTier);
    this._markDiscovered(newTier);
    if (newTier > this.biggestTier) {
      this.biggestTier = newTier;
    }

    this.audio.playMerge(newTier, this.comboCount);
    if (newTier >= 4 || this.comboCount >= 2 || isMaxPop) {
      this.renderer.triggerShake(Math.min(11, 2.5 + newTier * 0.7), 0.25);
    }

    let floatLabel = `+${addedScore}`;
    if (isMaxPop) {
      floatLabel = 'DOUBLE PASTÈQUE 3000 !! +300';
      this.moodEl.textContent = 'EXPLOSION NUCLÉAIRE DE PASTÈQUE ! LA NASA EST EN PANNE !';
      this._announce('Double Pastèque 3000 ! Plus 300 points.');
    } else if (this.comboCount >= 3) {
      floatLabel = `COMBO ×${this.comboCount} !!`;
      const quip = COMBO_QUIPS[Math.floor(Math.random() * COMBO_QUIPS.length)];
      this.moodEl.textContent = `${quip} (×${this.comboCount})`;
    } else if (isNewDiscovery) {
      floatLabel = `${FRUITS[newTier].name} !`;
      this.moodEl.textContent = `${FRUITS[newTier].name} : ${FRUITS[newTier].quip}`;
      this._announce(`Nouveau mutant : ${FRUITS[newTier].name}.`);
    } else if (Math.random() < 0.7) {
      floatLabel = MERGE_QUIPS[Math.floor(Math.random() * MERGE_QUIPS.length)];
    }

    this.renderer.spawnMergeEffect(x, y, newTier, floatLabel);
    this._updateHUD();
    this._updatePowerUI();
    this._updateTelemetryUI();
  }

  _spawnWin98Popups() {
    this._clearWin98Popups();
    if (!this.popupsLayerEl) return;

    const specs = [
      {
        title: 'Gagnez 1 Pastèque.exe',
        body: 'FÉLICITATIONS ! Tu es le 1 000 000e joueur à dropper trop vite !',
        cta: 'Accepter (faux)',
        top: '14%',
        left: '6%',
      },
      {
        title: 'Alerte Système 98',
        body: 'ERREUR FATALE : Trop de dopamine détectée dans le bocal.',
        cta: 'Ignorer',
        top: '42%',
        left: '28%',
      },
      {
        title: 'Télécharger RAM Gratuite',
        body: '+64 Go de Qi cérébral instantané ! Offre limitée à 7 secondes.',
        cta: 'OK LOL',
        top: '68%',
        left: '10%',
      },
    ];

    for (const spec of specs) {
      const card = document.createElement('div');
      card.className = 'win98-popup';
      card.style.top = spec.top;
      card.style.left = spec.left;
      card.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('pointerup', (e) => e.stopPropagation());

      const bar = document.createElement('div');
      bar.className = 'win98-titlebar';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'win98-title';
      titleSpan.textContent = spec.title;

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'win98-close';
      closeBtn.setAttribute('aria-label', `Fermer ${spec.title}`);
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.remove();
        if (this.popupsLayerEl.childElementCount === 0) {
          this.popupsLayerEl.hidden = true;
        }
      });
      bar.append(titleSpan, closeBtn);

      const body = document.createElement('div');
      body.className = 'win98-body';
      const text = document.createElement('p');
      text.textContent = spec.body;
      const cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'win98-cta';
      cta.textContent = spec.cta;
      cta.addEventListener('click', (e) => {
        e.stopPropagation();
        cta.textContent = 'PIÉGÉ ! ×';
        this.renderer.triggerShake(4, 0.15);
      });
      body.append(text, cta);

      card.append(bar, body);
      this.popupsLayerEl.appendChild(card);
    }

    this.popupsLayerEl.hidden = false;
    this.popupsSpawnedForChaos = true;
  }

  _clearWin98Popups() {
    this.popupsSpawnedForChaos = false;
    if (!this.popupsLayerEl) return;
    this.popupsLayerEl.replaceChildren();
    this.popupsLayerEl.hidden = true;
  }

  _triggerRandomChaos() {
    const pool = CHAOS_EVENTS.filter((ev) => ev.id !== this.lastChaosId);
    const evt = pool[Math.floor(Math.random() * pool.length)];
    this.lastChaosId = evt.id;
    this.chaosSurvivedCount += 1;
    if (this.chaosSurvivedCount >= 5) {
      this._unlockAchievement('wtf_veteran');
    }

    this._cyclePalette();
    this.spamDropAcc = 0;
    this._clearWin98Popups();

    this.world.triggerChaos(evt);
    if (evt.id === 'popups') {
      this._spawnWin98Popups();
    }
    this.audio.playChaosAlert();
    this.renderer.triggerShake(8, 0.35);
    this.renderer.triggerGlitch(0.35);
    this.renderer.spawnMicroExplosion(
      JAR_BOUNDS.width * 0.5,
      JAR_BOUNDS.height * 0.45,
      '#ff2bd6',
      evt.name,
    );
    this.moodEl.textContent = evt.quip;
    this._announce(`Événement aléatoire : ${evt.name}. Nouvelle palette : ${CHAOS_PALETTES[this.paletteIndex].name}.`);
  }

  _availableGauges() {
    return Math.floor(this.powerCharge / CHARGE_PER_GAUGE);
  }

  _activatePower(type) {
    if (this.isGameOver) return;
    if (this.powerMode === type) {
      this._cancelPowerMode();
      return;
    }

    const gauges = this._availableGauges();
    const bodyCount = this.world.bodies.length;

    if (type === 'nuke') {
      if (gauges < 1 || bodyCount < 1) return;
      this.powerMode = 'nuke';
      this.powerBannerTextEl.textContent = 'Clique pour larguer la BOMBE !';
      this._announce('Mode bombe locale actif : cliquez dans le bocal.');
      this._updatePowerUI();
      return;
    }

    if (type === 'wind') {
      if (gauges < 2 || bodyCount < 1) return;
      this._cancelPowerMode(false);
      this.powerCharge = Math.max(0, this.powerCharge - 2 * CHARGE_PER_GAUGE);
      this.powerNoChargeTimer = Math.max(this.powerNoChargeTimer, 2.8);
      this.world.triggerWind(2.6);
      this.audio.playWind();
      this.renderer.triggerShake(6, 0.35);
      this.renderer.triggerGlitch(0.25);
      this.moodEl.textContent = 'ESSORAGE 9000 RPM ! LES CHAUSSETTES VOLENT PARTOUT !';
      this._announce('Essorage 9000 activé !');
      this._updatePowerUI();
      return;
    }

    if (type === 'clone') {
      const hasClonable = this.world.bodies.some((b) => b.tier <= CLONE_MAX_TIER);
      if (gauges < 3 || !hasClonable) {
        if (gauges >= 3 && bodyCount > 0) {
          this.moodEl.textContent = 'Aucune boule ≤ Chaussette Mouillée à cloner !';
        }
        return;
      }
      this.powerMode = 'clone';
      this.powerBannerTextEl.textContent = 'Clique sur une boule (max Chaussette) à CLONER !';
      this._announce('Mode rayon cloneur actif : sélectionnez une créature jusqu’à Chaussette Mouillée.');
      this._updatePowerUI();
      return;
    }

    if (type === 'purge') {
      if (gauges < 4 || bodyCount < 1) return;
      this._cancelPowerMode(false);
      const purged = this.world.purgeLowTiers(3);
      if (purged.length === 0) {
        this.moodEl.textContent = 'Aucune mini-boule à purger ! Tes 4 jauges sont sauves.';
        return;
      }
      this.powerCharge = Math.max(0, this.powerCharge - 4 * CHARGE_PER_GAUGE);
      this.audio.playNuke();
      this.renderer.triggerShake(9, 0.35);
      this.renderer.triggerGlitch(0.3);
      for (const p of purged) {
        this.renderer.spawnMicroExplosion(p.x, p.y, FRUITS[p.tier].color, 'PURGÉ!');
        this.renderer.spawnLaserBolt(190, 92, p.x, p.y, '#00f5d4');
      }
      const bonus = purged.length * 15;
      this._addScore(bonus);
      this.moodEl.textContent = `GRAND MÉNAGE ! ${purged.length} mini-boules pulvérisées (+${bonus} pts) !`;
      this._announce(`Purge effectuée : ${purged.length} boules supprimées.`);
      this._updateHUD();
      this._updatePowerUI();
      return;
    }

    if (type === 'apocalypse') {
      if (gauges < 5 || bodyCount < 1) return;
      this._cancelPowerMode(false);
      const upgraded = this.world.apocalypseUpgrade(4);
      if (upgraded.length === 0) {
        this.moodEl.textContent = 'Que des Pastèques 3000 ?! Impossible d’upgrader plus !';
        return;
      }
      this.powerCharge = Math.max(0, this.powerCharge - 5 * CHARGE_PER_GAUGE);
      this.powerNoChargeTimer = Math.max(this.powerNoChargeTimer, 1.8);
      this.audio.playApocalypse();
      this.renderer.triggerShake(11, 0.45);
      this.renderer.triggerGlitch(0.4);
      let bonus = 0;
      for (const b of upgraded) {
        this._markDiscovered(b.tier);
        if (b.tier > this.biggestTier) this.biggestTier = b.tier;
        bonus += FRUITS[b.tier].score;
        this.renderer.spawnLaserBolt(b.x + (Math.random() - 0.5) * 60, 0, b.x, b.y, '#ffe600');
        this.renderer.spawnMergeEffect(b.x, b.y, b.tier, `MUTATION ${FRUITS[b.tier].name} !`);
      }
      this._addScore(bonus);
      this.moodEl.textContent = `ORAGE MUTANT ! ${upgraded.length} créatures évoluées par la foudre (+${bonus} pts) !`;
      this._announce(`Orage mutant : ${upgraded.length} créatures améliorées.`);
      this._updateHUD();
      this._updatePowerUI();
    }
  }

  _cancelPowerMode(announce = true) {
    if (!this.powerMode) return;
    this.powerMode = null;
    this.hoveredFruitId = null;
    this.pointerWorldPos = null;
    if (announce) {
      this._announce('Pouvoir annulé.');
    }
    this._updatePowerUI();
  }

  _handlePowerCanvasClick(x, y) {
    if (this.powerMode === 'nuke') {
      const removed = this.world.nukeAt(x, y, 105);
      if (removed.length === 0) {
        this.moodEl.textContent = 'T’as visé le vide ! Clique près d’une boule pour la faire péter.';
        return;
      }
      this.powerCharge = Math.max(0, this.powerCharge - CHARGE_PER_GAUGE);
      this.audio.playNuke();
      this.renderer.triggerShake(10, 0.32);
      this.renderer.triggerGlitch(0.28);
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', `KABOOM ×${removed.length} !!`);
      for (const r of removed) {
        this.renderer.spawnFlameBurst(r.x, r.y, 6);
      }
      const bonus = removed.length * 10;
      this._addScore(bonus);
      this.moodEl.textContent = `BOMBE NUCLÉAIRE ! ${removed.length} boules pulvérisées (+${bonus} pts) !`;
      this._announce(`Bombe locale : ${removed.length} boules détruites.`);
      this._cancelPowerMode(false);
      this._updateHUD();
      return;
    }

    if (this.powerMode === 'clone') {
      const hit = this.world.findFruitAt(x, y);
      if (!hit) return;
      if (hit.tier > CLONE_MAX_TIER) {
        this.moodEl.textContent = 'Trop gros pour le Rayon Cloneur (max : Chaussette Mouillée) !';
        return;
      }
      const res = this.world.cloneFruit(hit.id, CLONE_MAX_TIER);
      if (!res) return;
      this.powerCharge = Math.max(0, this.powerCharge - 3 * CHARGE_PER_GAUGE);
      this.audio.playClone();
      this.renderer.triggerShake(7, 0.25);
      this.renderer.triggerGlitch(0.22);
      this.renderer.spawnLaserBolt(res.src.x, res.src.y, res.clone.x, res.clone.y, '#00f5d4');
      this.renderer.spawnMicroExplosion(res.clone.x, res.clone.y, '#a6ff2e', 'CLONE ×2 !');
      this.moodEl.textContent = `MITOSE CURSED ! ${FRUITS[res.src.tier].name} cloné et prêt à fusionner !`;
      this._announce(`${FRUITS[res.src.tier].name} cloné.`);
      this._cancelPowerMode(false);
    }
  }

  _updatePowerUI() {
    const gauges = this._availableGauges();
    const bodyCount = this.world.bodies.length;
    this.gaugeSummaryEl.textContent = `${gauges} / ${MAX_GAUGES} ${gauges > 1 ? 'jauges' : 'jauge'}`;

    for (let i = 0; i < MAX_GAUGES; i++) {
      const segCharge = Math.max(0, Math.min(CHARGE_PER_GAUGE, this.powerCharge - i * CHARGE_PER_GAUGE));
      const pct = (segCharge / CHARGE_PER_GAUGE) * 100;
      const fillEl = this.gaugeFills[i];
      fillEl.style.inlineSize = `${pct}%`;
      fillEl.parentElement.classList.toggle('is-full', segCharge >= CHARGE_PER_GAUGE);
    }

    const hasClonable = this.world.bodies.some((b) => b.tier <= CLONE_MAX_TIER);
    const hasLowTiers = this.world.bodies.some((b) => b.tier <= 3);
    const hasUpgradable = this.world.bodies.some((b) => b.tier < FRUITS.length - 1);

    const states = [
      [this.powerNukeBtn, gauges >= 1 && bodyCount >= 1, this.powerMode === 'nuke'],
      [this.powerWindBtn, gauges >= 2 && bodyCount >= 1, false],
      [this.powerCloneBtn, gauges >= 3 && hasClonable, this.powerMode === 'clone'],
      [this.powerPurgeBtn, gauges >= 4 && hasLowTiers, false],
      [this.powerApocalypseBtn, gauges >= 5 && hasUpgradable, false],
    ];

    for (const [btn, ready, pressed] of states) {
      btn.setAttribute('aria-disabled', String(!ready));
      btn.classList.toggle('is-ready', ready && !pressed);
    }

    this.powerNukeBtn.setAttribute('aria-pressed', String(this.powerMode === 'nuke'));
    this.powerCloneBtn.setAttribute('aria-pressed', String(this.powerMode === 'clone'));

    this.powerBanner.hidden = !this.powerMode;
    this.canvas.classList.toggle('is-targeting', Boolean(this.powerMode));
  }

  _handleGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.feverTimer = 0;
    this._cancelPowerMode(false);
    document.body.classList.remove('is-upsidedown', 'is-talljar', 'is-quake', 'is-fever');
    if (this.flashlightEl) this.flashlightEl.hidden = true;
    if (this.fourthWallActorEl) this.fourthWallActorEl.hidden = true;
    if (this.feverPillEl) this.feverPillEl.hidden = true;
    this._resetRunawayJar();
    this._clearWin98Popups();
    this.dangerBanner.hidden = true;
    this.chaosBanner.hidden = true;
    this.audio.playGameOver();

    const quip = GAMEOVER_QUIPS[Math.floor(Math.random() * GAMEOVER_QUIPS.length)];
    this.gameoverQuipEl.textContent = quip;
    this.finalScoreEl.textContent = String(this.score);
    this.finalBestEl.textContent = String(this.bestScore);
    this.finalBiggestEl.textContent = FRUITS[this.biggestTier].name;
    this.finalTimeEl.textContent = this._formatTime(this.runSeconds);
    this.finalMouseEl.textContent = `${Math.round(this.mouseDistancePx)} px`;
    this.finalIqEl.textContent = String(this.iqScore);

    this._announce(`Fin de partie. Score final : ${this.score}.`);
    this.gameoverDialog.showModal();
  }

  _formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _updateTelemetryUI() {
    const t = this.world.getTelemetry();
    if (t.calories >= 10000) {
      this._unlockAchievement('master_chef');
    }
    if (this.iqScore < 0) {
      this._unlockAchievement('negative_iq');
    }
    if (this.hideUselessStats) return;
    const els = this.telemetryEls;
    const chaosBoost = this.world.activeChaos ? 1.8 : 1;

    els.mouse.textContent = `${Math.round(this.mouseDistancePx)} px`;
    els.drops.textContent = String(this.totalDrops);
    els.merges.textContent = String(this.totalMerges);
    els.bonks.textContent = String(this.world.bonkCount);
    els.time.textContent = this._formatTime(this.runSeconds);
    els.kcal.textContent = `${t.calories} kcal`;
    els.mass.textContent = `${t.massKg.toFixed(1)} kg`;
    els.energy.textContent = `${Math.round(t.kineticJ)} J`;
    els.speed.textContent = `${Math.round(t.maxSpeed)} px/s`;
    els.rpm.textContent = `${Math.round(t.avgRpm)} tr/m`;

    const cringe = Math.min(999.9, t.fillPct * 1.4 + (this.world.activeChaos ? 35 : 0) + t.fireCount * 8 + Math.sin(this.elapsedTime * 3) * 1.5);
    const pressure = 1013 + t.count * 3 + Math.round(Math.sin(this.elapsedTime * 5) * 8) + (this.world.activeChaos ? 45 : 0);
    const temp = 21 + t.fireCount * 14 + t.kineticJ * 0.08 + (this.world.activeChaos ? 18 : 0);
    const wifi = (0.4 + t.wifiCount * 5.2 + Math.abs(Math.sin(this.elapsedTime * 4)) * 1.1).toFixed(1);
    const salt = (this.world.bonkCount * 0.3 + this.totalDrops * 0.4).toFixed(1);
    const db = Math.min(180, Math.round(40 + t.maxSpeed * 0.14 + t.fireCount * 12 + (this.world.activeChaos ? 26 : 0)));
    const bpm = Math.round(72 + t.fillPct * 0.9 + (this.world.isDangerActive ? 55 : 0) + (this.world.activeChaos ? 32 : 0));
    const plastic = Math.round(120 + this.totalDrops * 17 + t.count * 23);
    const entropy = (1 + t.count * 0.24 + (t.kineticJ * 0.01) * chaosBoost).toFixed(2);

    els.cringe.textContent = `${Math.max(0, cringe).toFixed(1)}%`;
    els.pressure.textContent = `${pressure} hPa`;
    els.temp.textContent = `${temp.toFixed(1)} °C`;
    els.wifi.textContent = `${wifi} Gbps`;
    els.salt.textContent = `${salt} g`;
    els.iq.textContent = String(this.iqScore);
    els.db.textContent = `${db} dB`;
    els.bpm.textContent = `${bpm} BPM`;
    els.plastic.textContent = `${plastic} ppm`;
    els.entropy.textContent = entropy;

    els.ledFps.textContent = String(Math.round(this.fpsSmooth));
    els.ledFill.textContent = `${Math.round(t.fillPct)}%`;
    els.ledCount.textContent = String(t.count);
    els.ledFires.textContent = String(t.fireCount);
    els.ledClicks.textContent = String(this.totalClicks);

    // Push sample into mental ECG curve
    const spike = Math.min(1, t.kineticJ / 260 + (this.world.activeChaos ? 0.35 : 0) + (this.world.isDangerActive ? 0.3 : 0));
    const wave = Math.sin(this.elapsedTime * 22) * (0.18 + spike * 0.8);
    this.ecgHistory.shift();
    this.ecgHistory.push(wave);
    this._renderECG();
  }

  _renderECG() {
    const ctx = this.ecgCtx;
    const w = this.ecgCanvas.width;
    const h = this.ecgCanvas.height;
    const pal = CHAOS_PALETTES[this.paletteIndex];

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = this.isMonochrome
      ? '#ffffff'
      : (this.world.activeChaos ? pal.pink : pal.cyan);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const len = this.ecgHistory.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w;
      const y = h * 0.5 - this.ecgHistory[i] * (h * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _markDiscovered(tier) {
    this.discoveredTiers.add(tier);
    const items = this.evolutionListEl.querySelectorAll('.evo-item');
    items.forEach((item) => {
      if (Number(item.dataset.tier) === tier) {
        item.classList.add('is-discovered');
      }
    });
  }

  _updateHUD() {
    const mystery = this.world.activeChaos?.id === 'mystery';
    this.scoreEl.textContent = String(this.score);
    this.bestEl.textContent = String(this.bestScore);
    this.nextNameEl.textContent = mystery ? 'Mystère ???' : FRUITS[this.nextTier].name;
    this.renderer.renderNextPreview(this.nextTier, this.isMonochrome, mystery);
  }

  _announce(text) {
    this.liveEl.textContent = text;
  }

  _loop(now) {
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    this.elapsedTime += dt;
    if (dt > 0) {
      const instFps = Math.min(144, 1 / dt);
      this.fpsSmooth = this.fpsSmooth * 0.9 + instFps * 0.1;
    }

    const modalOpen = this.helpDialog.open || this.gameoverDialog.open || this.achievementsDialog.open;
    const modeCfg = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.audio.setPaused(modalOpen || this.isGameOver);

    if (!this.isGameOver && !modalOpen) {
      if (this.hasStartedDropping) {
        this.runSeconds += dt;
      }
      if (this.dropCooldown > 0) {
        this.dropCooldown = Math.max(0, this.dropCooldown - dt);
      }
      if (this.comboTimer > 0) {
        this.comboTimer = Math.max(0, this.comboTimer - dt);
        if (this.comboTimer === 0) this.comboCount = 0;
      }
      if (this.feverTimer > 0) {
        this.feverTimer = Math.max(0, this.feverTimer - dt);
      }
      if (this.powerNoChargeTimer > 0) {
        this.powerNoChargeTimer = Math.max(0, this.powerNoChargeTimer - dt);
      }
      const isFever = this.feverTimer > 0;
      document.body.classList.toggle('is-fever', isFever);
      if (this.feverPillEl) {
        this.feverPillEl.hidden = !isFever;
        if (isFever) {
          this.feverPillEl.textContent = `FEVER ×2 (${this.feverTimer.toFixed(1)}s)`;
        }
      }

      // Forced drop timer (Classic: 1s, Inferno: 0.55s, Zen: off)
      if (
        modeCfg.dropLimit !== null
        && this.hasStartedDropping
        && !this.powerMode
        && this.dropCooldown <= 0
        && this.world.activeChaos?.id !== 'spamclick'
      ) {
        this.autoDropTimer -= dt;
        if (this.autoDropTimer <= 0) {
          this.dropCurrentFruit({ forced: true });
        }
      }

      // Spamclick chaos
      if (this.world.activeChaos?.id === 'spamclick' && !this.powerMode) {
        this.spamDropAcc += dt;
        if (this.spamDropAcc >= 0.24) {
          this.spamDropAcc = 0;
          this.dropCurrentFruit({ fromSpam: true });
        }
      }

      // Random Chaos Roulette timer (disabled in Zen mode)
      if (modeCfg.chaosEnabled && this.hasStartedDropping && !this.world.activeChaos && this.world.bodies.length >= 2) {
        this.chaosCountdown -= dt;
        if (this.chaosCountdown <= 0) {
          this._triggerRandomChaos();
          this.chaosCountdown = modeCfg.chaosMin + Math.random() * (modeCfg.chaosMax - modeCfg.chaosMin);
        }
      }

      const moveDir = this.world.activeChaos?.id === 'mirror' ? -1 : 1;
      const moveSpeed = 295;
      if (this.keysHeld.has('left')) {
        this.aimX = this._clampAimX(this.aimX - moveSpeed * moveDir * dt, this.currentTier);
      }
      if (this.keysHeld.has('right')) {
        this.aimX = this._clampAimX(this.aimX + moveSpeed * moveDir * dt, this.currentTier);
      }

      const fixedStep = 1 / 60;
      this.accumulator += dt;
      while (this.accumulator >= fixedStep) {
        this.world.step(fixedStep);
        this.accumulator -= fixedStep;
      }

      if (this.world.maxDangerRatio >= 0.75) {
        this.hadHighDangerThisRun = true;
      } else if (this.hadHighDangerThisRun && this.world.maxDangerRatio < 0.2) {
        this.hadHighDangerThisRun = false;
        this._unlockAchievement('survival_cringe');
      }

      this._maybeSpawnSpeechBubble(dt);

      // Re-clamp held fruit aimX inside dynamic stretched/snapped jar bounds
      this.aimX = this._clampAimX(this.aimX, this.currentTier);
      this.dangerBanner.hidden = Boolean(this.powerMode) || !this.world.isDangerActive;

      if (this.world.activeChaos) {
        const c = this.world.activeChaos;
        this.chaosBanner.hidden = false;
        this.chaosBannerTextEl.textContent = `${c.emoji} ${c.name} (${c.remaining.toFixed(1)}s)`;
        this.chaosTimerTextEl.textContent = `EN COURS : ${c.emoji} ${c.name} (${c.remaining.toFixed(1)}s)`;
      } else if (!modeCfg.chaosEnabled) {
        this.chaosBanner.hidden = true;
        this.chaosTimerTextEl.textContent = 'Mode Zen : zéro roulette WTF';
      } else {
        this.chaosBanner.hidden = true;
        this.chaosTimerTextEl.textContent = this.hasStartedDropping
          ? `Prochain incident : ${Math.max(1, Math.ceil(this.chaosCountdown))}s`
          : 'Clique pour lancer le chaos !';
      }

      this.audio.setMusicState({
        mode: this.gameMode,
        danger: this.world.isDangerActive,
        fever: isFever,
        chaosId: this.world.activeChaos?.id ?? null,
      });

      const mono = this.world.activeChaos?.id === 'monochrome';
      const mystery = this.world.activeChaos?.id === 'mystery';
      const upsidedown = this.world.activeChaos?.id === 'upsidedown';
      const talljar = this.world.activeChaos?.id === 'talljar';
      const runaway = this.world.activeChaos?.id === 'runaway';
      const quake = this.world.activeChaos?.id === 'quake' && !this.reducedMotion;
      document.body.classList.toggle('is-upsidedown', upsidedown);
      document.body.classList.toggle('is-talljar', talljar);
      document.body.classList.toggle('is-quake', quake);

      if (runaway && !this.reducedMotion && this.jarFrameEl) {
        const rect = this.jarFrameEl.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        let targetX = Math.sin(this.elapsedTime * 3.1) * 58;
        let targetY = Math.cos(this.elapsedTime * 2.4) * 24;
        if (this.lastPointerClient) {
          const dx = cx - this.lastPointerClient.x;
          const dy = cy - this.lastPointerClient.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 4 && dist < 240) {
            targetX += (dx / dist) * 52;
            targetY += (dy / dist) * 20;
          }
        }
        targetX = Math.max(-72, Math.min(72, targetX));
        targetY = Math.max(-30, Math.min(30, targetY));
        this.runawayX += (targetX - this.runawayX) * Math.min(1, dt * 6);
        this.runawayY += (targetY - this.runawayY) * Math.min(1, dt * 6);
        this.jarFrameEl.style.setProperty('--jar-tx', `${this.runawayX.toFixed(1)}px`);
        this.jarFrameEl.style.setProperty('--jar-ty', `${this.runawayY.toFixed(1)}px`);
      } else if (this.runawayX !== 0 || this.runawayY !== 0) {
        this._resetRunawayJar();
      }

      if (this.popupsSpawnedForChaos && this.world.activeChaos?.id !== 'popups') {
        this._clearWin98Popups();
      }

      if (mono !== this.isMonochrome || mystery !== this.isMystery) {
        this.isMonochrome = mono;
        this.isMystery = mystery;
        document.body.classList.toggle('is-monochrome', mono);
        this.bgRenderer.setMonochrome(mono);
        this.nextNameEl.textContent = mystery ? 'Mystère ???' : FRUITS[this.nextTier].name;
        this.renderer.renderNextPreview(this.nextTier, mono, mystery);
        this._renderECG();
      }
    }

    const showFlashlight = !this.isGameOver && !modalOpen && this.world.activeChaos?.id === 'flashlight';
    if (this.flashlightEl) {
      this.flashlightEl.hidden = !showFlashlight;
      if (showFlashlight && !this.lastPointerClient) {
        const rect = this.canvas.getBoundingClientRect();
        const fx = rect.left + (this.aimX / JAR_BOUNDS.width) * rect.width;
        const fy = rect.top + rect.height * 0.52;
        this.flashlightEl.style.setProperty('--flash-x', `${fx.toFixed(1)}px`);
        this.flashlightEl.style.setProperty('--flash-y', `${fy.toFixed(1)}px`);
      }
    }

    const showFourthWall = !this.isGameOver && !modalOpen && this.world.activeChaos?.id === 'fourthwall' && Boolean(this.world.activeChaos.escapedBall);
    if (this.fourthWallActorEl) {
      this.fourthWallActorEl.hidden = !showFourthWall;
      if (showFourthWall) {
        this._renderFourthWallActor(this.world.activeChaos, this.isMonochrome);
      }
    }

    const bgIntensity = this.world.activeChaos ? 2.4 : 1.0;
    this.bgRenderer.render(dt, this.elapsedTime, bgIntensity);

    this.telemetryAcc += dt;
    if (this.telemetryAcc >= 0.1) {
      this.telemetryAcc = 0;
      this._updateTelemetryUI();
    }

    this.renderer.updateEffects(dt, this.world);
    const isLag = this.world.activeChaos?.id === 'lag';
    let shouldRender = true;
    if (isLag) {
      this.lagRenderAcc += dt;
      if (this.lagRenderAcc < 0.18) {
        shouldRender = false;
      } else {
        this.lagRenderAcc = 0;
      }
    } else {
      this.lagRenderAcc = 999;
    }

    if (shouldRender) {
      this.renderer.render({
        world: this.world,
        aimX: this.aimX,
        currentTier: this.currentTier,
        canDrop: !this.isGameOver && this.dropCooldown <= 0,
        showDropTimer: Boolean(modeCfg.dropLimit) && this.hasStartedDropping && this.world.activeChaos?.id !== 'spamclick',
        dropTimerRatio: this.autoDropTimer / (modeCfg.dropLimit || 1),
        time: this.elapsedTime,
        powerMode: this.powerMode,
        hoveredFruitId: this.hoveredFruitId,
        pointerPos: this.pointerWorldPos,
        isFever: this.feverTimer > 0,
      });
    }

    requestAnimationFrame((t) => this._loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SuiklemGame();
});
