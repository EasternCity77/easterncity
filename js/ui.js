'use strict';

// ═══ ui.js ═══
// Evolution tree, HUD, flash, death screen, game over, i18n, goHome, modeToggle

// ═══ EVOLUTION TREE — HONEYCOMB LAYOUT ═══

function curNodes(){return gameMode==='3d'?EVO_NODES_3D:EVO_NODES;}
function curCodes(){return gameMode==='3d'?NODE_CODES_3D:NODE_CODES;}

// ── Hex helpers ──
function _evoBranchCol(branch, EVO) {
  if(branch==='laser')   return {col:EVO.laser,   rgb:EVO.laserRgb};
  if(branch==='missile') return {col:EVO.missile,  rgb:EVO.missileRgb};
  return {col:EVO.mobility, rgb:EVO.mobilityRgb};
}

function _evoHexPath(c, cx, cy, r) {
  c.beginPath();
  for(let i=0;i<6;i++){
    const a = i*Math.PI/3; // flat-top
    const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
    if(i===0) c.moveTo(x,y); else c.lineTo(x,y);
  }
  c.closePath();
}

// Convert node to pixel position
function _evoNodePos(n, cx, cy, sp) {
  return { x: cx + n.dx * sp, y: cy + n.dy * sp };
}

// Point-in-hex test (distance-based for flat-top hex)
function _evoHitHex(mx, my, hx, hy, r) {
  const dx = Math.abs(mx-hx), dy = Math.abs(my-hy);
  if(dx > r || dy > r*0.866) return false;
  return r*0.866 - dy > (dx - r*0.5)*1.732;
}

// ── Floating effect: per-node random phase seeds ──
const _evoFloatSeeds = {};
function _evoFloatOffset(nodeId, now) {
  let s = _evoFloatSeeds[nodeId];
  if (!s) {
    s = _evoFloatSeeds[nodeId] = {
      px: Math.random()*Math.PI*2, py: Math.random()*Math.PI*2,
      sx: 0.8+Math.random()*0.4,   sy: 0.8+Math.random()*0.4
    };
  }
  return {
    x: Math.sin(now*0.001*s.sx + s.px) * 3,
    y: Math.cos(now*0.0013*s.sy + s.py) * 3
  };
}

// ── Mouse tracking ──
let _evoMouseX = -1, _evoMouseY = -1;
let _evoHoverNode = null;

// ── Selection focus animation ──
let _evoFocusT = 0;
let _evoFocusTarget = null;
let _evoLastFocusTime = 0;
let _evoFocusFinalCx = 0, _evoFocusFinalCy = 0;

// Render position: base + float + mouse attraction
function _evoNodeRenderPos(n, L, now) {
  const base = _evoNodePos(n, L.cx, L.cy, L.sp);
  // Disable floating for selected node when focus is complete
  const isFocused = _evoFocusT > 0.99 && selectedEvo === n.id;
  const f = isFocused ? {x: 0, y: 0} : _evoFloatOffset(n.id, now);
  let x = base.x + f.x, y = base.y + f.y;
  // Mouse attraction (subtle)
  if (_evoMouseX >= 0 && !isFocused) {
    const mdx = x - _evoMouseX, mdy = y - _evoMouseY;
    const dist = Math.sqrt(mdx*mdx + mdy*mdy);
    const maxD = L.hexR * 3;
    if (dist < maxD && dist > 0.1) {
      const strength = (1 - dist/maxD) * 0.06;
      x += (_evoMouseX - x) * strength;
      y += (_evoMouseY - y) * strength;
    }
  }
  return {x, y};
}

// ── Layout params (recalculated each frame) ──
let _evoLayout = {cx:0,cy:0,sp:0,hexR:0};

function _evoCalcLayout() {
  const W = window.innerWidth, H = window.innerHeight;
  let hexR = Math.min(W,H) * (typeof isMobile !== 'undefined' && isMobile ? 0.065 : 0.048);
  hexR = Math.max(hexR, 22); // minimum touch target size
  let sp = hexR * 2.6;
  const isPortrait = typeof isMobile !== 'undefined' && isMobile && H > W;
  let cx = W * 0.5, cy = H * (isPortrait ? 0.38 : 0.44);

  // Selection focus: zoom and center on target node
  if (_evoFocusT > 0.001 && _evoFocusTarget) {
    const zoom = 1 + _evoFocusT * 0.35;
    hexR *= zoom;
    sp *= zoom;
    // Ease-out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - _evoFocusT, 3);
    cx = cx + (_evoFocusFinalCx - cx) * eased;
    cy = cy + (_evoFocusFinalCy - cy) * eased;
  }

  _evoLayout = {cx,cy,sp,hexR,W,H};
  return _evoLayout;
}

// ── Animation state ──
let _evoOpenTime = 0;
let _evoSelectedAnim = 0; // 0-1 for selection scale animation

function nodeState(n) {
  if(unlocked.has(n.id)) return 'unlocked';
  if(n.req.every(r=>unlocked.has(r))) return 'available';
  return 'locked';
}

// ═══ MAIN DRAW ═══
function drawEvoTree() {
  const c = evoCtx;
  const EVO = getTheme().evo;
  const now = performance.now();

  // ── Drive focus animation ──
  const dt = now - (_evoLastFocusTime || now);
  _evoLastFocusTime = now;

  if (selectedEvo) {
    const targetNode = curNodes().find(n => n.id === selectedEvo);
    if (targetNode && (!_evoFocusTarget || _evoFocusTarget.id !== selectedEvo)) {
      _evoFocusTarget = targetNode;
      // Pre-calculate final target position with full zoom (1.35x)
      const W = window.innerWidth, H = window.innerHeight;
      let baseHexR = Math.min(W,H) * (typeof isMobile !== 'undefined' && isMobile ? 0.065 : 0.048);
      baseHexR = Math.max(baseHexR, 22);
      const baseSp = baseHexR * 2.6;
      const finalSp = baseSp * 1.35;
      _evoFocusFinalCx = W / 2 - targetNode.dx * finalSp;
      _evoFocusFinalCy = H / 2 - targetNode.dy * finalSp;
    }
    _evoFocusT = Math.min(1, _evoFocusT + dt * 0.005);
  } else {
    _evoFocusT = Math.max(0, _evoFocusT - dt * 0.006);
    if (_evoFocusT <= 0.001) _evoFocusTarget = null;
  }

  const L = _evoCalcLayout();
  const openT = Math.min(1, (now - _evoOpenTime) / 600); // 600ms entrance
  const focusAlpha = 1 - _evoFocusT * 0.4; // dim background elements during focus

  // Resize canvas to full screen
  const dpr = window.devicePixelRatio||1;
  if(evoCanvas.width !== L.W*dpr || evoCanvas.height !== L.H*dpr) {
    evoCanvas.width = L.W*dpr; evoCanvas.height = L.H*dpr;
    evoCanvas.style.width = L.W+'px'; evoCanvas.style.height = L.H+'px';
    c.scale(dpr,dpr);
  }
  c.clearRect(0,0,L.W,L.H);

  // ── Dark base ──
  c.fillStyle = '#07090E';
  c.fillRect(0,0,L.W,L.H);

  // ── Hex grid background ──
  c.globalAlpha = focusAlpha;
  _evoDrawBgGrid(c,L);

  // ── Scanlines ──
  c.fillStyle = 'rgba(0,0,0,0.08)';
  for(let y=0;y<L.H;y+=4) c.fillRect(0,y,L.W,1);

  // ── Branch glow zones ──
  _evoDrawBranchZones(c,L,EVO);
  c.globalAlpha = 1;

  // ── Connections ──
  _evoDrawConnections(c,L,EVO,now,openT);

  // ── CORE hex ──
  c.globalAlpha = focusAlpha;
  _evoDrawCore(c,L,EVO,now,openT);
  c.globalAlpha = 1;

  // ── Nodes ──
  const nodes = curNodes();
  nodes.forEach(n => _evoDrawNode(c,n,L,EVO,now,openT));

  // ── Floating detail card ──
  if(selectedEvo) _evoDrawDetailCard(c,L,EVO,now);

  // ── Title + counter ──
  _evoDrawHUD(c,L,EVO);
}

// ── Background hex grid ──
function _evoDrawBgGrid(c,L) {
  const gs = L.hexR * 1.8;
  c.strokeStyle = 'rgba(0,220,160,0.025)';
  c.lineWidth = 0.5;
  const cols = Math.ceil(L.W/gs)+2, rows = Math.ceil(L.H/(gs*0.866))+2;
  for(let r=0;r<rows;r++){
    for(let q=0;q<cols;q++){
      const ox = q*gs + (r%2)*gs*0.5;
      const oy = r*gs*0.866;
      _evoHexPath(c, ox, oy, gs*0.48);
      c.stroke();
    }
  }
}

// ── Branch glow zones ──
function _evoDrawBranchZones(c,L,EVO) {
  const branches = ['laser','missile','mobility'];
  const angles = [
    {dx:-0.866,dy:-0.5},  // laser: upper-left
    {dx:0.866,dy:-0.5},   // missile: upper-right
    {dx:0,dy:1},           // mobility: down
  ];
  branches.forEach((b,i)=>{
    const bc = _evoBranchCol(b,EVO);
    const gx = L.cx + angles[i].dx * L.sp * 1.5;
    const gy = L.cy + angles[i].dy * L.sp * 1.5;
    const grad = c.createRadialGradient(gx,gy,0, gx,gy, L.sp*2.5);
    grad.addColorStop(0, `rgba(${bc.rgb},0.06)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.fillRect(0,0,L.W,L.H);
  });
}

// ── Connection lines ──
function _evoDrawConnections(c,L,EVO,now,openT) {
  const nodes = curNodes();
  nodes.forEach(n => {
    n.req.forEach(rid => {
      const rn = nodes.find(x=>x.id===rid);
      if(!rn) return;
      const unlRn = unlocked.has(rid), unlN = unlocked.has(n.id);
      const bc = _evoBranchCol(n.branch,EVO);
      const isCross = rn.branch !== n.branch;

      let lineCol, lineW, dash, alpha;
      if(unlN) { lineCol=EVO.unlocked; lineW=2.5; dash=[]; alpha=0.85; }
      else if(unlRn) { lineCol=bc.col; lineW=1.8; dash=[6,4]; alpha=0.7; }
      else { lineCol=EVO.locked; lineW=1; dash=[3,6]; alpha=0.4; }

      const p1 = _evoNodeRenderPos(rn,L,now);
      const p2 = _evoNodeRenderPos(n,L,now);

      // Entrance animation: fade in with ring distance
      const maxD = Math.max(Math.abs(n.dx),Math.abs(n.dy),Math.abs(rn.dx),Math.abs(rn.dy));
      const nodeOpenT = Math.max(0, Math.min(1, (openT*3 - maxD*0.3)));
      if(nodeOpenT<=0) return;

      c.save();
      c.globalAlpha = alpha * nodeOpenT;
      c.strokeStyle = lineCol;
      c.lineWidth = lineW;
      c.setLineDash(dash);
      c.lineCap = 'round';

      if(isCross) {
        // Cross-branch: route through CORE center
        c.beginPath();
        c.moveTo(p1.x,p1.y);
        c.lineTo(L.cx,L.cy);
        c.lineTo(p2.x,p2.y);
        c.stroke();
      } else {
        c.beginPath();
        c.moveTo(p1.x,p1.y);
        c.lineTo(p2.x,p2.y);
        c.stroke();
      }

      // Flowing light dot on unlocked paths
      if(unlN && dash.length===0) {
        c.setLineDash([]);
        const t = (now%2000)/2000;
        let dotX, dotY;
        if(isCross) {
          // Two segments
          if(t<0.5) {
            const tt=t*2;
            dotX=p1.x+(L.cx-p1.x)*tt; dotY=p1.y+(L.cy-p1.y)*tt;
          } else {
            const tt=(t-0.5)*2;
            dotX=L.cx+(p2.x-L.cx)*tt; dotY=L.cy+(p2.y-L.cy)*tt;
          }
        } else {
          dotX=p1.x+(p2.x-p1.x)*t; dotY=p1.y+(p2.y-p1.y)*t;
        }
        c.fillStyle = EVO.unlocked;
        c.shadowColor = EVO.unlocked;
        c.shadowBlur = 8;
        c.beginPath(); c.arc(dotX,dotY,3,0,Math.PI*2); c.fill();
        c.shadowBlur = 0;
      }
      c.restore();
    });
  });

  // ── Dependency particles (white orbs on all connections) ──
  _evoDrawDependencyParticles(c,L,EVO,now,openT);
}

// ── Dependency Particles ──
function _evoDrawDependencyParticles(c,L,EVO,now,openT) {
  const nodes = curNodes();
  const cycleMs = 5000;  // 5s per round trip
  const particleCount = 1;  // particles per connection

  nodes.forEach(n => {
    n.req.forEach(rid => {
      const rn = nodes.find(x=>x.id===rid);
      if(!rn) return;

      const maxD = Math.max(Math.abs(n.dx),Math.abs(n.dy),Math.abs(rn.dx),Math.abs(rn.dy));
      const nodeOpenT = Math.max(0, Math.min(1, (openT*3 - maxD*0.3)));
      if(nodeOpenT<=0) return;

      const isCross = rn.branch !== n.branch;
      const p1 = _evoNodeRenderPos(rn,L,now);
      const p2 = _evoNodeRenderPos(n,L,now);

      for(let i=0; i<particleCount; i++) {
        const offset = i / particleCount;
        const cycleT = ((now + offset * cycleMs) % cycleMs) / cycleMs;
        // Back-and-forth: sin wave maps 0→1→0
        const phase = Math.abs(Math.sin(cycleT * Math.PI));

        let px, py;
        if(isCross) {
          // Two segments: p1→CORE→p2
          const mid = {x: L.cx, y: L.cy};
          const d1 = Math.sqrt((mid.x-p1.x)**2 + (mid.y-p1.y)**2);
          const d2 = Math.sqrt((p2.x-mid.x)**2 + (p2.y-mid.y)**2);
          const total = d1 + d2;
          const ratio = d1 / total;
          if(phase < ratio) {
            // First segment
            const t = phase / ratio;
            px = p1.x + (mid.x - p1.x) * t;
            py = p1.y + (mid.y - p1.y) * t;
          } else {
            // Second segment
            const t = (phase - ratio) / (1 - ratio);
            px = mid.x + (p2.x - mid.x) * t;
            py = mid.y + (p2.y - mid.y) * t;
          }
        } else {
          px = p1.x + (p2.x - p1.x) * phase;
          py = p1.y + (p2.y - p1.y) * phase;
        }

        // Draw particle
        const alpha = 0.2 + 0.3 * Math.sin(phase * Math.PI);
        c.save();
        c.globalAlpha = alpha * nodeOpenT;
        c.fillStyle = '#FFFFFF';
        c.shadowColor = '#FFFFFF';
        c.shadowBlur = 6;
        c.beginPath();
        c.arc(px, py, 2.5, 0, Math.PI*2);
        c.fill();
        c.restore();
      }
    });
  });

  // Core to initial nodes (nodes with no prerequisites)
  _evoDrawCoreToInitialParticles(c,L,EVO,now,openT);
}

// ── Core to Initial Nodes Particles ──
function _evoDrawCoreToInitialParticles(c,L,EVO,now,openT) {
  const nodes = curNodes();
  const cycleMs = 3000;  // 3s per round trip

  nodes.forEach(n => {
    if(n.req.length > 0) return;  // Skip non-initial nodes

    const maxD = Math.max(Math.abs(n.dx), Math.abs(n.dy));
    const nodeOpenT = Math.max(0, Math.min(1, (openT*3 - maxD*0.3)));
    if(nodeOpenT<=0) return;

    const p1 = {x: L.cx, y: L.cy};  // CORE center
    const p2 = _evoNodeRenderPos(n,L,now);

    const cycleT = (now % cycleMs) / cycleMs;
    const phase = Math.abs(Math.sin(cycleT * Math.PI));

    const px = p1.x + (p2.x - p1.x) * phase;
    const py = p1.y + (p2.y - p1.y) * phase;

    // Draw particle
    const alpha = 0.25 + 0.35 * Math.sin(phase * Math.PI);
    c.save();
    c.globalAlpha = alpha * nodeOpenT;
    c.fillStyle = '#FFFFFF';
    c.shadowColor = '#FFFFFF';
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(px, py, 3, 0, Math.PI*2);
    c.fill();
    c.restore();
  });
}

// ── CORE hex ──
function _evoDrawCore(c,L,EVO,now,openT) {
  if(openT<=0) return;
  const pulse = 0.7+0.3*Math.sin(now*0.003);
  const r = L.hexR*1.1*Math.min(1,openT*2);

  c.save();
  // Glow
  c.shadowColor = 'rgba(255,184,48,0.5)';
  c.shadowBlur = 15*pulse;
  _evoHexPath(c,L.cx,L.cy,r);
  c.fillStyle = 'rgba(20,16,8,0.9)';
  c.fill();
  c.shadowBlur=0;

  // Border
  _evoHexPath(c,L.cx,L.cy,r);
  c.strokeStyle = `rgba(255,184,48,${0.4+0.2*pulse})`;
  c.lineWidth = 2;
  c.stroke();

  // Inner hex pattern
  _evoHexPath(c,L.cx,L.cy,r*0.55);
  c.strokeStyle = 'rgba(255,184,48,0.15)';
  c.lineWidth = 1;
  c.stroke();

  // Text
  c.font = `700 ${Math.floor(r*0.38)}px "Share Tech Mono", monospace`;
  c.fillStyle = `rgba(255,184,48,${0.6+0.2*pulse})`;
  c.textAlign='center'; c.textBaseline='middle';
  c.fillText('CORE', L.cx, L.cy);
  c.textBaseline='alphabetic';
  c.restore();
}

// ── Single hex node ──
function _evoDrawNode(c,n,L,EVO,now,openT) {
  const st = nodeState(n);
  const sel = selectedEvo===n.id;
  const hov = _evoHoverNode===n.id && !sel;
  const bc = _evoBranchCol(n.branch,EVO);
  const pos = _evoNodeRenderPos(n,L,now);
  const blink = Math.floor(now/420)%2===0;

  // Entrance animation
  const dist = Math.sqrt(n.dx*n.dx + n.dy*n.dy);
  const nodeOpenT = Math.max(0, Math.min(1, (openT*3 - dist*0.25)));
  if(nodeOpenT<=0) return;

  const scale = sel ? 1.25 : hov ? 1.08 : 1.0;
  const r = L.hexR * scale * nodeOpenT;
  const pulse = 0.6+0.4*Math.sin(now*0.004);

  c.save();

  // ── Focus blur for non-selected nodes ──
  if(_evoFocusT > 0.01 && !sel) {
    c.filter = `blur(${(_evoFocusT*2.5).toFixed(1)}px)`;
    c.globalAlpha = 1 - _evoFocusT*0.3;
  }

  // ── Determine colors ──
  let bgCol, borderCol, labelCol, glowRgb;
  if(st==='unlocked') {
    bgCol='rgba(0,40,20,0.85)'; borderCol=EVO.unlocked; labelCol=EVO.unlocked; glowRgb=EVO.unlockedRgb;
  } else if(st==='available') {
    bgCol = sel ? `rgba(${bc.rgb},0.2)` : 'rgba(10,14,22,0.88)';
    borderCol = bc.col; labelCol = sel ? '#FFF' : bc.col; glowRgb = bc.rgb;
  } else {
    bgCol='rgba(6,8,14,0.8)'; borderCol=EVO.locked; labelCol=EVO.locked; glowRgb=null;
  }

  // ── Glow ──
  if(glowRgb && (sel || hov || st==='unlocked' || st==='available')) {
    const glowAlpha = sel ? 0.8 : hov ? 0.6 : st==='unlocked' ? 0.5 : 0.3*pulse;
    c.shadowColor = `rgba(${glowRgb},${glowAlpha})`;
    c.shadowBlur = sel ? 20 : hov ? 14 : st==='unlocked' ? 10 : 6*pulse;
  }

  // ── Fill ──
  _evoHexPath(c,pos.x,pos.y,r);
  c.fillStyle = bgCol;
  c.fill();
  c.shadowBlur=0;

  // ── Border ──
  _evoHexPath(c,pos.x,pos.y,r);
  if(st==='locked') { c.setLineDash([4,4]); }
  else { c.setLineDash([]); }
  c.strokeStyle = borderCol;
  c.lineWidth = sel ? 2.5 : st==='unlocked' ? 2 : 1.2;
  c.stroke();
  c.setLineDash([]);

  // ── Inner hex accent ──
  if(st!=='locked') {
    _evoHexPath(c,pos.x,pos.y,r*0.72);
    c.strokeStyle = `rgba(${glowRgb},0.12)`;
    c.lineWidth = 0.8;
    c.stroke();
  }

  // ── Code (top) ──
  const codeSize = Math.max(7, Math.floor(r*0.2));
  c.font = `${codeSize}px "Share Tech Mono", monospace`;
  c.fillStyle = st==='locked' ? 'rgba(30,40,55,0.5)' : `rgba(${glowRgb||'100,130,160'},0.5)`;
  c.textAlign='center';
  c.fillText(curCodes()[n.id]||n.id.toUpperCase(), pos.x, pos.y - r*0.35);

  // ── Label (center) ──
  const labelSize = Math.max(10, Math.floor(r*0.36));
  c.font = `700 ${labelSize}px "Barlow Condensed", sans-serif`;
  c.fillStyle = labelCol;
  if(glowRgb && st!=='locked') {
    c.shadowColor = `rgba(${glowRgb},0.5)`;
    c.shadowBlur = 4;
  }
  c.fillText(n.label, pos.x, pos.y + r*0.08);
  c.shadowBlur=0;

  // ── Status (bottom) ──
  let statusTxt;
  if(st==='unlocked') statusTxt='■ OK';
  else if(st==='available') statusTxt = sel ? (blink?'▶ SEL':'  SEL') : '○ RDY';
  else statusTxt='× LCK';

  c.font = `700 ${codeSize}px "Share Tech Mono", monospace`;
  c.fillStyle = st==='unlocked' ? EVO.unlocked : st==='available' ? bc.col : EVO.locked;
  c.fillText(statusTxt, pos.x, pos.y + r*0.55);

  c.textAlign='left';
  c.restore();
}

// ── Floating detail card ──
function _evoDrawDetailCard(c,L,EVO,now) {
  const sn = curNodes().find(n=>n.id===selectedEvo);
  if(!sn) return;
  const bc = _evoBranchCol(sn.branch,EVO);
  const pos = _evoNodeRenderPos(sn,L,now);

  // Card dimensions
  const cw = Math.min(240, L.W*0.2);
  const ch = 130;

  // Position: try right side of node, then left if too close to edge
  let cx = pos.x + L.hexR*1.6;
  let cy = pos.y - ch*0.3;
  if(cx + cw > L.W - 20) cx = pos.x - L.hexR*1.6 - cw;
  if(cy < 20) cy = 20;
  if(cy + ch > L.H - 20) cy = L.H - ch - 20;

  c.save();

  // Background
  c.fillStyle = 'rgba(8,12,20,0.92)';
  c.strokeStyle = bc.col;
  c.lineWidth = 1.5;
  c.shadowColor = `rgba(${bc.rgb},0.4)`;
  c.shadowBlur = 12;
  c.fillRect(cx,cy,cw,ch);
  c.shadowBlur=0;
  c.strokeRect(cx,cy,cw,ch);

  // Top accent line
  c.fillStyle = bc.col;
  c.fillRect(cx,cy,cw,2);

  const pad = 14;
  let ly = cy + 20;

  // Code
  c.font = '8px "Share Tech Mono", monospace';
  c.fillStyle = `rgba(${bc.rgb},0.6)`;
  c.textAlign='left';
  c.fillText(curCodes()[sn.id]||sn.id.toUpperCase(), cx+pad, ly);
  ly += 18;

  // Label
  c.font = '700 16px "Barlow Condensed", sans-serif';
  c.fillStyle = bc.col;
  c.fillText(sn.label, cx+pad, ly);
  ly += 16;

  // Description
  c.font = '10px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(200,190,170,0.8)';
  c.fillText(sn.desc, cx+pad, ly);
  ly += 18;

  // Prerequisites
  if(sn.req.length>0) {
    const reqNames = sn.req.map(r=>curNodes().find(x=>x.id===r)?.label||r).join(', ');
    c.font = '8px "Share Tech Mono", monospace';
    c.fillStyle = 'rgba(100,130,160,0.6)';
    c.fillText(`前置: ${reqNames}`, cx+pad, ly);
    ly += 14;
  }

  // Confirm prompt (blinking)
  if(Math.floor(now/500)%2===0) {
    c.font = '700 9px "Share Tech Mono", monospace';
    c.fillStyle = bc.col;
    c.fillText('[ CONFIRM INSTALL ]', cx+pad, ly+4);
  }

  c.restore();
}

// ── Title + counter HUD ──
function _evoDrawHUD(c,L,EVO) {
  // Top-left title
  c.font = '11px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(232,100,10,0.4)';
  c.textAlign='left';
  c.fillText('RHINE LAB · EVOLUTION PROTOCOL v3.0', 24, 30);

  c.font = '700 22px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(232,100,10,0.7)';
  c.fillText('干员进化', 24, 56);

  // Bottom-right counter
  c.font = '9px "Share Tech Mono", monospace';
  c.fillStyle = 'rgba(100,130,160,0.5)';
  c.textAlign='right';
  c.fillText(`${unlocked.size} / ${curNodes().length}  INSTALLED`, L.W-24, L.H-20);

  // Branch legends (bottom-left)
  const branches = [
    {name:'LASER',   branch:'laser'},
    {name:'MISSILE', branch:'missile'},
    {name:'MOBILITY',branch:'mobility'},
  ];
  c.textAlign='left';
  let ly = L.H - 60;
  branches.forEach(b=>{
    const bc = _evoBranchCol(b.branch,EVO);
    c.fillStyle = bc.col;
    c.fillRect(24,ly-6,8,8);
    c.font = '8px "Share Tech Mono", monospace';
    c.fillStyle = 'rgba(160,170,180,0.6)';
    c.fillText(b.name, 38, ly+1);
    ly += 16;
  });

  c.textAlign='left';
}

// ── Click handler ──
function onEvoClick(e) {
  // In debug mode, let drag take priority
  if (debugMode && isDragging) return;

  const L = _evoCalcLayout();
  const rect = evoCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left);
  const my = (e.clientY - rect.top);
  const now = performance.now();

  // Check nodes (reverse order so top-drawn nodes get priority)
  const nodes = curNodes();
  for(let i=nodes.length-1;i>=0;i--){
    const n = nodes[i];
    const pos = _evoNodeRenderPos(n,L,now);
    if(_evoHitHex(mx,my,pos.x,pos.y,L.hexR*1.1)) {
      const st = nodeState(n);
      if(st==='available') {
        selectedEvo = n.id;
        document.getElementById('evoWarn').textContent='';
        drawEvoTree();
      } else if(st==='unlocked') {
        document.getElementById('evoWarn').textContent='/ 该节点已激活';
      } else {
        document.getElementById('evoWarn').textContent='/ 需要先解锁前置节点';
      }
      return;
    }
  }
  // Click on empty space: deselect
  if(selectedEvo) { selectedEvo=null; drawEvoTree(); }
}

let evoRaf = null;
let evoEventsInit = false;
function startEvoRedraw() {
  // Initialize debug events once
  if (!evoEventsInit) {
    initEvoDebugEvents();
    evoEventsInit = true;
  }
  _evoOpenTime = performance.now();
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
    case'combo_ext': u.combo_ext = (u.combo_ext || 0) + 1; break;
    case'xp_boost': u.xp_boost = 1; break;
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
  // Mobile: hide touch controls, unlock orientation
  if (typeof showTouchControls === 'function') showTouchControls(false);
  if (typeof unlockOrientation === 'function') unlockOrientation();
  document.body.classList.remove('game-active');
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
    // Mobile: hide touch controls
    if (typeof showTouchControls === 'function') showTouchControls(false);
    document.body.classList.remove('game-active');
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

// ═══ OPERATOR'S MANUAL ═══

let manualLang = 'en';
let manualCurrentPage = 0;
const MANUAL_PAGE_COUNT = 6;

const MANUAL_I18N = {
  t_move:  {en:'§ SECTION 01 — MOVE',          cn:'§ 章节 01 — 移动操控'},
  t_combo: {en:'§ SECTION 02 — COMBO',         cn:'§ 章节 02 — 连击系统'},
  t_laser: {en:'§ SECTION 03 — LASER',         cn:'§ 章节 03 — 激光武器'},
  t_skill: {en:'§ SECTION 04 — SKILL',         cn:'§ 章节 04 — 主动技能'},
  t_evo:   {en:'§ SECTION 05 — EVOLUTION',     cn:'§ 章节 05 — 进化树'},
  t_threat:{en:'§ SECTION 06 — THREAT',        cn:'§ 章节 06 — 威胁系统'},
  c_move: {
    en:'<p>Navigate your snake across the hexagonal grid.</p><p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> — Change direction</p><p>Eat the flashing food cell to grow longer and earn points. The longer you survive, the higher the threat level rises.</p><p>Avoid collisions with walls, enemy snakes, and your own body — any contact is fatal.</p>',
    cn:'<p>在六边形网格上操控你的蛇。</p><p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 或 <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> — 改变方向</p><p>吃掉闪烁的食物来增长身体并获得分数。存活时间越长，威胁等级越高。</p><p>避免碰撞墙壁、敌蛇和自己的身体 — 任何接触都会致命。</p>'
  },
  c_combo: {
    en:'<p>Eating food in quick succession builds a combo chain:</p><p>×1.0 → ×1.5 → ×2.0 → ×2.5 → ... → ×4.0 (max)</p><p>Each food eaten within the combo window extends the timer. If you go too long without eating, the combo resets to ×1.</p><p>Higher combos mean higher scores — plan your route to chain food pickups efficiently.</p>',
    cn:'<p>快速连续吃食物可以积累连击：</p><p>×1.0 → ×1.5 → ×2.0 → ×2.5 → ... → ×4.0（上限）</p><p>在连击时间窗口内吃到食物会刷新计时器。如果间隔太久没吃到食物，连击倍率重置为 ×1。</p><p>更高的连击意味着更高的分数 — 规划路线以高效串联食物。</p>'
  },
  c_laser: {
    en:'<p><kbd>J</kbd> — Fire laser beam in your current direction.</p><p>The laser has a 5-second cooldown (upgradeable). It damages enemy snakes on contact, removing segments or killing them outright.</p><p>Upgrade paths include: multi-beam, pierce (penetrate through enemies), double damage, and slow enchantment.</p><p>The cooldown indicator is shown on the HUD bar at the top.</p>',
    cn:'<p><kbd>J</kbd> — 向当前方向发射激光。</p><p>激光有 5 秒冷却时间（可升级缩短）。命中敌蛇时会移除身体段或直接击杀。</p><p>升级路线包括：多束激光、穿透（贯穿敌蛇）、双倍伤害、减速附魔。</p><p>冷却进度显示在顶部 HUD 栏中。</p>'
  },
  c_skill: {
    en:'<p><kbd>K</kbd> — Time Slow: briefly freeze the world, then slow enemies and bullets to 20% speed while you move at 70%. Cooldown: 20s.</p><p><kbd>L</kbd> — Tracking Missiles: launch homing missiles that orbit your head, then lock onto and pursue the nearest enemy. Cooldown: 10s.</p><p>Both skills can be enhanced through the Evolution Tree — increase duration, reduce cooldown, add missile count or pierce.</p>',
    cn:'<p><kbd>K</kbd> — 时间减缓：短暂冻结世界，随后敌人和子弹减速至 20%，你的移速为 70%。冷却：20 秒。</p><p><kbd>L</kbd> — 追踪飞弹：发射环绕蛇头的自导飞弹，锁定并追踪最近的敌蛇。冷却：10 秒。</p><p>两个技能都可以通过进化树强化 — 增加持续时间、缩短冷却、增加飞弹数量或穿透。</p>'
  },
  c_evo: {
    en:'<p>Collect blue XP orbs dropped by defeated enemies. Fill the XP bar to level up and unlock one evolution node.</p><p>Three upgrade paths:</p><p>▸ <span class="mn-branch laser">LASER</span> — More beams, pierce, damage, slow enchant. High investment, devastating control.</p><p>▸ <span class="mn-branch missile">MISSILE</span> — More missiles, wall pierce, bonus damage. Independent burst path.</p><p>▸ <span class="mn-branch mobility">MOBILITY</span> — Speed boost, quick turn, time slow upgrades, combo extension, XP boost. Growth-oriented.</p><p>Each level-up expands the map, giving you more room but also more enemies.</p>',
    cn:'<p>收集击败敌蛇掉落的蓝色 XP 球。填满经验条即可升级并解锁一个进化节点。</p><p>三条升级路线：</p><p>▸ <span class="mn-branch laser">激光</span> — 更多光束、穿透、伤害、减速附魔。高投入，毁灭性控制。</p><p>▸ <span class="mn-branch missile">飞弹</span> — 更多飞弹、穿墙、额外伤害。独立爆发路线。</p><p>▸ <span class="mn-branch mobility">机动</span> — 加速、急转、时缓强化、连击延长、经验加成。成长导向。</p><p>每次升级会扩大地图，给你更多空间，但也带来更多敌人。</p>'
  },
  c_threat: {
    en:'<p>Threat level increases over time. Higher threat means:</p><p>▸ More enemy snakes spawning on the map</p><p>▸ Enemies shoot bullets more frequently</p><p>▸ Bullets gain speed and spread patterns at higher levels</p><p>Walls appear and disappear periodically — they block movement, lasers, and missiles.</p><p>Speed items (▲/▼) spawn on the map — collect them to temporarily boost or reduce your speed.</p>',
    cn:'<p>威胁等级随时间持续上升。更高的威胁意味着：</p><p>▸ 地图上生成更多敌蛇</p><p>▸ 敌蛇更频繁地发射子弹</p><p>▸ 高等级时子弹获得加速和扩散模式</p><p>墙壁会周期性地出现和消失 — 它们阻挡移动、激光和飞弹。</p><p>速度道具（▲/▼）会在地图上生成 — 拾取可临时加速或减速。</p>'
  }
};

function openManual() {
  manualCurrentPage = 0;
  document.getElementById('manualScreen').classList.add('show');
  updateManualStack();
  updateManualPageIndicator();
  applyManualLang();
}

function closeManual() {
  document.getElementById('manualScreen').classList.remove('show');
}

function updateManualStack() {
  for (let i = 0; i < MANUAL_PAGE_COUNT; i++) {
    const page = document.getElementById('manPage' + i);
    if (!page) continue;
    page.classList.remove('page-front','page-back-1','page-back-2','page-hidden','page-exit-left','page-exit-right');
    const rel = ((i - manualCurrentPage) + MANUAL_PAGE_COUNT) % MANUAL_PAGE_COUNT;
    if (rel === 0) page.classList.add('page-front');
    else if (rel === 1) page.classList.add('page-back-1');
    else if (rel === 2) page.classList.add('page-back-2');
    else page.classList.add('page-hidden');
  }
}

function updateManualPageIndicator() {
  const el = document.getElementById('manPageInd');
  if (el) el.textContent = '\u00a7' + (manualCurrentPage + 1) + ' / \u00a7' + MANUAL_PAGE_COUNT;
  const prev = document.getElementById('manPrev');
  const next = document.getElementById('manNext');
  if (prev) prev.disabled = manualCurrentPage === 0;
  if (next) next.disabled = manualCurrentPage === MANUAL_PAGE_COUNT - 1;
}

function manualNextPage() {
  if (manualCurrentPage >= MANUAL_PAGE_COUNT - 1) return;
  const oldPage = document.getElementById('manPage' + manualCurrentPage);
  if (oldPage) {
    oldPage.classList.remove('page-front');
    oldPage.classList.add('page-exit-left');
  }
  manualCurrentPage++;
  // immediately position new front + back pages
  for (let i = 0; i < MANUAL_PAGE_COUNT; i++) {
    if (i === manualCurrentPage - 1) continue; // exiting page handled above
    const page = document.getElementById('manPage' + i);
    if (!page) continue;
    page.classList.remove('page-front','page-back-1','page-back-2','page-hidden');
    const rel = ((i - manualCurrentPage) + MANUAL_PAGE_COUNT) % MANUAL_PAGE_COUNT;
    if (rel === 0) page.classList.add('page-front');
    else if (rel === 1) page.classList.add('page-back-1');
    else if (rel === 2) page.classList.add('page-back-2');
    else page.classList.add('page-hidden');
  }
  updateManualPageIndicator();
  setTimeout(updateManualStack, 760);
}

function manualPrevPage() {
  if (manualCurrentPage <= 0) return;
  const oldPage = document.getElementById('manPage' + manualCurrentPage);
  if (oldPage) {
    oldPage.classList.remove('page-front');
    oldPage.classList.add('page-exit-right');
  }
  manualCurrentPage--;
  for (let i = 0; i < MANUAL_PAGE_COUNT; i++) {
    if (i === manualCurrentPage + 1) continue;
    const page = document.getElementById('manPage' + i);
    if (!page) continue;
    page.classList.remove('page-front','page-back-1','page-back-2','page-hidden');
    const rel = ((i - manualCurrentPage) + MANUAL_PAGE_COUNT) % MANUAL_PAGE_COUNT;
    if (rel === 0) page.classList.add('page-front');
    else if (rel === 1) page.classList.add('page-back-1');
    else if (rel === 2) page.classList.add('page-back-2');
    else page.classList.add('page-hidden');
  }
  updateManualPageIndicator();
  setTimeout(updateManualStack, 760);
}

function toggleManualLang() {
  manualLang = manualLang === 'en' ? 'cn' : 'en';
  applyManualLang();
}

function applyManualLang() {
  document.querySelectorAll('[data-mn]').forEach(el => {
    const key = el.dataset.mn;
    if (MANUAL_I18N[key]) {
      const val = MANUAL_I18N[key][manualLang];
      if (key.startsWith('c_')) el.innerHTML = val;
      else el.textContent = val;
    }
  });
  const btn = document.querySelector('.manual-lang');
  if (btn) btn.textContent = manualLang === 'en' ? 'EN → 中文' : '中文 → EN';
}

function switchCfgTab(tab) {
  document.getElementById('cfgTabTheme').classList.toggle('active', tab === 'theme');
  document.getElementById('cfgTabVol').classList.toggle('active', tab === 'volume');
  document.getElementById('cfgTabDiff').classList.toggle('active', tab === 'difficulty');

  const content = document.querySelector('.cfg-content');
  const startH = content.offsetHeight;

  document.getElementById('cfgPaneTheme').style.display = tab === 'theme' ? 'block' : 'none';
  document.getElementById('cfgPaneVolume').style.display = tab === 'volume' ? 'block' : 'none';
  document.getElementById('cfgPaneDifficulty').style.display = tab === 'difficulty' ? 'block' : 'none';

  const endH = content.scrollHeight;
  if (startH !== endH) {
    content.style.height = startH + 'px';
    requestAnimationFrame(() => {
      content.style.height = endH + 'px';
    });
    const onEnd = () => { content.style.height = ''; content.removeEventListener('transitionend', onEnd); };
    content.addEventListener('transitionend', onEnd);
  }
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

  // Mobile: show detail panel on tap (hover doesn't work on touch)
  if (typeof isMobile !== 'undefined' && isMobile) {
    showDiffDetail(id);
  }

  // Optional: Save to localStorage
  try {
    localStorage.setItem('hexsnake_difficulty', id);
  } catch(e) {}
}

// ═══ DIFFICULTY DETAIL PANEL ═══
const DIFFICULTY_DATA = {
  easy: {
    initial: 0, spawn: '30s', growth: '60s', max: 3,
    bulletCD: '10s', speed: '400ms', xp: '+0%', cap: 'Lv.5'
  },
  normal: {
    initial: 0, spawn: '20s', growth: '30s', max: 5,
    bulletCD: '8s', speed: '320ms', xp: '+0%', cap: 'Lv.8'
  },
  hard: {
    initial: 1, spawn: '12s', growth: '20s', max: 8,
    bulletCD: '6s', speed: '260ms', xp: '+25%', cap: 'Lv.10'
  },
  hell: {
    initial: 2, spawn: '8s', growth: '15s', max: 12,
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
  const delay = (typeof isMobile !== 'undefined' && isMobile) ? 0 : 1000;
  hideDetailTimer = setTimeout(() => {
    const panel = document.getElementById('diffDetailPanel');
    if (panel) panel.classList.remove('show');
    currentDetailDiff = null;
    hideDetailTimer = null;
  }, delay);
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

// ═══ EVO TREE DEBUG EDITOR ═══
let debugMode = false;
let draggedNode = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// 切换调试模式
function toggleEvoDebug() {
  debugMode = !debugMode;
  const panel = document.getElementById('evoDebugPanel');
  panel.style.display = debugMode ? 'block' : 'none';
  if (debugMode) {
    updateDebugDisplay();
    renderNodeList();
  }
}

// 更新调试显示
function updateDebugDisplay() {
  if (!selectedEvo) {
    document.getElementById('debugSelectedNode').textContent = '—';
    document.getElementById('debugDx').textContent = '0.00';
    document.getElementById('debugDy').textContent = '0.00';
    return;
  }
  const node = curNodes().find(n => n.id === selectedEvo);
  if (node) {
    document.getElementById('debugSelectedNode').textContent = `${node.id} [${node.label}]`;
    document.getElementById('debugDx').textContent = node.dx.toFixed(2);
    document.getElementById('debugDy').textContent = node.dy.toFixed(2);
  }
  renderNodeList();
}

// 渲染节点列表
function renderNodeList() {
  const container = document.getElementById('debugNodeList');
  if (!container) return;
  container.innerHTML = '';
  curNodes().forEach(n => {
    const el = document.createElement('div');
    el.className = 'evo-debug-node-item' + (n.id === selectedEvo ? ' active' : '');
    el.textContent = `${n.id} ${n.label}`;
    el.onclick = () => {
      selectedEvo = n.id;
      updateDebugDisplay();
      drawEvoTree();
    };
    container.appendChild(el);
  });
}

// 微调坐标
function adjustDelta(dDx, dDy) {
  if (!selectedEvo) return;
  const node = EVO_NODES.find(n => n.id === selectedEvo);
  if (node) {
    node.dx = Math.round((node.dx + dDx) * 100) / 100;
    node.dy = Math.round((node.dy + dDy) * 100) / 100;
    updateDebugDisplay();
    drawEvoTree();
  }
}

// 重置坐标
function resetDelta() {
  if (!selectedEvo) return;
  const node = EVO_NODES.find(n => n.id === selectedEvo);
  if (node) {
    node.dx = 0;
    node.dy = 0;
    updateDebugDisplay();
    drawEvoTree();
  }
}

// 导出配置到控制台
function exportConfig() {
  const nodes = EVO_NODES.map(n =>
    `  {id:'${n.id}', label:'${n.label}', desc:'${n.desc}', req:[${n.req.map(r=>`'${r}'`).join(',')}], branch:'${n.branch}', dx:${n.dx.toFixed(1)}, dy:${n.dy.toFixed(1)}}`
  );
  const output = `const EVO_NODES = [\n${nodes.join(',\n')}\n];`;
  console.log(output);
  navigator.clipboard.writeText(output).then(() => {
    alert('配置已导出到控制台并复制到剪贴板！');
  }).catch(() => {
    alert('配置已导出到控制台（剪贴板复制失败，请手动从控制台复制）');
  });
}

// 像素坐标转 delta 坐标
function pixelToDelta(px, py, cx, cy, sp) {
  return {
    dx: (px - cx) / sp,
    dy: (py - cy) / sp
  };
}

// 鼠标事件处理 - 拖拽节点
function onEvoMouseDown(e) {
  const L = _evoCalcLayout();
  const rect = evoCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const now = performance.now();

  // Check for node click (for hover detection)
  const nodes = curNodes();
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const pos = _evoNodeRenderPos(n, L, now);
    if (_evoHitHex(mx, my, pos.x, pos.y, L.hexR * 1.2)) {
      _evoHoverNode = n;
      break;
    }
  }

  // In debug mode, let drag take priority
  if (!debugMode) return false;
  if (_evoHoverNode) {
    draggedNode = _evoHoverNode;
    dragStartX = mx;
    dragStartY = my;
    isDragging = false;
    selectedEvo = _evoHoverNode.id;
    updateDebugDisplay();
    drawEvoTree();
    e.preventDefault();
    return true;
  }
  return false;
}

function onEvoMouseMove(e) {
  const L = _evoCalcLayout();
  const rect = evoCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const now = performance.now();

  // Always track mouse position
  _evoMouseX = mx;
  _evoMouseY = my;

  // Detect hover node
  _evoHoverNode = null;
  for (let i = curNodes().length - 1; i >= 0; i--) {
    const n = curNodes()[i];
    const pos = _evoNodeRenderPos(n, L, now);
    if (_evoHitHex(mx, my, pos.x, pos.y, L.hexR * 1.1)) {
      _evoHoverNode = n;
      break;
    }
  }

  // Debug drag logic
  if (!debugMode || !draggedNode) return;

  // 检测是否开始拖拽（移动距离超过 5 像素）
  if (!isDragging) {
    const dx = mx - dragStartX;
    const dy = my - dragStartY;
    if (dx * dx + dy * dy > 25) { // 5^2 = 25
      isDragging = true;
    } else {
      return; // 移动距离不足，不更新
    }
  }

  const delta = pixelToDelta(mx, my, L.cx, L.cy, L.sp);
  draggedNode.dx = Math.round(delta.dx * 100) / 100;
  draggedNode.dy = Math.round(delta.dy * 100) / 100;
  updateDebugDisplay();
  drawEvoTree();
}

function onEvoMouseUp() {
  isDragging = false;
  draggedNode = null;
}

function onEvoMouseLeave() {
  _evoMouseX = -1;
  _evoMouseY = -1;
  _evoHoverNode = null;
}

// 绑定鼠标事件到 canvas
function initEvoDebugEvents() {
  if (evoCanvas) {
    evoCanvas.addEventListener('mousedown', onEvoMouseDown);
    evoCanvas.addEventListener('mousemove', onEvoMouseMove);
    evoCanvas.addEventListener('mouseup', onEvoMouseUp);
    evoCanvas.addEventListener('mouseleave', onEvoMouseLeave);
  }
}

