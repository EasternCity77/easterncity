'use strict';

// ═══ touch-input.js ═══
// Mobile detection, D-Pad + skill buttons, performance detection

const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ── Performance level detection ──
(function detectPerfLevel() {
  if (!isMobile) { window.perfLevel = 'high'; return; }
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (mem < 4 || cores < 4) window.perfLevel = 'low';
  else if (mem < 6 || cores < 6) window.perfLevel = 'medium';
  else window.perfLevel = 'high';
})();

// ── Runtime FPS monitor for adaptive degradation ──
let _fpsFrames = [];
let _fpsDegraded = false;
function _fpsCheck(ts) {
  if (!isMobile || _fpsDegraded) return;
  _fpsFrames.push(ts);
  if (_fpsFrames.length > 60) _fpsFrames.shift();
  if (_fpsFrames.length >= 60) {
    const elapsed = _fpsFrames[59] - _fpsFrames[0];
    const avgFrame = elapsed / 59;
    if (avgFrame > 20) { // below 50fps sustained
      if (window.perfLevel === 'high') window.perfLevel = 'medium';
      else if (window.perfLevel === 'medium') window.perfLevel = 'low';
      _fpsDegraded = true;
    }
  }
}
// Hook into game loop — called from game-2d.js loop()
window._touchFpsCheck = _fpsCheck;

// ── Touch controls setup ──
function initTouchControls() {
  if (!isMobile) return;

  const container = document.getElementById('touchControls');
  if (!container) return;
  container.style.display = '';

  // Track active pointers per control
  const activePointers = {};

  // Direction map for D-Pad buttons
  const dirMap = {
    'dpad-up':    {x:0, y:-1},
    'dpad-down':  {x:0, y:1},
    'dpad-left':  {x:-1, y:0},
    'dpad-right': {x:1, y:0}
  };

  // Skill map
  const skillMap = {
    'btn-laser':   'laser',
    'btn-timeslow':'timeSlow',
    'btn-missile': 'missile'
  };

  // Prevent default on all touch controls to avoid scrolling/zooming
  container.addEventListener('touchstart', e => e.preventDefault(), {passive: false});
  container.addEventListener('touchmove', e => e.preventDefault(), {passive: false});

  // D-Pad buttons
  container.querySelectorAll('.dpad-btn').forEach(btn => {
    const id = btn.id;
    const dir = dirMap[id];
    if (!dir) return;

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      activePointers[e.pointerId] = id;
      btn.classList.add('active');
      if (gameActive) applyDirection(dir);
    });
    btn.addEventListener('pointerup', e => {
      e.preventDefault();
      delete activePointers[e.pointerId];
      btn.classList.remove('active');
    });
    btn.addEventListener('pointercancel', () => {
      btn.classList.remove('active');
    });
  });

  // Skill buttons
  container.querySelectorAll('.skill-btn').forEach(btn => {
    const id = btn.id;
    const skill = skillMap[id];
    if (!skill) return;

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('active');
      if (gameActive) activateSkill(skill);
    });
    btn.addEventListener('pointerup', e => {
      e.preventDefault();
      btn.classList.remove('active');
    });
    btn.addEventListener('pointercancel', e => {
      btn.classList.remove('active');
    });
  });
}

// ── Show/hide touch controls based on game state ──
function showTouchControls(visible) {
  if (!isMobile) return;
  const el = document.getElementById('touchControls');
  if (el) el.style.opacity = visible ? '1' : '0';
}

// ── Orientation lock for gameplay ──
function lockLandscape() {
  // No longer force landscape — portrait mode is fully supported
}

function unlockOrientation() {
  if (!isMobile) return;
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch(e) {}
}

// ── Init on DOM ready ──
window.addEventListener('DOMContentLoaded', () => {
  if (!isMobile) {
    // Hide touch controls on desktop
    const el = document.getElementById('touchControls');
    if (el) el.style.display = 'none';
    const rp = document.getElementById('rotatePrompt');
    if (rp) rp.style.display = 'none';
    return;
  }
  // Override HUD height for mobile
  if (typeof HUD_H !== 'undefined') HUD_H = 40;
  initTouchControls();
});

// ── Rotate prompt disabled: portrait mode is fully supported ──
function updateRotatePrompt() {
  // Portrait play is now supported — hide rotate prompt always
  const rp = document.getElementById('rotatePrompt');
  if (rp) rp.style.display = 'none';
}

window.addEventListener('resize', updateRotatePrompt);
window.addEventListener('orientationchange', updateRotatePrompt);
window._updateRotatePrompt = updateRotatePrompt;
