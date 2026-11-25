import {
  FRUITS,
  CHILL_FRUIT_PALETTE,
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
import { WingsController } from './wings.js';
import { createChaosIconSvg, createCloseCrossSvg, createAchievementIconSvg } from './icons.js';

const STORAGE_BEST_KEY = 'suiklem-best-score';
const STORAGE_MUTE_KEY = 'suiklem-muted';
const STORAGE_MUSIC_MUTE_KEY = 'suiklem-music-muted';
const STORAGE_HIDE_STATS_KEY = 'suiklem-hide-stats';
const STORAGE_MODE_KEY = 'suiklem-mode';
const STORAGE_ACHIEVEMENTS_KEY = 'suiklem-achievements';
const STORAGE_INTRO_SEEN_KEY = 'suiklem-intro-seen';
const CHARGE_PER_GAUGE = 185;

const INTRO_BOSS_LINES = [
  'Attends… stop tout. Tu croyais vraiment que c’était un jeu de fruits calme et normal ?',
  'Ambiance pastel, musique douce, zéro stress… HAHAHA. T’as vraiment gobé ça ?',
  'Bienvenue dans SUIKLEM.EXE ! Ici c’est 1 seconde max par coup, 53 catastrophes WTF et ZÉRO pitié !',
  'Accroche ton cerveau… J’ALLUME LE BORDELLL !!',
];
const MAX_GAUGES = 5;
const MAX_CHARGE = CHARGE_PER_GAUGE * MAX_GAUGES;
const CLONE_MAX_TIER = 6;
const SLOT_ROW_HEIGHT = 22;
const SLOT_SPIN_DURATION_CLASSIC = 3.5;
const SLOT_SPIN_DURATION_INFERNO = 2.2;

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
    this.chaosBannerIconEl = document.getElementById('chaos-banner-icon');
    this.chaosBannerTextEl = document.getElementById('chaos-banner-text');
    this.lastChaosBannerId = null;
    this.chaosTimerTextEl = document.getElementById('chaos-timer-text');
    this.chaosSlotMachineEl = document.getElementById('chaos-slot-machine');
    this.chaosSlotTrackEl = document.getElementById('chaos-slot-track');
    this.chaosSlotProgressEl = document.getElementById('chaos-slot-progress');
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
    this.brandTitleEl = document.querySelector('.brand-text h1');
    this.brandTitleDefault = 'SUIKLEM.EXE';
    this.subtitleEl = document.querySelector('.subtitle');
    this.subtitleDefault = 'Zéro chill • 100% télémétrie inutile';
    this.replayIntroBtn = document.getElementById('replay-intro-btn');
    this.nextLabelEl = document.getElementById('next-label');
    this.introFxOverlayEl = document.getElementById('intro-fx-overlay');
    this.introBossOverlayEl = document.getElementById('intro-boss-overlay');
    this.introBossCanvasEl = document.getElementById('intro-boss-canvas');
    this.introBossCtx = this.introBossCanvasEl ? this.introBossCanvasEl.getContext('2d') : null;
    this.introBossTextEl = document.getElementById('intro-boss-text');
    this.introBossProgressEl = document.getElementById('intro-boss-progress');
    this.introStage = readStorage(STORAGE_INTRO_SEEN_KEY, 'false') === 'true' ? 'none' : 'chill';
    this.introDialogIndex = 0;
    this.introTriggerDrops = 12;
    this.introRevealTime = 0;
    this.introRevealPhase = 0;
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
    this.isGameBoy = false;
    this.isMatrix = false;
    this.isSabotage = false;
    this.sabotageButtons = [];
    this.lagRenderAcc = 999;
    this.runawayX = 0;
    this.runawayY = 0;
    this.ecgCanvas = document.getElementById('ecg-canvas');
    this.ecgCtx = this.ecgCanvas.getContext('2d');
    this.ecgHistory = new Array(60).fill(0);
    this.achFilterBtns = Array.from(document.querySelectorAll('.ach-filter-btn'));
    this.achievementFilter = 'all';
    this.usedPowerThisRun = false;
    this.powersUsedThisRun = 0;
    this.forcedDropsThisRun = 0;
    this.pinballHitsThisChaos = 0;
    this.pongHitsThisChaos = 0;
    this.mosquitosSwattedThisChaos = 0;
    this.pacChompsThisChaos = 0;
    this.retroSeen = new Set();
    this.prevActiveChaosId = null;
    this.wings = new WingsController({
      audio: this.audio,
      moodEl: this.moodEl,
      onAchievement: (id) => this._unlockAchievement(id),
    });

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
    this.chaosCycleTotal = 11;
    this.lastChaosId = null;
    this.slotSpin = null;
    this.slotRestingEvent = null;
    this.slotItemEls = [];
    this.slotState = 'idle';
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

    this._buildFruitList(this.evolutionListEl, 'evo-item', 20, 6.8);
    this._buildFruitList(this.helpFruitGridEl, 'help-fruit-item', 26, 8.8);
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
      iconCtx.translate(boxSize * 0.5, boxSize * 0.55);
      drawFruitShape(iconCtx, fruit.tier, iconRadius, { showFace: true });

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
    for (const btn of this.achFilterBtns) {
      btn.addEventListener('click', () => {
        this.achievementFilter = btn.dataset.filter || 'all';
        for (const b of this.achFilterBtns) {
          b.setAttribute('aria-pressed', String(b === btn));
        }
        this.audio.playSwitchSnap();
        this._renderAchievements();
      });
    }
    this.helpBtn.addEventListener('click', () => this.helpDialog.showModal());
    this.replayIntroBtn?.addEventListener('click', () => this.replayChillIntro());
    this.introBossOverlayEl?.addEventListener('click', () => this._advanceIntroDialogue());
    this.restartBtn.addEventListener('click', () => this.startNewGame());
    for (const btn of this.modeBtns) {
      btn.addEventListener('click', () => this.setGameMode(btn.dataset.mode));
    }
    this.tickerToggleBtn.addEventListener('click', () => {
      const paused = this.tickerBar.classList.toggle('is-paused');
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

    this.sabotageButtons = [
      this.powerNukeBtn,
      this.powerWindBtn,
      this.powerCloneBtn,
      this.powerPurgeBtn,
      this.powerApocalypseBtn,
      ...this.modeBtns,
    ].filter(Boolean);
    for (const btn of this.sabotageButtons) {
      btn.addEventListener('pointerenter', () => {
        if (!this.isSabotage || this.reducedMotion) return;
        const dx = (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 14);
        const dy = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10);
        btn.style.setProperty('--flee-x', `${dx.toFixed(0)}px`);
        btn.style.setProperty('--flee-y', `${dy.toFixed(0)}px`);
      });
    }

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.isGameOver || this.introStage === 'dialogue' || this.introStage === 'revealing') return;
      this.audio.unlock();
      if (this.powerMode) {
        const coords = this._getCanvasCoords(e.clientX, e.clientY);
        if (coords) this._handlePowerCanvasClick(coords.x, coords.y);
        return;
      }
      const coords = this._getCanvasCoords(e.clientX, e.clientY);
      if (coords && this.world.tryInteractChaos(coords.x, coords.y).handled) {
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
      if (this.introStage === 'dialogue') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this._advanceIntroDialogue();
        }
        return;
      }
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
    this.chaosCycleTotal = this.chaosCountdown;
    this.lastChaosId = null;
    this._resetSlotReel(modeCfg);
    this.isMonochrome = false;
    this.isMystery = false;
    this.isGameBoy = false;
    this.isMatrix = false;
    this.isSabotage = false;
    this.lagRenderAcc = 999;
    document.body.classList.remove('is-monochrome', 'is-upsidedown', 'is-talljar', 'is-quake', 'is-fever', 'is-gameboy', 'is-matrix', 'is-sabotage');
    this._clearSabotageState();
    this.bgRenderer.setMonochrome(false);
    this.bgRenderer.setRetroTheme(null);
    if (this.introStage === 'dialogue' || this.introStage === 'revealing') {
      this.introStage = 'none';
    }
    this.introRevealTime = 0;
    this.introRevealPhase = 0;
    document.body.classList.remove(
      'is-intro-revealing',
      'reveal-step-1',
      'reveal-step-2',
      'reveal-step-3',
      'reveal-step-4',
      'reveal-step-5',
    );
    if (this.introFxOverlayEl) {
      this.introFxOverlayEl.hidden = true;
    }
    if (this.introBossOverlayEl) {
      this.introBossOverlayEl.hidden = true;
    }
    this._applyIntroStageVisuals();
    this.totalDrops = 0;
    this.totalMerges = 0;
    this.runSeconds = 0;
    this.iqScore = 100;
    this.usedPowerThisRun = false;
    this.powersUsedThisRun = 0;
    this.forcedDropsThisRun = 0;
    this.pinballHitsThisChaos = 0;
    this.pongHitsThisChaos = 0;
    this.mosquitosSwattedThisChaos = 0;
    this.pacChompsThisChaos = 0;
    this.prevActiveChaosId = null;
    this.ecgHistory.fill(0);

    this._applyPalette(this.paletteIndex);

    this.currentTier = this._pickDropTier();
    this.nextTier = this._pickDropTier();
    this._markDiscovered(this.currentTier);
    this.aimX = JAR_BOUNDS.width / 2;

    if (this.controlsHintEl) {
      this.controlsHintEl.textContent = this.introStage === 'chill'
        ? 'Déplace avec la souris ou les flèches • Clique pour poser tranquillement'
        : `${modeCfg.hint} • Espace lâcher • 1–5 pouvoirs`;
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
    if (this.isSabotage) {
      this._unlockAchievement('secret_sabotage_click');
    }
    this.gameMode = modeId;
    writeStorage(STORAGE_MODE_KEY, modeId);
    this.startNewGame();
  }

  replayChillIntro() {
    writeStorage(STORAGE_INTRO_SEEN_KEY, 'false');
    if (this.helpDialog.open) this.helpDialog.close();
    this.introStage = 'chill';
    this.introDialogIndex = 0;
    this.startNewGame();
  }

  _applyIntroStageVisuals() {
    const isChill = this.introStage === 'chill' || this.introStage === 'dialogue';
    document.documentElement.classList.toggle('is-chill-pre', isChill);
    document.body.classList.toggle('is-chill-intro', isChill);
    this.world.chillMode = isChill;
    this.renderer.setChillMode(isChill);
    if (this.nextLabelEl) {
      this.nextLabelEl.textContent = isChill ? 'Prochain fruit' : 'Prochain mutant';
    }
    const favEl = document.getElementById('site-favicon');
    if (isChill) {
      document.title = 'Suika Chill — Jeu de fusion de fruits pastel';
      if (favEl) {
        favEl.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E%3Crect x='1' y='1' width='34' height='34' rx='9' fill='%23fff4e3' stroke='%23cfa57c' stroke-width='2'/%3E%3Cpath d='M18 11 C18 6.5 22 4 24.5 5.5' fill='none' stroke='%236c4a32' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M19 9.5 C22.5 5.5 27.5 6.5 28.5 10 C25 12 21 11.5 19 9.5 Z' fill='%2372b354' stroke='%234a7c36' stroke-width='1.3' stroke-linejoin='round'/%3E%3Ccircle cx='18' cy='20' r='10.5' fill='%23ff758f' stroke='%237a3342' stroke-width='1.8'/%3E%3Cellipse cx='14.2' cy='15.2' rx='3' ry='1.6' transform='rotate(-28 14.2 15.2)' fill='%23ffffff' opacity='0.6'/%3E%3Ccircle cx='14.5' cy='19.5' r='1.4' fill='%234a2c18'/%3E%3Ccircle cx='21.5' cy='19.5' r='1.4' fill='%234a2c18'/%3E%3Ccircle cx='14.9' cy='19.1' r='0.5' fill='%23ffffff'/%3E%3Ccircle cx='21.9' cy='19.1' r='0.5' fill='%23ffffff'/%3E%3Cpath d='M16 22.2 Q18 24.2 20 22.2' fill='none' stroke='%234a2c18' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E";
      }
      this.bgRenderer.setRetroTheme('chill');
      if (this.brandTitleEl) this.brandTitleEl.textContent = 'Suika Chill';
      if (this.subtitleEl) this.subtitleEl.textContent = 'Tri fruité pastel • Détente & zen';
    } else {
      document.title = 'SUIKLEM.EXE — Télémétrie du Bordel';
      if (favEl) {
        favEl.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ff2bd6'/%3E%3Cstop offset='100%25' stop-color='%23ffe600'/%3E%3C/linearGradient%3E%3CradialGradient id='sk' cx='38%25' cy='32%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%23d9ff70'/%3E%3Cstop offset='55%25' stop-color='%2365a30d'/%3E%3Cstop offset='100%25' stop-color='%2314532d'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect x='1' y='1' width='34' height='34' rx='9' fill='url(%23bg)' stroke='%232b0b00' stroke-width='2'/%3E%3Cpath d='M18 3 L20.5 7.5 L15.5 8 Z' fill='%23ff2bd6' stroke='%231b0824' stroke-width='1.2' stroke-linejoin='round'/%3E%3Cpath d='M8 18 C8 10.5 12.5 7 18 7 C23.5 7 28 10.5 28 18 C28 24.5 25 29 18 29 C11 29 8 24.5 8 18 Z' fill='url(%23sk)' stroke='%23090314' stroke-width='2'/%3E%3Ccircle cx='13.5' cy='15.5' r='4.4' fill='%23ffffff' stroke='%23090314' stroke-width='1.5'/%3E%3Ccircle cx='14.2' cy='14.8' r='1.7' fill='%23090314'/%3E%3Ccircle cx='22.8' cy='16.5' r='3.4' fill='%23ffffff' stroke='%23090314' stroke-width='1.5'/%3E%3Ccircle cx='22.1' cy='17.3' r='1.4' fill='%23ff006e'/%3E%3Cpath d='M11.5 21.5 Q18 27 24.5 21' fill='%232e0619' stroke='%23090314' stroke-width='1.4' stroke-linecap='round'/%3E%3Cpath d='M15.5 24.2 Q18 28.5 20.8 24.2 Z' fill='%23ff2bd6' stroke='%23090314' stroke-width='1'/%3E%3Crect x='13.5' y='21.4' width='2.3' height='2' rx='0.5' fill='%23fde047'/%3E%3Cellipse cx='12' cy='10.5' rx='2.2' ry='1' transform='rotate(-24 12 10.5)' fill='%23ffffff' opacity='0.65'/%3E%3C/svg%3E";
      }
      if (!this.isGameBoy && !this.isMatrix) {
        this.bgRenderer.setRetroTheme(null);
      }
      if (this.brandTitleEl) this.brandTitleEl.textContent = this.brandTitleDefault;
      if (this.subtitleEl && !this.isSabotage && this.subtitleDefault) {
        this.subtitleEl.textContent = this.subtitleDefault;
      }
    }
  }

  _startIntroBossDialogue() {
    if (this.introStage !== 'chill') return;
    this.introStage = 'dialogue';
    this.introDialogIndex = 0;
    this.activePointerId = null;
    if (this.introBossOverlayEl) {
      this.introBossOverlayEl.hidden = false;
    }
    this._syncIntroDialogueLine();
    this._renderIntroBossCanvas();
    this.audio.playChaosAlert();
  }

  _syncIntroDialogueLine() {
    const line = INTRO_BOSS_LINES[this.introDialogIndex] ?? '';
    if (this.introBossTextEl) this.introBossTextEl.textContent = line;
    if (this.introBossProgressEl) {
      this.introBossProgressEl.textContent = `${this.introDialogIndex + 1} / ${INTRO_BOSS_LINES.length}`;
    }
  }

  _advanceIntroDialogue() {
    if (this.introStage !== 'dialogue') return;
    this.introDialogIndex += 1;
    if (this.introDialogIndex < INTRO_BOSS_LINES.length) {
      this._syncIntroDialogueLine();
      this.audio.playSwitchSnap();
      return;
    }
    this._finishIntroReveal();
  }

  _finishIntroReveal() {
    this.introStage = 'revealing';
    this.introRevealTime = 0;
    this.introRevealPhase = 1;
    writeStorage(STORAGE_INTRO_SEEN_KEY, 'true');
    if (this.introBossOverlayEl) {
      this.introBossOverlayEl.hidden = true;
    }
    this.gameMode = 'classic';
    writeStorage(STORAGE_MODE_KEY, 'classic');
    const modeCfg = GAME_MODES.classic;
    this.world.setGravityY(modeCfg.gravityY);
    this.autoDropTimer = modeCfg.dropLimit ?? 1.0;
    this.chaosCountdown = 7.5;
    this.chaosCycleTotal = 7.5;
    this._syncModeButtons();
    this._resetSlotReel(modeCfg);
    this._applyIntroStageVisuals();

    document.body.classList.remove(
      'is-intro-revealing',
      'reveal-step-1',
      'reveal-step-2',
      'reveal-step-3',
      'reveal-step-4',
      'reveal-step-5',
    );
    void document.body.offsetWidth;
    document.body.classList.add('is-intro-revealing', 'reveal-step-1');

    if (this.introFxOverlayEl) {
      this.introFxOverlayEl.className = 'intro-fx-overlay step-1';
      this.introFxOverlayEl.hidden = false;
    }

    // Visual mutation wave on every chill fruit already inside the jar!
    for (const b of this.world.bodies) {
      b.vy -= 130 + Math.random() * 80;
      b.vx += (Math.random() - 0.5) * 140;
      b.squashX = 1.32;
      b.squashY = 0.72;
      b.onFireTimer = 1.6;
      b.mood = 'bonked';
      b.moodTimer = 1.2;
      this.renderer.spawnMergeEffect(b.x, b.y, b.tier, 'MUTATION !');
    }

    this.audio.playApocalypse();
    this.renderer.triggerShake(14, 0.55);
    this.renderer.triggerGlitch(0.5);
    this.renderer.spawnMicroExplosion(JAR_BOUNDS.width * 0.5, 220, '#ff2bd6', 'PIRATAGE EN COURS...');
    if (this.controlsHintEl) {
      this.controlsHintEl.textContent = `${modeCfg.hint} • Espace lâcher • 1–5 pouvoirs`;
    }
    this.moodEl.textContent = 'SURPRISE !! MUTATION DU SYSTÈME EN COURS…';
    this._announce('Révélation en cours : Suiklem.exe prend le contrôle.');
    this._updateHUD();
    this._updatePowerUI();
    this._updateTelemetryUI();
  }

  _stepIntroReveal(dt) {
    this.introRevealTime += dt;
    const t = this.introRevealTime;

    if (this.introRevealPhase < 2 && t >= 1.15) {
      this.introRevealPhase = 2;
      document.body.classList.add('reveal-step-2');
      if (this.introFxOverlayEl) this.introFxOverlayEl.className = 'intro-fx-overlay step-2';
      this.audio.playChaosAlert();
      this.renderer.triggerShake(10, 0.35);
      this.renderer.triggerGlitch(0.35);
      this.renderer.spawnLaserBolt(14, 120, 366, 520, '#00f5d4');
      this.renderer.spawnLaserBolt(366, 120, 14, 520, '#ff2bd6');
    }

    if (this.introRevealPhase < 3 && t >= 2.3) {
      this.introRevealPhase = 3;
      document.body.classList.add('reveal-step-3');
      if (this.introFxOverlayEl) this.introFxOverlayEl.className = 'intro-fx-overlay step-3';
      this.audio.playPinball();
      this.renderer.triggerShake(9, 0.3);
      this.renderer.spawnFlameBurst(75, 290, 10);
      this.renderer.spawnMicroExplosion(120, 310, '#00f5d4', 'ARSENAL ARMÉ !');
    }

    if (this.introRevealPhase < 4 && t >= 3.45) {
      this.introRevealPhase = 4;
      document.body.classList.add('reveal-step-4');
      if (this.introFxOverlayEl) this.introFxOverlayEl.className = 'intro-fx-overlay step-4';
      this.audio.playSlotPull();
      this.renderer.triggerShake(10, 0.32);
      this.renderer.triggerGlitch(0.38);
      this.renderer.spawnFlameBurst(305, 290, 10);
      this.renderer.spawnMicroExplosion(265, 270, '#ffe600', 'ROULETTE WTF !');
    }

    if (this.introRevealPhase < 5 && t >= 4.55) {
      this.introRevealPhase = 5;
      document.body.classList.add('reveal-step-5');
      if (this.introFxOverlayEl) this.introFxOverlayEl.className = 'intro-fx-overlay step-5';
      this.audio.playGaugeReady();
      this.renderer.triggerShake(12, 0.45);
      this.renderer.triggerGlitch(0.42);
      this.renderer.spawnLaserBolt(190, 0, 60, 540, '#a6ff2e');
      this.renderer.spawnLaserBolt(190, 0, 320, 540, '#ff2bd6');
      this.renderer.spawnMicroExplosion(190, 260, '#a6ff2e', 'SURCHARGE MAX !!');
    }

    if (t >= 5.65) {
      this.introStage = 'none';
      this.introRevealTime = 0;
      this.introRevealPhase = 0;
      document.body.classList.remove(
        'is-intro-revealing',
        'reveal-step-1',
        'reveal-step-2',
        'reveal-step-3',
        'reveal-step-4',
        'reveal-step-5',
      );
      if (this.introFxOverlayEl) {
        this.introFxOverlayEl.hidden = true;
        this.introFxOverlayEl.className = 'intro-fx-overlay';
      }
      this.autoDropTimer = 1.0;
      this.audio.playChaosAlert();
      this.renderer.spawnMicroExplosion(190, 200, '#ffe600', 'SUIKLEM.EXE EN LIGNE !!');
      this.moodEl.textContent = 'TERMINÉ LE CALME ! 1 SECONDE MAX PAR COUP ! QUE LE BORDEL COMMENCE !';
      this._announce('Suiklem.exe en ligne en mode Chaos.');
    }
  }

  _renderIntroBossCanvas() {
    if (!this.introBossCtx || !this.introBossCanvasEl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 144;
    if (this.introBossCanvasEl.width !== size * dpr) {
      this.introBossCanvasEl.width = size * dpr;
      this.introBossCanvasEl.height = size * dpr;
      this.introBossCanvasEl.style.width = `${size}px`;
      this.introBossCanvasEl.style.height = `${size}px`;
    }
    const ctx = this.introBossCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size * 0.5, size * 0.52);
    const bounce = this.reducedMotion ? 1 : 1 + Math.sin(this.elapsedTime * 5) * 0.05;
    drawFruitShape(ctx, 15, 50 * bounce, {
      mood: 'happy',
      time: this.elapsedTime,
    });
    ctx.restore();
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
    if (this.isMuted && this.isMusicMuted) {
      this._unlockAchievement('secret_mute_all');
    }
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
    if (this.introStage !== 'none') return;
    if (this.unlockedAchievements.has(id)) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;

    this.unlockedAchievements.add(id);
    writeStorage(STORAGE_ACHIEVEMENTS_KEY, JSON.stringify([...this.unlockedAchievements]));
    this.audio.playAchievement();
    this._renderAchievements();

    if (this.achievementToastEl) {
      this.achievementToastEmojiEl.replaceChildren(createAchievementIconSvg(id, true, 24));
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
    const filtered = ACHIEVEMENTS.filter((ach) => {
      const unlocked = this.unlockedAchievements.has(ach.id);
      if (this.achievementFilter === 'unlocked') return unlocked;
      if (this.achievementFilter === 'secret') return Boolean(ach.hidden);
      return true;
    });
    for (const ach of filtered) {
      const unlocked = this.unlockedAchievements.has(ach.id);
      const isHiddenLocked = Boolean(ach.hidden && !unlocked);
      const li = document.createElement('li');
      li.className = `achievement-item${unlocked ? ' is-unlocked' : ''}${ach.hidden ? ' is-secret' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'achievement-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.replaceChildren(createAchievementIconSvg(ach.id, unlocked, 24, isHiddenLocked));
      const info = document.createElement('div');
      info.className = 'achievement-info';
      const title = document.createElement('strong');
      title.textContent = isHiddenLocked ? '???' : ach.title;
      const desc = document.createElement('span');
      desc.textContent = isHiddenLocked ? 'Succès caché — à toi de le découvrir !' : ach.desc;
      info.append(title, desc);
      li.append(icon, info);
      this.achievementsListEl.appendChild(li);
    }
  }

  _maybeSpawnSpeechBubble(dt) {
    if (this.introStage !== 'none' || this.world.chillMode) return;
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
    if (this.hideUselessStats) {
      this._unlockAchievement('secret_no_stats');
    } else {
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
    if (this.isMuted && this.isMusicMuted) {
      this._unlockAchievement('secret_mute_all');
    }
  }

  _syncSoundButton() {
    this.soundToggleBtn.setAttribute('aria-pressed', String(this.isMuted));
    this.soundToggleBtn.setAttribute(
      'aria-label',
      this.isMuted ? 'Activer le son' : 'Couper le son',
    );
  }

  dropCurrentFruit({ forced = false, fromSpam = false } = {}) {
    if (this.isGameOver || this.introStage === 'dialogue' || this.introStage === 'revealing') return;
    if (!fromSpam && (this.dropCooldown > 0 || this.world.activeChaos?.id === 'spamclick')) return;

    this.hasStartedDropping = true;
    this.totalDrops += 1;
    this._unlockAchievement('first_drop');
    if (forced) {
      this.iqScore -= 3;
      this.forcedDropsThisRun += 1;
      if (this.forcedDropsThisRun >= 5) this._unlockAchievement('secret_afk_drop');
      if (this.iqScore < 0) this._unlockAchievement('negative_iq');
    }

    const tier = this.currentTier;
    const isDoubleDrop = this.world.activeChaos?.id === 'double_drop' && !fromSpam;
    const jitter = fromSpam ? (Math.random() - 0.5) * 44 : 0;
    const x = this._clampAimX(this.aimX + jitter + (isDoubleDrop ? -16 : 0), tier);
    this.world.spawnFruit(tier, x, JAR_BOUNDS.dropY, {
      vx: isDoubleDrop ? -36 : 0,
      vy: fromSpam ? 180 : 40,
      mood: 'falling',
      moodTimer: 0.65,
      squashX: 0.9,
      squashY: 1.12,
    });

    if (isDoubleDrop) {
      const twinTier = this._pickDropTier();
      const x2 = this._clampAimX(this.aimX + 16, twinTier);
      this.world.spawnFruit(twinTier, x2, JAR_BOUNDS.dropY + 4, {
        vx: 36,
        vy: 55,
        mood: 'happy',
        moodTimer: 0.85,
        squashX: 0.9,
        squashY: 1.12,
      });
      this._markDiscovered(twinTier);
      this.renderer.spawnMicroExplosion(this.aimX, JAR_BOUNDS.dropY + 12, '#a6ff2e', '2 POUR 1 !');
    }

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
    const isBulletTime = this.world.activeChaos?.id === 'bullet_time';
    this.dropCooldown = fromSpam ? 0.08 : (isBulletTime ? 0.12 : 0.22);
    this.autoDropTimer = modeCfg.dropLimit ?? 1.0;
    this._updateHUD();
    this._updatePowerUI();
    this._updateTelemetryUI();

    if (this.introStage === 'chill' && this.totalDrops >= this.introTriggerDrops) {
      this._startIntroBossDialogue();
    }
  }

  _handleChaosFx({ type, x, y, tier, hitsLeft }) {
    if (this.introStage === 'chill' || this.world.chillMode) return;
    if (type === 'popcorn') {
      this.renderer.spawnMicroExplosion(x, y, '#ff7b00', 'POP!!');
      this.renderer.triggerShake(5, 0.16);
      this.audio.playChomp();
    } else if (type === 'pinballHit') {
      this.audio.playPinball();
      this._addScore(25);
      this.pinballHitsThisChaos += 1;
      if (this.pinballHitsThisChaos >= 8) this._unlockAchievement('pinball_wizard');
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', '+25!');
      this.renderer.triggerShake(3, 0.1);
      this._updateHUD();
    } else if (type === 'krakenSlap') {
      this.audio.playSwitchSnap();
      this.renderer.spawnMicroExplosion(x, y, '#00f5d4', `PAF! (${hitsLeft}×)`);
      this.renderer.triggerShake(4, 0.12);
    } else if (type === 'krakenRepelled') {
      this.audio.playCashBlip(true);
      this._addScore(80);
      this._unlockAchievement('kraken_hero');
      this.renderer.spawnMicroExplosion(x, y, '#a6ff2e', 'SAUVÉ ! +80');
      this.renderer.triggerShake(7, 0.2);
      this.moodEl.textContent = 'BIEN JOUÉ ! LE KRAKEN EST REPARTI LES TENTACULES VIDES !';
      this._updateHUD();
    } else if (type === 'krakenSteal') {
      this.audio.playChomp();
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', 'TAXÉ !!');
      this.renderer.triggerShake(9, 0.25);
      this.moodEl.textContent = 'OUTCH ! LE KRAKEN T’A VOLÉ UN GROS MUTANT POUR LA TVA !';
    } else if (type === 'laserFire') {
      this.audio.playLaserSweep();
      this.renderer.triggerShake(7, 0.22);
      this.renderer.triggerGlitch(0.2);
    } else if (type === 'laserDevolve') {
      this._unlockAchievement('laser_victim');
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', 'DÉ-ÉVOLUÉ !');
    } else if (type === 'mosquitoSwat') {
      this.audio.playChomp();
      this._addScore(45);
      this.mosquitosSwattedThisChaos += 1;
      if (this.mosquitosSwattedThisChaos >= 3) this._unlockAchievement('mosquito_hunter');
      this.powerCharge = Math.min(MAX_CHARGE, this.powerCharge + 45);
      this.renderer.spawnMicroExplosion(x, y, '#a6ff2e', 'SPLAT ! +45 JUS');
      this._updateHUD();
      this._updatePowerUI();
    } else if (type === 'meteorHit') {
      this.audio.playBump(420);
      this.renderer.spawnFlameBurst(x, y, 8);
      this.renderer.triggerShake(6, 0.18);
    } else if (type === 'pacmanChomp') {
      this.audio.playChomp();
      this._addScore(60);
      this.pacChompsThisChaos += 1;
      if (this.pacChompsThisChaos >= 3) this._unlockAchievement('pacman_feast');
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', 'WAKA ! +60');
      this.renderer.triggerShake(4, 0.12);
      this._updateHUD();
    } else if (type === 'pongHit') {
      this.audio.playPinball();
      this._addScore(20);
      this.pongHitsThisChaos += 1;
      if (this.pongHitsThisChaos >= 5) this._unlockAchievement('pong_ace');
      this.renderer.spawnMicroExplosion(x, y, '#00f5d4', 'PONG ! +20');
      this._updateHUD();
    } else if (type === 'mitosisSplit') {
      this.audio.playClone();
      this.renderer.spawnMicroExplosion(x, y, '#ff2bd6', 'MITOSE ÷2 !');
      this.renderer.triggerShake(5, 0.15);
      this._updateHUD();
    } else if (type === 'lightningStrike') {
      this.audio.playGaugeReady();
      const scoreBonus = FRUITS[tier]?.score ?? 25;
      this._addScore(scoreBonus);
      this._unlockAchievement('lightning_lucky');
      this._markDiscovered(tier);
      if (tier > this.biggestTier) this.biggestTier = tier;
      this.renderer.spawnLaserBolt(x + (Math.random() - 0.5) * 50, 0, x, y, '#ffe600');
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', `ZAP ! +${scoreBonus}`);
      this.renderer.triggerShake(6, 0.18);
      this._updateHUD();
    } else if (type === 'dvdCornerHit') {
      this.audio.playApocalypse();
      this._addScore(500);
      this._unlockAchievement('dvd_corner');
      this.feverTimer = Math.max(this.feverTimer, 6.0);
      this.renderer.spawnMicroExplosion(x, y, '#ffe600', 'COIN PARFAIT !! +500');
      this.renderer.triggerShake(12, 0.4);
      this.moodEl.textContent = 'INCROYABLE !! LE LOGO DVD A TOUCHÉ LE COIN PARFAIT (+500 + FEVER) !!';
      this._updateHUD();
    } else if (type === 'discoBeat') {
      this._addScore(10);
      this._updateHUD();
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

  _clearSabotageState() {
    for (const btn of this.sabotageButtons || []) {
      btn.style.removeProperty('--flee-x');
      btn.style.removeProperty('--flee-y');
    }
    if (this.subtitleEl && this.subtitleDefault) {
      this.subtitleEl.textContent = this.subtitleDefault;
    }
    if (this.flashlightEl) this.flashlightEl.hidden = true;
    if (this.fourthWallActorEl) this.fourthWallActorEl.hidden = true;
    this.fourthWallStep = -1;
    this.fourthWallLines = [];
    if (this.feverPillEl) this.feverPillEl.hidden = true;
    this._resetRunawayJar();
    this._clearWin98Popups();
  }

  _resetRunawayJar() {
    this.runawayX = 0;
    this.runawayY = 0;
    if (this.jarFrameEl) {
      this.jarFrameEl.style.setProperty('--jar-tx', '0px');
      this.jarFrameEl.style.setProperty('--jar-ty', '0px');
      this.jarFrameEl.style.removeProperty('--jar-rot');
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
    if (this.score >= 10000) this._unlockAchievement('score_10k');
    if (this.score >= 30000) this._unlockAchievement('score_30k');
    if (this.gameMode === 'inferno' && this.score >= 5000) {
      this._unlockAchievement('inferno_runner');
    }
    if (this.gameMode === 'inferno' && this.score >= 15000) {
      this._unlockAchievement('inferno_master');
    }
    if (this.gameMode === 'zen' && this.score >= 15000) {
      this._unlockAchievement('zen_chill');
    }
    if (!this.usedPowerThisRun && this.score >= 12000) {
      this._unlockAchievement('purist_run');
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

  _handleMerge({ x, y, newTier, isMaxPop, fromPower = false, dnaShift = 0 }) {
    if (this.comboTimer > 0) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = 1.15;
    this.totalMerges += 1;
    if (this.comboCount >= 2) this.iqScore += 2;

    const isChill = this.introStage === 'chill' || this.world.chillMode;
    const baseScore = isMaxPop ? 300 : FRUITS[newTier].score;
    const comboBonus = this.comboCount > 1 ? Math.min(this.comboCount - 1, 5) * 3 : 0;
    const gained = baseScore + comboBonus;
    if (!isChill && this.comboCount >= 4) {
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
    if (this.comboCount >= 8) {
      this._unlockAchievement('combo_ultra');
    }
    if (newTier >= 15 || isMaxPop) {
      this._unlockAchievement('watermelon');
    }
    if (isMaxPop) {
      this._unlockAchievement('double_watermelon');
    }

    const addedScore = this._addScore(gained);

    const canChargeFromMerge = !isChill && !fromPower && this.powerNoChargeTimer <= 0 && this.world.windTimer <= 0;
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
    if (!isChill && (newTier >= 4 || this.comboCount >= 2 || isMaxPop)) {
      this.renderer.triggerShake(Math.min(11, 2.5 + newTier * 0.7), 0.25);
    }

    let floatLabel = isChill ? null : `+${addedScore}`;
    if (!isChill) {
      if (dnaShift > 0) {
        floatLabel = `ADN GLITCH +${dnaShift + 1} !!`;
      } else if (dnaShift < 0) {
        floatLabel = 'ERREUR ADN -1 !';
      } else if (isMaxPop) {
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
    }

    this.renderer.spawnMergeEffect(x, y, newTier, floatLabel, { chill: isChill });
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
      closeBtn.appendChild(createCloseCrossSvg(10));
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

  _getSlotSpinDuration(modeCfg) {
    return modeCfg.id === 'inferno' ? SLOT_SPIN_DURATION_INFERNO : SLOT_SPIN_DURATION_CLASSIC;
  }

  _setSlotState(state) {
    if (!this.chaosSlotMachineEl || this.slotState === state) return;
    this.slotState = state;
    this.chaosSlotMachineEl.dataset.slotState = state;
  }

  _setSlotProgress(ratio) {
    if (!this.chaosSlotProgressEl) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    this.chaosSlotProgressEl.style.transform = `scaleX(${clamped.toFixed(4)})`;
  }

  _pickRandomChaosEvent(excludeIds = []) {
    const excluded = new Set(excludeIds.filter(Boolean));
    const pool = CHAOS_EVENTS.filter((ev) => !excluded.has(ev.id));
    const source = pool.length > 0 ? pool : CHAOS_EVENTS;
    return source[Math.floor(Math.random() * source.length)];
  }

  _renderSlotItems(items, centerIndex) {
    if (!this.chaosSlotTrackEl) return;
    const fragment = document.createDocumentFragment();
    const els = [];
    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = idx === centerIndex ? 'slot-item is-center' : 'slot-item';

      const emoji = document.createElement('span');
      emoji.className = 'slot-item-emoji';
      emoji.appendChild(createChaosIconSvg(item.id, 17));

      const label = document.createElement('span');
      label.className = 'slot-item-label';
      label.textContent = item.name;

      row.append(emoji, label);
      fragment.appendChild(row);
      els.push(row);
    });
    this.chaosSlotTrackEl.replaceChildren(fragment);
    this.slotItemEls = els;
    this.chaosSlotTrackEl.style.transform = `translateY(${(-(centerIndex - 1) * SLOT_ROW_HEIGHT).toFixed(2)}px)`;
  }

  _resetSlotReel(modeCfg) {
    this.slotSpin = null;
    this.slotRestingEvent = null;
    if (!modeCfg.chaosEnabled) {
      this._renderSlotItems([
        { id: 'zen-breath', name: 'RESPIRATION' },
        { id: 'zen-lotus', name: 'MODE ZEN' },
        { id: 'zen-melon', name: 'ZÉRO CHAOS' },
      ], 1);
      this._setSlotState('zen');
      this._setSlotProgress(0);
      return;
    }

    const topEvt = this._pickRandomChaosEvent();
    const botEvt = this._pickRandomChaosEvent([topEvt.id]);
    this._renderSlotItems([
      topEvt,
      { id: 'slot-ready', name: 'PRÊT AU CHAOS' },
      botEvt,
    ], 1);
    this._setSlotState('idle');
    this._setSlotProgress(0);
  }

  _startSlotSpin(modeCfg) {
    const targetEvent = this._pickRandomChaosEvent([this.lastChaosId]);
    const centerItem = this.slotRestingEvent ?? { id: 'slot-ready', name: 'PRÊT AU CHAOS' };
    const topItem = this._pickRandomChaosEvent([centerItem.id]);

    const spinSteps = modeCfg.id === 'inferno' ? 18 : 24;
    const sequence = [topItem, centerItem];
    let prevId = centerItem.id;

    for (let i = 0; i < spinSteps; i += 1) {
      const isLastFiller = i === spinSteps - 1;
      const nextEvt = this._pickRandomChaosEvent(
        isLastFiller ? [prevId, targetEvent.id] : [prevId],
      );
      sequence.push(nextEvt);
      prevId = nextEvt.id;
    }

    const targetIndex = sequence.length;
    sequence.push(targetEvent);
    sequence.push(this._pickRandomChaosEvent([targetEvent.id]));

    this._renderSlotItems(sequence, 1);
    this.slotSpin = {
      targetEvent,
      sequence,
      startRemaining: Math.max(0.25, this.chaosCountdown),
      targetIndex,
      lastStep: 1,
      lastTickAudioAt: -1,
    };
    this._setSlotState('spinning');
    this.audio.playSlotPull();
  }

  _updateSlotSpin() {
    if (!this.slotSpin || !this.chaosSlotTrackEl) return;
    const spin = this.slotSpin;
    const u = Math.max(0, Math.min(1, 1 - (this.chaosCountdown / spin.startRemaining)));
    const eased = this.reducedMotion ? (u >= 1 ? 1 : 0) : 1 - Math.pow(1 - u, 4.2);
    const floatIndex = 1 + eased * (spin.targetIndex - 1);

    this.chaosSlotTrackEl.style.transform = `translateY(${(-(floatIndex - 1) * SLOT_ROW_HEIGHT).toFixed(2)}px)`;

    const step = Math.min(spin.targetIndex, Math.round(floatIndex));
    if (step !== spin.lastStep) {
      if (this.slotItemEls[spin.lastStep]) {
        this.slotItemEls[spin.lastStep].classList.remove('is-center');
      }
      if (this.slotItemEls[step]) {
        this.slotItemEls[step].classList.add('is-center');
      }
      if (!this.reducedMotion && this.elapsedTime - spin.lastTickAudioAt >= 0.032) {
        this.audio.playSlotTick(u);
        spin.lastTickAudioAt = this.elapsedTime;
      }
      spin.lastStep = step;
    }

    this._setSlotProgress(u);
  }

  _triggerRandomChaos(forcedEvent = null) {
    const evt = forcedEvent ?? this._pickRandomChaosEvent([this.lastChaosId]);
    this.lastChaosId = evt.id;
    this.slotRestingEvent = evt;
    this.chaosSurvivedCount += 1;
    this.pinballHitsThisChaos = 0;
    this.pongHitsThisChaos = 0;
    this.mosquitosSwattedThisChaos = 0;
    this.pacChompsThisChaos = 0;
    if (this.chaosSurvivedCount >= 5) {
      this._unlockAchievement('wtf_veteran');
    }
    if (this.chaosSurvivedCount >= 10) {
      this._unlockAchievement('wtf_10');
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

  _recordPowerUsed() {
    this.usedPowerThisRun = true;
    this.powersUsedThisRun += 1;
    if (this.powersUsedThisRun >= 5) this._unlockAchievement('power_bomber');
    if (this.isSabotage) this._unlockAchievement('secret_sabotage_click');
  }

  _activatePower(type) {
    if (this.isGameOver) return;
    if (this.isSabotage) this._unlockAchievement('secret_sabotage_click');
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
      this._recordPowerUsed();
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
      this._recordPowerUsed();
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
      this._recordPowerUsed();
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
      this._recordPowerUsed();
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
      this._recordPowerUsed();
      if (res.src.tier === CLONE_MAX_TIER) this._unlockAchievement('big_clone');
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
    document.body.classList.remove('is-upsidedown', 'is-talljar', 'is-quake', 'is-fever', 'is-gameboy', 'is-matrix', 'is-sabotage');
    this.isGameBoy = false;
    this.isMatrix = false;
    this.isSabotage = false;
    this._clearSabotageState();
    this.bgRenderer.setMonochrome(false);
    this.bgRenderer.setRetroTheme(null);
    if (this.introStage === 'dialogue' || this.introStage === 'revealing') {
      this.introStage = 'none';
    }
    this.introRevealTime = 0;
    this.introRevealPhase = 0;
    document.body.classList.remove(
      'is-intro-revealing',
      'reveal-step-1',
      'reveal-step-2',
      'reveal-step-3',
      'reveal-step-4',
      'reveal-step-5',
    );
    if (this.introFxOverlayEl) {
      this.introFxOverlayEl.hidden = true;
    }
    if (this.introBossOverlayEl) {
      this.introBossOverlayEl.hidden = true;
    }
    this._applyIntroStageVisuals();
    this.dangerBanner.hidden = true;
    this.chaosBanner.hidden = true;
    this.slotSpin = null;
    this._setSlotState(GAME_MODES[this.gameMode].chaosEnabled ? 'idle' : 'zen');
    if (this.runSeconds > 0 && this.runSeconds < 15) {
      this._unlockAchievement('secret_fast_death');
    }
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
    if (this.mouseDistancePx >= 25000) {
      this._unlockAchievement('secret_marathon');
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
    if (this.discoveredTiers.size >= FRUITS.length) {
      this._unlockAchievement('all_specimens');
    }
    const items = this.evolutionListEl.querySelectorAll('.evo-item');
    items.forEach((item) => {
      if (Number(item.dataset.tier) === tier) {
        item.classList.add('is-discovered');
      }
    });
  }

  _updateHUD() {
    const mystery = this.world.activeChaos?.id === 'mystery';
    const isChill = this.introStage === 'chill' || this.introStage === 'dialogue';
    this.scoreEl.textContent = String(this.score);
    this.bestEl.textContent = String(this.bestScore);
    this.nextNameEl.textContent = isChill
      ? (CHILL_FRUIT_PALETTE[this.nextTier]?.name ?? 'Fruit')
      : (mystery ? 'Mystère ???' : FRUITS[this.nextTier].name);
    this.renderer.renderNextPreview(this.nextTier, this.isMonochrome, mystery, this.isGameBoy, isChill);
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
    const introPaused = this.introStage === 'dialogue';
    const isRevealing = this.introStage === 'revealing';
    const isChillIntro = this.introStage === 'chill';
    const modeCfg = GAME_MODES[this.gameMode] || GAME_MODES.classic;
    this.audio.setPaused(modalOpen || introPaused || this.isGameOver);

    if (introPaused) {
      this._renderIntroBossCanvas();
    }

    if (isRevealing) {
      this._stepIntroReveal(dt);
    }

    if (!this.isGameOver && !modalOpen && !introPaused) {
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

      // Forced drop timer (Classic: 1s, Inferno: 0.55s, Zen/Chill/Revealing: off)
      if (
        !isChillIntro
        && !isRevealing
        && modeCfg.dropLimit !== null
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

      // Random Chaos Roulette timer + integrated slot machine spin (disabled in Zen, Chill & Reveal)
      if (!isChillIntro && !isRevealing && modeCfg.chaosEnabled && this.hasStartedDropping && !this.world.activeChaos && (this.world.bodies.length >= 2 || this.slotSpin)) {
        this.chaosCountdown -= dt;
        const spinDuration = this._getSlotSpinDuration(modeCfg);
        if (!this.slotSpin && this.chaosCountdown <= spinDuration) {
          this._startSlotSpin(modeCfg);
        }
        if (this.slotSpin) {
          this._updateSlotSpin();
        }
        if (this.chaosCountdown <= 0) {
          const landedEvent = this.slotSpin?.targetEvent ?? null;
          if (this.slotSpin && this.chaosSlotTrackEl) {
            const { targetIndex, lastStep } = this.slotSpin;
            if (this.slotItemEls[lastStep]) this.slotItemEls[lastStep].classList.remove('is-center');
            if (this.slotItemEls[targetIndex]) this.slotItemEls[targetIndex].classList.add('is-center');
            this.chaosSlotTrackEl.style.transform = `translateY(${(-(targetIndex - 1) * SLOT_ROW_HEIGHT).toFixed(2)}px)`;
          }
          this.slotSpin = null;
          this._triggerRandomChaos(landedEvent);
          this.chaosCountdown = modeCfg.chaosMin + Math.random() * (modeCfg.chaosMax - modeCfg.chaosMin);
          this.chaosCycleTotal = this.chaosCountdown;
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
      const simScale = this.world.activeChaos?.id === 'bullet_time' ? 0.28 : 1;
      if (this.world.activeChaos?.id === 'pong') {
        this.world.setPaddleX(this.aimX);
      }
      this.accumulator += dt;
      while (this.accumulator >= fixedStep) {
        this.world.step(fixedStep, simScale);
        this.accumulator -= fixedStep;
      }

      const curChaosId = this.world.activeChaos?.id ?? null;
      if (this.prevActiveChaosId && curChaosId !== this.prevActiveChaosId && !this.isGameOver) {
        if (this.prevActiveChaosId === 'blackhole') {
          this._unlockAchievement('survived_blackhole');
        }
        if (this.prevActiveChaosId === 'gameboy' || this.prevActiveChaosId === 'vhs') {
          this.retroSeen.add(this.prevActiveChaosId);
          if (this.retroSeen.size >= 2) this._unlockAchievement('retro_gamer');
        }
      }
      this.prevActiveChaosId = curChaosId;

      if (this.world.maxDangerRatio >= 0.75) {
        this.hadHighDangerThisRun = true;
      } else if (this.hadHighDangerThisRun && this.world.maxDangerRatio < 0.2) {
        this.hadHighDangerThisRun = false;
        this._unlockAchievement('survival_cringe');
      }

      if (!isChillIntro) {
        this._maybeSpawnSpeechBubble(dt);
      }

      // Re-clamp held fruit aimX inside dynamic stretched/snapped jar bounds
      this.aimX = this._clampAimX(this.aimX, this.currentTier);
      this.dangerBanner.hidden = isChillIntro || Boolean(this.powerMode) || !this.world.isDangerActive;

      if (this.world.activeChaos) {
        const c = this.world.activeChaos;
        this.chaosBanner.hidden = false;
        if (this.chaosBannerIconEl && this.lastChaosBannerId !== c.id) {
          this.lastChaosBannerId = c.id;
          this.chaosBannerIconEl.replaceChildren(createChaosIconSvg(c.id, 16));
        }
        this.chaosBannerTextEl.textContent = `${c.name} (${c.remaining.toFixed(1)}s)`;
        this.chaosTimerTextEl.textContent = `JACKPOT : ${c.name} (${c.remaining.toFixed(1)}s)`;
        this._setSlotState('active');
        this._setSlotProgress(c.duration > 0 ? c.remaining / c.duration : 0);
      } else if (!modeCfg.chaosEnabled) {
        this.chaosBanner.hidden = true;
        this.chaosTimerTextEl.textContent = 'Mode Zen : zéro roulette WTF';
        this._setSlotState('zen');
        this._setSlotProgress(0);
      } else if (this.slotSpin) {
        this.chaosBanner.hidden = true;
        this.chaosTimerTextEl.textContent = `TIRAGE EN COURS… (${Math.max(0, this.chaosCountdown).toFixed(1)}s)`;
        this._setSlotState('spinning');
      } else {
        this.chaosBanner.hidden = true;
        this._setSlotState('idle');
        if (!this.hasStartedDropping) {
          this._setSlotProgress(0);
          this.chaosTimerTextEl.textContent = 'Clique pour lancer le chaos !';
        } else {
          const spinDuration = this._getSlotSpinDuration(modeCfg);
          const timeToSpin = Math.max(0, this.chaosCountdown - spinDuration);
          const waitSpan = Math.max(0.1, this.chaosCycleTotal - spinDuration);
          const waitProgress = Math.max(0, Math.min(1, 1 - (timeToSpin / waitSpan)));
          this._setSlotProgress(waitProgress);
          this.chaosTimerTextEl.textContent = this.world.bodies.length < 2
            ? 'Lâche encore 1 boule pour armer…'
            : `Prochain tirage : ${Math.max(1, Math.ceil(timeToSpin))}s`;
        }
      }

      this.audio.setMusicState({
        mode: isChillIntro ? 'zen' : this.gameMode,
        danger: isChillIntro ? false : this.world.isDangerActive,
        fever: isFever,
        chaosId: this.world.activeChaos?.id ?? null,
      });

      const mono = this.world.activeChaos?.id === 'monochrome';
      const mystery = this.world.activeChaos?.id === 'mystery';
      const gameboy = this.world.activeChaos?.id === 'gameboy';
      const matrix = this.world.activeChaos?.id === 'bullet_time';
      const sabotage = this.world.activeChaos?.id === 'ui_sabotage';
      const tiltfloor = this.world.activeChaos?.id === 'tiltfloor';
      const upsidedown = this.world.activeChaos?.id === 'upsidedown';
      const talljar = this.world.activeChaos?.id === 'talljar';
      const runaway = this.world.activeChaos?.id === 'runaway';
      const quake = this.world.activeChaos?.id === 'quake' && !this.reducedMotion;
      document.body.classList.toggle('is-upsidedown', upsidedown);
      document.body.classList.toggle('is-talljar', talljar);
      document.body.classList.toggle('is-quake', quake);
      document.body.classList.toggle('is-gameboy', gameboy);
      document.body.classList.toggle('is-matrix', matrix);
      document.body.classList.toggle('is-sabotage', sabotage);

      if (tiltfloor && !this.reducedMotion && this.jarFrameEl) {
        const deg = ((this.world.activeChaos.tiltAngle || 0) * 180) / Math.PI * 0.45;
        this.jarFrameEl.style.setProperty('--jar-rot', `${deg.toFixed(2)}deg`);
      } else if (!upsidedown && this.jarFrameEl) {
        this.jarFrameEl.style.removeProperty('--jar-rot');
      }

      if (sabotage !== this.isSabotage) {
        this.isSabotage = sabotage;
        if (sabotage && this.subtitleEl) {
          this.subtitleEl.textContent = 'SYSTÈME PIRATÉ • ATTRAPE LES BOUTONS !!';
        } else if (!sabotage) {
          for (const btn of this.sabotageButtons) {
            btn.style.removeProperty('--flee-x');
            btn.style.removeProperty('--flee-y');
          }
          if (this.subtitleEl && this.subtitleDefault) {
            this.subtitleEl.textContent = this.subtitleDefault;
          }
        }
      }

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

      if (mono !== this.isMonochrome || mystery !== this.isMystery || gameboy !== this.isGameBoy || matrix !== this.isMatrix) {
        this.isMonochrome = mono;
        this.isMystery = mystery;
        this.isGameBoy = gameboy;
        this.isMatrix = matrix;
        document.body.classList.toggle('is-monochrome', mono);
        this.bgRenderer.setMonochrome(mono);
        this.bgRenderer.setRetroTheme(gameboy ? 'gameboy' : (matrix ? 'matrix' : null));
        this.nextNameEl.textContent = mystery ? 'Mystère ???' : FRUITS[this.nextTier].name;
        this.renderer.renderNextPreview(this.nextTier, mono, mystery, gameboy);
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
    this.wings.update(dt, CHAOS_PALETTES[this.paletteIndex], this.isMonochrome, this.reducedMotion);

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
        canDrop: !this.isGameOver && !introPaused && !isRevealing && this.dropCooldown <= 0,
        showDropTimer: !isChillIntro && !isRevealing && Boolean(modeCfg.dropLimit) && this.hasStartedDropping && this.world.activeChaos?.id !== 'spamclick',
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
