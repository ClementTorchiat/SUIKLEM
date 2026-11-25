/**
 * Suiklem Chaos Web Audio synthesizer — zero external audio files.
 * Tactile card/chip-inspired SFX + fast-paced electro-funk / WTF cartoon soundtrack.
 */

// 4-bar 16-step (4/4) hyper-funk / electro-swing progression in D Harmonic Minor
const CHAOS_BARS = [
  {
    // Dm
    chord: [293.66, 349.23, 440.0, 523.25],
    bass: [73.42, 0, 146.83, 73.42, 0, 87.31, 110.0, 0, 73.42, 146.83, 0, 130.81, 110.0, 0, 87.31, 98.0],
    lead: [587.33, 0, 698.46, 0, 880.0, 0, 932.33, 880.0, 0, 698.46, 0, 659.25, 587.33, 0, 554.37, 0],
    stabs: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  },
  {
    // Bb7
    chord: [233.08, 293.66, 349.23, 415.3],
    bass: [58.27, 0, 116.54, 0, 87.31, 0, 116.54, 87.31, 58.27, 0, 116.54, 130.81, 146.83, 0, 130.81, 116.54],
    lead: [466.16, 0, 587.33, 698.46, 0, 830.61, 0, 698.46, 587.33, 0, 0, 466.16, 523.25, 0, 587.33, 0],
    stabs: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
  },
  {
    // Gm7
    chord: [293.66, 349.23, 392.0, 466.16],
    bass: [98.0, 0, 196.0, 0, 98.0, 116.54, 146.83, 0, 98.0, 196.0, 0, 174.61, 146.83, 130.81, 116.54, 0],
    lead: [783.99, 0, 932.33, 0, 880.0, 783.99, 698.46, 0, 587.33, 0, 698.46, 0, 783.99, 0, 880.0, 0],
    stabs: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
  },
  {
    // A7(b9) turnaround
    chord: [277.18, 329.63, 392.0, 466.16],
    bass: [110.0, 0, 220.0, 110.0, 0, 138.59, 164.81, 0, 110.0, 0, 196.0, 0, 164.81, 146.83, 138.59, 123.47],
    lead: [880.0, 0, 932.33, 880.0, 830.61, 0, 698.46, 0, 659.25, 587.33, 554.37, 0, 440.0, 554.37, 659.25, 880.0],
    stabs: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1],
  },
];

// Pentatonic / Dorian scale (Hz) for addictive escalating merge chimes
const MERGE_SCALE = [
  293.66, 329.63, 349.23, 440.0, 523.25,
  587.33, 659.25, 698.46, 880.0, 1046.5,
  1174.66, 1318.51, 1396.91, 1760.0,
];

export class BrainrotAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicMuted = false;
    this.paused = false;
    this.lastBumpTime = 0;

    this.sfxBus = null;
    this.sfxCompressor = null;
    this.sfxReverbSend = null;
    this.musicGain = null;
    this.musicFilter = null;
    this.musicReverbSend = null;
    this.reverbNode = null;
    this.noiseBuffer = null;

    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.musicState = {
      mode: 'classic',
      danger: false,
      fever: false,
      chaosId: null,
    };
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  setMusicMuted(muted) {
    this.musicMuted = Boolean(muted);
    if (this.musicMuted) {
      this._stopMusicTimer();
    } else if (this.ctx?.state === 'running' && !this.paused) {
      this._startMusicTimer();
    }
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (this.paused) {
      this._stopMusicTimer();
    } else if (!this.musicMuted && this.ctx?.state === 'running') {
      this._startMusicTimer();
    }
  }

  setMusicState(nextState) {
    const prev = this.musicState;
    const changed =
      (nextState.mode !== undefined && nextState.mode !== prev.mode)
      || (nextState.danger !== undefined && nextState.danger !== prev.danger)
      || (nextState.fever !== undefined && nextState.fever !== prev.fever)
      || (nextState.chaosId !== undefined && nextState.chaosId !== prev.chaosId);

    if (!changed) return;
    Object.assign(this.musicState, nextState);

    if (this.musicFilter && this.ctx) {
      const darkChaos =
        this.musicState.chaosId === 'blackhole'
        || this.musicState.chaosId === 'flashlight'
        || this.musicState.chaosId === 'talljar';
      let targetHz = 5600;
      if (darkChaos) targetHz = 520;
      else if (this.musicState.mode === 'zen') targetHz = 2400;
      else if (this.musicState.fever) targetHz = 7800;
      else if (this.musicState.danger) targetHz = 6600;

      this.musicFilter.frequency.setTargetAtTime(targetHz, this.ctx.currentTime, 0.14);
    }
  }

  unlock() {
    if (this.muted && this.musicMuted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this._initAudioGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (!this.musicMuted && !this.paused) this._startMusicTimer();
      }).catch(() => {});
    } else if (!this.musicMuted && !this.paused && !this.musicTimer) {
      this._startMusicTimer();
    }
  }

  _initAudioGraph() {
    const ctx = this.ctx;

    // Shared noise buffer (1.5s) for tactile snaps, pops, hats & whooshes
    const length = Math.floor(ctx.sampleRate * 1.5);
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Subtle stereo room reverb impulse (~0.55s warm decay)
    const irLen = Math.floor(ctx.sampleRate * 0.55);
    const irBuffer = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const chData = irBuffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < irLen; i++) {
        const decay = Math.pow(1 - i / irLen, 2.7);
        const white = (Math.random() * 2 - 1) * decay;
        lp = lp * 0.68 + white * 0.32;
        chData[i] = lp;
      }
    }
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = irBuffer;
    const reverbMaster = ctx.createGain();
    reverbMaster.gain.value = 0.42;
    this.reverbNode.connect(reverbMaster);
    reverbMaster.connect(ctx.destination);

    // Master SFX bus with soft compressor & warm high-end ceiling
    this.sfxCompressor = ctx.createDynamicsCompressor();
    this.sfxCompressor.threshold.value = -14;
    this.sfxCompressor.knee.value = 18;
    this.sfxCompressor.ratio.value = 5;
    this.sfxCompressor.attack.value = 0.004;
    this.sfxCompressor.release.value = 0.14;

    const sfxCeiling = ctx.createBiquadFilter();
    sfxCeiling.type = 'lowpass';
    sfxCeiling.frequency.value = 9200;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;

    this.sfxReverbSend = ctx.createGain();
    this.sfxReverbSend.gain.value = 0.2;

    this.sfxBus.connect(this.sfxCompressor);
    this.sfxBus.connect(this.sfxReverbSend);
    this.sfxReverbSend.connect(this.reverbNode);
    this.sfxCompressor.connect(sfxCeiling);
    sfxCeiling.connect(ctx.destination);

    // Master Music bus (punchy fast-paced bus + subtle room glue)
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 5600;
    this.musicFilter.Q.value = 0.7;

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.16;

    this.musicReverbSend = ctx.createGain();
    this.musicReverbSend.gain.value = 0.18;

    this.musicFilter.connect(this.musicGain);
    this.musicGain.connect(ctx.destination);
    this.musicFilter.connect(this.musicReverbSend);
    this.musicReverbSend.connect(this.reverbNode);
  }

  _stopMusicTimer() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.nextNoteTime = 0;
  }

  _startMusicTimer() {
    if (this.musicTimer || this.musicMuted || this.paused || !this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.04;
    this.musicTimer = setInterval(() => this._schedulerTick(), 30);
  }

  _schedulerTick() {
    if (this.musicMuted || this.paused || !this.ctx || this.ctx.state !== 'running') {
      this._stopMusicTimer();
      return;
    }

    const now = this.ctx.currentTime;
    // Prevent burst catch-up if tab was backgrounded
    if (this.nextNoteTime < now - 0.25) {
      this.nextNoteTime = now + 0.04;
    }

    while (this.nextNoteTime < now + 0.12) {
      const stepInBar = this.musicStep % 16;
      const barIndex = Math.floor(this.musicStep / 16) % CHAOS_BARS.length;

      // Energetic electro-swing 16th-note shuffle
      const swingOffset = stepInBar % 2 === 1 ? 0.011 : 0;
      this._scheduleMusicStep(barIndex, stepInBar, this.nextNoteTime + swingOffset);

      let bpm = this.musicState.mode === 'zen'
        ? 96
        : (this.musicState.mode === 'inferno' ? 154 : 134);
      if (this.musicState.danger) bpm += 14;
      if (this.musicState.fever) bpm += 16;
      if (this.musicState.chaosId === 'upsidedown') bpm -= 10;

      const sixteenthDur = 15 / bpm;
      this.nextNoteTime += sixteenthDur;
      this.musicStep += 1;
    }
  }

  _scheduleMusicStep(barIndex, step, time) {
    if (!this.ctx || !this.musicFilter) return;

    if (this.musicState.chaosId === 'lag' && Math.random() < 0.34) {
      return;
    }

    const bar = CHAOS_BARS[barIndex];
    const isZen = this.musicState.mode === 'zen';
    const isInferno = this.musicState.mode === 'inferno';
    const isFever = this.musicState.fever;
    const isDanger = this.musicState.danger;
    const isChaos = Boolean(this.musicState.chaosId);
    const isUpsideDown = this.musicState.chaosId === 'upsidedown';

    // Pitch shifts: Fever lifts +2 semitones; UpsideDown droops slightly
    let pitchMul = isFever ? 1.12246 : 1.0;
    if (isUpsideDown) pitchMul *= 0.96;

    // Slight goofy pitch wobble during weird states
    const wobble = Math.sin(this.musicStep * 0.45) * (isUpsideDown || isChaos ? 18 : 4);

    // 1. Driving slap/acid-pluck bass
    const bassFreq = bar.bass[step];
    if (bassFreq > 0 && (!isZen || step % 2 === 0)) {
      this._playMusicSlapBass(
        bassFreq * pitchMul,
        time,
        isZen ? 0.16 : 0.12,
        isZen ? 0.11 : 0.17,
      );
    }

    // 2. Syncopated funky clav/organ chord stabs (off-beat punch!)
    if (bar.stabs[step] && (!isZen || step === 2 || step === 10)) {
      const stabGain = isZen ? 0.022 : 0.036;
      bar.chord.forEach((freq, idx) => {
        this._playMusicOrganStab(
          freq * pitchMul,
          time + idx * 0.006,
          isZen ? 0.18 : 0.1,
          stabGain,
          wobble + (idx % 2 === 0 ? -5 : 5),
        );
      });
    }

    // 3. Quirky bouncy lead + occasional WTF random octave jump / ornament
    const leadFreq = bar.lead[step];
    if (leadFreq > 0 && (!isZen || step % 2 === 0)) {
      let noteFreq = leadFreq * pitchMul;
      // Random unhinged octave jump on 15% of off-beat notes (more during chaos/fever!)
      const chaosChance = isChaos || isFever ? 0.24 : 0.1;
      let slideMode = false;
      if (!isZen && Math.random() < chaosChance) {
        noteFreq *= Math.random() < 0.65 ? 2.0 : 0.5;
        slideMode = Math.random() < 0.5;
      }
      this._playMusicQuirkLead(
        noteFreq,
        time,
        isZen ? 0.18 : 0.115,
        isFever ? 0.068 : 0.052,
        wobble,
        slideMode,
      );
    } else if (!isZen && step === 15 && Math.random() < (isChaos ? 0.55 : 0.22)) {
      // Random WTF cartoon spring / slide-whistle / cowbell fill at end of bar
      this._playMusicWtfFill(time, pitchMul);
    }

    // 4. Tight fast-paced arcade-funk drums
    if (!isZen) {
      // Four-on-the-floor punchy kick + extra syncopated kick in bar 4 / inferno
      const isKick = step % 4 === 0 || ((isInferno || isDanger || barIndex === 3) && step === 14);
      if (isKick) {
        this._playMusicKick(time, step === 0 ? 0.22 : 0.17);
      }

      // Snappy clap-snare on 2 & 4 (steps 4 & 12), plus ghost fill on bar 4 step 15
      if (step === 4 || step === 12 || (barIndex === 3 && step === 15 && Math.random() < 0.7)) {
        this._playMusicSnapSnare(time, step === 15 ? 0.06 : 0.11);
      }

      // Driving crisp hi-hats (every off-beat + 16th-note hustle when intense)
      const isOffBeat = step % 4 === 2;
      const playHat = isOffBeat || isInferno || isDanger || isFever || (step % 2 === 0);
      if (playHat) {
        const hatGain = isOffBeat ? 0.042 : (step % 2 === 0 ? 0.022 : 0.015);
        const hatDur = (isOffBeat && step === 10) ? 0.09 : 0.032; // tiny open-hat lift on step 10
        this._playMusicBrushHat(time, hatGain, hatDur);
      }

      // Playful cowbell / poker-chip tick on syncopations
      if (step === 6 || step === 11 || (isChaos && step === 3 && Math.random() < 0.4)) {
        this._playMusicChipTick(time, 0.045, step === 11 ? 1180 : 940);
      }
    } else if (step % 4 === 0) {
      // Gentle pulse in Zen mode
      this._playMusicKick(time, 0.09);
    }
  }

  _playMusicOrganStab(freq, time, duration, gain, detuneCents = 0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detuneCents, time);

    // Snappy resonant funk clav filter envelope (no harsh 8-bit buzz)
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3400, time);
    filter.frequency.exponentialRampToValueAtTime(620, time + duration);
    filter.Q.value = 2.4;

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.musicFilter);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  _playMusicSlapBass(freq, time, duration, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 1.12, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq), time + 0.022);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1450, time);
    lp.frequency.exponentialRampToValueAtTime(240, time + duration);
    lp.Q.value = 3.2;

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(lp);
    lp.connect(env);
    env.connect(this.musicFilter);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  _playMusicQuirkLead(freq, time, duration, gain, detuneCents = 0, slideUp = false) {
    const ctx = this.ctx;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    const env = ctx.createGain();

    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(slideUp ? freq * 0.72 : freq * 1.03, time);
    carrier.frequency.exponentialRampToValueAtTime(Math.max(40, freq), time + (slideUp ? 0.05 : 0.018));
    carrier.detune.setValueAtTime(detuneCents, time);

    // Subtle rubbery FM bite on attack
    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, time);
    modGain.gain.setValueAtTime(freq * 0.85, time);
    modGain.gain.exponentialRampToValueAtTime(1, time + 0.055);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, time);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.007);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(lp);
    lp.connect(env);
    env.connect(this.musicFilter);

    mod.start(time);
    carrier.start(time);
    mod.stop(time + duration + 0.03);
    carrier.stop(time + duration + 0.03);
  }

  _playMusicWtfFill(time, pitchMul = 1.0) {
    const ctx = this.ctx;
    const kind = Math.floor(Math.random() * 3);

    if (kind === 0) {
      // Goofy rubber boing up
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * pitchMul, time);
      osc.frequency.exponentialRampToValueAtTime(1180 * pitchMul, time + 0.09);
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.065, time + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
      osc.connect(env);
      env.connect(this.musicFilter);
      osc.start(time);
      osc.stop(time + 0.13);
    } else if (kind === 1) {
      // Tiny record-scratch noise zip
      if (!this.noiseBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, time);
      bp.frequency.exponentialRampToValueAtTime(3400, time + 0.06);
      bp.Q.value = 4.2;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.06, time + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
      src.connect(bp);
      bp.connect(env);
      env.connect(this.musicFilter);
      src.start(time, Math.random() * 0.5, 0.09);
    } else {
      // Double cartoon woodblock bonk
      this._playMusicChipTick(time, 0.055, 860 * pitchMul);
      this._playMusicChipTick(time + 0.05, 0.055, 1320 * pitchMul);
    }
  }

  _playMusicKick(time, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.065);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    osc.connect(env);
    env.connect(this.musicFilter);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  _playMusicSnapSnare(time, gain) {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;

    // Crisp noise clap
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2200, time);
    bp.Q.value = 1.4;
    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.0001, time);
    nEnv.gain.linearRampToValueAtTime(gain, time + 0.003);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.085);
    src.connect(bp);
    bp.connect(nEnv);
    nEnv.connect(this.musicFilter);
    src.start(time, Math.random() * 0.5, 0.1);

    // Tight snare body knock
    const body = ctx.createOscillator();
    const bEnv = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(240, time);
    body.frequency.exponentialRampToValueAtTime(115, time + 0.04);
    bEnv.gain.setValueAtTime(0.0001, time);
    bEnv.gain.linearRampToValueAtTime(gain * 0.75, time + 0.002);
    bEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    body.connect(bEnv);
    bEnv.connect(this.musicFilter);
    body.start(time);
    body.stop(time + 0.07);
  }

  _playMusicChipTick(time, gain, startFreq = 980) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, startFreq * 0.55), time + 0.025);

    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.038);

    osc.connect(env);
    env.connect(this.musicFilter);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  _playMusicBrushHat(time, gain, duration = 0.036) {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(6400, time);
    bp.Q.value = 1.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(bp);
    bp.connect(env);
    env.connect(this.musicFilter);

    src.start(time, Math.random() * 0.5, duration + 0.02);
  }

  // --- Tactile SFX Primitives ---

  _canPlaySfx() {
    return !this.muted && this.ctx && this.ctx.state === 'running' && this.sfxBus;
  }

  /**
   * Short filtered-noise transient (card snap, bubble pop, air whoosh, crunch).
   */
  _playNoiseBurst({
    freq = 1800,
    endFreq = freq,
    q = 2.2,
    duration = 0.035,
    gain = 0.12,
    delay = 0,
    filterType = 'bandpass',
  }) {
    if (!this._canPlaySfx() || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(40, freq), t);
    if (endFreq !== freq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + duration);
    }
    filter.Q.value = q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + Math.min(0.004, duration * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);

    src.start(t, Math.random() * 0.8, duration + 0.02);
  }

  /**
   * Warm rounded oscillator with optional pitch sweep and resonant lowpass.
   */
  _playBodyTone({
    freq,
    endFreq = freq,
    duration = 0.14,
    gain = 0.14,
    type = 'sine',
    delay = 0,
    detune = 0,
    cutoff = 6000,
    q = 1.0,
    attack = 0.005,
  }) {
    if (!this._canPlaySfx()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, freq), t);
    if (detune) osc.detune.setValueAtTime(detune, t);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), t + duration);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.value = q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxBus);

    osc.start(t);
    osc.stop(t + duration + 0.025);
  }

  /**
   * FM marimba / vibraphone / glassy chip pluck (Balatro tactile chime).
   */
  _playFMPluck({
    freq,
    duration = 0.24,
    gain = 0.14,
    modRatio = 2.0,
    modDepth = 1.4,
    modDecay = 0.07,
    delay = 0,
    detune = 0,
  }) {
    if (!this._canPlaySfx()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(Math.max(30, freq), t);
    if (detune) carrier.detune.setValueAtTime(detune, t);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(Math.max(30, freq * modRatio), t);
    modGain.gain.setValueAtTime(freq * modDepth, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + modDecay);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(this.sfxBus);

    mod.start(t);
    carrier.start(t);
    mod.stop(t + duration + 0.03);
    carrier.stop(t + duration + 0.03);
  }

  // --- Public Gameplay SFX ---

  playDrop() {
    this.unlock();
    // Soft air whoosh + light rubbery thwip
    this._playNoiseBurst({
      freq: 1400,
      endFreq: 520,
      q: 1.5,
      duration: 0.06,
      gain: 0.06,
    });
    this._playBodyTone({
      freq: 430,
      endFreq: 195,
      duration: 0.075,
      gain: 0.09,
      type: 'sine',
    });
  }

  playBump(impactSpeed) {
    if (!this._canPlaySfx()) return;
    const now = performance.now();
    if (now - this.lastBumpTime < 60 || impactSpeed < 80) return;
    this.lastBumpTime = now;

    const norm = Math.min(1, (impactSpeed - 80) / 550);
    const vol = 0.02 + norm * 0.065;
    const baseFreq = 135 + Math.random() * 65 + norm * 45;

    // Soft silicone / wooden bonk
    this._playBodyTone({
      freq: baseFreq * 1.45,
      endFreq: baseFreq * 0.72,
      duration: 0.055,
      gain: vol,
      type: 'sine',
      cutoff: 1200,
    });
    this._playNoiseBurst({
      freq: 650 + norm * 400,
      q: 2.0,
      duration: 0.018,
      gain: vol * 0.45,
    });
  }

  playMerge(tier, combo = 1) {
    this.unlock();
    const scaleIdx = Math.min(MERGE_SCALE.length - 1, Math.max(0, combo - 1 + Math.floor(tier * 0.35)));
    const chimeFreq = MERGE_SCALE[scaleIdx];

    // Larger fruits get a deeper, juicier bubble-pop body
    const sizeFactor = Math.max(0.42, 1.18 - tier * 0.045);
    const popStart = 280 * sizeFactor;
    const popEnd = 640 * sizeFactor;

    // Layer 1: Crisp poker-chip / bubble-snap transient
    this._playNoiseBurst({
      freq: 2200 * (0.85 + Math.min(combo, 6) * 0.06),
      endFreq: 900,
      q: 2.8,
      duration: 0.022,
      gain: 0.13,
    });

    // Layer 2: Rubbery bubble bloop
    this._playBodyTone({
      freq: popStart,
      endFreq: popEnd,
      duration: 0.075,
      gain: 0.14,
      type: 'sine',
      cutoff: 3200,
    });

    // Layer 3: Tactile FM marimba/bell chime ascending with combo
    this._playFMPluck({
      freq: chimeFreq,
      duration: 0.24,
      gain: 0.14,
      modRatio: 2.0,
      modDepth: 1.35,
      modDecay: 0.06,
      delay: 0.015,
    });

    // Extra harmonic fifth sparkle on combos
    if (combo >= 2) {
      this._playFMPluck({
        freq: chimeFreq * 1.5,
        duration: 0.26,
        gain: Math.min(0.11, 0.05 + combo * 0.012),
        modRatio: 3.0,
        modDepth: 0.9,
        modDecay: 0.05,
        delay: 0.045,
        detune: 6,
      });
    }

    // Mega-fruit Balatro jackpot flourish (Pastèque+ / tier >= 15)
    if (tier >= 15) {
      [587.33, 698.46, 880.0, 1046.5, 1318.51, 1760.0].forEach((note, idx) => {
        this._playFMPluck({
          freq: note,
          duration: 0.36,
          gain: 0.11,
          modRatio: 2.0,
          modDepth: 1.8,
          modDecay: 0.09,
          delay: 0.045 * idx,
          detune: idx % 2 === 0 ? -5 : 5,
        });
      });
    }
  }

  playGameOver() {
    this.unlock();
    // Deflated lounge tape-stop chord + tiny comedic low plonk
    const chord = [293.66, 349.23, 440.0, 523.25];
    chord.forEach((freq, idx) => {
      this._playBodyTone({
        freq,
        endFreq: freq * 0.56,
        duration: 0.72,
        gain: 0.075,
        type: 'triangle',
        cutoff: 1400,
        delay: idx * 0.04,
        detune: (idx - 1.5) * 6,
      });
    });

    this._playFMPluck({
      freq: 146.83,
      duration: 0.32,
      gain: 0.11,
      modRatio: 1.5,
      modDepth: 1.2,
      modDecay: 0.08,
      delay: 0.52,
    });
  }

  playGaugeReady() {
    this.unlock();
    this._playNoiseBurst({ freq: 2400, q: 3.0, duration: 0.016, gain: 0.08 });
    this._playFMPluck({ freq: 587.33, duration: 0.18, gain: 0.12, modRatio: 2.0, modDepth: 1.1 });
    this._playFMPluck({ freq: 880.0, duration: 0.26, gain: 0.13, modRatio: 2.0, modDepth: 1.3, delay: 0.065 });
  }

  playChomp() {
    this.unlock();
    // Cartoon double-cronch + bouncy gulp
    this._playNoiseBurst({ freq: 1400, endFreq: 420, q: 2.2, duration: 0.045, gain: 0.15 });
    this._playNoiseBurst({ freq: 1700, endFreq: 520, q: 2.4, duration: 0.045, gain: 0.14, delay: 0.055 });
    this._playBodyTone({
      freq: 460,
      endFreq: 145,
      duration: 0.11,
      gain: 0.15,
      type: 'triangle',
      cutoff: 2200,
      q: 3.2,
    });
    this._playBodyTone({
      freq: 190,
      endFreq: 520,
      duration: 0.12,
      gain: 0.12,
      type: 'sine',
      delay: 0.06,
    });
  }

  playWind() {
    this.unlock();
    // Breezy whirlwind sweep + playful flute-like swirl
    this._playNoiseBurst({
      freq: 360,
      endFreq: 1650,
      q: 3.6,
      duration: 0.45,
      gain: 0.14,
    });
    this._playNoiseBurst({
      freq: 1650,
      endFreq: 420,
      q: 3.2,
      duration: 0.52,
      gain: 0.12,
      delay: 0.42,
    });

    const notes = [349.23, 440.0, 587.33, 698.46, 587.33, 523.25, 659.25, 880.0];
    notes.forEach((freq, idx) => {
      this._playBodyTone({
        freq,
        endFreq: freq * 1.08,
        duration: 0.18,
        gain: 0.065,
        type: 'sine',
        delay: idx * 0.095,
      });
    });
  }

  playSwap() {
    this.unlock();
    // Crisp card-flip snap + elastic zip
    this._playNoiseBurst({ freq: 2600, q: 2.4, duration: 0.02, gain: 0.12 });
    this._playBodyTone({ freq: 340, endFreq: 780, duration: 0.12, gain: 0.12, type: 'sine' });
    this._playBodyTone({ freq: 780, endFreq: 410, duration: 0.14, gain: 0.1, type: 'sine', delay: 0.07 });
  }

  playNuke() {
    this.unlock();
    // Clean, fat sub-bass drop + warm lowpassed boom
    this._playBodyTone({
      freq: 165,
      endFreq: 34,
      duration: 0.46,
      gain: 0.24,
      type: 'sine',
      cutoff: 800,
    });
    this._playBodyTone({
      freq: 220,
      endFreq: 48,
      duration: 0.34,
      gain: 0.14,
      type: 'sawtooth',
      cutoff: 720,
      q: 2.6,
    });
    this._playNoiseBurst({
      freq: 2400,
      endFreq: 160,
      q: 1.2,
      duration: 0.48,
      gain: 0.2,
      filterType: 'lowpass',
    });
  }

  playClone() {
    this.unlock();
    // Rapid Balatro Joker-retrigger cascade
    [440.0, 587.33, 698.46, 880.0].forEach((freq, idx) => {
      this._playNoiseBurst({
        freq: 2100 + idx * 250,
        q: 2.6,
        duration: 0.015,
        gain: 0.08,
        delay: idx * 0.048,
      });
      this._playFMPluck({
        freq,
        duration: 0.18,
        gain: 0.12,
        modRatio: 2.0,
        modDepth: 1.25,
        modDecay: 0.05,
        delay: idx * 0.048,
      });
    });
  }

  playApocalypse() {
    this.unlock();
    this._playBodyTone({ freq: 130, endFreq: 38, duration: 0.45, gain: 0.2, type: 'sine' });
    this._playNoiseBurst({ freq: 1800, endFreq: 240, q: 1.4, duration: 0.42, gain: 0.14, filterType: 'lowpass' });
    [293.66, 440.0, 587.33, 739.99, 880.0, 1174.66].forEach((freq, idx) => {
      this._playFMPluck({
        freq,
        duration: 0.34,
        gain: 0.1,
        modRatio: 2.0,
        modDepth: 1.6,
        modDecay: 0.08,
        delay: idx * 0.055,
        detune: idx % 2 === 0 ? -6 : 6,
      });
    });
  }

  playSlam() {
    this.unlock();
    // Heavy jar thud + quick woody container rattle
    this._playBodyTone({
      freq: 145,
      endFreq: 36,
      duration: 0.32,
      gain: 0.24,
      type: 'sine',
    });
    this._playBodyTone({
      freq: 195,
      endFreq: 62,
      duration: 0.22,
      gain: 0.13,
      type: 'triangle',
      cutoff: 950,
    });
    this._playNoiseBurst({
      freq: 920,
      endFreq: 260,
      q: 1.6,
      duration: 0.16,
      gain: 0.16,
      filterType: 'lowpass',
    });
  }

  playSlotPull() {
    this.unlock();
    // Chunky mechanical lever pull + spring latch click
    this._playBodyTone({
      freq: 175,
      endFreq: 92,
      duration: 0.11,
      gain: 0.14,
      type: 'triangle',
      cutoff: 720,
    });
    this._playNoiseBurst({
      freq: 1650,
      endFreq: 680,
      q: 2.2,
      duration: 0.045,
      gain: 0.09,
    });
  }

  playSlotTick(progress = 0) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const clamped = Math.max(0, Math.min(1, progress));
    // Crisp reel detent click that deepens slightly as the wheel slows down
    const tickFreq = 1350 - clamped * 380;
    const toneFreq = 760 - clamped * 220;
    this._playNoiseBurst({
      freq: tickFreq,
      q: 3.4,
      duration: 0.012,
      gain: 0.055 + clamped * 0.025,
    });
    this._playFMPluck({
      freq: toneFreq,
      duration: 0.045,
      gain: 0.04 + clamped * 0.02,
      modRatio: 2.2,
      modDepth: 0.65,
      modDecay: 0.025,
    });
  }

  playChaosAlert() {
    this.unlock();
    // Quirky mischievous tritone/lounge bell chime
    const notes = [880.0, 622.25, 880.0, 1046.5];
    notes.forEach((freq, idx) => {
      this._playNoiseBurst({
        freq: 2500,
        q: 2.8,
        duration: 0.014,
        gain: 0.06,
        delay: idx * 0.095,
      });
      this._playFMPluck({
        freq,
        duration: 0.2,
        gain: 0.11,
        modRatio: 2.5,
        modDepth: 1.1,
        modDecay: 0.06,
        delay: idx * 0.095,
      });
    });
  }

  playFever() {
    this.unlock();
    // Euphoric Balatro Mult-breakout rising Dmaj9 sparkle
    this._playBodyTone({ freq: 130, endFreq: 48, duration: 0.16, gain: 0.18, type: 'sine' });
    [587.33, 739.99, 880.0, 1108.73, 1318.51].forEach((freq, idx) => {
      this._playFMPluck({
        freq,
        duration: 0.3,
        gain: 0.11,
        modRatio: 2.0,
        modDepth: 1.5,
        modDecay: 0.07,
        delay: idx * 0.05,
        detune: idx % 2 === 0 ? -5 : 5,
      });
    });
  }

  playAchievement() {
    this.unlock();
    // Warm rewarding badge unlock chime
    this._playNoiseBurst({ freq: 2800, q: 3.0, duration: 0.016, gain: 0.07 });
    [440.0, 587.33, 739.99, 880.0].forEach((freq, idx) => {
      this._playFMPluck({
        freq,
        duration: 0.34,
        gain: 0.11,
        modRatio: 2.0,
        modDepth: 1.2,
        modDecay: 0.07,
        delay: idx * 0.065,
      });
    });
  }
}
