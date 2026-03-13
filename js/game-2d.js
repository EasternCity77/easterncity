'use strict';

// ═══ game-2d.js ═══
// 2D mode: init, start, loop, tick, food, enemies, bullets, laser, input, render

let foodParticles = [];
let missileShakeTime = 0;
let missileShakeIntensity = 0;

// ── Utilities ──
// Convert grid coordinates to pixel coordinates (used by renderers and effects)
// Returns [px, py] — the center pixel of grid cell (gx, gy)
function gridToPixel(gx, gy, cS) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const isPortrait = typeof isMobile !== 'undefined' && isMobile && H > W;
  const CTRL_H = isPortrait ? 170 : 0;
  const ox = Math.floor((W - gCols * cS) / 2);
  const oy = HUD_H + Math.floor((H - HUD_H - CTRL_H - gRows * cS) / 2);
  return [ox + gx * cS + cS / 2, oy + gy * cS + cS / 2];
}

// ── Food style renderers (keyed by theme.foodStyle) ──
// All renderers receive: ctx, px, py, cS, T — where px/py are pixel coordinates
const FOOD_RENDERERS = {
  diamond(ctx, px, py, cS, T) {
    const t2=(Date.now()%900)/900;
    const pulse=0.88+0.12*Math.sin(t2*Math.PI*2);
    const r=cS*0.30*pulse;
    ctx.save();
    ctx.translate(px,py);ctx.rotate(Math.PI/4);
    ctx.fillStyle=T.foodFill;
    ctx.fillRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
    ctx.strokeStyle=T.foodBorder; ctx.lineWidth=1.5;
    ctx.strokeRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
    ctx.restore();
    ctx.fillStyle=T.foodDot;
    ctx.beginPath();ctx.arc(px,py,r*0.22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(${T.boardAccentRgb},0.08)`;
    ctx.beginPath();ctx.arc(px,py,r*2,0,Math.PI*2);ctx.fill();
  },
  firework(ctx, px, py, cS, T) {
    const period=1500;
    const t=(Date.now()%period)/period;
    const r=cS*0.30;
    // 外围光晕 - 随爆炸扩散
    const glowR=r*(1.5+t*1.2);
    const glowAlpha=0.12*(1-t*0.7);
    ctx.fillStyle=`rgba(${T.boardAccentRgb},${glowAlpha.toFixed(2)})`;
    ctx.beginPath();ctx.arc(px,py,glowR,0,Math.PI*2);ctx.fill();
    // 每个周期角度略偏移，避免完全重复
    const seed=Math.floor(Date.now()/period);
    const baseAngle=(seed*137.5%360)*Math.PI/180;
    const cols=[T.primary||'#CC2020',T.secondary||'#D4A820'];
    const rayCount=12;
    ctx.lineCap='round';
    for(let i=0;i<rayCount;i++){
      const angle=baseAngle+i*Math.PI*2/rayCount;
      const rayLen=r*1.8*t;
      const alpha=t<0.6?1.0:1.0-(t-0.6)/0.4;
      ctx.strokeStyle=cols[i%2];
      ctx.lineWidth=4;
      ctx.globalAlpha=alpha*0.9;
      ctx.beginPath();
      ctx.moveTo(px+Math.cos(angle)*r*0.15,py+Math.sin(angle)*r*0.15);
      ctx.lineTo(px+Math.cos(angle)*rayLen,py+Math.sin(angle)*rayLen);
      ctx.stroke();
      if(i%2===0){
        ctx.fillStyle='#FFF8E8';
        ctx.globalAlpha=alpha*0.85;
        ctx.beginPath();
        ctx.arc(px+Math.cos(angle)*rayLen,py+Math.sin(angle)*rayLen,2.5,0,Math.PI*2);
        ctx.fill();
      }
    }
    // 中心亮点 - 爆炸初期明亮，后期消散
    ctx.globalAlpha=t<0.3?1.0:Math.max(0,1.0-(t-0.3)*1.5);
    ctx.fillStyle=T.foodDot;
    ctx.beginPath();ctx.arc(px,py,r*0.32,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1.0;
    ctx.lineCap='butt';
  },
};

// ── Food eat effects (keyed by theme.foodStyle) ──
// All effects receive: gx, gy — grid coordinates, and compute pixel coordinates internally
const FOOD_EAT_EFFECTS = {
  firework(gx, gy) {
    const [px, py] = gridToPixel(gx, gy, cS);
    const BURST_COLS = ['#CC2020', '#D4A820', '#FFF8E8', '#FF6040'];
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 2 * i / 12;
      const spd = 1.5 + Math.random() * 2;
      foodParticles.push({
        x: px, y: py,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        color: BURST_COLS[i % 4]
      });
    }
  },
};

// ═══ INIT ═══


function resizeGame() {
  const _rawDpr = window.devicePixelRatio||1;
  const dpr = Math.min(_rawDpr, window.perfLevel==='low'?1.5:window.perfLevel==='medium'?2:_rawDpr);
  const W=window.innerWidth, H=window.innerHeight;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  canvas.width=W*dpr; canvas.height=H*dpr;
  ctx.scale(dpr,dpr);
  recalcCell();
}

function recalcCell() {
  const W = window.innerWidth;
  const isPortrait = typeof isMobile !== 'undefined' && isMobile && window.innerHeight > W;
  const CTRL_H = isPortrait ? 170 : 0;
  const H = window.innerHeight - HUD_H - CTRL_H;
  cS = Math.max(8, Math.floor(Math.min(W / gCols, H / gRows)));
}


// ═══ START ═══
function startGame() {
  document.getElementById('startScreen').style.display='none';

  // Hide both game over screens
  const goEl = document.getElementById('goScreen');
  goEl.classList.remove('show');
  goEl.style.opacity = '';
  goEl.style.transition = '';
  const spGoEl = document.getElementById('spGoScreen');
  spGoEl.classList.remove('show');
  spGoEl.style.opacity = '';
  spGoEl.style.transition = '';

  // Stop menu background animation
  if (menuBgRaf) { cancelAnimationFrame(menuBgRaf); menuBgRaf = null; }
  if (typeof menuBgSpringStop === 'function') menuBgSpringStop();
  document.getElementById('evoScreen').classList.remove('show');
  canvas.style.display='block'; // restore after 3D death may have hidden it

  gCols=20; gRows=20; recalcCell(); resizeGame();
  score=0; level=1; xp=0; xpNeeded=5; gameTime=0;
  gamePaused=false; gameActive=true; deathTime=0;

  // Mobile: show touch controls, lock landscape, mark body
  if (typeof showTouchControls === 'function') showTouchControls(true);
  if (typeof lockLandscape === 'function') lockLandscape();
  document.body.classList.add('game-active');
  // Update rotate prompt visibility
  if (window._updateRotatePrompt) window._updateRotatePrompt();

  const mx=Math.floor(gCols/2), my=Math.floor(gRows/2);
  player={
    body:[{x:mx,y:my}], prev:[{x:mx,y:my}],
    dir:{x:1,y:0}, ndir:{x:1,y:0},
    grow:0, lCD:0,
    speedMult:1, speedTarget:1,    effects:[],
    upg:{laserN:1,laserDmg:1,laserCD:1.0,pierce:false,slow:false,spd:0,quickTurn:false,
         ts_dur:0, ts_cd:0, ms_count:0, ms_pierce:false, ms_dmg:0},
    alive:true,
    // Skill state
    timeSlowCD: 0, timeSlowActive: false, timeSlowEnd: 0, timeSlowStart: 0, timeSlowSpeedMult: 1,
    missileCD: 0, missiles: [],
  };
  enemies=[]; bullets=[]; walls=[]; speedItems=[]; xpBalls=[]; laserVis=null; foodParticles=[];
  unlocked=new Set(); selectedEvo=null; enemyAccum=0; enemyTickT=0;
  combo=0; comboMult=1; lastFoodTS=0; maxCombo=0;
  threatLevel=0; lastThreatTS=0; threatNotif=null; lastWallMaintainTS=0;
  killCount=0; bulletHits=0; laserHits=0;
  food = spawnFood();

  // Pre-spawn initial enemies based on difficulty
  for(let i=0;i<diffCfg().initialEnemies;i++){
    let pos=null;
    for(let a=0;a<200;a++){
      const x=Math.floor(Math.random()*gCols),y=Math.floor(Math.random()*gRows);
      const d=Math.abs(x-player.body[0].x)+Math.abs(y-player.body[0].y);
      if(d>=7&&!isWall(x,y)&&!(food&&x===food.x&&y===food.y)){pos={x,y};break;}
    }
    if(pos) enemies.push({body:[{...pos}],prev:[{...pos}],dir:{x:1,y:0},bCD:diffCfg().bulletCD+Math.random()*3000,slowTimer:0,grow:0});
  }

  const now=performance.now();
  lastFrame=now; lastTick=now; lastBulletTick=now; lastSpeedTS=now; lastEnemyTS=now;
  tickT=0;
  if(animId) cancelAnimationFrame(animId);
  animId=requestAnimationFrame(loop);
  Audio.init();
  Audio.resume();
  Audio.stopAllBgm();
  if (getTheme().id === 'spring') Audio.startBgmSpring(); else Audio.startBGM();
  updateHUD();
}


// ═══ LAUNCH TRANSITION (button → game board morph) ═══
// ═══ SHARED LAUNCH OVERLAY TRANSITION ═══
// opts: { expandDur, colorShiftDelay, startDelay, preHook }
function _expandOverlayTransition(btn, startFn, opts) {
  Audio.init();
  Audio.resume();

  const overlay = document.getElementById('launchTransition');
  if (!btn || !overlay) { startFn(); return; }

  const isSpring = getTheme().id === 'spring';
  const overlayColor = isSpring ? '#CC2020' : 'var(--amber)';
  const overlayFadeColor = isSpring ? '#A01818' : '#DEDAD0';

  const rect = btn.getBoundingClientRect();
  if (opts.preHook) opts.preHook();
  btn.style.pointerEvents = 'none';

  overlay.className = '';
  overlay.style.cssText = `
    position:fixed;z-index:999;pointer-events:none;
    left:${rect.left}px;top:${rect.top}px;
    width:${rect.width}px;height:${rect.height}px;
    opacity:1;background:${overlayColor};border-radius:4px;
  `;
  overlay.offsetHeight;

  overlay.style.transition = `all ${opts.expandDur}s cubic-bezier(0.4,0,0.2,1)`;
  overlay.style.left = '0px';
  overlay.style.top = '0px';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.borderRadius = '0';

  setTimeout(() => { overlay.style.background = overlayFadeColor; }, opts.colorShiftDelay);

  setTimeout(() => {
    startFn();
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 0.8s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
        btn.style.pointerEvents = '';
      }, 850);
    });
  }, opts.startDelay);
}

function launchGame() {
  const startFn = gameMode==='3d' ? startGame3D : startGame;
  const isSpring = getTheme().id === 'spring';
  const btn = document.getElementById(isSpring ? 'spLaunchBtn' : 'launchBtn');
  _expandOverlayTransition(btn, startFn, {
    expandDur: 0.7, colorShiftDelay: 350, startDelay: 750
  });
}

// ═══ REDEPLOY TRANSITION ═══
function launchRedeploy(btn) {
  const startFn = gameMode==='3d' ? startGame3D : startGame;
  _expandOverlayTransition(btn, startFn, {
    expandDur: 0.6, colorShiftDelay: 300, startDelay: 650,
    preHook() {
      document.getElementById('goScreen').classList.remove('show');
      document.getElementById('spGoScreen').classList.remove('show');
    }
  });
}

// ═══ RETURN HOME TRANSITION (cinematic: black → white panel slides in → UI reveals) ═══
function launchHome(btn) {
  const overlay = document.getElementById('launchTransition');
  if (!btn || !overlay) { goToHome(); return; }

  btn.style.pointerEvents = 'none';

  const isSpring = getTheme().id === 'spring';
  if (isSpring) {
    // Spring: keep spGoScreen visible as backdrop while scrolls close over it
    document.getElementById('goScreen').classList.remove('show');
    _launchHomeSpring(btn, overlay);
  } else {
    // Cassette: hide both immediately (black fade covers the gap)
    document.getElementById('goScreen').classList.remove('show');
    document.getElementById('spGoScreen').classList.remove('show');
    _launchHomeCassette(btn, overlay);
  }
}

// ── Spring Festival: 卷轴收拢 → 烟花绽放 → 菜单浮现 ──
function _launchHomeSpring(btn, overlay) {
  // Build scroll halves + burst inside overlay
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:all;overflow:hidden;opacity:1;';
  overlay.innerHTML = `
    <div class="sp-trans-scroll top"></div>
    <div class="sp-trans-scroll bot"></div>
    <div class="sp-trans-burst"></div>
  `;

  const scrollTop = overlay.querySelector('.sp-trans-scroll.top');
  const scrollBot = overlay.querySelector('.sp-trans-scroll.bot');
  const burst     = overlay.querySelector('.sp-trans-burst');

  // Force layout then trigger closing
  overlay.offsetHeight;
  scrollTop.classList.add('closing');
  scrollBot.classList.add('closing');

  // ─── Phase 2 (900ms): Scrolls fully closed, switch DOM ───
  setTimeout(() => {
    // Now safe to hide spring game-over screen (scrolls cover it)
    document.getElementById('spGoScreen').classList.remove('show');
    goToHome();

    // Hide spMain until reveal — prevents flash when .revealing is added later
    const spMain = document.getElementById('spMain');
    if (spMain) {
      spMain.classList.remove('revealing');
      spMain.style.opacity = '0';
    }

    // ─── Phase 3: Firework burst + scrolls open ───
    scrollTop.classList.remove('closing');
    scrollTop.classList.add('opening');
    scrollBot.classList.remove('closing');
    scrollBot.classList.add('opening');

    // Trigger burst explosion
    burst.classList.add('explode');

    // Add sparks — two waves
    _addTransSparks(overlay, false);
    setTimeout(() => _addTransSparks(overlay, true), 200);

    // ─── Phase 4 (800ms later): Menu reveal ───
    setTimeout(() => {
      if (spMain) {
        spMain.style.opacity = '1';
        spMain.classList.add('revealing');
      }
    }, 800);

    // ─── Phase 5: Cleanup ───
    setTimeout(() => {
      overlay.innerHTML = '';
      overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
      btn.style.pointerEvents = '';
      if (spMain) {
        spMain.classList.remove('revealing');
        spMain.style.opacity = '';
      }
    }, 2200);
  }, 900);
}

// Generate random sparks for firework burst
function _addTransSparks(container, isSecondWave) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const count = isSecondWave ? 24 : 36;
  const colors = ['#FFE080','#FFD060','#FF6040','#FF8848','#FFCC30'];
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'sp-trans-spark';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = isSecondWave ? (100 + Math.random() * 220) : (200 + Math.random() * 350);
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const dur = isSecondWave ? (0.6 + Math.random() * 0.4) : (0.8 + Math.random() * 0.5);
    const delay = Math.random() * 0.2;
    const sz = isSecondWave ? (4 + Math.random() * 5) : (6 + Math.random() * 8);
    const clr = colors[Math.floor(Math.random() * colors.length)];
    spark.style.cssText = `
      left:${cx}px;top:${cy}px;
      --tx:${tx.toFixed(0)}px;--ty:${ty.toFixed(0)}px;
      --dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;
      --sz:${sz.toFixed(0)}px;--clr:${clr};
    `;
    container.appendChild(spark);
    requestAnimationFrame(() => spark.classList.add('fly'));
  }
}

// ── Cassette Futurism: black fade → panel slides → UI reveals ──
function _launchHomeCassette(btn, overlay) {
  // ─── Phase 1: Fade to black (0.6s) ───
  overlay.style.cssText = `
    position:fixed;z-index:999;pointer-events:none;
    left:0;top:0;width:100vw;height:100vh;
    opacity:0;background:#080604;border-radius:0;
  `;
  overlay.offsetHeight;
  overlay.style.transition = 'opacity 0.6s ease';
  overlay.style.opacity = '1';

  setTimeout(() => {
    // ─── Phase 2: Screen is fully black. Switch to home underneath ───
    goToHome();

    // Prepare cinematic entry states
    const ss = document.getElementById('startScreen');
    const panelW = document.getElementById('panelWhite');
    const panelD = document.getElementById('panelDark');
    const topB   = document.getElementById('topBar');
    const botB   = document.getElementById('bottomBar');
    const reveals = document.querySelectorAll('[data-reveal]');

    // Activate cinematic mode
    if(ss) ss.classList.add('cinematic-entry');

    // Hide everything initially
    if(panelW) { panelW.classList.add('home-slide'); panelW.classList.remove('home-in'); }
    if(panelD) { panelD.classList.add('home-dark'); panelD.classList.remove('home-in'); }
    if(topB)   { topB.classList.add('home-bar'); topB.classList.remove('home-in'); }
    if(botB)   { botB.classList.add('home-bar'); botB.classList.remove('home-in'); }
    reveals.forEach(el => el.classList.remove('revealed'));

    // ─── Phase 3: Fade out black overlay (0.5s) ───
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';

        // ─── Phase 4: White panel slides in from left (starts 200ms into fade) ───
        setTimeout(() => {
          if(panelW) panelW.classList.add('home-in');
          // Top bar appears
          if(topB) { topB.classList.add('home-in'); }
        }, 200);

        // ─── Phase 5: Dark panel fades in (after white panel mostly in) ───
        setTimeout(() => {
          if(panelD) panelD.classList.add('home-in');
          if(botB) { botB.classList.add('home-in'); }
        }, 500);

        // ─── Phase 6: UI elements reveal with stagger ───
        setTimeout(() => {
          // Sort by data-reveal order
          const sorted = Array.from(reveals).sort((a,b) =>
            parseInt(a.dataset.reveal) - parseInt(b.dataset.reveal)
          );
          sorted.forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 100);
          });
        }, 550);

        // ─── Phase 7: Cleanup after all animations done ───
        setTimeout(() => {
          overlay.style.cssText = 'position:fixed;z-index:999;pointer-events:none;opacity:0;';
          btn.style.pointerEvents = '';
          // Remove animation classes so normal display works
          if(ss)     ss.classList.remove('cinematic-entry');
          if(panelW) { panelW.classList.remove('home-slide','home-in'); }
          if(panelD) { panelD.classList.remove('home-dark','home-in'); }
          if(topB)   { topB.classList.remove('home-bar','home-in'); }
          if(botB)   { botB.classList.remove('home-bar','home-in'); }
          reveals.forEach(el => el.classList.remove('revealed'));
        }, 2200);
      });
    });
  }, 650);
}


// ═══ LOOP ═══
function loop(ts) {
  if(!gameActive && !deathTime){return;}
  animId=requestAnimationFrame(loop);
  const dt=Math.min(ts-lastFrame, 80);
  lastFrame=ts;
  // Mobile FPS monitoring for adaptive performance
  if(window._touchFpsCheck) window._touchFpsCheck(ts);

  // ── Time Stop Handling ──
  if(gameFrozen) {
    if(ts >= freezeEnd) {
      gameFrozen = false;
      if(freezeCompleteCallback) freezeCompleteCallback();
      else processQueuedSkill();
    }
    render();  // Continue rendering during freeze for visual effects
    return;
  }

  // ── Time Slow End Check ── (only check when not frozen to avoid infinite loop)
  if(player.timeSlowActive && ts >= player.timeSlowEnd) {
    endTimeSlow();  // timeSlowActive 在冻结回调中才关闭，冻结期间保持蓝色叠加层
    render();
    return;
  }

  if(!gamePaused && player.alive) {
    gameTime+=dt;

    // Time Slow speed modifier
    if(player.timeSlowActive) {
      player.speedMult = player.speedTarget * player.timeSlowSpeedMult;
    }

    const ti=tickInterval();
    if(ts-lastTick>=ti){gameTick(); lastTick=ts;}
    tickT=Math.min(1,(ts-lastTick)/Math.max(1,tickInterval()));

    // Enemy movement with time slow modifier
    const enemyDt = player.timeSlowActive ? dt * TIME_SLOW_ENEMY_MULT : dt;
    enemyAccum += enemyDt;
    if(enemyAccum>=diffCfg().enemyTick){
      enemies.forEach(e=>{ e.prev=e.body.map(s=>({...s})); });
      updateEnemies();
      enemyAccum-=diffCfg().enemyTick;
    }
    enemyTickT=Math.min(1,enemyAccum/diffCfg().enemyTick);

    // Bullet movement with time slow modifier
    const bulletInterval = Math.max(60, BULLET_TICK - threatLevel*8);
    if(player.timeSlowActive) {
      const bulletDt = BULLET_TICK * TIME_SLOW_BULLET_MULT;
      if(ts - lastBulletTick >= bulletDt) {
        updateBullets(); lastBulletTick = ts;
      }
    } else {
      if(ts-lastBulletTick>=bulletInterval){updateBullets(); lastBulletTick=ts;}
    }

    if(ts-lastSpeedTS>=SPEED_ITEM_CD){trySpawnSpeed(); lastSpeedTS=ts;}
    trySpawnEnemy(ts);
    checkThreatEscalation();
    maintainWalls();
    updateTimers(dt);
    // Skip lerpSpeed during time slow to preserve the speed modifier
    if(!player.timeSlowActive) lerpSpeed(dt);
    if(player.lCD>0) player.lCD-=dt;
    if(player.timeSlowCD>0) player.timeSlowCD-=dt;
    if(player.missileCD>0) player.missileCD-=dt;

    // Update missiles
    if(player.missiles.length > 0) updateMissiles(dt);

    updateHUD();
  }
  render();
}

function tickInterval() {
  let t=BASE_TICK/player.speedMult;
  if(player.upg.spd>=1) t/=1.2;
  if(player.upg.spd>=2) t/=1.2;
  return Math.max(50,t);
}

function updateTimers(dt) {
  walls=walls.filter(w=>{w.life-=dt;return w.life>0;});
  speedItems=speedItems.filter(s=>{s.life-=dt;return s.life>0;});
  player.effects=player.effects.filter(e=>{e.life-=dt;return e.life>0;});
  if(laserVis){laserVis.life-=dt; if(laserVis.life<=0)laserVis=null;}
  enemies.forEach(e=>{if(e.slowTimer>0)e.slowTimer-=dt;});
  if(threatNotif){threatNotif.life-=dt; if(threatNotif.life<=0)threatNotif=null;}
  recalcSpeed();

  // Combo reset if player hasn't eaten in COMBO_RESET_MS
  if(combo>0 && gameTime-lastFoodTS>COMBO_RESET_MS){
    combo=0; comboMult=1;
  }
}


// ═══ TICK helpers ═══
function _isLethalCell(nh) {
  if (nh.x<0||nh.x>=gCols||nh.y<0||nh.y>=gRows) return true;
  if (isWallSolid(nh.x,nh.y)) return true;
  if (player.body.some(s=>s.x===nh.x&&s.y===nh.y)) return true;
  return false;
}

function _applyPlayerDamage(segIdx, penalty) {
  if (player.body.length>1) {
    player.body.splice(segIdx,1);
    score=Math.max(0,score-penalty);
    return false;
  }
  deathTransition();
  return true;
}

function _collectItems(nh) {
  if(food&&nh.x===food.x&&nh.y===food.y) eatFood();
  speedItems=speedItems.filter(it=>{
    if(nh.x===it.x&&nh.y===it.y){applySpeed(it.type);return false;}
    return true;
  });
  xpBalls=xpBalls.filter(b=>{
    if(nh.x===b.x&&nh.y===b.y){addXP();return false;}
    return true;
  });
}

// ═══ TICK ═══
function gameTick() {
  player.prev=player.body.map(s=>({...s}));
  const newDir={...player.ndir};
  const isReverse = newDir.x===-player.dir.x && newDir.y===-player.dir.y;

  // ── QuickTurn 180° reversal: reverse the body array so old tail becomes new head ──
  if(isReverse && player.upg.quickTurn && player.body.length>=2){
    player.body.reverse();
    // Set prev to match reversed body so there's no interpolation jump on the reversal frame
    player.prev=player.body.map(s=>({...s}));
    player.dir=newDir;
    player.ndir=newDir;
    // After reversal, move one step in the new direction
    const h=player.body[0];
    const nh={x:h.x+player.dir.x, y:h.y+player.dir.y};
    if(_isLethalCell(nh)){deathTransition();return;}
    player.body.unshift(nh);
    if(player.grow>0) player.grow--; else player.body.pop();
    syncPrev(player);
    _collectItems(nh);
    return;
  }

  // ── Normal movement ──
  player.dir={...newDir};
  const h=player.body[0];
  const nh={x:h.x+player.dir.x, y:h.y+player.dir.y};

  if(_isLethalCell(nh)){deathTransition();return;}

  player.body.unshift(nh);
  if(player.grow>0) player.grow--; else player.body.pop();
  syncPrev(player);

  _collectItems(nh);
}

function syncPrev(snake) {
  while(snake.prev.length<snake.body.length) snake.prev.push({...snake.prev[snake.prev.length-1]});
  while(snake.prev.length>snake.body.length) snake.prev.pop();
}


// ═══ FOOD ═══
function spawnFood() {
  let pos=randomEmpty();
  if(!pos) return food;
  for(let a=0;a<12;a++){
    const wc=makeWallNear(pos);
    if(!wc) continue;
    if(bfsOK(player.body[0],pos,wc)){
      walls.push({cells:wc, life:WALL_LIFE_MIN+Math.random()*(WALL_LIFE_MAX-WALL_LIFE_MIN), born:performance.now()});
      break;
    }
  }
  return pos;
}

function makeWallNear(food) {
  const len=2+Math.floor(Math.random()*3);
  const horiz=Math.random()<0.5;
  const dist=2+Math.floor(Math.random()*2);
  const side=Math.random()<0.5?1:-1;
  const jit=Math.floor(Math.random()*3)-1;
  let sx,sy;
  if(horiz){sx=food.x-Math.floor(len/2)+jit; sy=food.y+dist*side;}
  else{sx=food.x+dist*side; sy=food.y-Math.floor(len/2)+jit;}
  const cells=[];
  // Build occupancy set: existing walls + food + player body + projected safe zone
  const bodySet = new Set(player ? player.body.map(s=>`${s.x},${s.y}`) : []);
  // Fan-shaped exclusion zone: prevent walls from spawning near the player's head.
  // Covers Manhattan distance 3 in all directions (immediate turns),
  // plus an extended forward corridor up to 6 steps (straight-ahead running).
  if(player && player.body.length>0){
    const head=player.body[0];
    const d=player.dir||{x:1,y:0};
    for(let dx=-3;dx<=3;dx++) for(let dy=-3;dy<=3;dy++){
      if(Math.abs(dx)+Math.abs(dy)<=3){
        const nx=head.x+dx, ny=head.y+dy;
        if(nx>=0&&nx<gCols&&ny>=0&&ny<gRows) bodySet.add(`${nx},${ny}`);
      }
    }
    for(let i=4;i<=6;i++){
      const fx=head.x+d.x*i, fy=head.y+d.y*i;
      if(fx>=0&&fx<gCols&&fy>=0&&fy<gRows) bodySet.add(`${fx},${fy}`);
    }
  }
  for(let i=0;i<len;i++){
    const x=horiz?sx+i:sx, y=horiz?sy:sy+i;
    if(x>=0&&x<gCols&&y>=0&&y<gRows
       &&!isWall(x,y)
       &&!(food&&x===food.x&&y===food.y)
       &&!bodySet.has(`${x},${y}`))
      cells.push({x,y});
  }
  return cells.length>=2?cells:null;
}

// ═══ WALL DENSITY MAINTENANCE ═══
let lastWallMaintainTS=0;
function maintainWalls(){
  if(gameTime-lastWallMaintainTS<WALL_MAINTAIN_CD) return;
  lastWallMaintainTS=gameTime;
  const target=WALL_MIN_COUNT+Math.floor(threatLevel/2);
  let attempts=0;
  while(walls.length<target&&attempts<30){
    attempts++;
    const anchor={x:Math.floor(Math.random()*gCols),y:Math.floor(Math.random()*gRows)};
    const wc=makeWallNear(anchor);
    if(wc&&bfsOK(player.body[0],food,wc)){
      walls.push({cells:wc,life:WALL_LIFE_MIN+Math.random()*(WALL_LIFE_MAX-WALL_LIFE_MIN),born:performance.now()});
    }
  }
}

function eatFood() {
  // ── Combo ──
  combo++;
  if(combo>maxCombo) maxCombo=combo;
  comboMult=Math.min(4, 1 + (combo-1)*0.5);  // ×1 / ×1.5 / ×2 / ×2.5 / ×3 / ×3.5 / ×4 cap
  lastFoodTS=gameTime;

  const pts=Math.round(10*comboMult*diffCfg().xpMult);
  score+=pts;
  player.grow++;

  Audio.sfxEat(combo);
  if(combo>=2) { Audio.sfxCombo(combo); flash(`COMBO ×${combo}  +${pts}`); }
  else flash('');

  // Food eat effect (style-specific)
  const eatFx = FOOD_EAT_EFFECTS[getTheme().foodStyle];
  if (eatFx && food) eatFx(food.x, food.y);  // pass grid coordinates

  const toSpawn=Math.random()<0.45?2:1;
  for(let i=0;i<toSpawn&&xpBalls.length<XP_MAP_CAP;i++){
    const p=randomEmpty(); if(p)xpBalls.push(p);
  }
  food=spawnFood();
}

function trySpawnSpeed() {
  if(speedItems.length>=2) return;
  const pos=randomEmpty(); if(!pos) return;
  speedItems.push({x:pos.x,y:pos.y,type:Math.random()<0.5?'up':'down',life:SPEED_DUR});
}

function applySpeed(type) {
  type==='up' ? Audio.sfxSpeedUp() : Audio.sfxSpeedDown();
  const ex=player.effects.find(e=>e.type===type);
  if(ex){ex.life=SPEED_DUR;ex.stacks++;}
  else{player.effects.push({type,life:SPEED_DUR,stacks:1});}
  recalcSpeed();
}

function recalcSpeed() {
  let m=1;
  player.effects.forEach(e=>{
    const f=e.type==='up'?1.5:(1/1.5);
    for(let i=0;i<e.stacks;i++) m*=f;
  });
  player.speedTarget=Math.max(0.2,Math.min(8,m));
}

// Smooth speed transition — called each frame with dt in ms
function lerpSpeed(dt) {
  const rate=3.0; // convergence speed: ~330ms to reach 95% of target
  const t=1-Math.exp(-rate*dt/1000);
  player.speedMult+=(player.speedTarget-player.speedMult)*t;
  // Snap if very close
  if(Math.abs(player.speedMult-player.speedTarget)<0.005) player.speedMult=player.speedTarget;
}

function addXP() {
  Audio.sfxXP();
  xp++;
  if(xp>=xpNeeded){xp=0;xpNeeded+=3;doLevelUp();}
}

function doLevelUp() {
  level++;
  gCols+=5; gRows+=5; recalcCell(); resizeGame();
  Audio.stopAllBgm();
  Audio.sfxLevelUp();
  gamePaused=true; selectedEvo=null;
  document.getElementById('evoWarn').textContent='';
  document.getElementById('evoScreen').classList.add('show');
  drawEvoTree();
  startEvoRedraw();
  flash('等级提升！地图扩大');
}


// ═══ ENEMIES ═══
function trySpawnEnemy(ts) {
  if(gameTime<diffCfg().enemyDelay) return;
  const maxE=Math.min(diffCfg().maxEnemies, 1+Math.floor((gameTime-diffCfg().enemyDelay)/diffCfg().spawnCD));
  if(enemies.length>=maxE) return;
  if(ts-lastEnemyTS<diffCfg().spawnCD) return;
  let pos=null;
  for(let a=0;a<200;a++){
    const x=Math.floor(Math.random()*gCols),y=Math.floor(Math.random()*gRows);
    const d=Math.abs(x-player.body[0].x)+Math.abs(y-player.body[0].y);
    if(d>=7&&!isWall(x,y)&&!(food&&x===food.x&&y===food.y)){pos={x,y};break;}
  }
  if(!pos) return;
  enemies.push({body:[{...pos}],prev:[{...pos}],dir:{x:1,y:0},bCD:diffCfg().bulletCD+Math.random()*3000,slowTimer:0,grow:0});
  lastEnemyTS=ts;
}

const THREAT_MSGS=[
  '威胁等级上升 — 敌蛇反应加快',
  '警告 — 敌蛇弹道速度提升',
  '危险 — 新增敌蛇上限',
  '极危 — 所有威胁强化',
  '终极威胁 — 全面压制',
];
function checkThreatEscalation() {
  if(gameTime<diffCfg().enemyDelay) return;
  const elapsed=gameTime-diffCfg().enemyDelay;
  const newLevel=Math.min(diffCfg().threatCap, Math.floor(elapsed/diffCfg().threatInterval)+1);
  if(newLevel>threatLevel){
    threatLevel=newLevel;
    const msg=THREAT_MSGS[Math.min(threatLevel-1,THREAT_MSGS.length-1)];
    threatNotif={text:`⚠ THREAT LV.${threatLevel}  ${msg}`, life:4000};
    Audio.sfxThreat();
  }
}

function updateEnemies() {
  const ws=wallKeySet();
  for(let ei=enemies.length-1;ei>=0;ei--){
    const e=enemies[ei];
    if(e.slowTimer>0&&Math.random()<0.35){e.bCD-=tickInterval()*2;checkEnemyBullet(e,ei);continue;}

    const target=food||player.body[0];
    const obs=new Set(ws);
    e.body.slice(1).forEach(s=>obs.add(`${s.x},${s.y}`));
    const path=astar(e.body[0],target,obs);

    let moved=false;
    if(path&&path.length>0){
      const nx=path[0];
      e.dir={x:nx.x-e.body[0].x,y:nx.y-e.body[0].y};
      e.body.unshift(nx); moved=true;
    } else {
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-.5);
      for(const [dx,dy] of dirs){
        const nx=e.body[0].x+dx,ny=e.body[0].y+dy;
        if(nx>=0&&nx<gCols&&ny>=0&&ny<gRows&&!ws.has(`${nx},${ny}`)&&!e.body.some(s=>s.x===nx&&s.y===ny)){
          e.dir={x:dx,y:dy}; e.body.unshift({x:nx,y:ny}); moved=true; break;
        }
      }
    }
    if(!moved){e.bCD-=tickInterval()*2;checkEnemyBullet(e,ei);continue;}
    if(e.grow>0)e.grow--; else e.body.pop();
    // prev was already captured pre-move at the start of gameTick.
    // syncPrev just adjusts array length to match body after grow/shrink.
    syncPrev(e);

    const eh=e.body[0];
    if(food&&eh.x===food.x&&eh.y===food.y){score-=5;e.grow++;food=spawnFood();}
    const pi=player.body.findIndex(s=>s.x===eh.x&&s.y===eh.y);
    if(pi>=0){
      if(_applyPlayerDamage(pi,20)) return;
    }
    e.bCD-=tickInterval()*2;
    checkEnemyBullet(e,ei);
  }
}

function checkEnemyBullet(e,ei) {
  if(e.bCD<=0){fireEnemyBullet(e);e.bCD=diffCfg().bulletCD;}
}


// ═══ BULLETS ═══
function _pushBullet(x,y,dx,dy){
  const fast=threatLevel>=BULLET_FAST_THREAT&&Math.random()<0.3;
  bullets.push({x,y,dx,dy,fast,bounces:0});
}
function _maybeSpread(x,y,dx,dy){
  _pushBullet(x,y,dx,dy);
  if(threatLevel>=BULLET_SPREAD_THREAT&&Math.random()<0.25){
    if(dx!==0){_pushBullet(x,y,0,1);_pushBullet(x,y,0,-1);}
    else{_pushBullet(x,y,1,0);_pushBullet(x,y,-1,0);}
  }
}
function fireEnemyBullet(enemy) {
  const eh=enemy.body[0];
  const ws=wallKeySet();
  const targets=[player.body[player.body.length-1],player.body[0]];
  for(const tgt of targets){
    const tdx=tgt.x-eh.x,tdy=tgt.y-eh.y;
    for(const[dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const ok=(dx===1&&tdx>0&&tdy===0)||(dx===-1&&tdx<0&&tdy===0)||
               (dy===1&&tdy>0&&tdx===0)||(dy===-1&&tdy<0&&tdx===0);
      if(ok&&hasLOS(eh,tgt,dx,dy,ws)){_maybeSpread(eh.x,eh.y,dx,dy);return;}
    }
  }
  if(enemy.dir.x!==0||enemy.dir.y!==0) _maybeSpread(eh.x,eh.y,enemy.dir.x,enemy.dir.y);
}

function hasLOS(from,to,dx,dy,ws) {
  let x=from.x+dx,y=from.y+dy;
  while(x>=0&&x<gCols&&y>=0&&y<gRows){
    if(ws.has(`${x},${y}`)) return false;
    if(x===to.x&&y===to.y) return true;
    x+=dx;y+=dy;
  }
  return false;
}

function updateBullets() {
  if(!player.alive) return;
  const ws=wallKeySet();
  bullets=bullets.filter(b=>{
    const steps=b.fast?2:1;
    for(let step=0;step<steps;step++){
      b.x+=b.dx; b.y+=b.dy;
      // 1. out of bounds → destroy
      if(b.x<0||b.x>=gCols||b.y<0||b.y>=gRows) return false;
      // 2. wall → ricochet or destroy
      if(ws.has(`${b.x},${b.y}`)){
        if((b.bounces||0)>=BULLET_MAX_BOUNCES) return false;
        b.bounces=(b.bounces||0)+1;
        b.x-=b.dx; b.y-=b.dy;
        // reflect: swap axis
        if(b.dx!==0){
          const tryDirs=[[0,1],[0,-1]].sort(()=>Math.random()-.5);
          let ref=false;
          for(const[ndx,ndy] of tryDirs){
            if(!ws.has(`${b.x+ndx},${b.y+ndy}`)&&b.x+ndx>=0&&b.x+ndx<gCols&&b.y+ndy>=0&&b.y+ndy<gRows){b.dx=ndx;b.dy=ndy;ref=true;break;}
          }
          if(!ref) b.dx=-b.dx;
        } else {
          const tryDirs=[[1,0],[-1,0]].sort(()=>Math.random()-.5);
          let ref=false;
          for(const[ndx,ndy] of tryDirs){
            if(!ws.has(`${b.x+ndx},${b.y+ndy}`)&&b.x+ndx>=0&&b.x+ndx<gCols&&b.y+ndy>=0&&b.y+ndy<gRows){b.dx=ndx;b.dy=ndy;ref=true;break;}
          }
          if(!ref) b.dy=-b.dy;
        }
        break; // stop stepping this tick after ricochet
      }
      // 3. hit player
      const hi=player.body.findIndex(s=>s.x===b.x&&s.y===b.y);
      if(hi>=0){
        const died=_applyPlayerDamage(hi,20);
        if(!died){bulletHits++;Audio.sfxBulletHit();flash('被子弹击中！-20分');}
        return false;
      }
      // 4. friendly fire — hit enemy snake
      for(let ei=enemies.length-1;ei>=0;ei--){
        const e=enemies[ei];
        const si=e.body.findIndex(s=>s.x===b.x&&s.y===b.y);
        if(si<0) continue;
        if(si===0){score+=50;killCount++;Audio.sfxEnemyDeath();enemies.splice(ei,1);}
        else{e.body.splice(si);score+=15;Audio.sfxEnemyHit();}
        return false;
      }
    }
    return true;
  });
}


// ═══ LASER ═══
function fireLaser() {
  if(!gameActive||gamePaused||!player.alive) return;
  const cdMs=LASER_CD_BASE*player.upg.laserCD;
  if(player.lCD>0) return;
  player.lCD=cdMs;
  Audio.sfxLaser();
  const dir=player.dir;
  const perp={x:dir.y,y:-dir.x};
  const n=player.upg.laserN;
  const ws=wallKeySet();

  const offsets=[];
  if(n===1) offsets.push({ox:0,oy:0});
  else if(n===2){offsets.push({ox:perp.x*-1,oy:perp.y*-1});offsets.push({ox:perp.x,oy:perp.y});}
  else{offsets.push({ox:perp.x*-1,oy:perp.y*-1});offsets.push({ox:0,oy:0});offsets.push({ox:perp.x,oy:perp.y});}

  const beams=[];  // each beam: {sx, sy, cells:[]}
  offsets.forEach(off=>{
    const sx=player.body[0].x+off.ox, sy=player.body[0].y+off.oy;
    if(sx<0||sx>=gCols||sy<0||sy>=gRows||ws.has(`${sx},${sy}`)) return;
    let x=sx,y=sy,pierce=player.upg.pierce?1:0;
    const beamCells=[];
    while(true){
      x+=dir.x; y+=dir.y;
      if(x<0||x>=gCols||y<0||y>=gRows) break;
      if(ws.has(`${x},${y}`)) break;
      beamCells.push({x,y});
      let hitCell=false;
      for(let ei=enemies.length-1;ei>=0;ei--){
        const e=enemies[ei];
        const si=e.body.findIndex(s=>s.x===x&&s.y===y);
        if(si<0) continue;
        hitCell=true;
        score+=15*player.upg.laserDmg;
        laserHits++;
        Audio.sfxEnemyHit();
        const willKill = e.body.length <= player.upg.laserDmg;
        const [hitPx, hitPy] = gridToPixel(x, y, cellSize);
        createLaserHitEffect(hitPx, hitPy, willKill);
        for(let d=0;d<player.upg.laserDmg;d++){
          if(e.body.length>1) e.body.pop();
          else{score+=50;killCount++;Audio.sfxEnemyDeath();missileShakeTime=120;missileShakeIntensity=3;enemies.splice(ei,1);break;}
        }
        if(player.upg.slow&&enemies[ei]) enemies[ei].slowTimer=3000;
      }
      if(hitCell&&pierce<=0) break;
      if(hitCell) pierce--;
    }
    if(beamCells.length>0) beams.push({sx,sy,cells:beamCells});
  });
  laserVis={beams,life:LASER_VIS_MS};
}

// ═══ SKILLS ═══
// ── Time Slow ──
function getTimeSlowDuration() {
  let dur = TIME_SLOW_BASE_DURATION;
  if(player.upg.ts_dur) dur += player.upg.ts_dur * 2000;
  return dur;
}

function getTimeSlowCD() {
  let cd = TIME_SLOW_BASE_CD;
  if(player.upg.ts_cd) cd -= player.upg.ts_cd * 5000;
  return Math.max(5000, cd);
}

function tryActivateTimeSlow() {
  if(!gameActive||gamePaused||!player.alive) return;
  if(player.timeSlowCD > 0) return;

  player.timeSlowCD = getTimeSlowCD();
  Audio.sfxTimeSlow();  // 音效在冻结开始时就播放

  // Trigger time stop first (as "wind-up" animation)
  startFreeze(TIME_STOP_MS, () => {
    // After freeze: set time slow state and start timing
    player.timeSlowActive = true;
    player.timeSlowStart = performance.now();
    player.timeSlowEnd = performance.now() + getTimeSlowDuration();
    player.timeSlowSpeedMult = TIME_SLOW_SELF_MULT;
    recalcSpeed();
  });
}

// ── Ice Shatter Effect Generation ──
function generateIceCracks(hx, hy) {
  const cracks = [];
  const count = 10;
  for(let i = 0; i < count; i++) {
    const baseAngle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
    const segs = [];
    let px = 0, py = 0;
    const segCount = 6 + Math.floor(Math.random() * 4);
    const maxLen = Math.max(canvas.width, canvas.height) * 0.6;
    for(let s = 0; s < segCount; s++) {
      const segLen = maxLen / segCount;
      const jitter = (Math.random() - 0.5) * 14;
      const nx = px + Math.cos(baseAngle) * segLen + Math.cos(baseAngle + Math.PI/2) * jitter;
      const ny = py + Math.sin(baseAngle) * segLen + Math.sin(baseAngle + Math.PI/2) * jitter;
      segs.push({x: nx, y: ny});
      px = nx; py = ny;
    }
    cracks.push({ox: hx, oy: hy, segs});
  }
  return cracks;
}

function generateIceShards(hx, hy) {
  const shards = [];
  const cols = 7, rows = 5;
  const cw = canvas.width / cols, ch = canvas.height / rows;
  for(let r = 0; r < rows; r++) {
    for(let c = 0; c < cols; c++) {
      const cx = cw * (c + 0.5) + (Math.random() - 0.5) * cw * 0.4;
      const cy = ch * (r + 0.5) + (Math.random() - 0.5) * ch * 0.4;
      // 生成三角形碎片
      const vertCount = 3 + Math.floor(Math.random() * 2); // 3~4 vertices
      const verts = [];
      const shardSize = Math.min(cw, ch) * (0.3 + Math.random() * 0.4);
      for(let v = 0; v < vertCount; v++) {
        const a = (Math.PI * 2 / vertCount) * v + (Math.random() - 0.5) * 0.6;
        const dist = shardSize * (0.5 + Math.random() * 0.5);
        verts.push({x: Math.cos(a) * dist, y: Math.sin(a) * dist});
      }
      // 飞散方向：从玩家中心向外
      const dx = cx - hx, dy = cy - hy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 200 + Math.random() * 300; // pixels per TIME_STOP_MS
      shards.push({
        cx, cy,
        verts,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        rot: 0,
        rotV: (Math.random() - 0.5) * Math.PI * 4,
      });
    }
  }
  return shards;
}

function endTimeSlow() {
  Audio.sfxTimeSlowEnd();
  // 计算玩家头部画布坐标并生成碎片
  const head = player.body[0];
  const [hx, hy] = gridToPixel(head.x, head.y, cS);
  timeSlowCracks = generateIceCracks(hx, hy);
  timeSlowShards = generateIceShards(hx, hy);
  timeSlowEnding = true;
  startFreeze(TIME_STOP_MS, () => {
    player.timeSlowActive = false;
    player.timeSlowSpeedMult = 1;
    timeSlowEnding = false;
    timeSlowShards = [];
    timeSlowCracks = [];
    recalcSpeed();
  });
}

// ── Tracking Missiles ──
function getMissileCount() {
  let count = MISSILE_BASE_COUNT;
  if(player.upg.ms_count) count += player.upg.ms_count * 2;
  return count;
}

function getMissileCD() {
  return MISSILE_BASE_CD;
}

function tryActivateMissiles() {
  if(!gameActive||gamePaused||!player.alive) return;
  if(player.missileCD > 0) return;

  player.missileCD = getMissileCD();
  const count = getMissileCount();
  const head = player.body[0];
  const [px, py] = gridToPixel(head.x, head.y, cS);

  // Initialize missiles in waiting state, orbiting around head
  for(let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const orbitRadius = cS * 1.5;
    player.missiles.push({
      x: px + Math.cos(angle) * orbitRadius,
      y: py + Math.sin(angle) * orbitRadius,
      vx: 0, vy: 0,
      state: 'waiting',  // 'waiting' | 'flying' | 'destroyed'
      waitTime: MISSILE_WAIT_MS,
      targetIdx: enemies.length > 0 ? i % enemies.length : -1,
      pierce: player.upg.ms_pierce ? 1 : 0,
      orbitAngle: angle,
      trail: [],
      spawnTime: Date.now(),
    });
  }

  Audio.sfxMissileLock();
}

function updateMissiles(dt) {
  const ws = wallKeySet();

  player.missiles.forEach(m => {
    if(m.state === 'waiting') {
      m.waitTime -= dt;
      // Orbit around player head
      const head = player.body[0];
      const [px, py] = gridToPixel(head.x, head.y, cS);
      m.orbitAngle += 0.003 * (m.targetIdx % 2 === 0 ? 1 : -1);
      const expandT = Math.min(1, (Date.now() - m.spawnTime) / 300);
      const orbitRadius = cS * 1.5 * expandT;
      m.x = px + Math.cos(m.orbitAngle) * orbitRadius;
      m.y = py + Math.sin(m.orbitAngle) * orbitRadius;

      if(m.waitTime <= 0) {
        m.state = 'flying';
        // 无目标时给沿轨道方向的初速度
        if(m.targetIdx < 0 || !enemies[m.targetIdx]) {
          m.vx = Math.cos(m.orbitAngle) * MISSILE_SPEED;
          m.vy = Math.sin(m.orbitAngle) * MISSILE_SPEED;
        }
        Audio.sfxMissileFire();
      }
    } else if(m.state === 'flying') {
      // 尾焰轨迹记录
      m.trail.push({x: m.x, y: m.y});
      if(m.trail.length > 8) m.trail.shift();

      // 修正无效目标：尝试重新分配
      if(m.targetIdx < 0 || !enemies[m.targetIdx] || enemies[m.targetIdx].body.length === 0) {
        const newT = enemies.find(e => e.body.length > 0);
        if(newT) m.targetIdx = enemies.indexOf(newT);
      }

      const target = enemies[m.targetIdx];
      if(target && target.body.length > 0) {
        const th = target.body[0];
        const [tx, ty] = gridToPixel(th.x, th.y, cS);

        // Steering behavior
        const dx = tx - m.x, dy = ty - m.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        m.distToTarget = dist;
        const desiredVx = dx / dist * MISSILE_SPEED;
        const desiredVy = dy / dist * MISSILE_SPEED;

        // Smooth turn toward desired velocity
        m.vx += (desiredVx - m.vx) * MISSILE_TURN_RATE;
        m.vy += (desiredVy - m.vy) * MISSILE_TURN_RATE;

        m.x += m.vx * dt;
        m.y += m.vy * dt;

        // Grid-based collision (account for grid offset + portrait touch controls)
        const _W = window.innerWidth, _H = window.innerHeight;
        const _isPortrait = typeof isMobile !== 'undefined' && isMobile && _H > _W;
        const _ctrlH = _isPortrait ? 170 : 0;
        const _ox = Math.floor((_W - gCols * cS) / 2);
        const _oy = HUD_H + Math.floor((_H - HUD_H - _ctrlH - gRows * cS) / 2);
        const gx = Math.floor((m.x - _ox) / cS);
        const gy = Math.floor((m.y - _oy) / cS);

        // Wall collision
        if(gx < 0 || gx >= gCols || gy < 0 || gy >= gRows || ws.has(`${gx},${gy}`)) {
          if(m.pierce > 0) {
            m.pierce--;
          } else {
            m.state = 'destroyed';
            createExplosion(m.x, m.y);
            Audio.sfxMissileExplode();
          }
        } else {
          // Enemy hit check
          for(let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            for(const seg of e.body) {
              if(seg.x === gx && seg.y === gy) {
                // Remove one segment
                if(e.body.length > 1) {
                  e.body.pop();
                  score += 15;
                } else {
                  score += 50;
                  killCount++;
                  Audio.sfxEnemyDeath();
                  enemies.splice(ei, 1);
                }
                m.state = 'destroyed';
                createExplosion(m.x, m.y);
                Audio.sfxMissileExplode();
                missileShakeTime = 150;
                missileShakeIntensity = 4;
                break;
              }
            }
            if(m.state === 'destroyed') break;
          }
        }
      } else {
        // 无目标：沿当前方向继续飞行，等待新敌蛇出现
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        // 飞出边界才销毁
        const _W2 = window.innerWidth, _H2 = window.innerHeight;
        const _isPortrait2 = typeof isMobile !== 'undefined' && isMobile && _H2 > _W2;
        const _ctrlH2 = _isPortrait2 ? 170 : 0;
        const _ox2 = Math.floor((_W2 - gCols * cS) / 2);
        const _oy2 = HUD_H + Math.floor((_H2 - HUD_H - _ctrlH2 - gRows * cS) / 2);
        const gx2 = Math.floor((m.x - _ox2) / cS);
        const gy2 = Math.floor((m.y - _oy2) / cS);
        if(gx2 < 0 || gx2 >= gCols || gy2 < 0 || gy2 >= gRows) {
          m.state = 'destroyed';
          createExplosion(m.x, m.y);
          Audio.sfxMissileExplode();
        }
      }
    }
  });

  // Clean up destroyed missiles
  player.missiles = player.missiles.filter(m => m.state !== 'destroyed');
}

function createExplosion(px, py) {
  const mColor = getTheme().colors.missile || '#FFB830';
  // Particle burst
  for(let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 / 16) * i + (Math.random()-0.5)*0.3;
    const spd = 2 + Math.random() * 3;
    foodParticles.push({
      x: px, y: py,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.03,
      color: mColor,
      size: 1.5 + Math.random() * 2
    });
  }
  // Flash ring (expanding white ring)
  foodParticles.push({
    x: px, y: py, vx: 0, vy: 0,
    life: 1.0, decay: 0.07,
    color: '#FFFFFF',
    isFlash: true, flashRadius: 5
  });
}

function createLaserHitEffect(px, py, killed) {
  const T = getTheme().colors;
  const count = killed ? 12 : 8;
  const cols = [T.laser, T.laserCore, '#FFFFFF'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
    const spd = 1.5 + Math.random() * 2.5;
    foodParticles.push({
      x: px, y: py,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0,
      decay: 0.05 + Math.random() * 0.03,
      color: cols[i % 3],
      size: 1 + Math.random() * 1.5
    });
  }
  foodParticles.push({
    x: px, y: py, vx: 0, vy: 0,
    life: 1.0, decay: killed ? 0.07 : 0.1,
    color: T.laserCore,
    isFlash: true, flashRadius: killed ? 5 : 3
  });
}

// ── Time Stop System ──
function startFreeze(duration, onComplete) {
  gameFrozen = true;
  freezeEnd = performance.now() + duration;
  freezeVisualStart = performance.now();
  freezeCompleteCallback = onComplete;
}

function processQueuedSkill() {
  if(queuedSkill === 'timeSlow') {
    queuedSkill = null;
    tryActivateTimeSlow();
  } else if(queuedSkill === 'missile') {
    queuedSkill = null;
    tryActivateMissiles();
  }
}


// ═══ INPUT ═══

// Shared direction handler — called by keyboard and touch input
function applyDirection(dir) {
  if(!player || !player.alive) return;
  const curDir = player.dir;
  const rev = dir.x === -curDir.x && dir.y === -curDir.y;
  if(!rev || player.upg.quickTurn || player.body.length === 1) player.ndir = dir;
  // Early tick: if past 60% of interval, trigger tick now for snappy response
  const now = performance.now();
  if(tickT > 0.6 && player.alive && !gamePaused && now - lastTick > 60) {
    gameTick(); lastTick = now;
  }
}

// Shared skill handler — called by keyboard and touch input
function activateSkill(type) {
  if(gamePaused) return;
  if(type === 'timeSlow') {
    if(gameFrozen) queuedSkill = 'timeSlow';
    else tryActivateTimeSlow();
  } else if(type === 'missile') {
    if(gameFrozen) queuedSkill = 'missile';
    else tryActivateMissiles();
  } else if(type === 'laser') {
    fireLaser();
  }
}

function onKey(e) {
  // F3: toggle evo tree debug editor (always active)
  if (e.key === 'F3') {
    e.preventDefault();
    toggleEvoDebug();
    return;
  }
  // ESC closes settings panel
  if(e.key==='Escape'){
    const cfg=document.getElementById('cfgScreen');
    if(cfg&&cfg.classList.contains('show')){closeSettings();e.preventDefault();return;}
  }
  // Enter on game-over screen → restart with transition
  if(e.key==='Enter'){
    const go=document.getElementById('goScreen');
    if(go&&go.classList.contains('show')){
      e.preventDefault();
      const btn=document.getElementById('redeployBtn');
      if(btn) launchRedeploy(btn);
      else { Audio.init(); Audio.resume(); if(gameMode==='3d')startGame3D();else startGame(); }
      return;
    }
  }
  if(!gameActive) return;
  // During freeze, only accept skill input (buffer) and direction (buffer)
  // Other input is ignored

  // 3D mode input
  if(gameMode==='3d' && cube3D.active){
    const map3d={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,w:0,W:0,d:1,D:1,s:2,S:2,a:3,A:3};
    const sd=map3d[e.key];
    if(sd!==undefined){cube3D.handleKey(sd);e.preventDefault();return;}
    if(e.key===' '||e.key==='j'||e.key==='J'){cube3D.fireShockwave();e.preventDefault();return;}
    if(e.key==='m'||e.key==='M'){toggleMute();e.preventDefault();}
    return;
  }

  const dm={'ArrowUp':{x:0,y:-1},'w':{x:0,y:-1},'W':{x:0,y:-1},
            'ArrowDown':{x:0,y:1},'s':{x:0,y:1},'S':{x:0,y:1},
            'ArrowLeft':{x:-1,y:0},'a':{x:-1,y:0},'A':{x:-1,y:0},
            'ArrowRight':{x:1,y:0},'d':{x:1,y:0},'D':{x:1,y:0}};
  const nd=dm[e.key];
  if(nd){ applyDirection(nd); e.preventDefault(); return; }

  // Skill input: buffer during freeze, execute normally otherwise
  if(gamePaused) return;

  if(e.key==='k'||e.key==='K'){ activateSkill('timeSlow'); e.preventDefault(); }
  if(e.key==='l'||e.key==='L'){ activateSkill('missile'); e.preventDefault(); }
  if(e.key==='j'||e.key==='J'){ activateSkill('laser'); e.preventDefault(); }
  if(e.key==='m'||e.key==='M'){toggleMute();e.preventDefault();}
  if(e.key==='F2'){debugLevelUp();e.preventDefault();}
}

// ── Debug: instantly trigger level-up / open evo screen ──
function debugLevelUp() {
  if(!gameActive) return;
  doLevelUp();
}


// ═══════════════════════════════════════════════════════════
// ═══ RENDER ═══
// ═══════════════════════════════════════════════════════════
function render() {
  const W=window.innerWidth, H=window.innerHeight;
  ctx.clearRect(0,0,W,H);
  const T=getTheme().colors;

  // Screen shake (death + missile impact)
  let shakeX = 0, shakeY = 0;
  if(deathTime){
    const elapsed = performance.now() - deathTime;
    if(elapsed < 400){
      const intensity = (1 - elapsed/400) * 8;
      shakeX += (Math.random()-0.5) * intensity;
      shakeY += (Math.random()-0.5) * intensity;
    }
  }
  if(missileShakeTime > 0){
    shakeX += (Math.random()-0.5) * 2 * missileShakeIntensity;
    shakeY += (Math.random()-0.5) * 2 * missileShakeIntensity;
    missileShakeTime -= 16; // approx 1 frame
    if(missileShakeTime <= 0) missileShakeIntensity = 0;
  }
  deathShakeX = shakeX; deathShakeY = shakeY;
  if(shakeX !== 0 || shakeY !== 0){
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  // Body background
  ctx.fillStyle=T.boardBody; ctx.fillRect(0,0,W,H);

  const ox=Math.floor((W-gCols*cS)/2);
  const oy=HUD_H+Math.floor((H-HUD_H-gRows*cS)/2);

  // ── Board background ──
  // Outer shadow/margin
  ctx.fillStyle=T.boardOuter;
  ctx.fillRect(ox-8,oy-8,gCols*cS+16,gRows*cS+16);

  // Board face
  ctx.fillStyle=T.boardFace;
  ctx.fillRect(ox,oy,gCols*cS,gRows*cS);

  // Grid lines
  ctx.strokeStyle=T.boardGrid; ctx.lineWidth=0.6;
  for(let x=0;x<=gCols;x++){
    ctx.beginPath();ctx.moveTo(ox+x*cS,oy);ctx.lineTo(ox+x*cS,oy+gRows*cS);ctx.stroke();
  }
  for(let y=0;y<=gRows;y++){
    ctx.beginPath();ctx.moveTo(ox,oy+y*cS);ctx.lineTo(ox+gCols*cS,oy+y*cS);ctx.stroke();
  }

  // Board border - double line, accent color
  ctx.strokeStyle=T.boardBorder; ctx.lineWidth=2.5;
  ctx.strokeRect(ox,oy,gCols*cS,gRows*cS);
  ctx.strokeStyle=T.boardAccent; ctx.lineWidth=1;
  ctx.strokeRect(ox+3,oy+3,gCols*cS-6,gRows*cS-6);

  // Corner marks
  const cm=10;
  ctx.fillStyle=T.boardAccent;
  [[ox,oy],[ox+gCols*cS,oy],[ox,oy+gRows*cS],[ox+gCols*cS,oy+gRows*cS]].forEach(([px,py])=>{
    ctx.fillRect(px-2,py-2,4,4);
  });
  // Corner tick lines
  ctx.strokeStyle=T.boardAccent; ctx.lineWidth=1.5;
  [[ox,oy,1,1],[ox+gCols*cS,oy,-1,1],[ox,oy+gRows*cS,1,-1],[ox+gCols*cS,oy+gRows*cS,-1,-1]].forEach(([px,py,sx,sy])=>{
    ctx.beginPath();ctx.moveTo(px+sx*2,py);ctx.lineTo(px+sx*cm,py);ctx.stroke();
    ctx.beginPath();ctx.moveTo(px,py+sy*2);ctx.lineTo(px,py+sy*cm);ctx.stroke();
  });

  const GCX=x=>ox+x*cS+cS/2;
  const GCY=y=>oy+y*cS+cS/2;

  // ── Walls ──
  const _now=performance.now();
  walls.forEach(w=>{
    const alpha=w.life<5000?(w.life/5000):1;
    const birthAge=w.born?_now-w.born:WALL_BIRTH_MS;
    const inBirth=birthAge<WALL_BIRTH_MS;
    const birthFrac=Math.min(1,birthAge/WALL_BIRTH_MS);
    w.cells.forEach(c=>{
      const wx=ox+c.x*cS, wy=oy+c.y*cS;
      if(inBirth){
        const pulse=0.5+0.5*Math.sin(_now*0.016);
        const wa=(0.35+0.55*birthFrac)*alpha;
        ctx.fillStyle=`rgba(${T.wallBirthR},${T.wallBirthG},${T.wallBirthB},${0.13*pulse*alpha})`;
        ctx.fillRect(wx+1,wy+1,cS-2,cS-2);
        ctx.strokeStyle=`rgba(${T.wallBirthBorderR},${T.wallBirthBorderG},${T.wallBirthBorderB},${wa*(0.5+0.5*pulse)})`;
        ctx.lineWidth=2;
        ctx.strokeRect(wx+2,wy+2,cS-4,cS-4);
        ctx.strokeStyle=`rgba(${T.wallBirthDiagR},${T.wallBirthDiagG},${T.wallBirthDiagB},${wa*0.55*pulse})`;
        ctx.lineWidth=0.8;
        ctx.beginPath();
        ctx.moveTo(wx+4,wy+4);ctx.lineTo(wx+cS-4,wy+cS-4);
        ctx.stroke();
      } else {
        ctx.fillStyle=`rgba(${T.wallFillRgb},${0.92*alpha})`;
        ctx.fillRect(wx+1,wy+1,cS-2,cS-2);
        ctx.strokeStyle=`rgba(${T.boardAccentRgb},${0.7*alpha})`;
        ctx.lineWidth=1;
        ctx.strokeRect(wx+1,wy+1,cS-2,cS-2);
        ctx.strokeStyle=`rgba(${T.boardAccentRgb},${0.35*alpha})`;
        ctx.lineWidth=0.8;
        ctx.beginPath();
        ctx.moveTo(wx+4,wy+4);ctx.lineTo(wx+cS-4,wy+cS-4);
        ctx.moveTo(wx+cS-4,wy+4);ctx.lineTo(wx+4,wy+cS-4);
        ctx.stroke();
      }
    });
  });

  // ── Food ──
  if(food){
    const px=GCX(food.x), py=GCY(food.y);
    (FOOD_RENDERERS[getTheme().foodStyle]||FOOD_RENDERERS.diamond)(ctx,px,py,cS,T);
  }

  // ── Food eat particles + explosion effects ──
  for(let i=foodParticles.length-1;i>=0;i--){
    const p=foodParticles[i];
    p.life-=p.decay;
    if(p.life<=0){foodParticles.splice(i,1);continue;}
    if(p.isFlash){
      // Expanding flash ring
      const ringR = p.flashRadius + (1-p.life) * 25;
      ctx.globalAlpha = p.life * 0.8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();ctx.arc(p.x,p.y,ringR,0,Math.PI*2);ctx.stroke();
    } else {
      p.x+=p.vx; p.y+=p.vy;
      p.vy+=0.05;
      ctx.globalAlpha=p.life;
      ctx.fillStyle=p.color;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size||2,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.globalAlpha=1.0;

  // ── Speed items ──
  speedItems.forEach(it=>{
    const px=GCX(it.x), py=GCY(it.y);
    const isUp=it.type==='up';
    const r=cS*0.26;
    const col=isUp?T.speedUp:T.speedDown;
    // Background square
    ctx.fillStyle=T.itemBg;
    ctx.fillRect(px-r,py-r,r*2,r*2);
    ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.strokeRect(px-r,py-r,r*2,r*2);
    // Arrow
    ctx.fillStyle=col;
    ctx.beginPath();
    if(isUp){
      ctx.moveTo(px,py-r*0.55);ctx.lineTo(px+r*0.55,py+r*0.4);ctx.lineTo(px-r*0.55,py+r*0.4);
    } else {
      ctx.moveTo(px,py+r*0.55);ctx.lineTo(px+r*0.55,py-r*0.4);ctx.lineTo(px-r*0.55,py-r*0.4);
    }
    ctx.closePath();ctx.fill();
  });

  // ── XP balls ──
  xpBalls.forEach(b=>{
    const px=GCX(b.x), py=GCY(b.y);
    const t3=(Date.now()%1400)/1400;
    const r=cS*0.21*(0.9+0.1*Math.sin(t3*Math.PI*2));
    ctx.fillStyle=T.xpBallBg;
    ctx.beginPath();ctx.arc(px,py,r*1.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=T.xpBall; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=T.xpBall;
    ctx.beginPath();ctx.arc(px,py,r*0.45,0,Math.PI*2);ctx.fill();
  });

  // ── Enemy bullets ──
  bullets.forEach(b=>{
    const px=GCX(b.x), py=GCY(b.y);
    const r=b.fast?cS*0.2:cS*0.15;
    ctx.fillStyle=T.bullet;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=T.bulletGlow;
    ctx.beginPath();ctx.arc(px,py,r*2.2,0,Math.PI*2);ctx.fill();
    if(b.fast){
      // trail effect for fast bullets
      const tx=px-b.dx*cS*0.4, ty=py-b.dy*cS*0.4;
      ctx.fillStyle=T.bulletGlow;
      ctx.beginPath();ctx.arc(tx,ty,r*1.5,0,Math.PI*2);ctx.fill();
    }
  });

  // ── Laser beam ──
  if(laserVis&&laserVis.beams&&laserVis.beams.length>0&&player){
    const alpha=Math.max(0,laserVis.life/LASER_VIS_MS);
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.lineCap='square';
    laserVis.beams.forEach(beam=>{
      if(beam.cells.length===0) return;
      const startX=GCX(beam.sx), startY=GCY(beam.sy);
      const endC=beam.cells[beam.cells.length-1];
      const endX=GCX(endC.x), endY=GCY(endC.y);
      // Outer wide glow
      ctx.strokeStyle=T.laserGlow; ctx.lineWidth=cS*0.55;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
      // Core beam
      ctx.strokeStyle=T.laser; ctx.lineWidth=cS*0.12;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
      // White center
      ctx.strokeStyle=T.laserCore; ctx.lineWidth=cS*0.04;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.lineTo(endX,endY);ctx.stroke();
    });
    ctx.restore();
  }

  // ── Draw hex cell ──
  function drawHex(c,hx,hy,r,fillCol,borderCol){
    c.beginPath();
    for(let i=0;i<6;i++){
      const ang=Math.PI/6+i*Math.PI/3;
      const px=hx+r*Math.cos(ang), py=hy+r*Math.sin(ang);
      i===0?c.moveTo(px,py):c.lineTo(px,py);
    }
    c.closePath();
    c.fillStyle=fillCol; c.fill();
    c.strokeStyle=borderCol; c.lineWidth=1.4; c.stroke();
  }

  // ── Draw snake ──
  function drawSnake(snake,isPlayer){
    if(!snake.body.length) return;
    const N=snake.body.length;
    const t = isPlayer ? tickT : enemyTickT;

    for(let i=N-1;i>=0;i--){
      const cur=snake.body[i], prv=snake.prev[i]||cur;
      const ix=ox+cS*(prv.x+(cur.x-prv.x)*t)+cS/2;
      const iy=oy+cS*(prv.y+(cur.y-prv.y)*t)+cS/2;
      const r=cS*0.42;
      const fade=Math.max(0.35,1-i/N*0.55);

      let fill,border;
      if(isPlayer){
        fill=i===0?T.playerHead:i<3?T.playerBody:T.playerTail;
        border=i===0?T.playerHeadBorder:T.playerBodyBorder;
      } else {
        fill=i===0?T.enemyHead:i<3?T.enemyBody:T.enemyTail;
        border=i===0?T.enemyHeadBorder:T.enemyBodyBorder;
      }

      // Slight opacity fade for tail
      if(fade<1){ ctx.save(); ctx.globalAlpha=fade*0.85+0.15; }
      drawHex(ctx,ix,iy,r,fill,border);
      if(fade<1) ctx.restore();
    }

    // Head detail: eyes
    const hCur=snake.body[0], hPrv=snake.prev[0]||hCur;
    const hx=ox+cS*(hPrv.x+(hCur.x-hPrv.x)*t)+cS/2;
    const hy=oy+cS*(hPrv.y+(hCur.y-hPrv.y)*t)+cS/2;
    const d=snake.dir||{x:1,y:0};
    const perp={x:d.y,y:-d.x};
    const eyeR=cS*0.075, eyeOff=cS*0.17, eyeFwd=cS*0.15;
    [[1],[-1]].forEach(([s])=>{
      const ex=hx+d.x*eyeFwd+perp.x*eyeOff*s;
      const ey=hy+d.y*eyeFwd+perp.y*eyeOff*s;
      ctx.fillStyle=T.snakeEye;
      ctx.beginPath();ctx.arc(ex,ey,eyeR,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=T.snakePupil;
      ctx.beginPath();ctx.arc(ex+d.x*eyeR*0.35,ey+d.y*eyeR*0.35,eyeR*0.5,0,Math.PI*2);ctx.fill();
    });
  }

  enemies.forEach(e=>drawSnake(e,false));
  if(player&&player.alive) drawSnake(player,true);

  // ── Render Missiles ──
  renderMissiles(ctx);

  // ── Time Slow Ripple Effect ──
  renderTimeSlowRipple(ctx, performance.now(), ox, oy);

  // ── Edge Glow Cooldown UI ──
  renderEdgeGlow(ctx);

  // ── Laser cooldown removed - replaced by edge glow UI

  // ── Enemy countdown ──
  if(player&&gameTime<diffCfg().enemyDelay){
    const remaining=Math.ceil((diffCfg().enemyDelay-gameTime)/1000);
    ctx.font=`bold 10px 'Share Tech Mono', monospace`;
    ctx.fillStyle=T.enemyCountdown;
    ctx.textAlign='right';
    ctx.fillText(`ENEMY IN ${remaining}s`, ox+gCols*cS-8, oy+gRows*cS-8);
    ctx.textAlign='left';
  }

  // ── Threat escalation banner ──
  if(threatNotif&&threatNotif.life>0){
    const alpha=Math.min(1, threatNotif.life/600) * Math.min(1,(threatNotif.life)/200<1?threatNotif.life/200:1);
    const fadedAlpha=Math.min(1, threatNotif.life/400);
    const bw=Math.min(gCols*cS, 580);
    const bx=ox+(gCols*cS-bw)/2;
    const by=oy+14;
    ctx.save();
    ctx.globalAlpha=fadedAlpha;
    ctx.fillStyle=T.threatBanner;
    ctx.fillRect(bx, by, bw, 28);
    ctx.fillStyle=T.threatBannerGlow;
    ctx.fillRect(bx-2, by-2, bw+4, 32);
    ctx.font=`bold 11px 'Share Tech Mono', monospace`;
    ctx.fillStyle=T.threatText;
    ctx.textAlign='center';
    ctx.fillText(threatNotif.text, ox+gCols*cS/2, by+18);
    ctx.textAlign='left';
    ctx.restore();
  }

  // ── Combo flash on board ──
  if(combo>=2&&gameTime-lastFoodTS<500){
    const frac=(gameTime-lastFoodTS)/500;
    const alpha=(1-frac)*0.9;
    const hCur=player&&player.body[0];
    if(hCur){
      const px=GCX(hCur.x), py=GCY(hCur.y)-cS*0.8;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.font=`bold ${Math.round(cS*0.55)}px 'Barlow Condensed', sans-serif`;
      ctx.fillStyle=T.comboText;
      ctx.textAlign='center';
      ctx.fillText(`COMBO ×${combo}`, px, py);
      ctx.restore();
    }
  }

  // ── Death transition overlay ──
  if(deathTime){
    // Restore shake transform only if it was applied (within first 400ms)
    const elapsed = performance.now() - deathTime;
    if(elapsed < 400){
      ctx.restore();
    }

    // Phase 1: Flash (0-250ms)
    if(elapsed < 250){
      const flashAlpha = (1 - elapsed/250) * 0.55;
      ctx.fillStyle = `rgba(${T.deathFlashR},${T.deathFlashG},${T.deathFlashB},${flashAlpha})`;
      ctx.fillRect(0,0,W,H);
    }

    // Phase 2: Gradual darken with vignette (200ms-1600ms)
    if(elapsed > 200){
      const darkProgress = Math.min(1, (elapsed-200)/1400);
      const darkAlpha = darkProgress * darkProgress * 0.92;
      const dRgb = T.deathDarkRgb;
      ctx.fillStyle = `rgba(${dRgb},${darkAlpha})`;
      ctx.fillRect(0,0,W,H);

      // Vignette closing in
      const vigR = Math.max(50, W*0.7*(1-darkProgress*0.6));
      const vig = ctx.createRadialGradient(W/2,H/2,vigR*0.3,W/2,H/2,vigR);
      vig.addColorStop(0,`rgba(${dRgb},0)`);
      vig.addColorStop(1,`rgba(${dRgb},${darkProgress*0.7})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0,0,W,H);

      if(darkProgress > 0.2){
        const noiseAlpha = Math.min(0.12, (darkProgress-0.2)*0.15);
        ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`;
        for(let i=0;i<Math.floor(darkProgress*60);i++){
          const nx=Math.random()*W, ny=Math.random()*H;
          ctx.fillRect(nx,ny,1,1);
        }
        if(Math.random()<darkProgress*0.3){
          const gy=Math.random()*H, gh=1+Math.random()*2;
          ctx.fillStyle=`rgba(${T.deathFlashR},${T.deathFlashG},${T.deathFlashB},${0.08+darkProgress*0.12})`;
          ctx.fillRect(0,gy,W,gh);
        }
      }

      if(darkProgress > 0.5){
        const txtAlpha = (darkProgress-0.5)*2;
        ctx.save();
        ctx.globalAlpha = txtAlpha * 0.6;
        ctx.font = `bold ${Math.round(cS*0.8)}px 'Share Tech Mono', monospace`;
        ctx.fillStyle = T.danger;
        ctx.textAlign = 'center';
        ctx.fillText('/// SIGNAL LOST ///', W/2, H/2);
        if(Math.floor(performance.now()/400)%2===0){
          ctx.font = `${Math.round(cS*0.4)}px 'Share Tech Mono', monospace`;
          ctx.fillStyle = `rgba(${T.deathFlashR},${T.deathFlashG},${T.deathFlashB},0.4)`;
          ctx.fillText('OPERATOR TERMINATED', W/2, H/2+cS*0.7);
        }
        ctx.textAlign = 'left';
        ctx.restore();
      }
    }
  }
}

// ═══ SKILL RENDER FUNCTIONS ═══
// ── Missiles ──
function renderMissiles(ctx) {
  const T = getTheme().colors;
  const missileColor = T.missile || '#00ffff';

  player.missiles.forEach(m => {
    ctx.save();

    // 出场动画缩放
    const age = Date.now() - m.spawnTime;
    if(m.state === 'waiting' && age < 300) {
      const t = age / 300;
      const scale = (1 - Math.pow(1-t, 3)) * (1 + 0.3 * Math.sin(t * Math.PI));
      ctx.globalAlpha = t;
      ctx.translate(m.x, m.y);
      ctx.scale(scale, scale);
    } else {
      // 双层拖影（外层光晕 + 内层亮点）
      if(m.trail.length > 1) {
        m.trail.forEach((p, idx) => {
          const t = (idx+1) / m.trail.length;
          // 外层光晕
          ctx.globalAlpha = t * 0.15;
          ctx.fillStyle = missileColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7*t, 0, Math.PI*2);
          ctx.fill();
          // 内层亮点
          ctx.globalAlpha = t * 0.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5*t, 0, Math.PI*2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      // 接近目标加速线
      if(m.distToTarget && m.distToTarget < 120) {
        const ang = Math.atan2(m.vy, m.vx);
        const perp = ang + Math.PI/2;
        ctx.strokeStyle = missileColor;
        ctx.lineWidth = 1;
        for(let j = -1; j <= 1; j += 2) {
          const offX = Math.cos(perp) * j * 7;
          const offY = Math.sin(perp) * j * 7;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(m.x + offX, m.y + offY);
          ctx.lineTo(m.x + offX - Math.cos(ang)*18, m.y + offY - Math.sin(ang)*18);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.translate(m.x, m.y);
    }

    // 旋转空心六边形弹头
    const spin = Date.now() / 200;

    ctx.strokeStyle = missileColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = missileColor;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a = Math.PI/6 + i*Math.PI/3 + spin;
      const px = Math.cos(a)*8, py = Math.sin(a)*8;
      i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  });
}

// ── Time Slow Ripple & Ice Shatter ──
function renderTimeSlowRipple(ctx, ts, ox, oy) {
  if(!player.timeSlowActive && !gameFrozen) return;

  const T = getTheme().colors;
  const head = player.body[0];
  const hx = ox + head.x * cS + cS/2;
  const hy = oy + head.y * cS + cS/2;

  // 冻结期间用 freezeVisualStart，非冻结期间用 timeSlowStart
  const startTime = gameFrozen ? freezeVisualStart : player.timeSlowStart;
  const elapsed = ts - startTime;
  const progress = Math.min(1, elapsed / TIME_STOP_MS);

  // ── 结束动画：冰碎裂 ──
  if(timeSlowEnding && gameFrozen) {
    renderIceShatter(ctx, progress, hx, hy, T);
    return;
  }

  // ── 开始动画：六边形波纹 ──
  if(gameFrozen) {
    const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
    const radius = progress * maxRadius;
    const alpha = (1 - progress) * 0.5;

    ctx.save();
    ctx.translate(hx, hy);
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI/6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // ── 持续期间：蓝色叠加层 ──
  if(player.timeSlowActive) {
    ctx.save();
    ctx.fillStyle = T.timeSlowOverlay || 'rgba(100, 150, 200, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function renderIceShatter(ctx, progress, hx, hy, T) {
  const overlayColor = T.timeSlowOverlay || 'rgba(100, 150, 200, 0.15)';

  // 阶段一 (0~30%): 蓝色叠加层 + 裂纹扩散
  if(progress < 0.3) {
    const crackProgress = progress / 0.3;
    // 蓝色叠加层（略微变亮表示即将碎裂）
    ctx.save();
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 额外白色闪光
    ctx.fillStyle = `rgba(200, 230, 255, ${crackProgress * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 裂纹线
    ctx.save();
    ctx.strokeStyle = `rgba(220, 240, 255, ${0.6 + crackProgress * 0.4})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(180, 220, 255, 0.8)';
    ctx.shadowBlur = 4;
    for(const crack of timeSlowCracks) {
      ctx.beginPath();
      ctx.moveTo(crack.ox, crack.oy);
      const visibleSegs = Math.ceil(crack.segs.length * crackProgress);
      for(let s = 0; s < visibleSegs; s++) {
        const seg = crack.segs[s];
        // 最后一段按比例截断
        if(s === visibleSegs - 1) {
          const frac = (crack.segs.length * crackProgress) - s;
          const prev = s > 0 ? crack.segs[s-1] : {x: 0, y: 0};
          const lx = crack.ox + prev.x + (seg.x - prev.x) * frac;
          const ly = crack.oy + prev.y + (seg.y - prev.y) * frac;
          ctx.lineTo(lx, ly);
        } else {
          ctx.lineTo(crack.ox + seg.x, crack.oy + seg.y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // 阶段二 (30~100%): 碎片飞散
  else {
    const shardProgress = (progress - 0.3) / 0.7;
    const shardAlpha = Math.max(0, 1 - shardProgress * 1.2);
    const scale = 1 - shardProgress * 0.3;

    ctx.save();
    for(const shard of timeSlowShards) {
      const sx = shard.cx + shard.vx * shardProgress;
      const sy = shard.cy + shard.vy * shardProgress;
      const rot = shard.rotV * shardProgress;

      if(shardAlpha <= 0) continue;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.globalAlpha = shardAlpha;

      // 碎片填充
      ctx.fillStyle = 'rgba(140, 190, 230, 0.4)';
      ctx.strokeStyle = `rgba(220, 240, 255, ${shardAlpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for(let v = 0; v < shard.verts.length; v++) {
        const vert = shard.verts[v];
        if(v === 0) ctx.moveTo(vert.x, vert.y);
        else ctx.lineTo(vert.x, vert.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }
}

// ── Edge Glow Cooldown UI ──
let _edgePrevProg = {laser: -1, ts: -1, ms: -1};
let _edgeFlash = {laser: 0, ts: 0, ms: 0};

function renderEdgeGlow(ctx) {
  const pad = 4;
  const barW = 8;
  const now = performance.now();
  const pulse = 0.6 + 0.4 * Math.sin(now * 0.004);
  const FLASH_MS = 300;

  // Calculate cooldown progress (0 = ready, 1 = just fired)
  const laserProg = Math.max(0, Math.min(1, player.lCD / (LASER_CD_BASE * player.upg.laserCD)));
  const tsProg = Math.max(0, Math.min(1, player.timeSlowCD / getTimeSlowCD()));
  const msProg = Math.max(0, Math.min(1, player.missileCD / getMissileCD()));

  // Detect cooldown-ready transitions
  if(_edgePrevProg.laser > 0 && laserProg === 0) { _edgeFlash.laser = FLASH_MS; Audio.sfxCooldownReady(); }
  if(_edgePrevProg.ts > 0 && tsProg === 0) { _edgeFlash.ts = FLASH_MS; Audio.sfxCooldownReady(); }
  if(_edgePrevProg.ms > 0 && msProg === 0) { _edgeFlash.ms = FLASH_MS; Audio.sfxCooldownReady(); }
  _edgePrevProg.laser = laserProg;
  _edgePrevProg.ts = tsProg;
  _edgePrevProg.ms = msProg;

  // Decay flash timers (~16ms per frame)
  if(_edgeFlash.laser > 0) _edgeFlash.laser = Math.max(0, _edgeFlash.laser - 16);
  if(_edgeFlash.ts > 0) _edgeFlash.ts = Math.max(0, _edgeFlash.ts - 16);
  if(_edgeFlash.ms > 0) _edgeFlash.ms = Math.max(0, _edgeFlash.ms - 16);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const topY = HUD_H + pad;
  const sideY = HUD_H + pad;

  ctx.save();

  // ── Top edge (Laser - amber) ──
  const topLen = W - pad * 2;
  const topFill = topLen * (1 - laserProg);
  ctx.fillStyle = 'rgba(255, 170, 100, 0.1)';
  ctx.fillRect(pad, topY, topLen, barW);
  if(laserProg === 0) { ctx.shadowColor = 'rgba(255, 170, 100, 0.8)'; ctx.shadowBlur = 10 * pulse; }
  else { ctx.shadowBlur = 0; }
  ctx.fillStyle = laserProg === 0
    ? `rgba(255, 170, 100, ${0.7 + 0.3 * pulse})`
    : 'rgba(255, 170, 100, 0.6)';
  ctx.fillRect(pad, topY, topFill, barW);
  ctx.shadowBlur = 0;
  // Flash burst
  if(_edgeFlash.laser > 0) {
    const f = _edgeFlash.laser / FLASH_MS;
    ctx.shadowColor = 'rgba(255, 170, 100, 1)';
    ctx.shadowBlur = 40 * f;
    ctx.fillStyle = `rgba(255, 200, 140, ${0.6 * f})`;
    ctx.fillRect(pad, topY - 4, topLen, barW + 8);
    ctx.shadowBlur = 0;
  }

  // ── Left edge (Time Slow - ice blue) ──
  const leftLen = H - sideY - pad;
  const leftFill = leftLen * (1 - tsProg);
  ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
  ctx.fillRect(pad, sideY, barW, leftLen);
  if(tsProg === 0) { ctx.shadowColor = 'rgba(100, 200, 255, 0.8)'; ctx.shadowBlur = 10 * pulse; }
  else { ctx.shadowBlur = 0; }
  ctx.fillStyle = tsProg === 0
    ? `rgba(100, 200, 255, ${0.7 + 0.3 * pulse})`
    : 'rgba(100, 200, 255, 0.6)';
  ctx.fillRect(pad, sideY + leftLen - leftFill, barW, leftFill);
  ctx.shadowBlur = 0;
  // Flash burst
  if(_edgeFlash.ts > 0) {
    const f = _edgeFlash.ts / FLASH_MS;
    ctx.shadowColor = 'rgba(100, 200, 255, 1)';
    ctx.shadowBlur = 40 * f;
    ctx.fillStyle = `rgba(140, 220, 255, ${0.6 * f})`;
    ctx.fillRect(pad - 4, sideY, barW + 8, leftLen);
    ctx.shadowBlur = 0;
  }

  // ── Right edge (Missiles - cyan-green) ──
  const rightLen = H - sideY - pad;
  const rightFill = rightLen * (1 - msProg);
  ctx.fillStyle = 'rgba(0, 255, 200, 0.1)';
  ctx.fillRect(W - pad - barW, sideY, barW, rightLen);
  if(msProg === 0) { ctx.shadowColor = 'rgba(0, 255, 200, 0.8)'; ctx.shadowBlur = 10 * pulse; }
  else { ctx.shadowBlur = 0; }
  ctx.fillStyle = msProg === 0
    ? `rgba(0, 255, 200, ${0.7 + 0.3 * pulse})`
    : 'rgba(0, 255, 200, 0.6)';
  ctx.fillRect(W - pad - barW, sideY + rightLen - rightFill, barW, rightFill);
  ctx.shadowBlur = 0;
  // Flash burst
  if(_edgeFlash.ms > 0) {
    const f = _edgeFlash.ms / FLASH_MS;
    ctx.shadowColor = 'rgba(0, 255, 200, 1)';
    ctx.shadowBlur = 40 * f;
    ctx.fillStyle = `rgba(100, 255, 220, ${0.6 * f})`;
    ctx.fillRect(W - pad - barW - 4, sideY, barW + 8, rightLen);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

