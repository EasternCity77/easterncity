'use strict';

// ═══ utils.js ═══
// Wall detection, BFS, random empty, A* pathfinding

// ═══ WALLS & BFS ═══
function isWall(x,y) {
  for(const w of walls) for(const c of w.cells) if(c.x===x&&c.y===y) return true;
  return false;
}

// Like isWall but skips walls still in their birth grace period (for player collision only)
function isWallSolid(x,y) {
  const now=performance.now();
  for(const w of walls){
    if(w.born && now-w.born<WALL_BIRTH_MS) continue;
    for(const c of w.cells) if(c.x===x&&c.y===y) return true;
  }
  return false;
}

function wallKeySet(extra=[]) {
  const s=new Set();
  walls.forEach(w=>w.cells.forEach(c=>s.add(`${c.x},${c.y}`)));
  extra.forEach(c=>s.add(`${c.x},${c.y}`));
  return s;
}

function bfsOK(from,to,extra=[]) {
  const blocked=wallKeySet(extra);
  const vis=new Set(); const q=[{...from}]; vis.add(`${from.x},${from.y}`);
  while(q.length){
    const cur=q.shift();
    if(cur.x===to.x&&cur.y===to.y) return true;
    for(const [dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cur.x+dx,ny=cur.y+dy,k=`${nx},${ny}`;
      if(nx<0||nx>=gCols||ny<0||ny>=gRows||vis.has(k)||blocked.has(k)) continue;
      vis.add(k); q.push({x:nx,y:ny});
    }
  }
  return false;
}

function randomEmpty() {
  const occ=new Set();
  walls.forEach(w=>w.cells.forEach(c=>occ.add(`${c.x},${c.y}`)));
  if(food)occ.add(`${food.x},${food.y}`);
  player.body.forEach(s=>occ.add(`${s.x},${s.y}`));
  enemies.forEach(e=>e.body.forEach(s=>occ.add(`${s.x},${s.y}`)));
  speedItems.forEach(i=>occ.add(`${i.x},${i.y}`));
  xpBalls.forEach(b=>occ.add(`${b.x},${b.y}`));
  for(let a=0;a<400;a++){
    const x=Math.floor(Math.random()*gCols), y=Math.floor(Math.random()*gRows);
    if(!occ.has(`${x},${y}`)) return{x,y};
  }
  return null;
}


// ═══ A* ═══
function astar(start,goal,obstacles) {
  const K=(x,y)=>`${x},${y}`;
  const H=(x,y)=>Math.abs(x-goal.x)+Math.abs(y-goal.y);
  const open=new Map(), gSc=new Map(), par=new Map(), closed=new Set();
  const sk=K(start.x,start.y);
  gSc.set(sk,0); open.set(sk,{x:start.x,y:start.y,f:H(start.x,start.y)});
  let iter=0;
  while(open.size>0&&iter++<gCols*gRows*2){
    let bk=null,bf=Infinity;
    for(const[k,n] of open){if(n.f<bf){bf=n.f;bk=k;}}
    const cur=open.get(bk); open.delete(bk); closed.add(bk);
    if(cur.x===goal.x&&cur.y===goal.y){
      const path=[]; let k=bk;
      while(par.has(k)){const[px,py]=k.split(',').map(Number);path.unshift({x:px,y:py});k=par.get(k);}
      return path;
    }
    const cg=gSc.get(bk);
    for(const[dx,dy] of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||nx>=gCols||ny<0||ny>=gRows) continue;
      const nk=K(nx,ny);
      if(closed.has(nk)||obstacles.has(nk)) continue;
      const ng=cg+1;
      if(!gSc.has(nk)||ng<gSc.get(nk)){gSc.set(nk,ng);par.set(nk,bk);open.set(nk,{x:nx,y:ny,f:ng+H(nx,ny)});}
    }
  }
  return null;
}

