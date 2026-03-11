'use strict';

// ═══ background.js ═══
// Cassette futurism background engine, demo game preview

// ═══ CASSETTE FUTURISM BACKGROUND ENGINE ═══
// VHS·NASA·Atompunk animated background for all overlay screens
let menuBgRaf = null;

function makeMenuBg(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv) return null;
  const cx = cv.getContext('2d');
  let W, H;

  function resize() {
    const parent = cv.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    W = (rect && rect.width > 0) ? rect.width : window.innerWidth;
    H = (rect && rect.height > 0) ? rect.height : window.innerHeight;
    const _rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(_rawDpr, window.perfLevel==='low'?1:window.perfLevel==='medium'?1.5:_rawDpr);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.scale(dpr, dpr);
    cx.clearRect(0, 0, W, H);
  }

  // ── Palette (from active theme) ──
  const _pal = getTheme().bg.palette;
  const C = { r:_pal[0], y:_pal[1], c:_pal[2], g:_pal[3], am:_pal[4], am2:_pal[5] };

  // ── Floating geometric shapes ──
  const COLS = [C.r, C.y, C.c, C.g, C.am];
  const _shapeCount = window.perfLevel==='low'?10:window.perfLevel==='medium'?18:26;
  const shapes = Array.from({length:_shapeCount}, () => ({
    x: 0.42 + Math.random()*0.58,  // right 58% only (dark side)
    y: Math.random(),
    vx: (Math.random()-.5)*0.00008,
    vy: (Math.random()-.5)*0.00008,
    r: 7 + Math.random()*22,
    col: COLS[Math.floor(Math.random()*COLS.length)],
    type: Math.floor(Math.random()*4),
    phase: Math.random()*Math.PI*2,
    speed: 0.2 + Math.random()*0.55,
  }));

  // ── Data stream (falling chars) ──
  const CHARS = '01∞Ω△◆●◎∝∮∇ABCDF◈◉◫';
  const _streamCount = window.perfLevel==='low'?6:window.perfLevel==='medium'?10:16;
  const streams = Array.from({length:_streamCount}, () => ({
    x: 0.42 + Math.random()*0.55,  // right side
    y: Math.random(),
    spd: 0.00022 + Math.random()*0.0005,
    chars: Array.from({length:5+Math.floor(Math.random()*7)}, ()=>CHARS[Math.floor(Math.random()*CHARS.length)]),
    col: COLS[Math.floor(Math.random()*4)],
    alpha: 0.03 + Math.random()*0.045,
  }));

  // ── Radar — right-center area (CRT panel) ──
  let radarAng = 0;
  const BLIPS = [
    {a:0.6, d:0.58, life:0},{a:2.3, d:0.75, life:0},{a:4.1, d:0.42, life:0},
    {a:5.2, d:0.65, life:0},
  ];

  // ── Orbit system ──
  const orbits = [
    {bx:0.73, by:0.26, rx:0.065, ry:0.032, phase:0,   spd:0.009, r:4,   col:C.am},
    {bx:0.73, by:0.26, rx:0.12,  ry:0.060, phase:1.6, spd:0.006, r:3,   col:C.c},
    {bx:0.73, by:0.26, rx:0.18,  ry:0.090, phase:3.2, spd:0.004, r:2.5, col:C.g},
  ];

  // ── Glitch state ──
  let glitchCd = 120 + Math.floor(Math.random()*100);
  let glitchStrips = [];

  // ── VHS Roll artifact ──
  let rollY = -1;
  let rollActive = false;
  let rollCd = 200 + Math.floor(Math.random()*300);

  // ── Scan line ──
  let scanY = 0;
  let t = 0;

  // ── Phosphor bloom pulses ──
  const _bloomCount = window.perfLevel==='low'?0:window.perfLevel==='medium'?2:5;
  const blooms = Array.from({length:_bloomCount}, () => ({
    x: 0.5 + Math.random()*0.48,
    y: Math.random(),
    r: 20 + Math.random()*60,
    col: COLS[Math.floor(Math.random()*COLS.length)],
    phase: Math.random()*Math.PI*2,
    speed: 0.3 + Math.random()*0.5,
  }));

  function drawHex(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.9;
    cx.beginPath();
    for (let i=0;i<6;i++){const ang=Math.PI/6+i*Math.PI/3;i===0?cx.moveTo(x+r*Math.cos(ang),y+r*Math.sin(ang)):cx.lineTo(x+r*Math.cos(ang),y+r*Math.sin(ang));}
    cx.closePath(); cx.stroke();
    cx.globalAlpha = a * 0.06; cx.fillStyle = col; cx.fill();
    cx.restore();
  }
  function drawCross(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.8;
    const gap = r * 0.28;
    cx.beginPath();
    cx.moveTo(x-r,y); cx.lineTo(x-gap,y); cx.moveTo(x+gap,y); cx.lineTo(x+r,y);
    cx.moveTo(x,y-r); cx.lineTo(x,y-gap); cx.moveTo(x,y+gap); cx.lineTo(x,y+r);
    cx.stroke();
    cx.beginPath(); cx.arc(x,y,gap,0,Math.PI*2); cx.stroke();
    cx.globalAlpha = a*0.28;
    cx.beginPath(); cx.arc(x,y,r,0,Math.PI*2); cx.stroke();
    cx.restore();
  }
  function drawSquare(x, y, r, col, a) {
    cx.save(); cx.globalAlpha = a; cx.strokeStyle = col; cx.lineWidth = 0.8;
    cx.strokeRect(x-r*0.7, y-r*0.7, r*1.4, r*1.4);
    const b = r*0.22;
    [[x-r*0.7,y-r*0.7,1,1],[x+r*0.7,y-r*0.7,-1,1],[x-r*0.7,y+r*0.7,1,-1],[x+r*0.7,y+r*0.7,-1,-1]]
      .forEach(([px,py,sx,sy])=>{
        cx.beginPath(); cx.moveTo(px+sx*b,py); cx.lineTo(px,py); cx.lineTo(px,py+sy*b); cx.stroke();
      });
    cx.restore();
  }

  function frame() {
    const BG = getTheme().bg;
    const TC = getTheme().colors;
    t += 0.008;
    cx.clearRect(0, 0, W, H);

    // ── Base ──
    cx.fillStyle = TC.bgDark;
    cx.fillRect(0, 0, W, H);

    // ── Fine grid (right side only) ──
    const GS = 36;
    const gridLeft = W * 0.39;
    cx.strokeStyle = BG.gridColor;
    cx.lineWidth = 0.4;
    for (let x = gridLeft; x < W; x += GS) { cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke(); }
    for (let y = 0; y < H; y += GS) { cx.beginPath(); cx.moveTo(gridLeft,y); cx.lineTo(W,y); cx.stroke(); }

    // ── PHOSPHOR BLOOM PULSES ──
    blooms.forEach(b => {
      const a = 0.018 + 0.012*Math.sin(t*b.speed + b.phase);
      const grd = cx.createRadialGradient(b.x*W, b.y*H, 0, b.x*W, b.y*H, b.r);
      grd.addColorStop(0, b.col.replace(')', `,${a*3})`).replace('rgb', 'rgba'));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grd;
      cx.fillRect(0, 0, W, H);
    });

    // ── FLOATING SHAPES ──
    shapes.forEach(sh => {
      sh.x += sh.vx; sh.y += sh.vy;
      if (sh.x < 0.4) { sh.x = 0.4; sh.vx *= -1; }
      if (sh.x > 1.05) { sh.x = 1.05; sh.vx *= -1; }
      if (sh.y < -0.05) { sh.y = -0.05; sh.vy *= -1; }
      if (sh.y > 1.05) { sh.y = 1.05; sh.vy *= -1; }
      const pulse = 0.82 + 0.18*Math.sin(t*sh.speed + sh.phase);
      const alpha = 0.05 + 0.038*Math.sin(t*sh.speed*0.7 + sh.phase);
      const sx = sh.x*W, sy = sh.y*H, sr = sh.r*pulse;
      if      (sh.type===0) drawHex(sx,sy,sr,sh.col,alpha);
      else if (sh.type===1) {cx.save();cx.globalAlpha=alpha;cx.strokeStyle=sh.col;cx.lineWidth=0.7;cx.beginPath();cx.arc(sx,sy,sr,0,Math.PI*2);cx.stroke();cx.restore();}
      else if (sh.type===2) drawCross(sx,sy,sr,sh.col,alpha);
      else drawSquare(sx,sy,sr,sh.col,alpha);
    });

    // ── AMBER WEB CONNECTIONS ──
    for (let i=0;i<shapes.length;i++) {
      for (let j=i+1;j<shapes.length;j++) {
        const a=shapes[i], b=shapes[j];
        const dx=(a.x-b.x)*W, dy=(a.y-b.y)*H, d=Math.sqrt(dx*dx+dy*dy);
        if (d < 160) {
          cx.strokeStyle = `rgba(${BG.webR},${BG.webG},${BG.webB},${(1-d/160)*0.055})`;
          cx.lineWidth = 0.5;
          cx.beginPath(); cx.moveTo(a.x*W,a.y*H); cx.lineTo(b.x*W,b.y*H); cx.stroke();
        }
      }
    }

    // ── DATA STREAMS ──
    cx.font = '9px "Share Tech Mono", monospace';
    streams.forEach(s => {
      s.y += s.spd;
      if (s.y > 1.1) { s.y = -0.1; s.x = 0.42 + Math.random()*0.55; }
      s.chars.forEach((ch, i) => {
        const a = s.alpha * Math.max(0, 1 - i/s.chars.length);
        cx.fillStyle = s.col; cx.globalAlpha = a;
        cx.fillText(ch, s.x*W, s.y*H - i*11);
      });
    });
    cx.globalAlpha = 1;

    // ── VHS HORIZONTAL COLOUR STRIPES ──
    const stripeY = H * (0.18 + 0.02*Math.sin(t*0.3));
    [[C.r,0],[C.y,0.005],[C.c,0.01],[C.g,0.015]].forEach(([col,dy])=>{
      cx.fillStyle = col; cx.globalAlpha = 0.014;
      cx.fillRect(W*0.39, stripeY + dy*H, W*0.61, 1.8);
    });
    cx.globalAlpha = 1;

    // ── MAIN SCAN LINE ──
    scanY = (scanY + 0.5) % H;
    const sg = cx.createLinearGradient(0, scanY-95, 0, scanY+4);
    sg.addColorStop(0, `rgba(${BG.scanR},${BG.scanG},${BG.scanB},0)`);
    sg.addColorStop(0.75, `rgba(${BG.scanR},${BG.scanG},${BG.scanB},0.05)`);
    sg.addColorStop(1, `rgba(${BG.scanR},${BG.scanG},${BG.scanB},0)`);
    cx.fillStyle = sg; cx.fillRect(0, scanY-95, W, 99);
    cx.fillStyle = `rgba(${BG.scanR},${BG.scanG},${BG.scanB},0.065)`; cx.fillRect(0, scanY, W, 1.5);

    // ── VHS ROLL ARTIFACT (occasional) ──
    rollCd--;
    if (rollCd <= 0 && !rollActive) {
      rollCd = 180 + Math.floor(Math.random()*280);
      if (Math.random() < 0.55) {
        rollActive = true;
        rollY = -8;
      }
    }
    if (rollActive) {
      rollY += 6;
      // Bright band
      cx.fillStyle = 'rgba(255,255,255,0.04)';
      cx.fillRect(0, rollY, W, 5);
      // Color fringing above
      cx.fillStyle = 'rgba(0,244,232,0.05)'; cx.fillRect(4, rollY-2, W-8, 2);
      cx.fillStyle = 'rgba(255,40,64,0.05)'; cx.fillRect(-4, rollY+5, W-8, 2);
      // Horizontal shift strip
      cx.fillStyle = `rgba(255,184,48,0.035)`;
      cx.fillRect(0, rollY, W*0.8, 3);
      if (rollY > H + 10) { rollActive = false; rollY = -8; }
    }

    // ── PHOSPHOR NOISE ──
    if (Math.random() < 0.055) {
      const nx = W*0.4 + Math.random()*(W*0.6);
      const ny = Math.random()*H;
      const nc = COLS[Math.floor(Math.random()*COLS.length)];
      cx.fillStyle = nc; cx.globalAlpha = 0.4;
      cx.fillRect(nx, ny, 2, 1); cx.globalAlpha = 1;
    }

    // ── VHS GLITCH STRIPS ──
    glitchCd--;
    if (glitchCd <= 0) {
      glitchCd = 80 + Math.floor(Math.random()*180);
      if (Math.random() < 0.45) {
        glitchStrips = Array.from({length: 2+Math.floor(Math.random()*5)}, () => ({
          y: Math.random()*H,
          h: 1 + Math.floor(Math.random()*10),
          dx: (Math.random()-0.5)*44,
          life: 2 + Math.floor(Math.random()*5),
        }));
      }
    }
    glitchStrips = glitchStrips.filter(s => {
      s.life--;
      if (s.life <= 0) return false;
      cx.save(); cx.globalAlpha = 0.3;
      cx.fillStyle = BG.glitchR; cx.fillRect(Math.max(0,s.dx+3), s.y, W*0.6, s.h);
      cx.fillStyle = BG.glitchC; cx.fillRect(Math.max(0,s.dx-3), s.y+s.h, W*0.6, s.h);
      // Yellow middle strip
      cx.fillStyle = 'rgba(255,224,64,0.15)'; cx.fillRect(0, s.y+s.h/2, W, 1);
      cx.restore();
      return true;
    });

    // ── FILM GRAIN (subtle noise layer) ──
    if (Math.floor(t*60) % 3 === 0) {
      for (let i=0; i<30; i++) {
        const gx = W*0.39 + Math.random()*W*0.61;
        const gy = Math.random()*H;
        cx.fillStyle = `rgba(255,255,255,${0.012 + Math.random()*0.018})`;
        cx.fillRect(gx, gy, 1, 1);
      }
    }

    // ── CORNER HUD BRACKETS ──
    const bSize = 18, bW = 1;
    [[14,0,1,1,BG.cornerTL],[W-14,0,-1,1,BG.cornerTR],
     [14,H,-1,-1,BG.cornerBL],[W-14,H,1,-1,BG.cornerBR]
    ].forEach(([px,py,sx,sy,col])=>{
      cx.strokeStyle=col; cx.lineWidth=bW;
      cx.beginPath(); cx.moveTo(px+sx*bSize,py); cx.lineTo(px,py); cx.lineTo(px,py+sy*bSize); cx.stroke();
    });

    return { frame };
  }

  const onResize = () => { resize(); };
  window.addEventListener('resize', onResize);
  const instance = { frame, resize, cleanup: () => window.removeEventListener('resize', onResize) };
  requestAnimationFrame(() => resize());
  return instance;
}

let _menuBgInst = null;
let _goBgInst   = null;

// ═══════════════════════════════════════════════════════════
// ═══ DEMO GAME PREVIEW (auto-playing snake on start screen)
// ═══════════════════════════════════════════════════════════
const DemoGame = (() => {
  const COLS=14, ROWS=10;
  let cvs, cx, cellSz;
  let snake, food, enemy, walls, dir, score, kills, alive, tickCD, restartCD;

  function init() {
    cvs = document.getElementById('previewCanvas');
    if(!cvs) return;
    cx = cvs.getContext('2d');
    reset();
  }

  function reset() {
    const mx=Math.floor(COLS/2), my=Math.floor(ROWS/2);
    snake = [{x:mx,y:my},{x:mx-1,y:my},{x:mx-2,y:my}];
    dir = {x:1,y:0};
    score=0; kills=0; alive=true; tickCD=0; restartCD=0;
    enemy = [];  // must init before spawnItem calls isOcc
    enemyDir = {x:0,y:1};
    enemyGrow = 0;
    enemyCD = 0;
    // spawn walls
    walls = [];
    for(let i=0;i<3;i++){
      const wx=2+Math.floor(Math.random()*(COLS-4));
      const wy=2+Math.floor(Math.random()*(ROWS-4));
      const horiz=Math.random()<0.5;
      const len=2+Math.floor(Math.random()*2);
      for(let j=0;j<len;j++){
        const cx_=horiz?wx+j:wx, cy_=horiz?wy:wy+j;
        if(cx_>=0&&cx_<COLS&&cy_>=0&&cy_<ROWS) walls.push({x:cx_,y:cy_});
      }
    }
    food = spawnItem();
    // enemy snake
    let ep = spawnItem();
    enemy = ep ? [{...ep}] : [{x:2,y:2}];
  }

  let enemyDir, enemyGrow;
  let enemyCD = 0;
  let _sp2Cvs = null, _sp2Cx = null, _sp2CellSz = 0;

  function isOcc(x,y,skipSnake){
    if(x<0||x>=COLS||y<0||y>=ROWS) return true;
    if(walls.some(w=>w.x===x&&w.y===y)) return true;
    if(!skipSnake && snake.some(s=>s.x===x&&s.y===y)) return true;
    if(enemy.some(s=>s.x===x&&s.y===y)) return true;
    return false;
  }

  function spawnItem(){
    for(let a=0;a<200;a++){
      const x=Math.floor(Math.random()*COLS), y=Math.floor(Math.random()*ROWS);
      if(!isOcc(x,y) && !(food&&food.x===x&&food.y===y)) return {x,y};
    }
    return {x:0,y:0};
  }

  // Simple greedy AI toward food
  function pickDir(){
    if(!food) return dir;
    const h=snake[0];
    const dx=food.x-h.x, dy=food.y-h.y;
    // Build preference list
    const dirs=[];
    if(Math.abs(dx)>=Math.abs(dy)){
      dirs.push({x:Math.sign(dx)||1,y:0});
      dirs.push({x:0,y:Math.sign(dy)||1});
      dirs.push({x:0,y:-(Math.sign(dy)||1)});
      dirs.push({x:-(Math.sign(dx)||1),y:0});
    } else {
      dirs.push({x:0,y:Math.sign(dy)||1});
      dirs.push({x:Math.sign(dx)||1,y:0});
      dirs.push({x:-(Math.sign(dx)||1),y:0});
      dirs.push({x:0,y:-(Math.sign(dy)||1)});
    }
    for(const d of dirs){
      // don't reverse
      if(d.x===-dir.x&&d.y===-dir.y&&snake.length>1) continue;
      const nx=h.x+d.x, ny=h.y+d.y;
      if(!isOcc(nx,ny,true)||((food&&nx===food.x&&ny===food.y))) return d;
    }
    return dir; // stuck
  }

  function tick(){
    if(!alive) return;
    dir = pickDir();
    const h=snake[0];
    const nh={x:h.x+dir.x, y:h.y+dir.y};
    // death check
    if(nh.x<0||nh.x>=COLS||nh.y<0||nh.y>=ROWS||
       walls.some(w=>w.x===nh.x&&w.y===nh.y)||
       snake.some(s=>s.x===nh.x&&s.y===nh.y)){
      alive=false; restartCD=120; return;
    }
    // eat enemy
    const ei=enemy.findIndex(s=>s.x===nh.x&&s.y===nh.y);
    if(ei>=0){
      enemy.splice(ei,1);
      score+=50; kills++;
      if(enemy.length===0){
        const ep=spawnItem();
        enemy=[ep||{x:1,y:1}]; enemyGrow=0;
      }
    }
    snake.unshift(nh);
    if(food&&nh.x===food.x&&nh.y===food.y){
      score+=10; food=spawnItem();
      // cap length for visual clarity
      if(snake.length>18) snake.pop();
    } else { snake.pop(); }

    // enemy movement
    enemyCD++;
    if(enemyCD>=2){
      enemyCD=0;
      moveEnemy();
    }
  }

  function moveEnemy(){
    if(enemy.length===0) return;
    const eh=enemy[0];
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-0.5);
    // 50% chance chase food, 50% random
    if(food && Math.random()<0.5){
      dirs.sort((a,b)=>{
        const da=Math.abs(eh.x+a[0]-food.x)+Math.abs(eh.y+a[1]-food.y);
        const db=Math.abs(eh.x+b[0]-food.x)+Math.abs(eh.y+b[1]-food.y);
        return da-db;
      });
    }
    for(const [dx,dy] of dirs){
      const nx=eh.x+dx, ny=eh.y+dy;
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      if(walls.some(w=>w.x===nx&&w.y===ny)) continue;
      if(enemy.some(s=>s.x===nx&&s.y===ny)) continue;
      if(snake.some(s=>s.x===nx&&s.y===ny)) continue;
      enemy.unshift({x:nx,y:ny});
      if(food&&nx===food.x&&ny===food.y){ enemyGrow+=2; food=spawnItem(); }
      if(enemyGrow>0) enemyGrow--; else enemy.pop();
      enemyDir={x:dx,y:dy};
      return;
    }
  }

  function resize(){
    if(!cvs) return;
    const rect = cvs.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    cvs.width = rect.width*dpr;
    cvs.height = rect.height*dpr;
    cx.scale(dpr,dpr);
    cellSz = Math.floor(Math.min((rect.width-40)/COLS, (rect.height-50)/ROWS));
  }

  function initSecondary(id) {
    _sp2Cvs = document.getElementById(id);
    if (!_sp2Cvs) return;
    _sp2Cx = _sp2Cvs.getContext('2d');
    resizeSecondary();
  }

  function resizeSecondary() {
    if (!_sp2Cvs) return;
    const rect = _sp2Cvs.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;  // parent is hidden, skip
    const dpr = window.devicePixelRatio || 1;
    _sp2Cvs.width = rect.width * dpr;
    _sp2Cvs.height = rect.height * dpr;
    _sp2Cx.scale(dpr, dpr);
    _sp2CellSz = Math.floor(Math.min((rect.width - 40) / COLS, (rect.height - 50) / ROWS));
  }

  // Shared board rendering — used by both render() and renderSpring()
  function _renderBoard(ctx_, cs_) {
    if (!ctx_) return;
    const T = getTheme().colors;
    const W_ = ctx_.canvas.width / (window.devicePixelRatio || 1);
    const H_ = ctx_.canvas.height / (window.devicePixelRatio || 1);
    ctx_.clearRect(0, 0, W_, H_);
    ctx_.fillStyle = T.bgDark;
    ctx_.fillRect(0, 0, W_, H_);

    const cs = cs_ || 20;
    const ox = Math.floor((W_ - COLS * cs) / 2);
    const oy = Math.floor((H_ - ROWS * cs) / 2) - 4;

    // Board face
    ctx_.fillStyle = T.boardFace;
    ctx_.fillRect(ox, oy, COLS * cs, ROWS * cs);

    // Grid
    ctx_.strokeStyle = T.boardGrid; ctx_.lineWidth = 0.5;
    for(let x=0;x<=COLS;x++){ctx_.beginPath();ctx_.moveTo(ox+x*cs,oy);ctx_.lineTo(ox+x*cs,oy+ROWS*cs);ctx_.stroke();}
    for(let y=0;y<=ROWS;y++){ctx_.beginPath();ctx_.moveTo(ox,oy+y*cs);ctx_.lineTo(ox+COLS*cs,oy+y*cs);ctx_.stroke();}

    // Border
    ctx_.strokeStyle = T.boardBorder; ctx_.lineWidth = 2;
    ctx_.strokeRect(ox, oy, COLS * cs, ROWS * cs);
    ctx_.strokeStyle = T.boardAccent; ctx_.lineWidth = 1;
    ctx_.strokeRect(ox+2, oy+2, COLS*cs-4, ROWS*cs-4);

    function dHex_(hx, hy, r, fill, border) {
      ctx_.beginPath();
      for(let i=0;i<6;i++){
        const ang=Math.PI/6+i*Math.PI/3;
        const px_=hx+r*Math.cos(ang), py_=hy+r*Math.sin(ang);
        i===0?ctx_.moveTo(px_,py_):ctx_.lineTo(px_,py_);
      }
      ctx_.closePath();ctx_.fillStyle=fill;ctx_.fill();
      ctx_.strokeStyle=border;ctx_.lineWidth=1.2;ctx_.stroke();
    }

    // Walls
    walls.forEach(w=>{
      const wx_=ox+w.x*cs, wy_=oy+w.y*cs;
      ctx_.fillStyle=T.wallFill;ctx_.fillRect(wx_+1,wy_+1,cs-2,cs-2);
      ctx_.strokeStyle=T.wallStroke;ctx_.lineWidth=0.8;ctx_.strokeRect(wx_+1,wy_+1,cs-2,cs-2);
    });

    // Food
    if(food){
      const px_=ox+food.x*cs+cs/2, py_=oy+food.y*cs+cs/2;
      const r=cs*0.28;
      ctx_.save();ctx_.translate(px_,py_);ctx_.rotate(Math.PI/4);
      ctx_.fillStyle=T.foodFill;ctx_.fillRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
      ctx_.restore();
      ctx_.fillStyle=T.foodDot;
      ctx_.beginPath();ctx_.arc(px_,py_,r*0.2,0,Math.PI*2);ctx_.fill();
    }

    // Snake drawing helper
    function drawDemoSnake_(body, isP, d) {
      const N=body.length;
      for(let i=N-1;i>=0;i--){
        const s=body[i];
        const sx_=ox+s.x*cs+cs/2, sy_=oy+s.y*cs+cs/2;
        const r=cs*0.40;
        const fade=Math.max(0.4,1-i/N*0.5);
        let fill,border;
        if(isP){
          fill=i===0?T.playerHead:i<3?T.playerBody:T.playerTail;
          border=i===0?T.playerHeadBorder:T.playerBodyBorder;
        } else {
          fill=i===0?T.enemyHead:i<3?T.enemyBody:T.enemyTail;
          border=i===0?T.enemyHeadBorder:T.enemyBodyBorder;
        }
        if(fade<1){ctx_.save();ctx_.globalAlpha=fade*0.85+0.15;}
        dHex_(sx_,sy_,r,fill,border);
        if(fade<1) ctx_.restore();
      }
      // Eyes
      if(body.length>0 && d){
        const hd=body[0];
        const hx_=ox+hd.x*cs+cs/2, hy_=oy+hd.y*cs+cs/2;
        const perp={x:d.y,y:-d.x};
        const eyeR=cs*0.065, eyeOff=cs*0.15, eyeFwd=cs*0.12;
        [1,-1].forEach(side=>{
          const ex=hx_+d.x*eyeFwd+perp.x*eyeOff*side;
          const ey=hy_+d.y*eyeFwd+perp.y*eyeOff*side;
          ctx_.fillStyle=T.snakeEye;ctx_.beginPath();ctx_.arc(ex,ey,eyeR,0,Math.PI*2);ctx_.fill();
          ctx_.fillStyle=T.snakePupil;ctx_.beginPath();ctx_.arc(ex+d.x*eyeR*0.35,ey+d.y*eyeR*0.35,eyeR*0.5,0,Math.PI*2);ctx_.fill();
        });
      }
    }

    if(enemy.length>0) drawDemoSnake_(enemy,false,enemyDir);
    drawDemoSnake_(snake,true,dir);

    // Dead overlay
    if(!alive){
      ctx_.fillStyle='rgba(8,4,2,0.5)';ctx_.fillRect(ox,oy,COLS*cs,ROWS*cs);
      ctx_.font="bold "+Math.round(cs*1.2)+"px 'Barlow Condensed',sans-serif";
      ctx_.fillStyle=T.danger;ctx_.textAlign='center';
      ctx_.fillText('TERMINATED',ox+COLS*cs/2,oy+ROWS*cs/2+cs*0.3);
      ctx_.textAlign='left';
    }
  }

  function _renderWithHUD(ctx_, cellSz_, ids, statusLabels) {
    if (!ctx_) return;
    if (!cellSz_) return;
    _renderBoard(ctx_, cellSz_);
    const elScore  = document.getElementById(ids.score);
    const elLen    = document.getElementById(ids.len);
    const elKills  = document.getElementById(ids.kills);
    const elStatus = document.getElementById(ids.status);
    if (elScore) elScore.textContent = score;
    if (elLen) elLen.textContent = snake.length;
    if (elKills) elKills.textContent = kills;
    if (elStatus) {
      if (!alive) { elStatus.textContent = statusLabels.dead; elStatus.style.color = statusLabels.deadColor; }
      else        { elStatus.textContent = statusLabels.alive; elStatus.style.color = statusLabels.aliveColor; }
    }
  }

  function render(){
    if(!cvs||!cx) return;
    if(!cellSz) resize();
    _renderWithHUD(cx, cellSz,
      { score:'demo-score', len:'demo-len', kills:'demo-kills', status:'demo-status' },
      { dead:'DEAD', deadColor:'var(--vhs-r)', alive:'HUNTING', aliveColor:'var(--phosphor)' }
    );
  }

  function renderSpring(){
    if(!_sp2Cvs||!_sp2Cx) return;
    if(!_sp2CellSz) { resizeSecondary(); if (!_sp2CellSz) return; }
    _renderWithHUD(_sp2Cx, _sp2CellSz,
      { score:'spScore', len:'spLen', kills:'spKills', status:'spStatus' },
      { dead:'● 已终止', deadColor:'#CC2020', alive:'● 在线', aliveColor:'#D4A820' }
    );
  }

  function update(){
    tickCD++;
    if(!alive){
      restartCD--;
      if(restartCD<=0) reset();
      return;
    }
    if(tickCD>=6){ tickCD=0; tick(); }
  }

  return { init, initSecondary, reset, resize, resizeSecondary, render, renderSpring, update };
})();

function stopMenuBg() {
  if (menuBgRaf) { cancelAnimationFrame(menuBgRaf); menuBgRaf = null; }
  if (_menuBgInst && _menuBgInst.cleanup) { _menuBgInst.cleanup(); _menuBgInst = null; }
}

function initMenuBg() {
  if (menuBgRaf) {
    cancelAnimationFrame(menuBgRaf);
    menuBgRaf = null;
  }
  
  // Clean up previous instance
  if (_menuBgInst && _menuBgInst.cleanup) {
    _menuBgInst.cleanup();
  }
  
  // Ensure startScreen is visible
  const ss = document.getElementById('startScreen');
  if (ss) {
    ss.style.display = 'flex';
  }
  
  // Delay initialization to ensure DOM is updated
  setTimeout(() => {
    _menuBgInst = makeMenuBg('startBg');
    if (!_menuBgInst) return;
    
    // Initialize demo game preview
    DemoGame.init();
    DemoGame.resize();
    
    let _bgSkip = false;
    function loop() {
      const ss = document.getElementById('startScreen');
      if (!ss || ss.style.display === 'none') return;
      // Mobile: 30fps (skip every other frame)
      if (window.perfLevel !== 'high') { _bgSkip = !_bgSkip; if (_bgSkip) { menuBgRaf = requestAnimationFrame(loop); return; } }
      _menuBgInst.frame();
      if (window.perfLevel === 'high') { DemoGame.update(); DemoGame.render(); }
      menuBgRaf = requestAnimationFrame(loop);
    }
    menuBgRaf = requestAnimationFrame(loop);
  }, 50); // 50ms delay ensures layout is complete
}

// ═══════════════════════════════════════════════════════════
// ═══ SPRING FESTIVAL BACKGROUND ENGINE (赛博春节)
// ═══════════════════════════════════════════════════════════

// ── Lantern drawing (pure Canvas, zero assets) ──
function drawLantern(ctx, t) {
  const w = 110, h = 170;
  ctx.clearRect(0, 0, w, h);

  const swing = Math.sin(t * 0.8) * 0.04;
  ctx.save();
  ctx.translate(w / 2, 0);
  ctx.rotate(swing);
  ctx.translate(-w / 2, 0);

  const cxL = w / 2;
  const topY = 22;
  const bodyH = 100;
  const bodyW = 60;
  const bodyTopY = topY + 14;
  const bodyBotY = bodyTopY + bodyH;
  const midY = (bodyTopY + bodyBotY) / 2;

  // Suspension ropes
  ctx.strokeStyle = '#C8A010';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cxL - 14, 2);  ctx.lineTo(cxL - 12, topY - 1);
  ctx.moveTo(cxL + 14, 2);  ctx.lineTo(cxL + 12, topY - 1);
  ctx.stroke();

  // Inner glow (drawn first, behind body)
  const pulse = 0.3 + 0.1 * Math.sin(t * 1.4);
  const glow = ctx.createRadialGradient(cxL, midY, 0, cxL, midY, bodyW * 0.68);
  glow.addColorStop(0, `rgba(255,160,40,${pulse})`);
  glow.addColorStop(0.55, `rgba(220,70,10,${pulse * 0.5})`);
  glow.addColorStop(1, 'rgba(180,30,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cxL, midY, bodyW * 0.62, bodyH * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top cap
  ctx.fillStyle = '#B89010';
  ctx.fillRect(cxL - 20, topY - 5, 40, 9);
  ctx.fillStyle = '#D4A820';
  ctx.fillRect(cxL - 15, topY - 9, 30, 5);
  ctx.strokeStyle = '#FFD040';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(cxL - 20, topY - 5, 40, 9);

  // Lantern body — 8 bezier strips
  const numStrips = 8;
  const stripW = bodyW / numStrips;
  const bulge = 16;
  for (let i = 0; i < numStrips; i++) {
    const x0 = cxL - bodyW / 2 + i * stripW;
    const x1 = x0 + stripW;
    const bm0 = x0 - bulge * Math.sin((i / numStrips) * Math.PI);
    const bm1 = x1 - bulge * Math.sin(((i + 1) / numStrips) * Math.PI);
    ctx.fillStyle = i % 2 === 0 ? '#CC2020' : '#AA1818';
    ctx.beginPath();
    ctx.moveTo(x0, bodyTopY);
    ctx.bezierCurveTo(bm0, bodyTopY + bodyH * 0.35, bm0, bodyTopY + bodyH * 0.65, x0, bodyBotY);
    ctx.lineTo(x1, bodyBotY);
    ctx.bezierCurveTo(bm1, bodyTopY + bodyH * 0.65, bm1, bodyTopY + bodyH * 0.35, x1, bodyTopY);
    ctx.closePath();
    ctx.fill();
  }
  // Vertical arc lines
  ctx.strokeStyle = 'rgba(255,80,80,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= numStrips; i++) {
    const x0 = cxL - bodyW / 2 + i * stripW;
    const bm = x0 - bulge * Math.sin((i / numStrips) * Math.PI);
    ctx.beginPath();
    ctx.moveTo(x0, bodyTopY);
    ctx.bezierCurveTo(bm, bodyTopY + bodyH * 0.35, bm, bodyTopY + bodyH * 0.65, x0, bodyBotY);
    ctx.stroke();
  }
  // Horizontal band rings
  ctx.strokeStyle = 'rgba(255,200,60,0.35)';
  ctx.lineWidth = 0.9;
  [bodyTopY + bodyH * 0.28, bodyTopY + bodyH * 0.72].forEach(bandY => {
    ctx.beginPath();
    for (let i = 0; i <= numStrips; i++) {
      const x = cxL - bodyW / 2 + i * stripW;
      const xOff = -bulge * Math.sin((i / numStrips) * Math.PI) * 0.82;
      i === 0 ? ctx.moveTo(x + xOff, bandY) : ctx.lineTo(x + xOff, bandY);
    }
    ctx.stroke();
  });

  // Bottom cap
  ctx.fillStyle = '#B89010';
  ctx.fillRect(cxL - 20, bodyBotY - 1, 40, 7);
  ctx.fillStyle = '#D4A820';
  ctx.fillRect(cxL - 12, bodyBotY + 5, 24, 5);
  ctx.strokeStyle = '#FFD040';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(cxL - 20, bodyBotY - 1, 40, 7);

  // Tassels
  const tassleTop = bodyBotY + 11;
  const numTassels = 9;
  for (let i = 0; i < numTassels; i++) {
    const tx = cxL - bodyW / 2 + 3 + (i / (numTassels - 1)) * (bodyW - 6);
    const tLen = 18 + Math.sin(i * 1.4 + t * 0.7) * 4;
    const sway = Math.sin(t * 0.8 + i * 0.6) * 2.5;
    ctx.strokeStyle = i % 2 === 0 ? '#D4A820' : '#FF8C30';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(tx, tassleTop);
    ctx.lineTo(tx + sway, tassleTop + tLen);
    ctx.stroke();
    ctx.fillStyle = '#FFD060';
    ctx.beginPath();
    ctx.arc(tx + sway, tassleTop + tLen + 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Spring particle helpers ──
function _makeSpringPetal(W, H) {
  return {
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.25,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.35 + Math.random() * 0.45,
    rot: Math.random() * Math.PI * 2,
    rotSpd: (Math.random() - 0.5) * 0.035,
    size: 4 + Math.random() * 4.5,
    col: Math.random() < 0.65 ? '#FFB0B8' : '#FFE0E8',
    alpha: 0.35 + Math.random() * 0.4,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpd: 0.018 + Math.random() * 0.018,
  };
}

function _makeSpringEmber(W, H) {
  return {
    x: W * 0.15 + Math.random() * W * 0.7,
    y: H + 8,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -(0.45 + Math.random() * 0.7),
    life: 1.0,
    decay: 0.0025 + Math.random() * 0.003,
    size: 0.8 + Math.random() * 2,
    col: Math.random() < 0.55 ? '#FFD040' : '#FF9040',
  };
}

function _drawPetal(ctx, x, y, size, rot, col, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.5, -size * 0.28, size * 0.75, size * 0.5, 0, size);
    ctx.bezierCurveTo(-size * 0.75, size * 0.5, -size * 0.5, -size * 0.28, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,238,120,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Spring menu background canvas ──
function makeSpringBg(canvasId) {
  const cv = document.getElementById(canvasId);
  if (!cv) return null;
  const ctx = cv.getContext('2d');
  let W, H;

  function resize() {
    const parent = cv.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : null;
    W = (rect && rect.width > 0) ? rect.width : 400;
    H = (rect && rect.height > 0) ? rect.height : 600;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    // Spread petals on resize
    petals.forEach(p => { p.y = Math.random() * H; });
  }

  const petals = Array.from({ length: 18 }, () => _makeSpringPetal(400, 600));
  const embers = Array.from({ length: 22 }, () => {
    const e = _makeSpringEmber(400, 600);
    e.y = Math.random() * 600; // spread initially
    e.life = Math.random();
    return e;
  });

  let t = 0;

  function frame() {
    if (!W || !H) return;
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    // Corner lantern glow halos
    const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.55);
    g1.addColorStop(0, 'rgba(180,50,10,0.09)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.65);
    g2.addColorStop(0, 'rgba(200,130,10,0.07)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    // Fine lattice grid
    ctx.strokeStyle = 'rgba(212,168,32,0.04)';
    ctx.lineWidth = 0.5;
    const gs = 28;
    for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Gold scan line (gentle, replaces VHS)
    const scanY = ((t * 55) % (H + 80)) - 40;
    const sg = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 4);
    sg.addColorStop(0, 'rgba(212,168,32,0)');
    sg.addColorStop(0.85, 'rgba(212,168,32,0.03)');
    sg.addColorStop(1, 'rgba(212,168,32,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, scanY - 50, W, 54);

    // Falling petals
    petals.forEach(p => {
      p.wobble += p.wobbleSpd;
      p.x += p.vx + Math.sin(p.wobble) * 0.45;
      p.y += p.vy;
      p.rot += p.rotSpd;
      if (p.y > H + 28) {
        Object.assign(p, _makeSpringPetal(W, H));
        p.y = -15;
      }
      _drawPetal(ctx, p.x, p.y, p.size, p.rot, p.col, p.alpha);
    });

    // Rising embers
    embers.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      e.life -= e.decay;
      if (e.life <= 0 || e.y < -8) {
        Object.assign(e, _makeSpringEmber(W, H));
        return;
      }
      const a = e.life * 0.85;
      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.2);
      const hex = e.col.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.col; ctx.globalAlpha = Math.min(1, a * 1.2);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Corner HUD brackets (gold/red)
    const bSz = 15;
    [[8,8,1,1,'rgba(212,168,32,0.45)'],[W-8,8,-1,1,'rgba(204,32,32,0.4)'],
     [8,H-8,1,-1,'rgba(212,168,32,0.35)'],[W-8,H-8,-1,-1,'rgba(212,168,32,0.35)']
    ].forEach(([px,py,sx,sy,col])=>{
      ctx.strokeStyle=col; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(px+sx*bSz,py); ctx.lineTo(px,py); ctx.lineTo(px,py+sy*bSz); ctx.stroke();
    });

    return { frame };
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  const instance = { frame, resize, cleanup: () => window.removeEventListener('resize', onResize) };
  requestAnimationFrame(() => resize());
  return instance;
}

// ── Lantern animation state ──
let _lanternRaf = null;
let _lanternT = 0;

function _startLanternAnim() {
  if (_lanternRaf) return;
  const cv = document.getElementById('lanternCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  function loop() {
    _lanternT += 0.016;
    drawLantern(ctx, _lanternT);
    _lanternRaf = requestAnimationFrame(loop);
  }
  _lanternRaf = requestAnimationFrame(loop);
}

function _stopLanternAnim() {
  if (_lanternRaf) { cancelAnimationFrame(_lanternRaf); _lanternRaf = null; }
}

// ── Fireworks window ──
function makeFireworksWindow(canvasId) {
  const cvs = document.getElementById(canvasId);
  if (!cvs) return null;
  const ctx = cvs.getContext('2d');

  let W, H;
  function resize() {
    const rect = cvs.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = rect.width * dpr;
    cvs.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rect.width; H = rect.height;
  }
  resize();

  const rockets = [];
  const bursts = [];
  let launchTimer = 0;

  const COLORS = ['#CC2020','#D4A820','#FFF8E8','#FF6040','#00E8B0'];
  const GRAVITY = 0.03;

  function launch() {
    rockets.push({
      x: W * (0.15 + Math.random() * 0.7),
      y: H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(2.5 + Math.random() * 1.5),
      targetY: H * (0.15 + Math.random() * 0.35),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      trail: []
    });
  }

  function explode(rocket) {
    const _maxBurst = window.perfLevel==='low'?40:window.perfLevel==='medium'?70:90;
    const count = _maxBurst + Math.floor(Math.random() * Math.floor(_maxBurst*0.67));
    const particles = [];
    const isWillow = Math.random() < 0.3;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count + (Math.random() - 0.5) * 0.3;
      const speed = (1.5 + Math.random() * 2.5) * (isWillow ? 0.7 : 1);
      particles.push({
        x: rocket.x, y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.004 + Math.random() * 0.006,
        gravity: isWillow ? 0.06 : GRAVITY
      });
    }
    bursts.push({ particles, color: rocket.color });
  }

  // 万字纹/回字纹窗棂
  function drawLattice() {
    const pad = 8;
    const barW = 3;
    const woodColor = 'rgba(90,35,15,0.75)';
    const woodHL = 'rgba(140,65,25,0.3)';
    ctx.lineCap = 'square';

    // Outer frame
    ctx.strokeStyle = woodColor;
    ctx.lineWidth = barW + 2;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    ctx.strokeStyle = woodHL;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 1, pad + 1, W - pad * 2 - 2, H - pad * 2 - 2);

    // Grid
    ctx.strokeStyle = woodColor;
    ctx.lineWidth = barW;
    const cellSz = Math.min((W - pad * 2) / 6, (H - pad * 2) / 8);
    if (cellSz < 4) return;
    const cols = Math.floor((W - pad * 2) / cellSz);
    const rows = Math.floor((H - pad * 2) / cellSz);
    const ox = pad + ((W - pad * 2) - cols * cellSz) / 2;
    const oy = pad + ((H - pad * 2) - rows * cellSz) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * cellSz;
        const y = oy + r * cellSz;
        const s = cellSz;
        const q = s / 4;
        ctx.beginPath();
        if ((r + c) % 2 === 0) {
          // Cross + hooks
          ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s, y + s / 2);
          ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s / 2, y + s);
          ctx.moveTo(x + s / 2, y + q); ctx.lineTo(x + s - q, y + q);
          ctx.moveTo(x + s - q, y + s / 2); ctx.lineTo(x + s - q, y + s - q);
          ctx.moveTo(x + s / 2, y + s - q); ctx.lineTo(x + q, y + s - q);
          ctx.moveTo(x + q, y + s / 2); ctx.lineTo(x + q, y + q);
        } else {
          // Border square
          ctx.moveTo(x, y); ctx.lineTo(x + s, y);
          ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s);
          ctx.moveTo(x + s, y + s); ctx.lineTo(x, y + s);
          ctx.moveTo(x, y + s); ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  function frame() {
    // 如果尺寸为 0 或 undefined，尝试重新获取（持续重试直到布局完成）
    if (!W || !H) { resize(); if (!W || !H) return; }
    ctx.clearRect(0, 0, W, H);

    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0A0820');
    sky.addColorStop(1, '#1A0A10');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.trail.push({ x: r.x, y: r.y, a: 1 });
      r.x += r.vx; r.y += r.vy;
      for (let j = r.trail.length - 1; j >= 0; j--) {
        const t = r.trail[j];
        t.a *= 0.92;
        if (t.a < 0.05) { r.trail.splice(j, 1); continue; }
        ctx.fillStyle = `rgba(255,220,160,${t.a * 0.6})`;
        ctx.fillRect(t.x - 1, t.y - 1, 2, 2);
      }
      if (r.y <= r.targetY) { explode(r); rockets.splice(i, 1); }
    }

    // Bursts
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      let allDead = true;
      for (let j = 0; j < b.particles.length; j++) {
        const p = b.particles[j];
        if (p.life <= 0) continue;
        allDead = false;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99; p.vy *= 0.99;
        p.life -= p.decay;
        const sz = 3.5 * p.life;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = b.color;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(p.x - sz * 0.3, p.y - sz * 0.3, sz * 0.6, sz * 0.6);
      }
      ctx.globalAlpha = 1;
      if (allDead) bursts.splice(i, 1);
    }

    // Auto-launch
    launchTimer++;
    if (launchTimer > 80 + Math.random() * 100) { launch(); launchTimer = 0; }

    // Lattice overlay
    drawLattice();
  }

  // Initial launch so fireworks appear immediately
  launch();
  launch();

  return { frame, resize, cleanup() {} };
}

// ── Spring menu loop state ──
let _springMenuRaf = null;
let _springBgInst = null;
let _fireworksInst = null;

function initMenuBgSpring() {
  menuBgSpringStop();

  const ss = document.getElementById('startScreen');
  if (ss) ss.style.display = 'flex';

  setTimeout(() => {
    _springBgInst = makeSpringBg('spBg');
    _startLanternAnim();

    _fireworksInst = makeFireworksWindow('spWindowCanvas');

    let _spSkip = false;
    function loop() {
      const spMain = document.getElementById('spMain');
      if (!spMain || !spMain.classList.contains('show')) {
        menuBgSpringStop();
        return;
      }
      // Mobile: 30fps
      if (window.perfLevel !== 'high') { _spSkip = !_spSkip; if (_spSkip) { _springMenuRaf = requestAnimationFrame(loop); return; } }
      if (_springBgInst) _springBgInst.frame();
      if (_fireworksInst) _fireworksInst.frame();
      _springMenuRaf = requestAnimationFrame(loop);
    }
    _springMenuRaf = requestAnimationFrame(loop);
  }, 50);
}

function menuBgSpringStop() {
  if (_springMenuRaf) { cancelAnimationFrame(_springMenuRaf); _springMenuRaf = null; }
  _stopLanternAnim();
  if (_springBgInst && _springBgInst.cleanup) { _springBgInst.cleanup(); _springBgInst = null; }
  if (_fireworksInst && _fireworksInst.cleanup) { _fireworksInst.cleanup(); _fireworksInst = null; }
}

function initGoBg() {
  // Clean up previous instance
  if (_goBgInst && _goBgInst.cleanup) {
    _goBgInst.cleanup();
  }
  
  // Delay initialization
  setTimeout(() => {
    _goBgInst = makeMenuBg('goBg');
    if (!_goBgInst) return;
    
    let raf;
    function loop() {
      const gs = document.getElementById('goScreen');
      if (!gs || !gs.classList.contains('show')) { 
        cancelAnimationFrame(raf); 
        return; 
      }
      _goBgInst.frame();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }, 50);
}

