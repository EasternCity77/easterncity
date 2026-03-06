'use strict';

// ═══ game-3d.js ═══
// 3D cube mode: cube3D module, startGame3D, loop3D, XP/levelUp

// ═══════════════════════════════════════════════
// ═══ 3D CUBE GAME MODULE ═══
// ═══════════════════════════════════════════════
const cube3D = (function(){
const N=12, M=N-1, TICK_3D=180, CAM_DIST=4.5, FOCAL=3.2;
const FACES=[
  {name:'FRONT',n:[0,0,1],r:[1,0,0],d:[0,1,0]},
  {name:'RIGHT',n:[1,0,0],r:[0,0,-1],d:[0,1,0]},
  {name:'BACK',n:[0,0,-1],r:[-1,0,0],d:[0,1,0]},
  {name:'LEFT',n:[-1,0,0],r:[0,0,1],d:[0,1,0]},
  {name:'TOP',n:[0,-1,0],r:[1,0,0],d:[0,0,1]},
  {name:'BOTTOM',n:[0,1,0],r:[1,0,0],d:[0,0,-1]},
];
const ADJ=[
  [[4,(c,r)=>[c,M],0],[1,(c,r)=>[0,r],1],[5,(c,r)=>[c,0],2],[3,(c,r)=>[M,r],3]],
  [[4,(c,r)=>[M,M-c],3],[2,(c,r)=>[0,r],1],[5,(c,r)=>[M,c],3],[0,(c,r)=>[M,r],3]],
  [[4,(c,r)=>[M-c,0],2],[3,(c,r)=>[0,r],1],[5,(c,r)=>[M-c,M],0],[1,(c,r)=>[M,r],3]],
  [[4,(c,r)=>[0,c],1],[0,(c,r)=>[0,r],1],[5,(c,r)=>[0,M-c],1],[2,(c,r)=>[M,r],3]],
  [[2,(c,r)=>[M-c,0],2],[1,(c,r)=>[M-r,0],2],[0,(c,r)=>[c,0],2],[3,(c,r)=>[r,0],2]],
  [[0,(c,r)=>[c,M],0],[1,(c,r)=>[r,M],0],[2,(c,r)=>[M-c,M],0],[3,(c,r)=>[M-r,M],0]],
];
const DIR_D=[[0,-1],[1,0],[0,1],[-1,0]];
const _s=Math.SQRT2/2;
const INC_Q=[[-_s,0,0,_s],[0,-_s,0,_s],[_s,0,0,_s],[0,_s,0,_s]];

// Quaternion math
function qMul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function qNorm(q){const l=Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]);return l>1e-4?[q[0]/l,q[1]/l,q[2]/l,q[3]/l]:[0,0,0,1];}
function qSlerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=[-b[0],-b[1],-b[2],-b[3]];d=-d;}if(d>.9995){const r=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t];return qNorm(r);}const th=Math.acos(Math.min(1,d)),sT=Math.sin(th);const wa=Math.sin((1-t)*th)/sT,wb=Math.sin(t*th)/sT;return[a[0]*wa+b[0]*wb,a[1]*wa+b[1]*wb,a[2]*wa+b[2]*wb,a[3]*wa+b[3]*wb];}
function m3ToQ(m){const tr=m[0][0]+m[1][1]+m[2][2];let x,y,z,w;if(tr>0){const s=Math.sqrt(tr+1)*2;w=s/4;x=(m[2][1]-m[1][2])/s;y=(m[0][2]-m[2][0])/s;z=(m[1][0]-m[0][1])/s;}else if(m[0][0]>m[1][1]&&m[0][0]>m[2][2]){const s=Math.sqrt(1+m[0][0]-m[1][1]-m[2][2])*2;w=(m[2][1]-m[1][2])/s;x=s/4;y=(m[0][1]+m[1][0])/s;z=(m[0][2]+m[2][0])/s;}else if(m[1][1]>m[2][2]){const s=Math.sqrt(1+m[1][1]-m[0][0]-m[2][2])*2;w=(m[0][2]-m[2][0])/s;x=(m[0][1]+m[1][0])/s;y=s/4;z=(m[1][2]+m[2][1])/s;}else{const s=Math.sqrt(1+m[2][2]-m[0][0]-m[1][1])*2;w=(m[1][0]-m[0][1])/s;x=(m[0][2]+m[2][0])/s;y=(m[1][2]+m[2][1])/s;z=s/4;}return qNorm([x,y,z,w]);}
function q2M(q){const[x,y,z,w]=q;return[[1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y)],[2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x)],[2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y)]];}
function mV(m,v){return[m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];}

// State
let snake=[], snakePrev=[], snakeDir=1, nextDir=1, grow=0;
let food=null, lastScreenDir=1;
let inputMap=[0,1,2,3], inputQueue=[];
let camQ=[0,0,0,1], tgtQ=[0,0,0,1], fromQ=[0,0,0,1];
let camM=[[1,0,0],[0,1,0],[0,0,1]];
let trans=false, transStart=0, transDur=350;
let W=0, H=0;
let mmCtx=null;
let walls3D=[]; // [{cells:[{face,col,row},...], life:ms}, ...]
const WALL3D_LIFE_MIN=18000, WALL3D_LIFE_MAX=26000;
let tickT3D=0;
let xpBalls3D=[];
// Shockwave
let swCD=0, swWave=[], swVisStart=0;
const SW_CD_BASE=8000;

// ── Cross-face neighbor: given (face,col,row,dir), return {face,col,row} ──
function neighbor3D(f,c,r,d){
  const nc=c+DIR_D[d][0], nr=r+DIR_D[d][1];
  if(nc>=0&&nc<N&&nr>=0&&nr<N) return{face:f,col:nc,row:nr};
  const adj=ADJ[f][d]; const mapped=adj[1](c,r);
  return{face:adj[0],col:mapped[0],row:mapped[1]};
}
function cellKey(f,c,r){return f*10000+c*100+r;}

// ── Cross-face BFS: can 'from' reach 'to' avoiding blocked set? ──
function bfs3D(from,to,blockedSet){
  const startK=cellKey(from.face,from.col,from.row);
  const goalK=cellKey(to.face,to.col,to.row);
  if(startK===goalK)return true;
  const vis=new Set([startK]);
  const q=[from];
  while(q.length){
    const cur=q.shift();
    for(let d=0;d<4;d++){
      const nb=neighbor3D(cur.face,cur.col,cur.row,d);
      const k=cellKey(nb.face,nb.col,nb.row);
      if(k===goalK) return true;
      if(vis.has(k)||blockedSet.has(k)) continue;
      vis.add(k); q.push(nb);
    }
  }
  return false;
}

function isWall3D(f,c,r){
  const k=cellKey(f,c,r);
  for(const w of walls3D) for(const cell of w.cells) if(cellKey(cell.face,cell.col,cell.row)===k) return true;
  return false;
}

function wallBlockedSet(extraCells){
  const s=new Set();
  for(const w of walls3D) for(const cell of w.cells) s.add(cellKey(cell.face,cell.col,cell.row));
  // Snake body is also blocked for BFS
  for(const seg of snake) s.add(cellKey(seg.face,seg.col,seg.row));
  if(extraCells) for(const cell of extraCells) s.add(cellKey(cell.face,cell.col,cell.row));
  return s;
}

// ── Generate a wall cluster near a position (same face) ──
function makeWall3D(nearFace,nearCol,nearRow){
  const len=2+Math.floor(Math.random()*3); // 2-4 cells
  const horiz=Math.random()<0.5;
  const dist=2+Math.floor(Math.random()*2);
  const side=Math.random()<0.5?1:-1;
  const jit=Math.floor(Math.random()*3)-1;
  let sc,sr;
  if(horiz){sc=nearCol-Math.floor(len/2)+jit; sr=nearRow+dist*side;}
  else{sc=nearCol+dist*side; sr=nearRow-Math.floor(len/2)+jit;}
  const cells=[];
  const bodySet=new Set(snake.map(s=>cellKey(s.face,s.col,s.row)));
  for(let i=0;i<len;i++){
    const c=horiz?sc+i:sc, r=horiz?sr:sr+i;
    if(c<0||c>=N||r<0||r>=N) continue;
    const k=cellKey(nearFace,c,r);
    if(isWall3D(nearFace,c,r)) continue;
    if(food&&nearFace===food.face&&c===food.col&&r===food.row) continue;
    if(bodySet.has(k)) continue;
    cells.push({face:nearFace,col:c,row:r});
  }
  return cells.length>=2?cells:null;
}

// Atmosphere: particle dust
const DUST=[];
for(let i=0;i<120;i++) DUST.push({
  x:(Math.random()-.5)*14, y:(Math.random()-.5)*10, z:(Math.random()-.5)*14,
  vx:(Math.random()-.5)*.004, vy:(Math.random()-.5)*.003, vz:(Math.random()-.5)*.004,
  size:Math.random()*2.2+0.8, bright:Math.random()*0.5+0.25,
  isBin:Math.random()<0.2, char:Math.random()<0.5?'0':'1',
});

// Atmosphere: orbital ring definitions
// Each ring has a rotation matrix (pre-computed) so we get full axis coverage
const RINGS=[];
(function(){
  // Helper: build rotation matrix from axis+angle
  function rotMat(ax,ay,az){
    const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
    return[
      [cy*cz, sx*sy*cz-cx*sz, cx*sy*cz+sx*sz],
      [cy*sz, sx*sy*sz+cx*cz, cx*sy*sz-sx*cz],
      [-sy,   sx*cy,          cx*cy]
    ];
  }
  // Ring 1: nearly horizontal — wraps around equator (faces 0,1,2,3), slight tilt
  RINGS.push({radius:2.15, mat:rotMat(0.12,0,0.08), speed:0.07, segs:72, color:'232,100,10',
    pattern:[3,1,3,1,6,1,3,1], // dash-gap pattern (repeating)
    tickEvery:9, cursor:true, cursorSpeed:0.15});
  // Ring 2: steep tilt around X — goes over top/bottom (faces 4,5)
  RINGS.push({radius:2.5, mat:rotMat(1.25,0.2,0), speed:-0.05, segs:80, color:'255,184,48',
    pattern:[2,1,2,1,2,1,8,2],
    tickEvery:10, cursor:true, cursorSpeed:-0.1});
  // Ring 3: diagonal — covers a mix of all faces
  RINGS.push({radius:2.85, mat:rotMat(0.5,0.9,0.35), speed:0.032, segs:96, color:'200,180,140',
    pattern:[4,2,1,1,1,1,4,2],
    tickEvery:12, cursor:false, cursorSpeed:0});
})();

const mod = {
  active: false,
  // 3D helpers
  cellPos(fi,c,r){const f=FACES[fi],u=-1+(c+.5)*2/N,v=-1+(r+.5)*2/N;return[f.n[0]+f.r[0]*u+f.d[0]*v,f.n[1]+f.r[1]*u+f.d[1]*v,f.n[2]+f.r[2]*u+f.d[2]*v];},
  cornerPos(fi,c,r){const f=FACES[fi],u=-1+c*2/N,v=-1+r*2/N;return[f.n[0]+f.r[0]*u+f.d[0]*v,f.n[1]+f.r[1]*u+f.d[1]*v,f.n[2]+f.r[2]*u+f.d[2]*v];},
  xform(p){return mV(camM,p);},
  proj(p3){const z=CAM_DIST-p3[2];if(z<.1)return null;const s=FOCAL/z*Math.min(W,H)*.4;return[W/2+p3[0]*s,H/2+p3[1]*s,z];},
  faceZ(fi){return mV(camM,FACES[fi].n)[2];},
  frontFace(fi){return mV(camM,FACES[fi].n)[2]>0;},

  computeInputMap(tq,fi){
    const M2=q2M(tq),f=FACES[fi],rS=mV(M2,f.r),dS=mV(M2,f.d);
    const lv=[[-dS[0],-dS[1]],[rS[0],rS[1]],[dS[0],dS[1]],[-rS[0],-rS[1]]];
    const sc=[[0,-1],[1,0],[0,1],[-1,0]];
    for(let sd=0;sd<4;sd++){let b=-99,bl=0;for(let ld=0;ld<4;ld++){const d=sc[sd][0]*lv[ld][0]+sc[sd][1]*lv[ld][1];if(d>b){b=d;bl=ld;}}inputMap[sd]=bl;}
  },

  init(){
    snake=[{face:0,col:Math.floor(N/2),row:Math.floor(N/2)}];
    snakePrev=[{face:0,col:Math.floor(N/2),row:Math.floor(N/2)}];
    snakeDir=1; nextDir=1; lastScreenDir=1; grow=3;
    inputMap=[0,1,2,3]; inputQueue=[];
    camQ=[0,0,0,1]; tgtQ=[0,0,0,1]; camM=q2M(camQ);
    food=null; walls3D=[]; xpBalls3D=[];
    swCD=0; swWave=[]; swVisStart=0; tickT3D=0;
    mod.spawnFood();
    // Seed initial XP orbs on current face
    for(let i=0;i<2;i++) mod.spawnXP();
    trans=false; mod.active=true;
    mmCtx=document.getElementById('minimap3d').getContext('2d');
    document.getElementById('minimap3d').classList.add('show');
    W=canvas.width; H=canvas.height;
  },

  spawnFood(){
    const occ=new Set();
    for(const s of snake) occ.add(cellKey(s.face,s.col,s.row));
    for(const w of walls3D) for(const c of w.cells) occ.add(cellKey(c.face,c.col,c.row));
    // Find empty cell for food
    let pos=null;
    for(let a=0;a<300;a++){
      const f=Math.floor(Math.random()*6),c=Math.floor(Math.random()*N),r=Math.floor(Math.random()*N);
      if(!occ.has(cellKey(f,c,r))){pos={face:f,col:c,row:r};break;}
    }
    if(!pos){food=null;return;}
    food=pos;
    // Try to spawn 1-2 wall clusters near food
    const numWalls=Math.random()<0.5?1:2;
    for(let w=0;w<numWalls;w++){
      for(let attempt=0;attempt<12;attempt++){
        const wc=makeWall3D(food.face,food.col,food.row);
        if(!wc) continue;
        // BFS check: snake head must still reach food with this new wall
        const blocked=wallBlockedSet(wc);
        if(bfs3D(snake[0],food,blocked)){
          walls3D.push({cells:wc, life:WALL3D_LIFE_MIN+Math.random()*(WALL3D_LIFE_MAX-WALL3D_LIFE_MIN)});
          break;
        }
      }
    }
  },

  handleKey(screenDir){
    const localDir=inputMap[screenDir];
    if(inputQueue.length<3) inputQueue.push({local:localDir, screen:screenDir});
    // Early tick: if past 60% of interval, trigger tick now
    const now=performance.now();
    if(tickT3D>0.6 && mod.active && !gamePaused && now-lastTick>60){
      mod.tick(); gameTime+=mod.tickMs(); lastTick=now;
    }
  },

  tick(){
    // Save prev positions for interpolation
    snakePrev=snake.map(s=>({face:s.face,col:s.col,row:s.row}));

    // Consume one input from queue
    if(inputQueue.length>0){
      const cmd=inputQueue[0];
      const isReverse=(cmd.local+2)%4===snakeDir;
      if(!isReverse){
        nextDir=cmd.local; lastScreenDir=cmd.screen;
        inputQueue.shift();
      } else if(player.upg.quickTurn&&snake.length>=2){
        // 180° quick turn
        snake.reverse();
        snakePrev=snake.map(s=>({face:s.face,col:s.col,row:s.row}));
        const h=snake[0],h2=snake[1];
        // Determine new direction from head to prev segment
        for(let d=0;d<4;d++){
          const nb=neighbor3D(h.face,h.col,h.row,(d+2)%4);
          if(nb.face===h2.face&&nb.col===h2.col&&nb.row===h2.row){snakeDir=d;nextDir=d;break;}
        }
        inputQueue.shift();
      } else {
        inputQueue.shift();
        if(inputQueue.length>0){
          const c2=inputQueue[0];
          if((c2.local+2)%4!==snakeDir){nextDir=c2.local;lastScreenDir=c2.screen;}
          inputQueue.shift();
        }
      }
    }

    snakeDir=nextDir;
    const head=snake[0];
    let nc=head.col+DIR_D[snakeDir][0], nr=head.row+DIR_D[snakeDir][1];
    let nf=head.face, nd=snakeDir;

    if(nc<0||nc>=N||nr<0||nr>=N){
      const adj=ADJ[nf][snakeDir];
      nf=adj[0];const mapped=adj[1](head.col,head.row);
      nc=mapped[0]; nr=mapped[1]; nd=adj[2];
      snakeDir=nd; nextDir=nd; inputQueue=[];
      fromQ=camQ.slice(); tgtQ=qNorm(qMul(INC_Q[lastScreenDir],tgtQ));
      trans=true; transStart=performance.now();
      mod.computeInputMap(tgtQ,nf);
    }

    // Self collision
    if(snake.some(s=>s.face===nf&&s.col===nc&&s.row===nr)){
      mod.die(); return;
    }
    // Wall collision
    if(isWall3D(nf,nc,nr)){
      mod.die(); return;
    }

    snake.unshift({face:nf,col:nc,row:nr});
    // Do NOT touch snakePrev here — prev[0] (old head pos) becomes
    // the interpolation source for the new head, matching 2D behavior

    if(food&&nf===food.face&&nc===food.col&&nr===food.row){
      score+=10; grow+=1; combo++;
      if(combo>maxCombo)maxCombo=combo;
      comboMult=1+Math.floor(combo/3)*0.5;
      lastFoodTS=performance.now();
      mod.spawnFood();
      Audio.sfxEat(combo);
    }

    // XP orb pickup
    const hk=cellKey(nf,nc,nr);
    xpBalls3D=xpBalls3D.filter(b=>{
      if(cellKey(b.face,b.col,b.row)===hk){addXP3D();return false;}
      return true;
    });

    const now=performance.now();
    if(combo>0&&now-lastFoodTS>COMBO_RESET_MS){combo=0;comboMult=1;}

    if(grow>0) grow--; else snake.pop();
    // Sync prev length to match snake (exactly like 2D syncPrev)
    while(snakePrev.length<snake.length) snakePrev.push({...snakePrev[snakePrev.length-1]});
    while(snakePrev.length>snake.length) snakePrev.pop();

    // Periodically spawn XP orbs on the map
    if(Math.random()<0.08 && xpBalls3D.length<6) mod.spawnXP();

    // Decay walls
    for(const w of walls3D) w.life-=mod.tickMs();
    walls3D=walls3D.filter(w=>w.life>0);

    // Decay shockwave CD
    if(swCD>0) swCD=Math.max(0,swCD-mod.tickMs());

    mod.updateHUD();
  },

  tickMs(){
    let t=120;
    if(player.upg.spd>=1) t/=1.2;
    if(player.upg.spd>=2) t/=1.2;
    return Math.round(t);
  },

  // ── XP ──
  spawnXP(){
    const occ=new Set();
    for(const s of snake) occ.add(cellKey(s.face,s.col,s.row));
    for(const w of walls3D) for(const wc of w.cells) occ.add(cellKey(wc.face,wc.col,wc.row));
    for(const b of xpBalls3D) occ.add(cellKey(b.face,b.col,b.row));
    if(food) occ.add(cellKey(food.face,food.col,food.row));
    // 60% chance spawn on current face, 40% random
    const curFace=snake.length>0?snake[0].face:0;
    for(let a=0;a<200;a++){
      const f=(a<120||Math.random()<0.6)?curFace:Math.floor(Math.random()*6);
      const col=Math.floor(Math.random()*N),row=Math.floor(Math.random()*N);
      if(!occ.has(cellKey(f,col,row))){xpBalls3D.push({face:f,col:col,row:row});return;}
    }
  },

  // ── SHOCKWAVE ──
  fireShockwave(){
    if(swCD>0||!mod.active||deathTime)return;
    const head=snake[0];
    const range=player.upg.swRange||2;
    // BFS expand from head
    const vis=new Set([cellKey(head.face,head.col,head.row)]);
    let frontier=[{face:head.face,col:head.col,row:head.row}];
    const wave=[];
    for(let ring=0;ring<=range;ring++){
      for(const c of frontier) wave.push({face:c.face,col:c.col,row:c.row,ring});
      if(ring===range) break;
      const next=[];
      for(const c of frontier){
        for(let d=0;d<4;d++){
          const nb=neighbor3D(c.face,c.col,c.row,d);
          const k=cellKey(nb.face,nb.col,nb.row);
          if(vis.has(k))continue;
          vis.add(k); next.push(nb);
        }
      }
      frontier=next;
    }
    swWave=wave; swVisStart=performance.now();
    swCD=SW_CD_BASE*(player.upg.swCDMult||1);
    // Effects: destroy walls in range
    if(player.upg.wallBreak){
      const waveSet=new Set(wave.map(w=>cellKey(w.face,w.col,w.row)));
      for(const w of walls3D){
        w.cells=w.cells.filter(c=>!waveSet.has(cellKey(c.face,c.col,c.row)));
      }
      walls3D=walls3D.filter(w=>w.cells.length>0);
    }
    Audio.sfxEat(3); // reuse eat sound for now
  },

  die(){
    if(deathTime) return; // prevent re-entry during death animation
    mod.active=false;     // stop ticks immediately
    player={body:snake.map(s=>({x:s.col,y:s.row})),alive:false};
    deathTime=performance.now();
    Audio.stopAllBgm(); Audio.sfxGameOver();
    setTimeout(()=>{
      gameActive=false; deathTime=0;
      if(animId){cancelAnimationFrame(animId);animId=null;}
      document.getElementById('minimap3d').classList.remove('show');
      canvas.style.display='none';
      _showGameOverScreen();
    },1600);
  },

  updateHUD(){
    document.getElementById('hScore').textContent=score;
    document.getElementById('hLevel').textContent=level;
    document.getElementById('hLen').textContent=snake.length;
    document.getElementById('hTime').textContent=Math.floor(gameTime/1000)+'s';
    const spd=player.upg.spd>=2?1.44:player.upg.spd>=1?1.2:1;
    document.getElementById('hSpd').textContent='×'+spd.toFixed(2);
    const cs=document.getElementById('hComboSeg');
    const cv=document.getElementById('hCombo');
    if(combo>=2){cs.style.display='flex';cv.textContent='×'+combo;}else{cs.style.display='none';}
    document.getElementById('hFace').textContent=FACES[snake[0].face].name;
    // XP bar
    const xpEl=document.getElementById('hXP');
    if(xpEl) xpEl.textContent=xp+'/'+xpNeeded;
    const xpFill=document.getElementById('xpFill');
    if(xpFill) xpFill.style.width=Math.round(xp/xpNeeded*100)+'%';
    // Shockwave CD → reuse laser bar
    const cdPct=swCD<=0?100:Math.max(0,100-(swCD/(SW_CD_BASE*(player.upg.swCDMult||1))*100));
    const lasFill=document.getElementById('lasFill');
    if(lasFill) lasFill.style.width=cdPct+'%';
  },

  // ── Draw TRON grid floor (screen-space, does NOT rotate with cube) ──
  drawFloor(c,ts){
    c.save();
    const scroll=(ts*0.00015)%1; // slow scroll
    const vpX=W/2, vpY=H*0.48; // vanishing point (slightly above center)
    const floorTop=H*0.62;      // where floor starts
    const floorBot=H+20;        // below screen edge
    const rows=18, cols=21;
    const halfCols=Math.floor(cols/2);
    const spacing=1/rows;

    // Horizontal lines (scrolling toward viewer)
    c.lineWidth=1;
    for(let i=0;i<rows+2;i++){
      let t=((i*spacing+scroll*spacing)%(1+spacing));
      const y=vpY+(floorBot-vpY)*t*t; // quadratic for perspective compression
      if(y<floorTop||y>floorBot)continue;
      const spread=(y-vpY)/(floorBot-vpY);
      const xL=vpX-W*0.8*spread;
      const xR=vpX+W*0.8*spread;
      const alpha=Math.min(0.35,spread*0.4);
      c.strokeStyle=`rgba(232,100,10,${alpha})`;
      c.beginPath();c.moveTo(xL,y);c.lineTo(xR,y);c.stroke();
    }
    // Vertical lines (converging to vanishing point)
    c.lineWidth=0.8;
    for(let i=-halfCols;i<=halfCols;i++){
      const frac=i/halfCols;
      const botX=vpX+W*0.8*frac;
      const alpha=Math.max(0.05,0.25*(1-Math.abs(frac)*0.7));
      c.strokeStyle=`rgba(232,100,10,${alpha})`;
      c.beginPath();c.moveTo(vpX+frac*W*0.02,floorTop);c.lineTo(botX,floorBot);c.stroke();
    }
    // Horizon glow line
    const grd=c.createLinearGradient(0,floorTop-30,0,floorTop+40);
    grd.addColorStop(0,'rgba(232,100,10,0)');
    grd.addColorStop(0.4,'rgba(232,100,10,0.08)');
    grd.addColorStop(1,'rgba(232,100,10,0)');
    c.fillStyle=grd;c.fillRect(W*0.1,floorTop-30,W*0.8,70);
    c.restore();
  },

  // ── Draw HUD orbital rings (with cube occlusion) ──
  drawRings(c,ts){
    c.save();
    const CUBE_R=1.05; // cube half-extent for occlusion test

    for(const ring of RINGS){
      const angle=ts*0.001*ring.speed;
      const r=ring.radius;
      const segs=ring.segs;
      const pat=ring.pattern;
      const patLen=pat.reduce((a,b)=>a+b,0);

      // Pre-compute all ring points in world space
      const pts=[];
      for(let i=0;i<=segs;i++){
        const a=i/segs*Math.PI*2+angle;
        // Circle in XZ plane, then rotate by ring matrix
        const lx=r*Math.cos(a), ly=0, lz=r*Math.sin(a);
        const m=ring.mat;
        const wx=m[0][0]*lx+m[0][1]*ly+m[0][2]*lz;
        const wy=m[1][0]*lx+m[1][1]*ly+m[1][2]*lz;
        const wz=m[2][0]*lx+m[2][1]*ly+m[2][2]*lz;
        // Camera transform
        const cx=mod.xform([wx,wy,wz]);
        const p=mod.proj(cx);
        // Occlusion: is this point behind the cube?
        const occluded=(Math.abs(wx)<CUBE_R&&Math.abs(wy)<CUBE_R&&Math.abs(wz)<CUBE_R) ||
                       (cx[2]<0&&Math.abs(cx[0])<1.1&&Math.abs(cx[1])<1.1);
        pts.push({p,cx,occluded,a,wx,wy,wz});
      }

      // Draw segments using dash pattern
      let patIdx=0, patAccum=0;
      for(let i=0;i<segs;i++){
        // Advance pattern
        if(patAccum<=0){patAccum=pat[patIdx%pat.length];patIdx++;}
        const isDash=(patIdx%2===1); // odd indices = dash, even = gap
        patAccum--;

        const A=pts[i], B=pts[i+1];
        if(!A.p||!B.p)continue;
        if(A.occluded&&B.occluded)continue; // fully behind cube

        // Depth-based alpha (lowered overall)
        const depthN=(CAM_DIST-A.cx[2])/(CAM_DIST*2);
        let alpha=Math.max(0.05, 0.3*(1-depthN*0.5));
        // Fade if partially occluded
        if(A.occluded||B.occluded) alpha*=0.15;

        if(isDash){
          // Main dash
          c.strokeStyle=`rgba(${ring.color},${alpha})`;
          c.lineWidth=1.4;
          c.beginPath();c.moveTo(A.p[0],A.p[1]);c.lineTo(B.p[0],B.p[1]);c.stroke();
          // Soft glow
          c.strokeStyle=`rgba(${ring.color},${alpha*0.2})`;
          c.lineWidth=3.5;
          c.beginPath();c.moveTo(A.p[0],A.p[1]);c.lineTo(B.p[0],B.p[1]);c.stroke();
        }

        // Tick marks + node dots at intervals
        if(i%ring.tickEvery===0 && !A.occluded){
          // Tick outward
          const ro=r*1.14;
          const lx2=ro*Math.cos(A.a),lz2=ro*Math.sin(A.a);
          const m=ring.mat;
          const twx=m[0][0]*lx2+m[0][2]*lz2, twy=m[1][0]*lx2+m[1][2]*lz2, twz=m[2][0]*lx2+m[2][2]*lz2;
          const tp=mod.proj(mod.xform([twx,twy,twz]));
          if(tp){
            c.strokeStyle=`rgba(${ring.color},${alpha*0.7})`;c.lineWidth=1.2;
            c.beginPath();c.moveTo(A.p[0],A.p[1]);c.lineTo(tp[0],tp[1]);c.stroke();
          }
          // Small square node
          const ns=2.5;
          c.save();
          c.translate(A.p[0],A.p[1]);c.rotate(A.a);
          c.fillStyle=`rgba(${ring.color},${alpha*0.9})`;
          c.fillRect(-ns,-ns,ns*2,ns*2);
          c.strokeStyle=`rgba(${ring.color},${alpha*0.4})`;c.lineWidth=0.8;
          c.strokeRect(-ns-1.5,-ns-1.5,ns*2+3,ns*2+3);
          c.restore();
        }
      }

      // Animated cursor dot
      if(ring.cursor){
        const cursorA=(ts*0.001*ring.cursorSpeed)%(Math.PI*2);
        const lx=r*Math.cos(cursorA),lz=r*Math.sin(cursorA);
        const m=ring.mat;
        const wx=m[0][0]*lx+m[0][2]*lz, wy=m[1][0]*lx+m[1][2]*lz, wz=m[2][0]*lx+m[2][2]*lz;
        const cx2=mod.xform([wx,wy,wz]);
        const occ=(Math.abs(wx)<CUBE_R&&Math.abs(wy)<CUBE_R&&Math.abs(wz)<CUBE_R)||(cx2[2]<0&&Math.abs(cx2[0])<1.1&&Math.abs(cx2[1])<1.1);
        if(!occ){
          const cp=mod.proj(cx2);
          if(cp){
            const depthN2=(CAM_DIST-cx2[2])/(CAM_DIST*2);
            const ca=Math.max(0.15,0.6*(1-depthN2*0.5));
            // Glow
            c.fillStyle=`rgba(${ring.color},${ca*0.15})`;
            c.beginPath();c.arc(cp[0],cp[1],8,0,Math.PI*2);c.fill();
            // Core
            c.fillStyle=`rgba(${ring.color},${ca})`;
            c.beginPath();c.arc(cp[0],cp[1],2.5,0,Math.PI*2);c.fill();
          }
        }
      }
    }
    c.restore();
  },

  // ── Draw floating particles / binary dust ──
  drawParticles(c,ts){
    c.save();
    for(const d of DUST){
      d.x+=d.vx;d.y+=d.vy;d.z+=d.vz;
      if(d.x>7)d.x=-7;if(d.x<-7)d.x=7;
      if(d.y>5)d.y=-5;if(d.y<-5)d.y=5;
      if(d.z>7)d.z=-7;if(d.z<-7)d.z=7;
      const p=mod.proj(mod.xform([d.x,d.y,d.z]));
      if(!p)continue;
      const depthFade=Math.max(0.15,1-p[2]/(CAM_DIST*1.5));
      const alpha=d.bright*depthFade;
      if(alpha<0.03)continue;
      if(d.isBin){
        const fs=Math.max(9,14*depthFade);
        c.font=`${fs}px "Share Tech Mono",monospace`;
        c.fillStyle=`rgba(232,100,10,${alpha*0.7})`;
        c.fillText(d.char,p[0],p[1]);
      } else {
        const sz=d.size*depthFade*1.5;
        // Core dot
        c.fillStyle=`rgba(222,218,208,${alpha*0.8})`;
        c.beginPath();c.arc(p[0],p[1],sz,0,Math.PI*2);c.fill();
        // Subtle glow
        c.fillStyle=`rgba(232,100,10,${alpha*0.2})`;
        c.beginPath();c.arc(p[0],p[1],sz*3,0,Math.PI*2);c.fill();
      }
    }
    c.restore();
  },
  render(ts){
    W=window.innerWidth; H=window.innerHeight;
    tickT3D=Math.min(1,(ts-lastTick)/Math.max(1,mod.tickMs()));
    const c=ctx;
    c.save();
    c.clearRect(0,0,W,H);

    // Background - match 2D
    c.fillStyle='#111110'; c.fillRect(0,0,W,H);

    // Update camera
    if(trans){
      const t=Math.min(1,(ts-transStart)/transDur), e=1-Math.pow(1-t,3);
      camQ=qSlerp(fromQ,tgtQ,e);
      if(t>=1){camQ=tgtQ.slice();trans=false;}
    }
    camM=q2M(camQ);

    // Death state
    let dying=deathTime>0, dProg=dying?(ts-deathTime)/1600:0;
    if(dying&&dProg<0.25){
      const intensity=(1-dProg/0.25)*8;
      c.translate((Math.random()-.5)*intensity,(Math.random()-.5)*intensity);
    }

    // ── Atmosphere layers (behind cube) ──
    mod.drawParticles(c,ts);
    mod.drawFloor(c,ts);

    // Sort and draw faces
    const order=[0,1,2,3,4,5].sort((a,b)=>mod.faceZ(a)-mod.faceZ(b));
    for(const fi of order) mod.drawFace(c,fi,ts);

    // ── HUD rings (overlaid on everything) ──
    mod.drawRings(c,ts);

    // Death overlay
    if(dying){
      if(dProg<0.15){c.fillStyle=`rgba(200,40,30,${(1-dProg/0.15)*0.55})`;c.fillRect(0,0,W,H);}
      if(dProg>0.12){
        const a=Math.min(1,(dProg-0.12)/0.6)*0.92;
        c.fillStyle=`rgba(6,5,10,${a})`;c.fillRect(0,0,W,H);
        // Vignette
        const vigR=Math.max(50,W*0.7*(1-dProg*0.4));
        const vig=c.createRadialGradient(W/2,H/2,vigR*0.3,W/2,H/2,vigR);
        vig.addColorStop(0,'rgba(6,5,10,0)');vig.addColorStop(1,'rgba(6,5,10,0.8)');
        c.fillStyle=vig;c.fillRect(0,0,W,H);
      }
      if(dProg>0.6){
        c.font='bold 24px "Share Tech Mono",monospace';c.textAlign='center';c.textBaseline='middle';
        c.fillStyle=`rgba(232,100,10,${Math.min(1,(dProg-0.6)/0.3)})`;
        c.fillText('/// SIGNAL LOST ///',W/2,H/2);
        c.textAlign='left';c.textBaseline='alphabetic';
      }
    }

    // Scanlines (subtle)
    c.fillStyle='rgba(0,0,0,0.04)';
    for(let y=0;y<H;y+=4)c.fillRect(0,y,W,1);
    c.restore();

    mod.drawMinimap();
  },

  // ── Projected hex ──
  drawHex3D(c,px,py,r,fill,border){
    c.beginPath();
    for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;i===0?c.moveTo(px+r*Math.cos(a),py+r*Math.sin(a)):c.lineTo(px+r*Math.cos(a),py+r*Math.sin(a));}
    c.closePath();
    c.fillStyle=fill;c.fill();
    c.strokeStyle=border;c.lineWidth=1.4;c.stroke();
  },

  drawFace(c,fi,ts){
    const f=FACES[fi], front=mod.frontFace(fi);
    const isCur=snake.length>0&&snake[0].face===fi;
    const cn=[mod.cornerPos(fi,0,0),mod.cornerPos(fi,N,0),mod.cornerPos(fi,N,N),mod.cornerPos(fi,0,N)];
    const c2=cn.map(p=>mod.proj(mod.xform(p)));
    if(c2.some(v=>!v))return;

    c.save();
    if(!front) c.globalAlpha=0.12;

    // Face fill — cream for front, muted for back
    c.beginPath();c.moveTo(c2[0][0],c2[0][1]);for(let i=1;i<4;i++)c.lineTo(c2[i][0],c2[i][1]);c.closePath();
    c.fillStyle=front?'#DEDAD0':'#3A3830';c.fill();

    // Grid lines — stone color like 2D
    c.strokeStyle=front?(isCur?'#B8B2A8':'#C8C2B8'):'#555048';c.lineWidth=front?0.6:0.4;
    for(let col=0;col<=N;col++){const p1=mod.proj(mod.xform(mod.cornerPos(fi,col,0))),p2=mod.proj(mod.xform(mod.cornerPos(fi,col,N)));if(p1&&p2){c.beginPath();c.moveTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.stroke();}}
    for(let row=0;row<=N;row++){const p1=mod.proj(mod.xform(mod.cornerPos(fi,0,row))),p2=mod.proj(mod.xform(mod.cornerPos(fi,N,row)));if(p1&&p2){c.beginPath();c.moveTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.stroke();}}

    // Border — dark outer + orange inner for current face
    c.strokeStyle=front?'#1A1A18':'#444038';c.lineWidth=front?2.5:1;
    c.beginPath();c.moveTo(c2[0][0],c2[0][1]);for(let i=1;i<4;i++)c.lineTo(c2[i][0],c2[i][1]);c.closePath();c.stroke();
    if(isCur&&front){
      // Orange inner border like 2D
      const shrink=3;
      const ic=[];for(let i=0;i<4;i++){const cx2=(c2[0][0]+c2[1][0]+c2[2][0]+c2[3][0])/4,cy2=(c2[0][1]+c2[1][1]+c2[2][1]+c2[3][1])/4;const dx=c2[i][0]-cx2,dy=c2[i][1]-cy2;const len=Math.sqrt(dx*dx+dy*dy);ic.push([c2[i][0]-dx/len*shrink,c2[i][1]-dy/len*shrink]);}
      c.strokeStyle='#E8640A';c.lineWidth=1;
      c.beginPath();c.moveTo(ic[0][0],ic[0][1]);for(let i=1;i<4;i++)c.lineTo(ic[i][0],ic[i][1]);c.closePath();c.stroke();

      // Corner marks — orange dots
      c2.forEach(([px,py])=>{c.fillStyle='#E8640A';c.fillRect(px-2,py-2,4,4);});
    }

    // Face number — subtle (use projected cell size for scaling)
    const cp=mod.proj(mod.xform(mod.cellPos(fi,N/2-.5,N/2-.5)));
    // Compute a rough cell size even for back faces
    const pRef1=mod.proj(mod.xform(mod.cellPos(fi,0,0)));
    const pRef2=mod.proj(mod.xform(mod.cellPos(fi,1,0)));
    const csRef=(pRef1&&pRef2)?Math.sqrt((pRef2[0]-pRef1[0])**2+(pRef2[1]-pRef1[1])**2):16;
    if(cp){
      const fs2=Math.max(14,csRef*2.5);
      c.font=`900 ${fs2}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.textBaseline='middle';
      c.fillStyle=front?(isCur?'rgba(232,100,10,0.25)':'rgba(150,140,130,0.25)'):'rgba(100,96,88,0.4)';
      c.fillText(fi,cp[0],cp[1]);
      c.font=`${Math.max(8,csRef*0.8)}px "Share Tech Mono",monospace`;
      c.fillStyle=front?(isCur?'rgba(232,100,10,0.2)':'rgba(150,140,130,0.2)'):'rgba(100,96,88,0.3)';
      c.fillText(f.name,cp[0],cp[1]+fs2*.7);
      c.textAlign='left';c.textBaseline='alphabetic';
    }

    if(!front){c.restore();return;}

    // ── Compute projected cell size (3D equivalent of cS) ──
    const pA=mod.proj(mod.xform(mod.cellPos(fi,0,0)));
    const pB=mod.proj(mod.xform(mod.cellPos(fi,1,0)));
    const cS3D=(pA&&pB)?Math.sqrt((pB[0]-pA[0])**2+(pB[1]-pA[1])**2):20;

    // ── Walls — dark cells with orange X marks like 2D ──
    for(const w of walls3D){
      const alpha=w.life<5000?(w.life/5000):1;
      for(const wc of w.cells){
        if(wc.face!==fi) continue;
        const wp=mod.proj(mod.xform(mod.cellPos(fi,wc.col,wc.row)));
        if(!wp)continue;
        const sz=cS3D*0.46;
        c.save();c.globalAlpha=alpha;
        c.fillStyle='rgba(20,18,16,0.92)';
        c.fillRect(wp[0]-sz,wp[1]-sz,sz*2,sz*2);
        c.strokeStyle='rgba(232,100,10,0.7)';c.lineWidth=1;
        c.strokeRect(wp[0]-sz,wp[1]-sz,sz*2,sz*2);
        c.strokeStyle='rgba(232,100,10,0.35)';c.lineWidth=0.8;
        c.beginPath();
        c.moveTo(wp[0]-sz*0.6,wp[1]-sz*0.6);c.lineTo(wp[0]+sz*0.6,wp[1]+sz*0.6);
        c.moveTo(wp[0]+sz*0.6,wp[1]-sz*0.6);c.lineTo(wp[0]-sz*0.6,wp[1]+sz*0.6);
        c.stroke();
        c.restore();
      }
    }

    // ── Food — diamond shape like 2D ──
    if(food&&food.face===fi){
      const fp=mod.proj(mod.xform(mod.cellPos(fi,food.col,food.row)));
      if(fp){
        const t2=(ts%900)/900, pulse=0.88+0.12*Math.sin(t2*Math.PI*2);
        const r=cS3D*0.30*pulse;
        c.fillStyle='rgba(232,100,10,0.08)';
        c.beginPath();c.arc(fp[0],fp[1],r*2.5,0,Math.PI*2);c.fill();
        c.save();c.translate(fp[0],fp[1]);c.rotate(Math.PI/4);
        c.fillStyle='#E8640A';c.fillRect(-r*.7,-r*.7,r*1.4,r*1.4);
        c.strokeStyle='#111110';c.lineWidth=1.5;c.strokeRect(-r*.7,-r*.7,r*1.4,r*1.4);
        c.restore();
        c.fillStyle='#F5F0E8';c.beginPath();c.arc(fp[0],fp[1],r*0.22,0,Math.PI*2);c.fill();
      }
    }

    // ── XP balls — teal circles like 2D ──
    for(const b of xpBalls3D){
      if(b.face!==fi) continue;
      const bp=mod.proj(mod.xform(mod.cellPos(fi,b.col,b.row)));
      if(!bp) continue;
      const r=cS3D*0.21;
      c.fillStyle='rgba(20,18,16,0.8)';c.beginPath();c.arc(bp[0],bp[1],r*1.3,0,Math.PI*2);c.fill();
      c.strokeStyle='#00A896';c.lineWidth=1.5;c.beginPath();c.arc(bp[0],bp[1],r,0,Math.PI*2);c.stroke();
      c.fillStyle='#00A896';c.beginPath();c.arc(bp[0],bp[1],r*0.45,0,Math.PI*2);c.fill();
    }

    // ── Shockwave visual ──
    if(swWave.length>0){
      const elapsed=ts-swVisStart;
      if(elapsed<600){
        for(const sw of swWave){
          if(sw.face!==fi)continue;
          const delay=sw.ring*80;
          const t2=(elapsed-delay)/400;
          if(t2<0||t2>1)continue;
          const alpha=(1-t2)*0.6;
          const swp=mod.proj(mod.xform(mod.cellPos(fi,sw.col,sw.row)));
          if(!swp)continue;
          const sz=cS3D*0.45*(0.5+t2*0.5);
          c.save();c.globalAlpha=alpha;
          c.strokeStyle='#E8640A';c.lineWidth=2;
          c.strokeRect(swp[0]-sz,swp[1]-sz,sz*2,sz*2);
          c.fillStyle='rgba(232,100,10,0.15)';
          c.fillRect(swp[0]-sz,swp[1]-sz,sz*2,sz*2);
          c.restore();
        }
      } else {
        swWave=[];
      }
    }

    // ── Snake — hex cells with interpolation ──
    const t3=tickT3D;
    for(let i=snake.length-1;i>=0;i--){
      const seg=snake[i];
      const prv=snakePrev[i]||seg;
      // Only interpolate if same face (cross-face = snap)
      const sameFace=(seg.face===prv.face);
      const drawFi=seg.face;
      if(drawFi!==fi) continue;

      let sx,sy;
      if(sameFace){
        const p1=mod.cellPos(fi,prv.col,prv.row);
        const p2=mod.cellPos(fi,seg.col,seg.row);
        const interp=[p1[0]+(p2[0]-p1[0])*t3, p1[1]+(p2[1]-p1[1])*t3, p1[2]+(p2[2]-p1[2])*t3];
        const sp=mod.proj(mod.xform(interp));
        if(!sp)continue;
        sx=sp[0];sy=sp[1];
      } else {
        const sp=mod.proj(mod.xform(mod.cellPos(fi,seg.col,seg.row)));
        if(!sp)continue;
        sx=sp[0];sy=sp[1];
      }

      const isH=i===0;
      const hexR=cS3D*0.42;
      const fade=Math.max(0.35,1-i/snake.length*0.55);

      if(fade<1){c.save();c.globalAlpha=fade*0.85+0.15;}

      if(isH){
        mod.drawHex3D(c,sx,sy,hexR,'#E8640A','#F5920A');
        const eyeR=hexR*0.18,eyeOff=hexR*0.4,eyeFwd=hexR*0.35;
        let dx=0,dy=-1;
        if(snake.length>1&&snake[1].face===fi){
          const prv2=snakePrev[1]||snake[1];
          const sameFace2=(snake[1].face===prv2.face);
          let s2x,s2y;
          if(sameFace2){
            const pa=mod.cellPos(fi,prv2.col,prv2.row);
            const pb=mod.cellPos(fi,snake[1].col,snake[1].row);
            const ip=[pa[0]+(pb[0]-pa[0])*t3,pa[1]+(pb[1]-pa[1])*t3,pa[2]+(pb[2]-pa[2])*t3];
            const sp2=mod.proj(mod.xform(ip));
            if(sp2){s2x=sp2[0];s2y=sp2[1];}
          } else {
            const sp2=mod.proj(mod.xform(mod.cellPos(fi,snake[1].col,snake[1].row)));
            if(sp2){s2x=sp2[0];s2y=sp2[1];}
          }
          if(s2x!==undefined){dx=sx-s2x;dy=sy-s2y;const dl=Math.sqrt(dx*dx+dy*dy)||1;dx/=dl;dy/=dl;}
        }
        const px2=-dy,py2=dx;
        [1,-1].forEach(s=>{
          const ex=sx+dx*eyeFwd+px2*eyeOff*s, ey=sy+dy*eyeFwd+py2*eyeOff*s;
          c.fillStyle='#EDEAE2';c.beginPath();c.arc(ex,ey,eyeR,0,Math.PI*2);c.fill();
          c.fillStyle='#0A0A09';c.beginPath();c.arc(ex+dx*eyeR*0.35,ey+dy*eyeR*0.35,eyeR*0.5,0,Math.PI*2);c.fill();
        });
      } else if(i<3){
        mod.drawHex3D(c,sx,sy,hexR*0.9,'#2A2926','#111110');
      } else {
        mod.drawHex3D(c,sx,sy,hexR*0.88,'#222220','#111110');
      }
      if(fade<1)c.restore();
    }

    // Combo flash
    if(combo>=2&&performance.now()-lastFoodTS<500){
      const frac=(performance.now()-lastFoodTS)/500;
      const head=snake[0];
      if(head&&head.face===fi){
        const hp=mod.proj(mod.xform(mod.cellPos(fi,head.col,head.row)));
        if(hp){
          c.save();c.globalAlpha=(1-frac)*0.9;
          const fsz=Math.max(12,cS3D*0.55);
          c.font=`bold ${fsz}px "Barlow Condensed",sans-serif`;c.textAlign='center';c.textBaseline='middle';
          c.fillStyle='#E8640A';c.fillText(`COMBO ×${combo}`,hp[0],hp[1]-cS3D*1.2);
          c.textAlign='left';c.textBaseline='alphabetic';c.restore();
        }
      }
    }

    c.restore();
  },

  drawMinimap(){
    if(!mmCtx)return;
    const mW=160,mH=120,cs=2,pad=2;
    mmCtx.clearRect(0,0,mW,mH);
    const cross=[[-1,4,-1],[3,0,1],[-1,5,-1],[-1,2,-1]];
    const ox=(mW-3*(cs*N+pad))/2,oy=4;
    for(let gy=0;gy<4;gy++)for(let gx=0;gx<3;gx++){
      const fi=cross[gy][gx];if(fi<0)continue;
      const bx=ox+gx*(cs*N+pad),by=oy+gy*(cs*N+pad),cur=snake[0].face===fi;
      // Cream fill for minimap faces
      mmCtx.fillStyle=cur?'rgba(222,218,208,0.25)':'rgba(222,218,208,0.06)';mmCtx.fillRect(bx,by,cs*N,cs*N);
      mmCtx.strokeStyle=cur?'#E8640A':'rgba(150,140,130,0.25)';mmCtx.lineWidth=cur?1.5:.5;mmCtx.strokeRect(bx,by,cs*N,cs*N);
      // Food
      if(food&&food.face===fi){mmCtx.fillStyle='#E8640A';mmCtx.fillRect(bx+food.col*cs,by+food.row*cs,cs,cs);}
      // Walls
      for(const w of walls3D) for(const wc of w.cells){if(wc.face!==fi)continue;mmCtx.fillStyle='rgba(20,18,16,0.8)';mmCtx.fillRect(bx+wc.col*cs,by+wc.row*cs,cs,cs);}
      // XP orbs
      for(const b of xpBalls3D){if(b.face!==fi)continue;mmCtx.fillStyle='#00A896';mmCtx.fillRect(bx+b.col*cs,by+b.row*cs,cs,cs);}
      // Snake
      snake.forEach((s,i)=>{if(s.face!==fi)return;mmCtx.fillStyle=i===0?'#E8640A':'#2A2926';mmCtx.fillRect(bx+s.col*cs,by+s.row*cs,cs,cs);});
      // Face number
      mmCtx.font='bold 9px "Barlow Condensed",sans-serif';mmCtx.fillStyle=cur?'rgba(232,100,10,0.5)':'rgba(150,140,130,0.25)';mmCtx.textAlign='center';mmCtx.textBaseline='middle';mmCtx.fillText(fi,bx+cs*N/2,by+cs*N/2);mmCtx.textAlign='left';mmCtx.textBaseline='alphabetic';
    }
    mmCtx.font='8px "Share Tech Mono",monospace';mmCtx.fillStyle='rgba(232,100,10,0.2)';mmCtx.fillText('RADAR',ox,oy+4*(cs*N+pad)+10);
  },
};
return mod;
})();

// ── 3D XP / Level Up ──
function addXP3D(){
  Audio.sfxXP();
  xp++;
  if(xp>=xpNeeded){xp=0;xpNeeded+=3;doLevelUp3D();}
}
function doLevelUp3D(){
  level++;
  Audio.stopAllBgm(); Audio.sfxLevelUp();
  gamePaused=true; selectedEvo=null;
  document.getElementById('evoWarn').textContent='';
  document.getElementById('evoScreen').classList.add('show');
  drawEvoTree();
  startEvoRedraw();
  flash('等级提升！');
}

// ── 3D Game Loop ──
function loop3D(ts){
  if(!gameActive&&!deathTime)return;
  const ti=cube3D.tickMs();
  if(cube3D.active&&!gamePaused&&ts-lastTick>=ti){
    cube3D.tick();
    gameTime+=ti;
    lastTick=ts;
  }
  cube3D.render(ts);
}

// ── Start 3D Game ──
function startGame3D(){
  document.getElementById('startScreen').style.display='none';
  const goEl=document.getElementById('goScreen');goEl.classList.remove('show');goEl.style.opacity='';goEl.style.transition='';
  if(menuBgRaf){cancelAnimationFrame(menuBgRaf);menuBgRaf=null;}
  document.getElementById('evoScreen').classList.remove('show');
  canvas.style.display='block'; // restore after 3D death hid it

  score=0;level=1;xp=0;xpNeeded=5;gameTime=0;
  gamePaused=false;gameActive=true;deathTime=0;
  combo=0;comboMult=1;lastFoodTS=0;maxCombo=0;
  killCount=0;bulletHits=0;laserHits=0;
  threatLevel=0;

  // Player object with 3D-specific upgrades
  player={body:[{x:0,y:0}],alive:true,upg:{swRange:2,swCDMult:1,wallBreak:false,spd:0,quickTurn:false},speedMult:1,speedTarget:1,effects:[]};
  unlocked=new Set();

  resizeGame();
  cube3D.init();

  const now=performance.now();
  lastFrame=now;
  if(animId)cancelAnimationFrame(animId);
  function mainLoop(ts){
    animId=requestAnimationFrame(mainLoop);
    loop3D(ts);
  }
  animId=requestAnimationFrame(mainLoop);

  Audio.init();Audio.resume();Audio.stopAllBgm();
  if (getTheme().id === 'spring') Audio.startBgmSpring(); else Audio.startBGM();
  // Init HUD for 3D - add face indicator
  const rSeg=document.querySelector('.hSeg.hRight');
  if(rSeg&&!document.getElementById('hFace')){
    const d=document.createElement('div');d.className='hSeg';d.style.borderRight='1px solid rgba(255,184,48,0.07)';
    d.innerHTML='<div class="hLab">FACE</div><div class="hVal" id="hFace">FRONT</div>';
    rSeg.parentNode.insertBefore(d,rSeg);
  }
  cube3D.updateHUD();
}

