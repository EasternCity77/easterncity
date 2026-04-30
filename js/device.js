'use strict';

// ═══ device.js ═══
// Device detection and performance level for mobile adaptation

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

// ── Add device class to HTML element ──
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add(isMobile ? 'is-mobile' : 'is-desktop');
});