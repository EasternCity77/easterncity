'use strict';

// ═══ audio.js ═══
// Procedural audio engine + toggleMute

const Audio = (() => {
  let ac = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let _muted = false;
  const BPM = 126;
  const STEP = 60 / BPM / 2;  // 16th-note duration in seconds

  // Generic BGM scheduling engine — returns { start, stop, isActive }
  function _makeBgmEngine(schedStepFn, getStepDur) {
    let active = false, step = 0, nextTime = 0, timer = null;
    function schedule() {
      if (!active || !ac) return;
      const lookahead = 0.12;
      while (nextTime < ac.currentTime + lookahead) {
        schedStepFn(step & 15, nextTime);
        step++;
        nextTime += getStepDur();
      }
      timer = setTimeout(schedule, 22);
    }
    return {
      start() {
        if (!ac || active || _muted) return;
        active = true; step = 0;
        nextTime = ac.currentTime + 0.08;
        schedule();
      },
      stop() {
        active = false;
        if (timer) { clearTimeout(timer); timer = null; }
      },
      isActive() { return active; }
    };
  }

  // ── Boot ──
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ac.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ac.destination);

      bgmGain = ac.createGain();
      bgmGain.gain.value = 0.32;
      bgmGain.connect(masterGain);

      sfxGain = ac.createGain();
      sfxGain.gain.value = 0.55;
      sfxGain.connect(masterGain);
    } catch(e) { ac = null; }
  }

  function resume() {
    if (ac && ac.state === 'suspended') ac.resume();
  }

  // ── Low-level synthesis ──
  function osc(type, freq, t, dur, vol, dest, freqEnd) {
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.01);
  }

  function noise(t, dur, vol, lpHz, dest) {
    if (!ac) return;
    const len = Math.ceil(ac.sampleRate * (dur + 0.01));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lpHz || 4000;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(dest || sfxGain);
    src.start(t); src.stop(t + dur + 0.01);
  }

  // ── BGM Sequencer (16-step, A-minor pentatonic) ──
  // A1=55 C2=65 E2=82 G2=98 A2=110 C3=131 E3=165
  const BASS = [55,0,0,55, 65.4,0,55,0, 82.4,0,0,65.4, 55,0,82.4,0];
  const MELD = [0,0,329.6,0, 0,392,0,0, 440,0,329.6,0, 0,0,392,493.9];
  const PAD_STEPS  = new Set([0, 8]);
  const KICK_STEPS = new Set([0, 4, 8, 12]);
  const SNARE_STEPS= new Set([4, 12]);
  const HAT_STEPS  = new Set([1,3,5,7,9,11,13,15]);

  function schedStep(step, t) {
    // Kick
    if (KICK_STEPS.has(step)) {
      osc('sine', 80, t, 0.28, 0.7, bgmGain, 28);
      noise(t, 0.04, 0.12, 350, bgmGain);
    }
    // Snare
    if (SNARE_STEPS.has(step)) {
      noise(t, 0.14, 0.3, 5000, bgmGain);
      osc('triangle', 220, t, 0.09, 0.18, bgmGain);
    }
    // Hi-hat
    if (HAT_STEPS.has(step)) {
      noise(t, 0.035, 0.055, 9000, bgmGain);
    }
    // Bass
    if (BASS[step]) {
      osc('sawtooth', BASS[step], t, 0.16, 0.4, bgmGain);
      osc('square',   BASS[step]*2, t, 0.1, 0.1, bgmGain);
    }
    // Melody
    if (MELD[step]) {
      osc('square',   MELD[step], t, 0.11, 0.13, bgmGain);
      osc('square',   MELD[step], t, 0.11, 0.06, bgmGain);
      // slight echo
      osc('sine',     MELD[step]*0.5, t + 0.06, 0.08, 0.04, bgmGain);
    }
    // Pad chord (A-minor) at bar start
    if (PAD_STEPS.has(step)) {
      [110, 130.8, 164.8, 196].forEach((f, i) => {
        osc('sine', f, t + i*0.01, 0.95, 0.06, bgmGain);
      });
    }
  }

  const _cassetteBgm = _makeBgmEngine(schedStep, () => STEP);
  function startBGM()  { _cassetteBgm.start(); }
  function stopBGM()   { _cassetteBgm.stop(); }

  // ── SFX ──

  function _sfxGuard() { return !ac || _muted; }

  // Eat food - rising blip, pitch scales with combo
  function sfxEat(comboN) {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    const base = 440 + Math.min(comboN, 6) * 80;
    osc('sine', base, t, 0.07, 0.22);
    osc('sine', base * 1.5, t + 0.05, 0.05, 0.12);
  }

  // Combo — ascending blip burst
  function sfxCombo(n) {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    const freqs = [440, 554, 659, 880, 1047, 1319];
    for (let i = 0; i < Math.min(n, freqs.length); i++) {
      osc('square', freqs[i], t + i * 0.055, 0.07, 0.09);
    }
  }

  // Laser fire — descending sawtooth zap
  function sfxLaser() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('sawtooth', 1200, t, 0.14, 0.25, null, 100);
    noise(t, 0.06, 0.1, 7000);
  }

  // Bullet hits player — low impact thud
  function sfxBulletHit() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('sawtooth', 160, t, 0.14, 0.35, null, 60);
    noise(t, 0.12, 0.28, 900);
  }

  // Enemy takes damage — short crack
  function sfxEnemyHit() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('square', 600, t, 0.06, 0.2, null, 300);
    noise(t, 0.05, 0.15, 5000);
  }

  // Enemy killed — descending squawk
  function sfxEnemyDeath() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('square', 440, t, 0.22, 0.25, null, 40);
    noise(t + 0.05, 0.14, 0.2, 2000);
  }

  // Level up — ascending fanfare
  function sfxLevelUp() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      osc('square', f, t + i * 0.09, 0.14, 0.16);
      osc('sine',   f, t + i * 0.09, 0.14, 0.09);
    });
  }

  // Game over — solemn falling tones
  function sfxGameOver() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    [392, 349.2, 293.7, 246.9, 196].forEach((f, i) => {
      osc('sawtooth', f, t + i * 0.17, 0.22, 0.18);
    });
    noise(t + 0.6, 0.5, 0.12, 600);
  }

  // Threat level up — alert alarm
  function sfxThreat() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    [0, 0.12, 0.26, 0.38].forEach((dt, i) => {
      osc('square', i % 2 === 0 ? 660 : 880, t + dt, 0.1, 0.22);
    });
  }

  // Speed up pickup — rising sweep
  function sfxSpeedUp() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('sine', 330, t, 0.18, 0.18, null, 660);
  }

  // Speed down pickup — falling sweep
  function sfxSpeedDown() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('sine', 550, t, 0.18, 0.18, null, 220);
  }

  // XP ball collected — high ping
  function sfxXP() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    osc('sine', 1100, t, 0.06, 0.12);
    osc('sine', 1650, t + 0.04, 0.05, 0.08);
  }

  // ── SKILL SOUNDS ──
  // Time Slow activation — descending sweep with reverb feel
  function sfxTimeSlow() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    // Deep descending sine sweep
    const o1 = ac.createOscillator();
    const g1 = ac.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(400, t);
    o1.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    o1.connect(g1);
    g1.connect(masterGain);
    o1.start(t);
    o1.stop(t + 0.4);

    // Sub-bass undertone
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(200, t);
    o2.frequency.exponentialRampToValueAtTime(50, t + 0.5);
    g2.gain.setValueAtTime(0.2, t);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    o2.connect(g2);
    g2.connect(masterGain);
    o2.start(t);
    o2.stop(t + 0.5);
  }

  // Time Slow end — rising sweep (reverse of activation)
  function sfxTimeSlowEnd() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    const o1 = ac.createOscillator();
    const g1 = ac.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(100, t);
    o1.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    o1.connect(g1);
    g1.connect(masterGain);
    o1.start(t);
    o1.stop(t + 0.3);
  }

  // Missile lock-on — rapid high beeps
  function sfxMissileLock() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    for (let i = 0; i < 5; i++) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(800 + i * 100, t + i * 0.08);
      g.gain.setValueAtTime(0.1, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.12);
      o.connect(g);
      g.connect(masterGain);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.12);
    }
  }

  // Missile launch — rising sawtooth
  function sfxMissileFire() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    o.connect(g);
    g.connect(masterGain);
    o.start(t);
    o.stop(t + 0.2);
  }

  // Missile explosion — noise burst
  function sfxMissileExplode() {
    if (_sfxGuard()) return;
    const t = ac.currentTime;
    const bufferSize = ac.sampleRate * 0.15;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ac.createBufferSource();
    noiseSrc.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    noiseSrc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    noiseSrc.start(t);
  }

  // ── Spring BGM — 五声音阶 (宫商角徵羽) instruments ──

  // Pipa (琵琶) — square wave, pluck decay
  function pipa(freq, t) {
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g); g.connect(bgmGain);
    o.start(t); o.stop(t + 0.14);
  }

  // Gong (锣) — 4×sine cluster, long ring
  function gong(t) {
    if (!ac) return;
    [100, 101, 103.5, 106.2].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.075 - i * 0.012, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g); g.connect(bgmGain);
      o.start(t); o.stop(t + 1.25);
    });
  }

  // Drum (堂鼓) — sine pitch drop + LP noise
  function drum(t) {
    if (!ac) return;
    osc('sine', 80, t, 0.22, 0.5, bgmGain, 28);
    noise(t, 0.08, 0.18, 700, bgmGain);
  }

  // Erhu (二胡) — sine + LFO vibrato
  function erhu(freq, t) {
    if (!ac) return;
    const o = ac.createOscillator();
    const lfo = ac.createOscillator();
    const lfoG = ac.createGain();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    lfo.type = 'sine'; lfo.frequency.value = 5.2;
    lfoG.gain.value = 3.5;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.045);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(bgmGain);
    lfo.start(t); lfo.stop(t + 0.55);
    o.start(t); o.stop(t + 0.55);
  }

  // Woodblock (木鱼) — HP noise click
  function muyu(t) {
    if (!ac) return;
    noise(t, 0.022, 0.065, 3200, bgmGain);
  }

  // Spring rhythm pattern (16-step)
  const SP_GONG = new Set([0, 8]);
  const SP_DRUM = new Set([0, 4, 8, 12]);
  const SP_MUYU = new Set([2, 6, 10, 14]);
  const SP_PAD  = new Set([0, 8]);

  function schedStepSpring(step, t) {
    const aud = getTheme().audio;
    const bass = aud.bass;
    const meld = aud.meld;
    const pad  = aud.padChord;
    if (SP_GONG.has(step)) gong(t);
    if (SP_DRUM.has(step)) drum(t);
    if (SP_MUYU.has(step)) muyu(t);
    if (bass[step]) pipa(bass[step], t);
    if (meld[step]) erhu(meld[step], t);
    if (SP_PAD.has(step) && pad) {
      pad.forEach((f, i) => osc('sine', f, t + i * 0.012, 0.9, 0.055, bgmGain));
    }
  }

  const _springBgm = _makeBgmEngine(
    schedStepSpring,
    () => 60 / ((getTheme().audio.bpm || 108)) / 2
  );
  function startBgmSpring() { _springBgm.start(); }
  function stopBgmSpring()  { _springBgm.stop(); }

  function stopAllBgm() {
    stopBGM();
    stopBgmSpring();
  }

  function setBgmTheme(themeId) {
    stopBGM();
    stopBgmSpring();
    if (!_muted) {
      if (themeId === 'spring') startBgmSpring();
      else startBGM();
    }
  }

  // Toggle mute — returns new muted state
  function toggleMute() {
    _muted = !_muted;
    if (masterGain) masterGain.gain.value = _muted ? 0 : 1;
    if (_muted) { stopBGM(); stopBgmSpring(); }
    else {
      if (getTheme().id === 'spring') startBgmSpring(); else startBGM();
    }
    return _muted;
  }

  function isMuted() { return _muted; }

  function getBgmVolume() { return bgmGain ? bgmGain.gain.value : 0.32; }
  function setBgmVolume(v) { if(bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, v)); }
  function getSfxVolume() { return sfxGain ? sfxGain.gain.value : 0.55; }
  function setSfxVolume(v) { if(sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v)); }

  return {
    init, resume, startBGM, stopBGM, startBgmSpring, stopBgmSpring, stopAllBgm, setBgmTheme,
    toggleMute, isMuted,
    getBgmVolume, setBgmVolume, getSfxVolume, setSfxVolume,
    sfxEat, sfxCombo, sfxLaser, sfxBulletHit, sfxEnemyHit,
    sfxEnemyDeath, sfxLevelUp, sfxGameOver, sfxThreat,
    sfxSpeedUp, sfxSpeedDown, sfxXP,
    sfxTimeSlow, sfxTimeSlowEnd, sfxMissileLock, sfxMissileFire, sfxMissileExplode,
  };
})();

function toggleMute() {
  const m = Audio.toggleMute();
  const btn = document.getElementById('muteBtn');
  if (btn) { btn.textContent = m ? '♪ OFF' : '♪ ON'; btn.style.color = m ? '#C8281E' : '#7A7670'; }
}

// ═══════════════════════════════════════════════════════════
