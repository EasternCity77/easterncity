'use strict';

// ═══ ui.js ═══
// Evolution tree, HUD, flash, death screen, game over, i18n, goHome, modeToggle

// ═══ EVOLUTION TREE ═══
const EVO_W=820, EVO_H=480;
const EVO_DIV=316;
function curNodes(){return gameMode==='3d'?EVO_NODES_3D:EVO_NODES;}
function curCodes(){return gameMode==='3d'?NODE_CODES_3D:NODE_CODES;}

function drawEvoTree() {
  const c = evoCtx;
  const EVO = getTheme().evo;
  c.clearRect(0, 0, EVO_W, EVO_H);

  // ── Deep dark base ──
  c.fillStyle = '#07090E';
  c.fillRect(0, 0, EVO_W, EVO_H);

  // ── Pixel grid ──
  c.strokeStyle = 'rgba(0,220,160,0.035)';
  c.lineWidth = 0.5;
  const GS = 20;
  for (let x = 0; x < EVO_W; x += GS) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,EVO_H); c.stroke(); }
  for (let y = 0; y < EVO_H; y += GS) { c.beginPath(); c.moveTo(0,y); c.lineTo(EVO_W,y); c.stroke(); }

  // ── Scanlines ──
  for (let y = 0; y < EVO_H; y += 4) {
    c.fillStyle = 'rgba(0,0,0,0.1)';
    c.fillRect(0, y, EVO_W, 1);
  }

  // ── Section backgrounds ──
  c.fillStyle = `rgba(${EVO.combatRgb},0.04)`;
  c.fillRect(0, 0, EVO_W, EVO_DIV);
  c.fillStyle = `rgba(${EVO.mobilityRgb},0.04)`;
  c.fillRect(0, EVO_DIV, EVO_W, EVO_H - EVO_DIV);

  // ── Section border outlines ──
  c.strokeStyle = `rgba(${EVO.combatRgb},0.12)`;
  c.lineWidth = 1;
  c.strokeRect(2, 2, EVO_W - 4, EVO_DIV - 4);
  c.strokeStyle = `rgba(${EVO.mobilityRgb},0.12)`;
  c.strokeRect(2, EVO_DIV + 2, EVO_W - 4, EVO_H - EVO_DIV - 4);

  // ── Divider line ──
  c.strokeStyle = 'rgba(100,120,150,0.25)';
  c.lineWidth = 1;
  c.setLineDash([6, 8]);
  c.beginPath(); c.moveTo(0, EVO_DIV); c.lineTo(EVO_W, EVO_DIV); c.stroke();
  c.setLineDash([]);

  // ── Section headers ──
  _evoSectionLabel(c, '> COMBAT MODULE', 12, 14, EVO.combat);
  _evoSectionLabel(c, '> MOBILITY MODULE', 12, EVO_DIV + 14, EVO.mobility);

  // ── Right info panel (x=424 onwards) ──
  _evoInfoPanel(c);

  // ── Connection lines ──
  _evoConnections(c);

  // ── Nodes ──
  curNodes().forEach(n => drawEvoNode(c, n));
}

function _evoSectionLabel(c, text, x, y, col) {
  c.font = '700 9px "Share Tech Mono", monospace';
  c.fillStyle = col;
  c.globalAlpha = 0.5;
  c.fillText(text, x, y);
  c.globalAlpha = 1;
}

function _evoInfoPanel(c) {
  const EVO = getTheme().evo;
  const px = 430, pw = 380, PADL = 18;

  // Panel background
  c.fillStyle = 'rgba(5,8,14,0.7)';
  c.fillRect(px, 8, pw - 8, EVO_H - 16);
  c.strokeStyle = 'rgba(60,80,110,0.3)';
  c.lineWidth = 1;
  c.strokeRect(px, 8, pw - 8, EVO_H - 16);

  // Panel title
  c.font = '700 8px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(160,180,200,0.4)';
  c.fillText('OPERATOR LOADOUT', px + PADL, 26);
  c.strokeStyle = 'rgba(60,80,110,0.4)';
  c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(px + PADL, 30); c.lineTo(px + pw - 24, 30); c.stroke();

  // List active upgrades
  const active = curNodes().filter(n => unlocked.has(n.id));
  const sectionColors = { combat: EVO.combat, mobility: EVO.mobility };

  if (active.length === 0) {
    c.font = '10px "Share Tech Mono", monospace';
    c.fillStyle = 'rgba(60,80,110,0.6)';
    c.fillText('[ NO UPGRADES ACTIVE ]', px + PADL, 58);
  } else {
    let lineY = 48;
    active.forEach((n, i) => {
      const col = sectionColors[n.section];
      // Bullet
      c.fillStyle = col;
      c.fillRect(px + PADL, lineY - 7, 3, 10);
      // Label
      c.font = '700 12px "Barlow Condensed", sans-serif';
      c.fillStyle = '#C8D4E0';
      c.fillText(n.label, px + PADL + 10, lineY);
      // Description
      c.font = '8px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(100,130,160,0.65)';
      c.fillText(n.desc, px + PADL + 10, lineY + 11);
      lineY += 28;
    });
  }

  // Selected node detail
  if (selectedEvo) {
    const sn = curNodes().find(n => n.id === selectedEvo);
    if (sn) {
      const detY = EVO_H - 120;
      c.fillStyle = `rgba(${EVO.combatRgb},0.06)`;
      c.fillRect(px, detY, pw - 8, 108);
      c.strokeStyle = `rgba(${EVO.combatRgb},0.25)`;
      c.lineWidth = 1;
      c.strokeRect(px, detY, pw - 8, 108);

      c.font = '700 8px "Share Tech Mono", monospace';
      c.fillStyle = `rgba(${EVO.combatRgb},0.6)`;
      c.fillText('SELECTED >', px + PADL, detY + 16);

      c.font = '700 16px "Barlow Condensed", sans-serif';
      c.fillStyle = EVO.combat;
      c.fillText(sn.label, px + PADL, detY + 36);

      c.font = '9px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(200,180,150,0.8)';
      c.fillText(sn.desc, px + PADL, detY + 52);

      c.font = '700 8px "Share Tech Mono", monospace';
      c.fillStyle = 'rgba(100,130,160,0.5)';
      c.fillText(`CODE: ${curCodes()[sn.id] || sn.id.toUpperCase()}`, px + PADL, detY + 70);

      // Req status
      if (sn.req.length > 0) {
        const reqNames = sn.req.map(r => curNodes().find(x => x.id === r)?.label || r).join(', ');
        c.fillText(`前置: ${reqNames}`, px + PADL, detY + 84);
      }

      // "PRESS CONFIRM" blink
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        c.font = '700 9px "Share Tech Mono", monospace';
        c.fillStyle = EVO.combat;
        c.fillText('[ PRESS CONFIRM TO INSTALL ]', px + PADL, detY + 100);
      }
    }
  }

  // Unlock count
  c.font = '700 9px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(100,130,160,0.4)';
  c.fillText(`${unlocked.size} / ${curNodes().length}  INSTALLED`, px + PADL, EVO_H - 14);
}

function _evoConnections(c) {
  const EVO = getTheme().evo;
  curNodes().forEach(n => {
    n.req.forEach(rid => {
      const rn = curNodes().find(x => x.id === rid);
      if (!rn) return;
      const unlRn = unlocked.has(rid);
      const unlN  = unlocked.has(n.id);

      const secCol = n.section === 'combat' ? EVO.combat : EVO.mobility;
      let lineCol, lineW, dash, alpha;

      if (unlN) {
        lineCol = EVO.unlocked; lineW = 2; dash = []; alpha = 0.85;
      } else if (unlRn) {
        lineCol = secCol; lineW = 1.5; dash = [5, 4]; alpha = 0.75;
      } else {
        lineCol = EVO.locked; lineW = 1; dash = [3, 6]; alpha = 0.5;
      }

      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = lineCol;
      c.lineWidth = lineW;
      c.setLineDash(dash);
      c.lineCap = 'square';

      // Source: right edge center of parent
      const x1 = rn.x + NW, y1 = rn.y + NH / 2;
      // Target: left edge center of child
      const x2 = n.x,        y2 = n.y  + NH / 2;
      const mx = x1 + (x2 - x1) * 0.45;

      if (Math.abs(y1 - y2) < 2) {
        // Straight horizontal
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      } else {
        // Right-angle elbow: horizontal → vertical → horizontal
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(mx, y1);
        c.lineTo(mx, y2);
        c.lineTo(x2, y2);
        c.stroke();
        // Junction dot at bend
        c.setLineDash([]);
        c.fillStyle = lineCol;
        c.beginPath(); c.arc(mx, y1, 2.5, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(mx, y2, 2.5, 0, Math.PI*2); c.fill();
      }

      // Arrow tip
      c.setLineDash([]);
      c.globalAlpha = alpha;
      const AS = 6;
      c.fillStyle = lineCol;
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - AS, y2 - AS * 0.5);
      c.lineTo(x2 - AS, y2 + AS * 0.5);
      c.closePath(); c.fill();

      c.restore();
    });
  });
}

function nodeState(n) {
  if(unlocked.has(n.id)) return 'unlocked';
  if(n.req.every(r=>unlocked.has(r))) return 'available';
  return 'locked';
}

function drawEvoNode(c, n) {
  const EVO = getTheme().evo;
  const st = nodeState(n);
  const sel = selectedEvo === n.id;
  const x = n.x, y = n.y, w = NW, h = NH;
  const secCol = n.section === 'combat' ? EVO.combat : EVO.mobility;
  const secRgb = n.section === 'combat' ? EVO.combatRgb : EVO.mobilityRgb;
  const blink = Math.floor(performance.now() / 420) % 2 === 0;

  // ── State-dependent colors ──
  let bgCol, accentCol, labelCol, descCol, statusTxt, statusCol, glowCol;

  if (st === 'unlocked') {
    bgCol     = 'rgba(0,40,20,0.9)';
    accentCol = EVO.unlocked;
    labelCol  = EVO.unlocked;
    descCol   = `rgba(${EVO.unlockedRgb},0.55)`;
    statusTxt = '■ OK';
    statusCol = EVO.unlocked;
    glowCol   = EVO.unlockedRgb;
  } else if (st === 'available') {
    if (sel) {
      bgCol     = n.section==='combat' ? 'rgba(70,28,0,0.95)' : 'rgba(0,42,38,0.95)';
      accentCol = secCol;
      labelCol  = '#FFFFFF';
      descCol   = 'rgba(255,255,255,0.6)';
      statusTxt = blink ? '▶ SEL' : '  SEL';
      statusCol = secCol;
      glowCol   = secRgb;
    } else {
      bgCol     = 'rgba(10,14,22,0.92)';
      accentCol = secCol;
      labelCol  = secCol;
      descCol   = `rgba(${secRgb},0.55)`;
      statusTxt = '○ RDY';
      statusCol = secCol;
      glowCol   = secRgb;
    }
  } else {
    bgCol     = 'rgba(6,8,14,0.85)';
    accentCol = EVO.locked;
    labelCol  = EVO.locked;
    descCol   = EVO.locked;
    statusTxt = '× LCK';
    statusCol = EVO.locked;
    glowCol   = null;
  }

  // ── Glow halo ──
  if (glowCol && (sel || st === 'unlocked')) {
    c.shadowColor   = `rgba(${glowCol},0.7)`;
    c.shadowBlur    = sel ? 16 : 8;
  }

  // ── Background ──
  c.fillStyle = bgCol;
  c.fillRect(x, y, w, h);
  c.shadowBlur = 0;

  // ── Left accent bar (3px) ──
  c.fillStyle = accentCol;
  c.fillRect(x, y, 3, h);

  // ── Corner bracket decoration ──
  const B = 7;
  c.strokeStyle = accentCol;
  c.lineWidth = st === 'locked' ? 0.7 : 1.5;
  // top-left
  c.beginPath(); c.moveTo(x+B+3, y+0.5); c.lineTo(x+0.5, y+0.5); c.lineTo(x+0.5, y+B+3); c.stroke();
  // top-right
  c.beginPath(); c.moveTo(x+w-B-3, y+0.5); c.lineTo(x+w-0.5, y+0.5); c.lineTo(x+w-0.5, y+B+3); c.stroke();
  // bottom-left
  c.beginPath(); c.moveTo(x+B+3, y+h-0.5); c.lineTo(x+0.5, y+h-0.5); c.lineTo(x+0.5, y+h-B-3); c.stroke();
  // bottom-right
  c.beginPath(); c.moveTo(x+w-B-3, y+h-0.5); c.lineTo(x+w-0.5, y+h-0.5); c.lineTo(x+w-0.5, y+h-B-3); c.stroke();

  // ── Pixel dot pattern (subtle) in bg ──
  if (st !== 'locked') {
    c.fillStyle = `rgba(${glowCol||'100,120,140'},0.06)`;
    for (let dx = 10; dx < w-6; dx += 8) {
      for (let dy = 6; dy < h-4; dy += 8) {
        c.fillRect(x+dx, y+dy, 1, 1);
      }
    }
  }

  // ── Node code ID (top-left) ──
  c.font = '8px "Share Tech Mono", monospace';
  c.fillStyle = st === 'locked' ? '#101820' : 'rgba(100,130,160,0.4)';
  c.textAlign = 'left';
  c.fillText(curCodes()[n.id] || n.id.toUpperCase(), x+6, y+11);

  // ── Status badge (top-right) ──
  c.font = '700 8px "Share Tech Mono", monospace';
  c.fillStyle = statusCol;
  c.textAlign = 'right';
  c.fillText(statusTxt, x+w-5, y+11);

  // ── Separator line ──
  c.strokeStyle = `rgba(${glowCol||'20,30,45'},0.35)`;
  c.lineWidth = 0.5;
  c.beginPath(); c.moveTo(x+4, y+15); c.lineTo(x+w-4, y+15); c.stroke();

  // ── Main label ──
  c.font = '700 15px "Barlow Condensed", sans-serif';
  c.fillStyle = labelCol;
  c.textAlign = 'center';
  // Glow text for active
  if (st !== 'locked' && glowCol) {
    c.shadowColor = `rgba(${glowCol},0.6)`;
    c.shadowBlur  = 6;
  }
  c.fillText(n.label, x+w/2, y+h*0.56);
  c.shadowBlur = 0;

  // ── Description ──
  c.font = '8px "Share Tech Mono", monospace';
  c.fillStyle = descCol;
  c.fillText(n.desc, x+w/2, y+h-7);

  c.textAlign = 'left';
}

function onEvoClick(e) {
  const rect = evoCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (EVO_W / rect.width);
  const my = (e.clientY - rect.top)  * (EVO_H / rect.height);
  for (const n of curNodes()) {
    if (mx >= n.x && mx <= n.x+NW && my >= n.y && my <= n.y+NH) {
      if (nodeState(n) === 'available') {
        selectedEvo = n.id;
        document.getElementById('evoWarn').textContent = '';
        drawEvoTree();
      } else if (nodeState(n) === 'unlocked') {
        document.getElementById('evoWarn').textContent = '/ 该节点已激活';
      } else {
        document.getElementById('evoWarn').textContent = '/ 需要先解锁前置节点';
      }
      return;
    }
  }
}

let evoRaf = null;
function startEvoRedraw() {
  if (evoRaf) return;
  function loop() {
    if (!document.getElementById('evoScreen').classList.contains('show')) {
      evoRaf = null; return;
    }
    drawEvoTree();
    evoRaf = requestAnimationFrame(loop);
  }
  evoRaf = requestAnimationFrame(loop);
}

function confirmUpgrade() {
  if(!selectedEvo){document.getElementById('evoWarn').textContent='请先选择一个可用节点';return;}
  const upgId = selectedEvo;
  const upgNode = curNodes().find(n=>n.id===upgId);
  unlocked.add(upgId);
  applyUpgradeEffect(upgId);
  selectedEvo=null;
  if (evoRaf) { cancelAnimationFrame(evoRaf); evoRaf = null; }
  document.getElementById('evoScreen').classList.remove('show');

  // Show 3-second countdown overlay before resuming
  const overlay = document.getElementById('countdownOverlay');
  const numEl   = document.getElementById('countdownNum');
  const nameEl  = document.getElementById('countdownUpgName');
  nameEl.textContent = upgNode ? `◈ ${upgNode.label} 已激活` : '';
  overlay.style.display = 'flex';
  let count = 3;
  numEl.textContent = count;
  const tick = setInterval(() => {
    count--;
    if(count <= 0){
      clearInterval(tick);
      overlay.style.display = 'none';
      gamePaused = false;
      if (getTheme().id === 'spring') Audio.startBgmSpring(); else Audio.startBGM();
    } else {
      numEl.textContent = count;
    }
  }, 1000);
}

function applyUpgradeEffect(id) {
  const u=player.upg;
  switch(id){
    // 2D
    case'laser2': u.laserN=2; break;
    case'laser3': u.laserN=3; break;
    case'pierce': u.pierce=true; break;
    case'cd1': u.laserCD=4/5; break;
    case'cd2': u.laserCD=3/5; break;
    case'dmg2': u.laserDmg=2; break;
    case'slow': u.slow=true; break;
    case'spd1': u.spd=1; break;
    case'spd2': u.spd=2; break;
    case'qturn': u.quickTurn=true; break;
    // Skills
    case'ts_dur': u.ts_dur = (u.ts_dur || 0) + 1; break;
    case'ts_cd': u.ts_cd = (u.ts_cd || 0) + 1; break;
    case'ms_count': u.ms_count = (u.ms_count || 0) + 1; break;
    case'ms_pierce': u.ms_pierce = true; break;
    case'ms_dmg': u.ms_dmg = (u.ms_dmg || 0) + 1; break;
    // 3D
    case'sw2': u.swRange=3; break;
    case'sw3': u.swRange=4; break;
    case'swcd1': u.swCDMult=0.75; break;
    case'swcd2': u.swCDMult=0.5; break;
    case'wbreak': u.wallBreak=true; break;
    case'spd1_3d': u.spd=1; break;
    case'spd2_3d': u.spd=2; break;
    case'qturn3d': u.quickTurn=true; break;
  }
}


// ═══ HOME ═══
function goToHome() {
  gameActive = false; deathTime = 0;
  Audio.stopAllBgm();
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  // 3D cleanup
  if (gameMode === '3d') { cube3D.active = false; document.getElementById('minimap3d').classList.remove('show'); }
  const goEl = document.getElementById('goScreen');
  goEl.classList.remove('show');
  goEl.style.opacity = '';
  goEl.style.transition = '';
  document.getElementById('startScreen').style.display = 'flex';
  
  // Refresh hi score display
  const hi = localStorage.getItem('hexsnake_hi');
  const el = document.getElementById('sHiScore');
  if (el) el.textContent = hi ? 'BEST: ' + hi : 'BEST: —';
  
  // Give DOM time to update layout, then init background
  setTimeout(() => {
    if (getTheme().id === 'spring') {
      initMenuBgSpring();
    } else {
      initMenuBg();
    }
    // Restore menu BGM
    Audio.setBgmTheme(getTheme().id);
  }, 100);
}


// ═══ MODE TOGGLE ═══
function toggleGameMode() {
  gameMode = gameMode === '2d' ? '3d' : '2d';
  const sw = document.getElementById('modeSwitch');
  const sA = document.getElementById('modeSideA');
  const sB = document.getElementById('modeSideB');
  if (gameMode === '3d') {
    sw.classList.add('mode3d');
    sA.classList.remove('active');
    sB.classList.add('active');
  } else {
    sw.classList.remove('mode3d');
    sA.classList.add('active');
    sB.classList.remove('active');
  }
  document.getElementById('launchBtn').textContent = gameMode === '2d' ? '▶ 开始任务' : '▶ 进入立方体';
  const spLaunch = document.getElementById('spLaunchBtn');
  if (spLaunch) spLaunch.textContent = gameMode === '2d' ? '▶ 开始游戏' : '▶ 进入立方体';
  const spA = document.getElementById('spModeA'), spB = document.getElementById('spModeB');
  if (spA && spB) {
    spA.classList.toggle('active', gameMode === '2d');
    spB.classList.toggle('active', gameMode === '3d');
  }
  // Click feedback sound
  try { Audio.init(); Audio.resume(); } catch(e) {}
}
function setGameMode(m) {
  if (m !== gameMode) toggleGameMode();
}

// ═══ THEME SWITCHING ═══
function applyThemeToMenuLayout(id) {
  const sMain  = document.querySelector('.s-main');
  const spMain = document.getElementById('spMain');
  if (sMain)  sMain.style.display  = id === 'cassette' ? '' : 'none';
  if (spMain) {
    if (id === 'spring') spMain.classList.add('show');
    else                 spMain.classList.remove('show');
  }
  // Update CSS custom properties so HTML elements match the active theme
  const t = getTheme();
  const root = document.documentElement;
  root.style.setProperty('--or', t.colors.primary);
  root.style.setProperty('--teal', t.colors.secondary);
  // Update settings theme cards
  document.querySelectorAll('.cfg-theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.themeId === id);
  });
}

function _applyThemeInternalState(newId) {
  setActiveTheme(newId);
  if (typeof Audio !== 'undefined' && typeof Audio.setBgmTheme === 'function') {
    Audio.setBgmTheme(newId);
  }
}

function _applyThemeLayout(newId) {
  // Close settings panel if open
  const cfg = document.getElementById('cfgScreen');
  if (cfg) cfg.classList.remove('show');
  applyThemeToMenuLayout(newId);
  if (newId === 'spring') {
    if (typeof stopMenuBg === 'function') stopMenuBg();
    if (typeof initMenuBgSpring === 'function') initMenuBgSpring();
    // Spring menu reveal animation
    const spMain = document.getElementById('spMain');
    if (spMain) {
      spMain.classList.add('revealing');
      setTimeout(() => spMain.classList.remove('revealing'), 800);
    }
  } else {
    if (typeof menuBgSpringStop === 'function') menuBgSpringStop();
    if (typeof initMenuBg === 'function') initMenuBg();
  }
}

// kept for compatibility — direct switch with no animation
function _applyThemeSwitch(newId) {
  _applyThemeInternalState(newId);
  _applyThemeLayout(newId);
}

// ── Theme transition animation ──
// cassette→spring: 2000ms  |  spring→cassette: 1800ms
let _transRaf = null;
function playThemeTransition(fromId, toId, onDone) {
  const cv = document.getElementById('transCanvas');
  if (!cv) { _applyThemeInternalState(toId); _applyThemeLayout(toId); if (onDone) onDone(); return; }
  const ctx = cv.getContext('2d');
  const W = window.innerWidth, H = window.innerHeight;
  cv.width = W; cv.height = H;
  cv.style.transition = '';
  cv.style.opacity = '1';
  cv.style.display = 'block';

  const IS_C2S = (fromId === 'cassette');   // cassette → spring
  const TOTAL     = IS_C2S ? 2000 : 1800;
  const STATE_AT  = 360;    // internal state + BGM switch
  const LAYOUT_AT = IS_C2S ? 1400 : 360;   // UI layout switch (spring deferred, cassette same)
  const FADE_START = IS_C2S ? 1400 : 1200;
  const FADE_DUR   = 400;

  let stateSwapped  = false;
  let layoutSwapped = false;
  const start = performance.now();

  // ── cassette→spring firework bursts (5 groups) ──
  const FW_GROUPS = [
    { t: 450,  x: 0.50, y: 0.45, n: 60, maxR: 0.30 },
    { t: 650,  x: 0.28, y: 0.35, n: 45, maxR: 0.22 },
    { t: 750,  x: 0.72, y: 0.30, n: 45, maxR: 0.22 },
    { t: 950,  x: 0.35, y: 0.62, n: 35, maxR: 0.18 },
    { t: 1100, x: 0.65, y: 0.58, n: 35, maxR: 0.18 },
  ];
  const FW_COLORS = ['#CC2020','#D4A820','#FF6040','#FFE080','#FF4040','#FFD060','#FF8040','#FFCC20'];
  // Pre-generate particles per group
  const fwParticles = FW_GROUPS.map(g => ({
    ...g,
    sparks: Array.from({ length: g.n }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 2.8,
      size:  2 + Math.random() * 6,
      col:   FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
      life:  0.6 + Math.random() * 0.4,
    })),
  }));

  // ── spring→cassette convergence particles ──
  const convSparks = Array.from({ length: 60 }, () => ({
    angle: Math.random() * Math.PI * 2,
    dist:  0.15 + Math.random() * 0.38,
    col:   ['#CC2020','#D4A820','#FF6040','#FFE080'][Math.floor(Math.random()*4)],
    size:  1.5 + Math.random() * 3,
  }));

  function frame(now) {
    const elapsed = now - start;

    // ── swap points ──
    if (!stateSwapped && elapsed >= STATE_AT) {
      stateSwapped = true;
      _applyThemeInternalState(toId);
    }
    if (!layoutSwapped && elapsed >= LAYOUT_AT) {
      layoutSwapped = true;
      _applyThemeLayout(toId);
    }

    ctx.clearRect(0, 0, W, H);

    if (IS_C2S) {
      // ── cassette → spring ──

      // Phase 1 (0–350ms): VHS stripes sweep bottom→top
      if (elapsed < 350) {
        const prog = elapsed / 350;
        for (let i = 0; i < 14; i++) {
          const y = H * (1 - prog) + (i / 14) * H * prog * 0.8;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(232,100,10,0.18)' : 'rgba(255,40,64,0.12)';
          ctx.fillRect(0, y, W, H / 14 * 0.65);
        }
        ctx.fillStyle = `rgba(255,255,255,${prog * 0.06})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Phase 2 (300–450ms): white flash
      if (elapsed >= 300 && elapsed < 450) {
        const fl = elapsed < 380 ? (elapsed - 300) / 80 : 1 - (elapsed - 380) / 70;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, fl) * 0.94})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Phase 3 (450–1400ms): 5 staggered firework bursts
      fwParticles.forEach(g => {
        if (elapsed < g.t || elapsed > g.t + 950) return;
        const age = (elapsed - g.t) / 950;
        const cx = W * g.x, cy = H * g.y;
        const maxD = Math.min(W, H) * g.maxR;
        g.sparks.forEach(sp => {
          const alive = sp.life - age;
          if (alive <= 0) return;
          const dist = sp.speed * age * maxD;
          const x = cx + Math.cos(sp.angle) * dist;
          const y = cy + Math.sin(sp.angle) * dist;
          // Gravity droop
          const droop = age * age * maxD * 0.18;
          const r = Math.max(0.3, sp.size * (1 - age * 0.7));
          ctx.globalAlpha = alive * 0.88;
          ctx.fillStyle = sp.col;
          ctx.beginPath(); ctx.arc(x, y + droop, r, 0, Math.PI * 2); ctx.fill();
          // Trailing glow
          ctx.globalAlpha = alive * 0.22;
          ctx.beginPath(); ctx.arc(x, y + droop, r * 2.8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      });

    } else {
      // ── spring → cassette ──

      // Phase 1 (0–350ms): gold/red particles converge to center
      if (elapsed < 350) {
        const prog = elapsed / 350;
        const D = Math.min(W, H);
        convSparks.forEach(sp => {
          const dist = sp.dist * D * (1 - prog);
          const x = W / 2 + Math.cos(sp.angle) * dist;
          const y = H / 2 + Math.sin(sp.angle) * dist;
          ctx.fillStyle = sp.col;
          ctx.globalAlpha = (1 - prog) * 0.8;
          ctx.beginPath(); ctx.arc(x, y, sp.size * (1 - prog * 0.5), 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Phase 2 (300–450ms): red flash (朱红 instead of white — spring feeling)
      if (elapsed >= 300 && elapsed < 450) {
        const fl = elapsed < 380 ? (elapsed - 300) / 80 : 1 - (elapsed - 380) / 70;
        ctx.fillStyle = `rgba(204,32,32,${Math.max(0, fl) * 0.72})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, fl) * 0.20})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Phase 3 (450–1100ms): VHS tape scan lines top→bottom
      if (elapsed >= 450 && elapsed < 1100) {
        const prog = (elapsed - 450) / 650;
        for (let i = 0; i < 12; i++) {
          const y = prog * H - (i / 12) * H * prog * 0.45;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(232,100,10,0.16)' : 'rgba(0,168,150,0.10)';
          ctx.fillRect(0, y, W, H / 12 * 0.55);
        }
        // Subtle phosphor shimmer
        ctx.fillStyle = `rgba(255,184,48,${(1 - prog) * 0.04})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Phase 4 (950–1200ms): data stream chars drip from top (rewind feel)
      if (elapsed >= 950 && elapsed < 1200) {
        const prog = (elapsed - 950) / 250;
        ctx.fillStyle = `rgba(232,100,10,${(1 - prog) * 0.55})`;
        ctx.font = '11px "Share Tech Mono",monospace';
        const chars = '01REWIND▶◀TAPE';
        for (let col = 0; col < Math.floor(W / 22); col++) {
          if (Math.random() > 0.45) continue;
          const ch = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(ch, col * 22, prog * H * 0.35 + Math.random() * 30);
        }
      }
    }

    // ── CSS opacity fade-out (no black fill rectangle) ──
    if (elapsed >= FADE_START && !cv._fadingOut) {
      cv._fadingOut = true;
      cv.style.transition = `opacity ${FADE_DUR}ms ease-out`;
      cv.style.opacity = '0';
    }

    if (elapsed < TOTAL) {
      _transRaf = requestAnimationFrame(frame);
    } else {
      setTimeout(() => {
        cv.style.display = 'none';
        cv.style.transition = '';
        cv._fadingOut = false;
        ctx.clearRect(0, 0, W, H);
        _transRaf = null;
        if (onDone) onDone();
      }, FADE_DUR + 20);
    }
  }

  if (_transRaf) cancelAnimationFrame(_transRaf);
  cv._fadingOut = false;
  _transRaf = requestAnimationFrame(frame);
}

// ── Theme card hover mini-preview ──
function previewTheme(themeId) {
  const th = THEMES[themeId];
  if (!th) return;
  const card = document.querySelector(`.cfg-theme-card[data-theme-id="${themeId}"]`);
  if (!card) return;
  const cv = card.querySelector('.cfg-theme-preview');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = 80, H = 44;
  ctx.clearRect(0, 0, W, H);

  const C = th.colors;
  const col = C.primary + '4D';  // ~30% opacity
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (themeId === 'cassette') {
    // ── Cassette tape icon ──
    const cx = W / 2, cy = H / 2;
    // Outer shell (rounded rect)
    const sw = 56, sh = 30, r = 4;
    ctx.beginPath();
    ctx.moveTo(cx - sw/2 + r, cy - sh/2);
    ctx.lineTo(cx + sw/2 - r, cy - sh/2);
    ctx.arcTo(cx + sw/2, cy - sh/2, cx + sw/2, cy - sh/2 + r, r);
    ctx.lineTo(cx + sw/2, cy + sh/2 - r);
    ctx.arcTo(cx + sw/2, cy + sh/2, cx + sw/2 - r, cy + sh/2, r);
    ctx.lineTo(cx - sw/2 + r, cy + sh/2);
    ctx.arcTo(cx - sw/2, cy + sh/2, cx - sw/2, cy + sh/2 - r, r);
    ctx.lineTo(cx - sw/2, cy - sh/2 + r);
    ctx.arcTo(cx - sw/2, cy - sh/2, cx - sw/2 + r, cy - sh/2, r);
    ctx.closePath();
    ctx.stroke();
    // Left reel
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 2, 2, 0, Math.PI * 2);
    ctx.stroke();
    // Right reel
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 2, 2, 0, Math.PI * 2);
    ctx.stroke();
    // Tape line connecting reels (arc below)
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 2);
    ctx.quadraticCurveTo(cx, cy + 10, cx + 18, cy - 2);
    ctx.stroke();
    // Bottom tape window (narrow rect)
    ctx.beginPath();
    ctx.rect(cx - 18, cy + sh/2 - 6, 36, 3);
    ctx.stroke();
  } else if (themeId === 'spring') {
    // ── Lantern icon ──
    const lx = W / 2, ly = H / 2;
    // Lantern body — curved outline using bezier
    const bw = 10, bh = 14;
    ctx.beginPath();
    // Left curve
    ctx.moveTo(lx, ly - bh/2);
    ctx.bezierCurveTo(lx - bw, ly - bh/3, lx - bw, ly + bh/3, lx, ly + bh/2);
    ctx.stroke();
    ctx.beginPath();
    // Right curve
    ctx.moveTo(lx, ly - bh/2);
    ctx.bezierCurveTo(lx + bw, ly - bh/3, lx + bw, ly + bh/3, lx, ly + bh/2);
    ctx.stroke();
    // Horizontal ribs
    ctx.beginPath();
    ctx.moveTo(lx - bw + 1, ly);
    ctx.lineTo(lx + bw - 1, ly);
    ctx.stroke();
    // Top cap (short horizontal line)
    ctx.beginPath();
    ctx.moveTo(lx - 4, ly - bh/2);
    ctx.lineTo(lx + 4, ly - bh/2);
    ctx.stroke();
    // Hook / hanging ring
    ctx.beginPath();
    ctx.arc(lx, ly - bh/2 - 3, 2.5, Math.PI, 0);
    ctx.stroke();
    // Bottom cap
    ctx.beginPath();
    ctx.moveTo(lx - 3, ly + bh/2);
    ctx.lineTo(lx + 3, ly + bh/2);
    ctx.stroke();
    // Tassel — center line + two short side lines
    ctx.beginPath();
    ctx.moveTo(lx, ly + bh/2);
    ctx.lineTo(lx, ly + bh/2 + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - 2, ly + bh/2 + 1);
    ctx.lineTo(lx - 3, ly + bh/2 + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx + 2, ly + bh/2 + 1);
    ctx.lineTo(lx + 3, ly + bh/2 + 5);
    ctx.stroke();
  }
}

function switchTheme(newId) {
  if (newId === getTheme().id) return;
  playThemeTransition(getTheme().id, newId, null);
}


// ═══ GAME OVER ═══
// ═══ DEATH TRANSITION ═══
function deathTransition() {
  if(deathTime) return;  // already dying
  player.alive = false;
  deathTime = performance.now();
  Audio.stopAllBgm();
  Audio.sfxGameOver();

  // Schedule game over screen after animation completes
  setTimeout(() => {
    gameActive = false;
    _showGameOverScreen();
  }, 1600);
}

// ═══ HIDE BOTH GAME OVER SCREENS ═══
function hideGameOverScreens() {
  const goEl = document.getElementById('goScreen');
  const spGoEl = document.getElementById('spGoScreen');
  goEl.classList.remove('show');
  goEl.style.opacity = '';
  goEl.style.transition = '';
  spGoEl.classList.remove('show');
  spGoEl.style.opacity = '';
  spGoEl.style.transition = '';
}

// ═══ GAME OVER i18n ═══
let goLang = 'en';  // 'en' or 'cn'
const GO_I18N = {
  go_status:    { en:'SIGNAL RECOVERED · MISSION LOG',  cn:'信号恢复 · 任务日志' },
  go_newrec:    { en:'★ NEW RECORD',                    cn:'★ 新纪录' },
  go_norec:     { en:'MISSION FAILED',                  cn:'任务失败' },
  go_scorelbl:  { en:'FINAL SCORE',                     cn:'最终得分' },
  go_best:      { en:'BEST:',                           cn:'最高:' },
  go_level:     { en:'LEVEL REACHED',                   cn:'到达等级' },
  go_time:      { en:'SURVIVAL TIME',                   cn:'生存时间' },
  go_length:    { en:'FINAL LENGTH',                    cn:'最终长度' },
  go_combo:     { en:'MAX COMBO',                       cn:'最大连击' },
  go_logheader: { en:'COMBAT LOG · DETAILED REPORT',    cn:'战斗日志 · 详细报告' },
  go_kills:     { en:'ENEMY.KILLS',                     cn:'击杀.敌蛇' },
  go_laser:     { en:'LASER.HITS',                      cn:'激光.命中' },
  go_bullet:    { en:'BULLET.DMG',                      cn:'子弹.伤害' },
  go_statusk:   { en:'STATUS',                          cn:'状态' },
  go_statusv:   { en:'TERMINATED',                      cn:'已终止' },
  go_logend:    { en:'LOG.END',                         cn:'日志.结束' },
  go_quick:     { en:'QUICK RESTART',                   cn:'快速重开' },
  go_home:      { en:'← RETURN HOME',                   cn:'← 返回主界面' },
  go_redeploy:  { en:'▶ REDEPLOY',                      cn:'▶ 重新部署' },
};

function applyGoLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if(GO_I18N[key]) el.textContent = GO_I18N[key][goLang];
  });
  const btn = document.getElementById('goLangBtn');
  if(btn) btn.textContent = goLang === 'en' ? 'EN → 中文' : '中文 → EN';
}

function toggleGoLang() {
  goLang = goLang === 'en' ? 'cn' : 'en';
  applyGoLang();
}

// ═══ GAME OVER SCREEN helper ═══
function _populateGameOverData(ids, isNew, hiScore) {
  document.getElementById(ids.score).textContent   = score;
  document.getElementById(ids.hiScore).textContent = hiScore;
  document.getElementById(ids.level).textContent   = level;
  document.getElementById(ids.time).textContent    = Math.floor(gameTime/1000)+'s';
  document.getElementById(ids.len).textContent     = player.body.length;
  document.getElementById(ids.combo).textContent   = ids.comboPrefix ? ids.comboPrefix+maxCombo : maxCombo;
  document.getElementById(ids.kills).textContent   = killCount;
  document.getElementById(ids.lasHits).textContent = laserHits;
  const nr = document.getElementById(ids.newRecord);
  if (nr) nr.style.display = isNew ? 'block' : 'none';
}

function _showGameOverScreen() {
  const themeId = getTheme().id;
  const isSpring = themeId === 'spring';

  // Cancel game loop to prevent render() from interfering with game over screen
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }

  const prevHi = parseInt(localStorage.getItem('hexsnake_hi')||'0');
  const isNew  = score > prevHi;
  if(isNew) localStorage.setItem('hexsnake_hi', score);
  const hiScore = isNew ? score : prevHi;

  if (isSpring) {
    // Spring Festival scroll theme
    _populateGameOverData({
      score:'spGoScore', hiScore:'spGoHiScore', level:'spGoLevel',
      time:'spGoTime', len:'spGoLen', combo:'spGoCombo', comboPrefix:'×',
      kills:'spGoKills', lasHits:'spGoLasHits', newRecord:'spGoNewRecord'
    }, isNew, hiScore);

    const spGoScreen = document.getElementById('spGoScreen');
    spGoScreen.style.opacity = '1';
    spGoScreen.classList.add('show');

    // Simple fade in animation for spring theme
    setTimeout(() => {
      spGoScreen.style.transition = 'opacity 0.5s ease';
      spGoScreen.style.opacity = '1';
    }, 50);

  } else {
    // Cassette futurism CRT theme (default)
    _populateGameOverData({
      score:'goScore', hiScore:'goHiScore', level:'goLevel',
      time:'goTime', len:'goLen', combo:'goCombo',
      kills:'goKills', lasHits:'goLasHits', newRecord:'goNewRecord'
    }, isNew, hiScore);

    // Cassette-specific elements
    if(isNew) document.getElementById('goScore').classList.add('is-record');
    else document.getElementById('goScore').classList.remove('is-record');
    document.getElementById('goTimeTag').textContent =
      goLang === 'cn'
        ? '生存 '+Math.floor(gameTime/1000)+'s · LV.'+level
        : 'SURVIVED '+Math.floor(gameTime/1000)+'s · LV.'+level;
    document.getElementById('goBulletHits').textContent =
      bulletHits > 0 ? bulletHits+' HIT' : '0 HIT ✓';
    document.getElementById('goNoRecord').style.display = isNew ? 'none' : 'block';

    // Apply current language
    applyGoLang();

    // Reset animation states
    const bootline = document.getElementById('goBootline');
    const crt = document.getElementById('goCrt');
    const reveals = document.querySelectorAll('#goScreen .go-reveal');
    bootline.className = 'go-bootline';
    crt.classList.remove('visible');
    reveals.forEach(el => el.classList.remove('shown'));

    // Show screen (black initially)
    const goScreen = document.getElementById('goScreen');
    goScreen.style.opacity = '1';
    goScreen.classList.add('show');

    // Phase 1: CRT boot line (horizontal line appears)
    requestAnimationFrame(() => {
      bootline.classList.add('boot-1');

      // Phase 2: Line expands vertically (after 300ms)
      setTimeout(() => {
        bootline.classList.add('boot-2');
      }, 300);

      // Phase 3: Content becomes visible (after expansion)
      setTimeout(() => {
        crt.classList.add('visible');
        initGoBg();
      }, 650);

      // Phase 4: Stagger reveal each element
      setTimeout(() => {
        const sorted = Array.from(reveals);
        sorted.forEach((el, i) => {
          setTimeout(() => el.classList.add('shown'), i * 120);
        });
      }, 750);
    });
  }

  // Reset deathTime immediately since we cancelled the game loop
  deathTime = 0;
}


// ═══ HUD ═══
function updateHUD() {
  document.getElementById('hScore').textContent=score;
  document.getElementById('hLevel').textContent=level;
  document.getElementById('hLen').textContent=player.body.length;
  document.getElementById('hTime').textContent=Math.floor(gameTime/1000)+'s';
  document.getElementById('hSpd').textContent='×'+player.speedMult.toFixed(2);

  // Combo display
  const cs=document.getElementById('hComboSeg');
  const cv=document.getElementById('hCombo');
  if(combo>=2){
    cs.style.opacity='1';
    cv.textContent='×'+comboMult.toFixed(1);
    cv.style.color=combo>=4?'#FF3300':combo>=3?'#E8640A':'#F5920A';
  } else {
    cs.style.opacity='0.3';
    cv.textContent='×1.0';
    cv.style.color='#888882';
  }
  const xpPct=Math.min(100,Math.round(xp/xpNeeded*100));
  document.getElementById('xpFill').style.width=xpPct+'%';
  document.getElementById('hXP').textContent=xp+'/'+xpNeeded;

  const cdMs=LASER_CD_BASE*player.upg.laserCD;
  const cdPct=player.lCD<=0?100:Math.max(0,100-(player.lCD/cdMs*100));
  document.getElementById('lasFill').style.width=cdPct+'%';

  const eb=document.getElementById('effectBar');
  eb.innerHTML='';
  player.effects.forEach(ef=>{
    const t=document.createElement('div');
    t.className='effectTag '+(ef.type==='up'?'tagUp':'tagDown');
    const suf=ef.stacks>1?` ×${ef.stacks}`:'';
    t.textContent=(ef.type==='up'?'▲加速':'▼减速')+suf+' '+Math.ceil(ef.life/1000)+'s';
    eb.appendChild(t);
  });
}


// ═══ SETTINGS PANEL ═══
function openSettings() {
  const screen = document.getElementById('cfgScreen');
  if (!screen) return;
  // Init slider values from current Audio state
  const bgmPct = Math.round(Audio.getBgmVolume() * 100);
  const bgmEl = document.getElementById('cfgBgmSlider');
  bgmEl.value = bgmPct;
  bgmEl.style.setProperty('--val', bgmPct + '%');
  document.getElementById('cfgBgmPct').textContent = bgmPct + '%';

  const sfxPct = Math.round(Audio.getSfxVolume() * 100);
  const sfxEl = document.getElementById('cfgSfxSlider');
  sfxEl.value = sfxPct;
  sfxEl.style.setProperty('--val', sfxPct + '%');
  document.getElementById('cfgSfxPct').textContent = sfxPct + '%';

  // Init difficulty card active state
  document.querySelectorAll('.cfg-diff-card').forEach(card => {
    card.classList.toggle('active', card.dataset.diff === difficulty);
  });

  screen.classList.add('show');
  // Initialize theme card previews
  previewTheme('cassette');
  previewTheme('spring');
}

function closeSettings() {
  const screen = document.getElementById('cfgScreen');
  if (screen) screen.classList.remove('show');
}

function switchCfgTab(tab) {
  document.getElementById('cfgTabTheme').classList.toggle('active', tab === 'theme');
  document.getElementById('cfgTabVol').classList.toggle('active', tab === 'volume');
  document.getElementById('cfgTabDiff').classList.toggle('active', tab === 'difficulty');
  document.getElementById('cfgPaneTheme').style.display = tab === 'theme' ? 'block' : 'none';
  document.getElementById('cfgPaneVolume').style.display = tab === 'volume' ? 'block' : 'none';
  document.getElementById('cfgPaneDifficulty').style.display = tab === 'difficulty' ? 'block' : 'none';
}

function onBgmSlider(el) {
  const pct = el.value;
  el.style.setProperty('--val', pct + '%');
  document.getElementById('cfgBgmPct').textContent = pct + '%';
  Audio.setBgmVolume(pct / 100);
}

function onSfxSlider(el) {
  const pct = el.value;
  el.style.setProperty('--val', pct + '%');
  document.getElementById('cfgSfxPct').textContent = pct + '%';
  Audio.setSfxVolume(pct / 100);
}

function toggleCfgMem() {
  const toggle = document.getElementById('cfgMemToggle');
  if (toggle) toggle.classList.toggle('on');
}

// ═══ DIFFICULTY SELECT ═══
function selectDifficulty(id) {
  // Update global state
  difficulty = id;

  // Update active state on cards
  document.querySelectorAll('.cfg-diff-card').forEach(card => {
    card.classList.toggle('active', card.dataset.diff === id);
  });

  // Optional: Save to localStorage
  try {
    localStorage.setItem('hexsnake_difficulty', id);
  } catch(e) {}
}

// ═══ DIFFICULTY DETAIL PANEL ═══
const DIFFICULTY_DATA = {
  easy: {
    initial: 0, spawn: '60s', growth: '60s', max: 3,
    bulletCD: '10s', speed: '400ms', xp: '+0%', cap: 'Lv.5'
  },
  normal: {
    initial: 1, spawn: '40s', growth: '30s', max: 5,
    bulletCD: '8s', speed: '320ms', xp: '+0%', cap: 'Lv.8'
  },
  hard: {
    initial: 1, spawn: '25s', growth: '20s', max: 8,
    bulletCD: '6s', speed: '260ms', xp: '+25%', cap: 'Lv.10'
  },
  hell: {
    initial: 2, spawn: '15s', growth: '15s', max: 12,
    bulletCD: '4s', speed: '200ms', xp: '+50%', cap: 'Lv.15'
  },
  nightmare: {
    locked: true
  }
};

let currentDetailDiff = null;
let hideDetailTimer = null;

function showDiffDetail(id) {
  // 取消待执行的隐藏
  if (hideDetailTimer) { clearTimeout(hideDetailTimer); hideDetailTimer = null; }

  const panel = document.getElementById('diffDetailPanel');
  if (!panel) return;

  // 如果已经是同一个难度，不重复处理
  if (currentDetailDiff === id) return;

  // 如果已有显示的卡片，先滑出
  if (currentDetailDiff !== null) {
    panel.classList.remove('show');

    // 等待滑出动画完成后再更新数据并滑入
    setTimeout(() => {
      updateDetailContent(id, panel);
      panel.classList.add('show');
      currentDetailDiff = id;
    }, 500); // 与 CSS transition 时间一致
    return;
  }

  // 首次显示
  updateDetailContent(id, panel);
  panel.classList.add('show');
  currentDetailDiff = id;
}

function hideDiffDetail() {
  if (hideDetailTimer) clearTimeout(hideDetailTimer);
  hideDetailTimer = setTimeout(() => {
    const panel = document.getElementById('diffDetailPanel');
    if (panel) panel.classList.remove('show');
    currentDetailDiff = null;
    hideDetailTimer = null;
  }, 1000);
}

// ── Radar chart: auto-computed from DIFFICULTY_DATA ──
const DIFF_RADAR_LABELS = ['数量','速度','子弹','成长','上限'];
const DIFF_COLORS = {
  easy:'#4CAF50', normal:'#2196F3', hard:'#FF9800', hell:'#9C27B0', nightmare:'#5A5A5A'
};
// Max reference values (hell difficulty) for normalization
const RADAR_MAX = { initial:2, speed:400, bullet:10, growth:60, cap:15 };

function getDiffRadarValues(id) {
  const d = DIFFICULTY_DATA[id];
  if (!d || d.locked) return null;
  return [
    Math.max(0.1, d.initial / RADAR_MAX.initial),
    Math.max(0.1, 1 - parseFloat(d.speed) / RADAR_MAX.speed),
    Math.max(0.1, 1 - parseFloat(d.bulletCD) / RADAR_MAX.bullet),
    Math.max(0.1, 1 - parseFloat(d.growth) / RADAR_MAX.growth),
    Math.max(0.1, parseInt(d.cap.replace('Lv.','')) / RADAR_MAX.cap)
  ];
}

// ── Radar animation state ──
let radarCurrentVals = null;
let radarFromVals = null;
let radarTargetVals = null;
let radarTargetColor = '#5A5A5A';
let radarTargetId = 'easy';
let radarAnimStart = 0;
let radarAnimId = null;
const RADAR_ANIM_MS = 300;

function drawDiffRadar(diffId) {
  const newVals = getDiffRadarValues(diffId);
  radarTargetVals = newVals;
  radarTargetColor = DIFF_COLORS[diffId] || '#5A5A5A';
  radarTargetId = diffId;

  if (!radarCurrentVals) {
    radarCurrentVals = newVals ? [...newVals] : null;
    renderRadar();
    return;
  }

  radarFromVals = [...radarCurrentVals];
  radarAnimStart = performance.now();
  if (radarAnimId) cancelAnimationFrame(radarAnimId);
  animateRadar();
}

function animateRadar() {
  const elapsed = performance.now() - radarAnimStart;
  const t = Math.min(1, elapsed / RADAR_ANIM_MS);
  const ease = 1 - (1-t)*(1-t); // ease-out

  if (radarFromVals && radarTargetVals) {
    if (!radarCurrentVals) radarCurrentVals = [0,0,0,0,0];
    for (let i=0;i<5;i++)
      radarCurrentVals[i] = radarFromVals[i] + (radarTargetVals[i] - radarFromVals[i]) * ease;
  } else {
    radarCurrentVals = radarTargetVals ? [...radarTargetVals] : null;
  }

  renderRadar();

  if (t < 1) {
    radarAnimId = requestAnimationFrame(animateRadar);
  } else {
    radarCurrentVals = radarTargetVals ? [...radarTargetVals] : null;
    radarAnimId = null;
  }
}

function renderRadar() {
  const cvs = document.getElementById('diffRadarCanvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  const cx = W/2, cy = H/2, R = 90;
  const N = 5;
  ctx.clearRect(0,0,W,H);

  const angles = [];
  for (let i=0;i<N;i++) angles.push(-Math.PI/2 + i*2*Math.PI/N);

  // 3-layer concentric pentagon grid
  ctx.strokeStyle = 'rgba(232,100,10,0.15)';
  ctx.lineWidth = 0.8;
  for (let layer=1;layer<=3;layer++){
    const r = R * layer/3;
    ctx.beginPath();
    for (let i=0;i<N;i++){
      const x = cx + r*Math.cos(angles[i]);
      const y = cy + r*Math.sin(angles[i]);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.stroke();
  }

  // Radial axis lines
  for (let i=0;i<N;i++){
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+R*Math.cos(angles[i]), cy+R*Math.sin(angles[i]));
    ctx.stroke();
  }

  // Data polygon
  const color = radarTargetColor;
  const vals = radarCurrentVals;
  if (vals) {
    ctx.beginPath();
    for (let i=0;i<N;i++){
      const v = vals[i] * R;
      const x = cx + v*Math.cos(angles[i]);
      const y = cy + v*Math.sin(angles[i]);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath();
    const hr = parseInt(color.slice(1,3),16);
    const hg = parseInt(color.slice(3,5),16);
    const hb = parseInt(color.slice(5,7),16);
    ctx.fillStyle = `rgba(${hr},${hg},${hb},0.15)`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    for (let i=0;i<N;i++){
      const v = vals[i] * R;
      ctx.beginPath();
      ctx.arc(cx+v*Math.cos(angles[i]), cy+v*Math.sin(angles[i]), 2.5, 0, Math.PI*2);
      ctx.fill();
    }
  } else {
    // Nightmare: dashed outline
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = '#5A5A5A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<N;i++){
      const v = 0.5*R;
      i===0 ? ctx.moveTo(cx+v*Math.cos(angles[i]),cy+v*Math.sin(angles[i]))
             : ctx.lineTo(cx+v*Math.cos(angles[i]),cy+v*Math.sin(angles[i]));
    }
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5A5A5A';
    ctx.font = '14px "Share Tech Mono",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('???', cx, cy);
  }

  // Labels
  ctx.font = '10px "Share Tech Mono",monospace';
  ctx.fillStyle = '#4A5A68';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i=0;i<N;i++){
    const lx = cx + (R+18)*Math.cos(angles[i]);
    const ly = cy + (R+18)*Math.sin(angles[i]);
    ctx.fillText(DIFF_RADAR_LABELS[i], lx, ly);
  }
}

function triggerFlicker(el) {
  el.classList.remove('flickering');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('flickering');
  el.addEventListener('animationend', () => el.classList.remove('flickering'), {once:true});
}

function updateDetailContent(id, panel) {
  if (id === 'nightmare') {
    panel.setAttribute('data-diff', 'nightmare');
    ['initial', 'spawn', 'growth', 'max', 'bullet', 'speed', 'xp', 'cap'].forEach(key => {
      const el = document.getElementById(`detail-${key}`);
      if (el) { el.textContent = '???'; triggerFlicker(el); }
    });
    drawDiffRadar('nightmare');
    return;
  }

  const data = DIFFICULTY_DATA[id];
  if (!data) return;

  panel.setAttribute('data-diff', id);

  const mapping = {
    'initial': data.initial,
    'spawn': data.spawn,
    'growth': data.growth,
    'max': data.max,
    'bullet': data.bulletCD,
    'speed': data.speed,
    'xp': data.xp,
    'cap': data.cap
  };

  for (const [key, value] of Object.entries(mapping)) {
    const el = document.getElementById(`detail-${key}`);
    if (el) { el.textContent = value; triggerFlicker(el); }
  }

  drawDiffRadar(id);
}

// ═══ FLASH ═══
let flashTimer=null;
function flash(msg) {
  const el=document.getElementById('flashMsg');
  el.textContent=msg; el.style.opacity='1';
  if(flashTimer) clearTimeout(flashTimer);
  flashTimer=setTimeout(()=>{el.style.opacity='0';},1800);
}

