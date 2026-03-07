'use strict';

// ═══ main.js ═══
// Boot: DOMContentLoaded, canvas init, event listeners

// ═══ BOOT ═══
window.addEventListener('DOMContentLoaded', () => {
  // Restore difficulty setting from localStorage
  try {
    const savedDiff = localStorage.getItem('hexsnake_difficulty');
    if (savedDiff && ['easy', 'normal', 'hard', 'hell'].includes(savedDiff)) {
      difficulty = savedDiff;
    }
  } catch(e) {}

  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  evoCanvas=document.getElementById('evoCanvas');
  evoCtx=evoCanvas.getContext('2d');
  // Canvas sizing handled dynamically in drawEvoTree()
  evoCanvas.addEventListener('click',onEvoClick);
  document.addEventListener('keydown',onKey);
  window.addEventListener('resize',resizeGame);
  resizeGame();

  // Hi score
  const hi = localStorage.getItem('hexsnake_hi');
  const hiEl = document.getElementById('sHiScore');
  if (hiEl) hiEl.textContent = hi ? 'BEST: '+hi : 'BEST: —';

  // Live clock in topbar
  function updateClock() {
    const el = document.getElementById('s-clock');
    if (!el) return;
    const n = new Date();
    const h = String(n.getHours()).padStart(2,'0');
    const m = String(n.getMinutes()).padStart(2,'0');
    const s = String(n.getSeconds()).padStart(2,'0');
    el.textContent = `TIME · ${h}:${m}:${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Resize demo preview / fireworks on window resize
  window.addEventListener('resize', () => {
    DemoGame.resize();
    if (typeof _fireworksInst !== 'undefined' && _fireworksInst) _fireworksInst.resize();
  });

  // Start animated background with delay to ensure layout
  setTimeout(() => {
    initMenuBg();
  }, 100);

  // Start menu BGM on first user interaction (browser autoplay policy)
  document.addEventListener('pointerdown', function startMenuBgm() {
    document.removeEventListener('pointerdown', startMenuBgm);
    Audio.init();
    Audio.resume();
    if (!window.gameActive) Audio.setBgmTheme(getTheme().id);
  }, { once: true });
});
