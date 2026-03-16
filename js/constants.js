'use strict';

// ═══ constants.js ═══
// Constants, evolution tree definitions, node codes

// ═══ CONSTANTS ═══
let   HUD_H         = 52;
const BASE_TICK     = 120;
const BULLET_TICK   = 130;
const LASER_CD_BASE = 5000;
const COMBO_RESET_MS  = 3500;   // ms without eating before combo resets
const LASER_VIS_MS  = 200;
const WALL_LIFE_MIN = 28000;
const WALL_LIFE_MAX = 45000;
const WALL_BIRTH_MS = 500;     // ms grace period before a new wall becomes solid
const WALL_MIN_COUNT = 5;      // minimum walls maintained on map at all times
const WALL_MAINTAIN_CD = 2000; // ms between wall-density checks
const SPEED_ITEM_CD = 6000;
const SPEED_DUR     = 15000;
const XP_MAP_CAP    = 5;
const BULLET_MAX_BOUNCES  = 2;
const BULLET_FAST_THREAT  = 3;
const BULLET_SPREAD_THREAT= 5;

// ── DIFFICULTY CONFIG ──
const DIFF_CONFIG = {
  easy:   { initialEnemies:0, enemyDelay:30000, spawnCD:30000, threatInterval:60000, maxEnemies:3,  bulletCD:10000, enemyTick:400, xpMult:1.0,  threatCap:5  },
  normal: { initialEnemies:0, enemyDelay:20000, spawnCD:20000, threatInterval:30000, maxEnemies:5,  bulletCD:8000,  enemyTick:320, xpMult:1.0,  threatCap:8  },
  hard:   { initialEnemies:1, enemyDelay:15000, spawnCD:12000, threatInterval:20000, maxEnemies:8,  bulletCD:6000,  enemyTick:260, xpMult:1.25, threatCap:10 },
  hell:   { initialEnemies:2, enemyDelay:10000, spawnCD:8000,  threatInterval:15000, maxEnemies:12, bulletCD:4000,  enemyTick:200, xpMult:1.5,  threatCap:15 },
};
function diffCfg() { return DIFF_CONFIG[difficulty] || DIFF_CONFIG.normal; }

// ── SKILLS ──
const TIME_SLOW_BASE_CD = 20000;      // 20s
const TIME_SLOW_BASE_DURATION = 5000; // 5s
const TIME_SLOW_SELF_MULT = 0.7;      // -30%
const TIME_SLOW_ENEMY_MULT = 0.2;     // -80%
const TIME_SLOW_BULLET_MULT = 0.3;    // -70%
const TIME_STOP_MS = 400;             // 0.4s

const MISSILE_BASE_CD = 10000;        // 10s
const MISSILE_WAIT_MS = 500;          // 0.5s
const MISSILE_BASE_COUNT = 1;
const MISSILE_SPEED = 0.15;           // pixels/ms
const MISSILE_TURN_RATE = 0.08;       // 转向灵敏度
const MISSILE_DAMAGE = 1;             // 1 segment

// ═══ EVO TREE ═══
// Honeycomb layout: dx,dy are unit offsets from center, scaled by spacing at render time
// branch: 'laser' (upper-left, orange) | 'missile' (upper-right, cyan) | 'mobility' (bottom, teal)
const EVO_NODES = [
  // ── LASER BRANCH (upper-left) ──
  {id:'laser2', label:'双激光',    desc:'激光数量 +1',       req:[],          branch:'laser',   dx:-1.3, dy:-0.3},
  {id:'laser3', label:'三激光',    desc:'激光数量 +1',       req:['laser2'],  branch:'laser',   dx:-3.6, dy:-1.7},
  {id:'pierce', label:'穿透',      desc:'激光贯穿 1 个敌蛇',  req:['laser2'],  branch:'laser',   dx:-2.4, dy:0.6},
  {id:'cd1',    label:'急速冷却Ⅰ', desc:'冷却 5s → 4s',     req:[],          branch:'laser',   dx:-0.3, dy:-1.1},
  {id:'cd2',    label:'急速冷却Ⅱ', desc:'冷却 4s → 3s',     req:['cd1'],     branch:'laser',   dx:-1.6, dy:-2.2},
  {id:'dmg2',   label:'强力激光',  desc:'激光伤害 ×2',       req:['laser2'],  branch:'laser',   dx:-3.3, dy:-0.3},
  {id:'slow',   label:'减速附魔',  desc:'命中使敌蛇减速 3s',  req:['dmg2','pierce'], branch:'laser', dx:-4.6, dy:0.9},
  // ── MISSILE BRANCH (upper-right) ──
  {id:'ms_count',label:'飞弹 +',   desc:'飞弹数量 +2',       req:[],          branch:'missile', dx:1.8, dy:-1.0},
  {id:'ms_pierce',label:'飞弹穿透', desc:'飞弹可穿透 1 墙',    req:['ms_count'],branch:'missile', dx:3.0, dy:-0.5},
  {id:'ms_dmg',  label:'飞弹伤 +',  desc:'飞弹伤害 +1',       req:['ms_count'],branch:'missile', dx:3.0, dy:-1.8},
  // ── MOBILITY BRANCH (bottom) ──
  {id:'spd1',   label:'加速Ⅰ',    desc:'基础移速 +20%',     req:[],          branch:'mobility', dx:-0.9, dy:0.7},
  {id:'spd2',   label:'加速Ⅱ',    desc:'基础移速再 +20%',   req:['spd1'],    branch:'mobility', dx:-3.3, dy:1.6},
  {id:'qturn',  label:'急停反应',  desc:'可 180°掉头',        req:[],          branch:'mobility', dx:1.7, dy:0.3},
  {id:'ts_dur', label:'时缓 +',   desc:'时缓持续时间 +2s',    req:['spd1'],    branch:'mobility', dx:-1.6, dy:2.1},
  {id:'ts_cd',  label:'时缓 CD-', desc:'时缓冷却 -5s',       req:['ts_dur'],  branch:'mobility', dx:-0.3, dy:3.5},
  {id:'combo_ext',label:'持久连击', desc:'连击计时 +1.5s',     req:['spd1'],    branch:'mobility', dx:0.1, dy:1.7},
  {id:'xp_boost', label:'经验强化', desc:'XP 获取 +50%',      req:['combo_ext'],branch:'mobility', dx:1.5, dy:1.7}
];

// ── 3D Cube Mode Evolution Nodes ──
const EVO_NODES_3D = [
  // COMBAT (upper-left)
  {id:'sw2',    label:'冲击波+',    desc:'冲击波范围 2→3',     req:[],         branch:'laser',   dx:-1.2, dy:-0.5},
  {id:'sw3',    label:'冲击波++',   desc:'冲击波范围 3→4',     req:['sw2'],    branch:'laser',   dx:-2.4, dy:-1.5},
  {id:'swcd1',  label:'急速冷却Ⅰ', desc:'冲击波冷却 ×0.75',   req:[],         branch:'laser',   dx:-0.3, dy:-1.8},
  {id:'swcd2',  label:'急速冷却Ⅱ', desc:'冲击波冷却 ×0.5',    req:['swcd1'],  branch:'laser',   dx:-1.5, dy:-2.7},
  {id:'wbreak', label:'破壁冲击',  desc:'冲击波可摧毁障碍物',  req:[],         branch:'laser',   dx:-0.3, dy:0.7},
  // MOBILITY (bottom)
  {id:'spd1_3d',label:'加速Ⅰ',    desc:'基础移速 +20%',     req:[],         branch:'mobility', dx:-0.6, dy:1.4},
  {id:'spd2_3d',label:'加速Ⅱ',    desc:'基础移速再 +20%',   req:['spd1_3d'],branch:'mobility', dx:-1.3, dy:2.5},
  {id:'qturn3d',label:'急停反应',  desc:'可 180°掉头',        req:[],         branch:'mobility', dx:0.6, dy:1.4},
];
const NODE_CODES_3D = {
  sw2:'SWAV·02', sw3:'SWAV·03', swcd1:'COOL·01', swcd2:'COOL·02',
  wbreak:'WBRK·01', spd1_3d:'MSPD·01', spd2_3d:'MSPD·02', qturn3d:'QTRN·01',
  ms_count:'MSLC·02', ms_pierce:'MSPI·01', ms_dmg:'MSDM·02',
  ts_dur:'TSDR·01', ts_cd:'TSCD·01',
};

// Short codes for pixel display
const NODE_CODES = {
  laser2:'LASR·02', laser3:'LASR·03', pierce:'PRCE·01',
  cd1:'COOL·01',    cd2:'COOL·02',    dmg2:'POVR·02',
  slow:'SLWF·01',   combo_ext:'CMBX·01', xp_boost:'XPBT·01',
  spd1:'MSPD·01',  spd2:'MSPD·02',
  qturn:'QTRN·01',  ms_count:'MSLC·02', ms_pierce:'MSPI·01', ms_dmg:'MSDM·02',
  ts_dur:'TSDR·01', ts_cd:'TSCD·01',
};

