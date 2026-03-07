'use strict';

// ═══ state.js ═══
// All global state variables

// ═══ STATE ═══
let canvas, ctx, evoCanvas, evoCtx;
let animId=null;
let gCols=20, gRows=20, cS=32;
let gameActive=false, gamePaused=false;
let gameTime=0, score=0, level=1, xp=0, xpNeeded=10;
let lastFrame=0, lastTick=0, lastBulletTick=0, lastSpeedTS=0, lastEnemyTS=0;
let player=null, enemies=[], bullets=[], food=null, walls=[], speedItems=[], xpBalls=[], laserVis=null;
let unlocked=new Set(), selectedEvo=null;
let tickT=0;
let enemyTickT=0;  // separate interpolation for enemies (independent clock)
let deathTime=0;   // timestamp when death started (0 = not dying)
let deathShakeX=0, deathShakeY=0;
let enemyAccum=0;          // ms accumulator for enemy movement (independent of player speed)

// ─ Combo ─
let combo=0, comboMult=1, lastFoodTS=0, maxCombo=0;
// ─ Threat ─
let threatLevel=0, lastThreatTS=0;
let threatNotif=null; // {text, life}
// ─ Stats ─
let killCount=0, bulletHits=0, laserHits=0;
// ─ Game Mode ─
let gameMode='2d'; // '2d' or '3d'

// ── SKILLS ──
let gameFrozen = false;          // 时停状态
let freezeEnd = 0;               // 时停结束时间
let freezeVisualStart = 0;       // 时停视觉特效起始时间
let freezeCompleteCallback = null; // 时停结束回调
let queuedSkill = null;          // 时停期间缓冲的技能 ('timeSlow' | 'missile')
let timeSlowShards = [];         // 冰碎片数组（结束特效用）
let timeSlowEnding = false;      // 标记正在播放结束动画
let timeSlowCracks = [];         // 裂纹数据（结束特效用）

// ── DIFFICULTY ──
let difficulty = 'normal';       // 全局难度设置：'easy' | 'normal' | 'hard' | 'hell' | 'nightmare'
