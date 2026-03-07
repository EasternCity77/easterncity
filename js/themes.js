'use strict';

// ═══ themes.js ═══
// Central theme configuration. Must be loaded before all other scripts.
// Access current theme via getTheme(). Switch theme via setActiveTheme(id).

const THEMES = {

  // ── 未来磁带 ── Cassette Futurism
  cassette: {
    id: 'cassette',
    foodStyle: 'diamond',
    name: '未来磁带',
    nameEn: 'CASS · FUTUR · 01',
    colors: {
      // Board
      boardFace:          '#DEDAD0',
      boardGrid:          '#C0BAB0',
      boardBorder:        '#1A1A18',
      boardAccent:        '#E8640A',
      boardBody:          '#111110',
      boardOuter:         '#0A0A09',
      // Player snake
      playerHead:         '#E8640A',
      playerHeadBorder:   '#F5920A',
      playerBody:         '#2A2926',
      playerBodyBorder:   '#111110',
      playerTail:         '#222220',
      // Enemy snake
      enemyHead:          '#C8281E',
      enemyHeadBorder:    '#E83020',
      enemyBody:          '#381A18',
      enemyBodyBorder:    '#111110',
      enemyTail:          '#2A1412',
      // Snake eyes
      snakeEye:           '#EDEAE2',
      snakePupil:         '#0A0A09',
      // Food
      foodFill:           '#E8640A',
      foodBorder:         '#111110',
      foodDot:            '#F5F0E8',
      // Walls (solid)
      wallFill:           'rgba(20,18,16,0.92)',
      wallStroke:         'rgba(232,100,10,0.7)',
      wallStrokeDim:      'rgba(232,100,10,0.35)',
      // Walls (birth/warning) — stored as components for dynamic alpha
      wallBirthR: 255, wallBirthG: 140, wallBirthB: 10,
      wallBirthBorderR: 255, wallBirthBorderG: 150, wallBirthBorderB: 20,
      wallBirthDiagR: 255, wallBirthDiagG: 210, wallBirthDiagB: 60,
      // Items
      speedUp:            '#E8640A',
      speedDown:          '#00A896',
      itemBg:             'rgba(20,18,16,0.85)',
      xpBallBg:           'rgba(20,18,16,0.8)',
      xpBall:             '#00A896',
      // Bullet
      bullet:             '#C8281E',
      bulletGlow:         'rgba(200,40,30,0.25)',
      // Laser
      laser:              '#E8640A',
      laserGlow:          'rgba(232,100,10,0.18)',
      laserCore:          'rgba(255,240,220,0.9)',
      // Death transition
      deathFlashR: 200, deathFlashG: 40, deathFlashB: 30,
      deathDark:          'rgba(6,5,10,1)',
      // Threat banner
      threatBanner:       '#C8281E',
      threatBannerGlow:   'rgba(200,40,30,0.3)',
      threatText:         '#F8F6F2',
      // Combo
      comboText:          '#E8640A',
      // Cooldown arc
      cooldownArc:        'rgba(232,100,10,0.5)',
      // Skills
      missile:            '#FFB830',
      timeSlowOverlay:    'rgba(100, 150, 200, 0.15)',
      // Enemy countdown
      enemyCountdown:     'rgba(20,18,16,0.45)',
      // RGB component strings for dynamic-alpha canvas operations
      boardAccentRgb:     '232,100,10',
      wallFillRgb:        '20,18,16',
      deathDarkRgb:       '6,5,10',
      // Globals
      primary:            '#E8640A',
      secondary:          '#00A896',
      danger:             '#C8281E',
      bgDark:             '#040302',
    },
    evo: {
      laser:    '#E8640A',
      missile:  '#00E8FF',
      mobility: '#00A896',
      unlocked: '#00E878',
      locked:   '#1A2230',
      laserRgb:    '232,100,10',
      missileRgb:  '0,232,255',
      mobilityRgb: '0,168,150',
      unlockedRgb: '0,232,120',
    },
    bg: {
      // Palette order: [r, y, c, g, am, am2]
      palette:  ['#FF2840','#FFE040','#00F4E8','#00FF88','#FFB830','#FFD060'],
      gridColor:'rgba(255,184,48,0.04)',
      // Web connections (amber): R G B components
      webR: 255, webG: 184, webB: 48,
      // Scan line (amber)
      scanR: 255, scanG: 184, scanB: 48,
      // VHS glitch colors
      glitchR: 'rgba(255,40,64,0.45)',
      glitchC: 'rgba(0,244,232,0.45)',
      // Corner brackets
      cornerTL: 'rgba(255,184,48,0.22)',
      cornerTR: 'rgba(255,40,64,0.22)',
      cornerBL: 'rgba(0,244,232,0.2)',
      cornerBR: 'rgba(0,255,136,0.2)',
    },
    audio: {
      bpm: 126,
      bass:     [55,0,0,55,    65.4,0,55,0,   82.4,0,0,65.4,  55,0,82.4,0],
      meld:     [0,0,329.6,0,  0,392,0,0,     440,0,329.6,0,  0,0,392,493.9],
      padChord: [110, 130.8, 164.8, 196],
    }
  },

  // ── 赛博春节 ── Spring Festival
  spring: {
    id: 'spring',
    foodStyle: 'firework',
    name: '赛博春节',
    nameEn: 'CASS · SPRING · 02',
    colors: {
      // Board
      boardFace:          '#F5E6C8',
      boardGrid:          '#D4C4A0',
      boardBorder:        '#1A0A08',
      boardAccent:        '#CC2020',
      boardBody:          '#120806',
      boardOuter:         '#0A0604',
      // Player snake (朱红)
      playerHead:         '#CC2020',
      playerHeadBorder:   '#FF4030',
      playerBody:         '#2A1810',
      playerBodyBorder:   '#120806',
      playerTail:         '#1E1008',
      // Enemy snake (金色)
      enemyHead:          '#D4A820',
      enemyHeadBorder:    '#FFD040',
      enemyBody:          '#2A2010',
      enemyBodyBorder:    '#120806',
      enemyTail:          '#1A1808',
      // Snake eyes
      snakeEye:           '#FFF8E8',
      snakePupil:         '#0A0806',
      // Food (金币)
      foodFill:           '#D4A820',
      foodBorder:         '#0A0806',
      foodDot:            '#FFF8E8',
      // Walls (solid)
      wallFill:           'rgba(18,8,6,0.92)',
      wallStroke:         'rgba(204,32,32,0.7)',
      wallStrokeDim:      'rgba(204,32,32,0.35)',
      // Walls (birth/warning)
      wallBirthR: 220, wallBirthG: 60, wallBirthB: 20,
      wallBirthBorderR: 240, wallBirthBorderG: 80, wallBirthBorderB: 30,
      wallBirthDiagR: 255, wallBirthDiagG: 180, wallBirthDiagB: 60,
      // Items
      speedUp:            '#CC2020',
      speedDown:          '#D4A820',
      itemBg:             'rgba(18,8,6,0.85)',
      xpBallBg:           'rgba(18,8,6,0.8)',
      xpBall:             '#D4A820',
      // Bullet
      bullet:             '#8B1A10',
      bulletGlow:         'rgba(140,26,16,0.25)',
      // Laser
      laser:              '#CC2020',
      laserGlow:          'rgba(204,32,32,0.18)',
      laserCore:          'rgba(255,240,220,0.9)',
      // Death transition
      deathFlashR: 180, deathFlashG: 20, deathFlashB: 10,
      deathDark:          'rgba(10,4,2,1)',
      // Threat banner
      threatBanner:       '#8B1A10',
      threatBannerGlow:   'rgba(140,26,16,0.3)',
      threatText:         '#FFF0E0',
      // Combo
      comboText:          '#CC2020',
      // Cooldown arc
      cooldownArc:        'rgba(204,32,32,0.5)',
      // Skills
      missile:            '#FFB830',
      timeSlowOverlay:    'rgba(100, 150, 200, 0.15)',
      // Enemy countdown
      enemyCountdown:     'rgba(18,8,6,0.45)',
      // RGB component strings for dynamic-alpha canvas operations
      boardAccentRgb:     '204,32,32',
      wallFillRgb:        '18,8,6',
      deathDarkRgb:       '10,4,2',
      // Globals
      primary:            '#CC2020',
      secondary:          '#D4A820',
      danger:             '#8B1A10',
      bgDark:             '#0A0302',
    },
    evo: {
      laser:    '#CC2020',
      missile:  '#FF6040',
      mobility: '#D4A820',
      unlocked: '#E8B040',
      locked:   '#2A1A10',
      laserRgb:    '204,32,32',
      missileRgb:  '255,96,64',
      mobilityRgb: '212,168,32',
      unlockedRgb: '232,176,64',
    },
    bg: {
      palette:  ['#CC2020','#D4A820','#FF6040','#FFE080','#FF8040','#FFD060'],
      gridColor:'rgba(212,168,32,0.04)',
      webR: 212, webG: 168, webB: 32,
      scanR: 212, scanG: 168, scanB: 32,
      glitchR: 'rgba(204,32,32,0.45)',
      glitchC: 'rgba(255,180,40,0.45)',
      cornerTL: 'rgba(212,168,32,0.22)',
      cornerTR: 'rgba(204,32,32,0.22)',
      cornerBL: 'rgba(255,120,40,0.2)',
      cornerBR: 'rgba(255,200,60,0.2)',
    },
    audio: {
      bpm: 108,
      // 宫商角徵羽 = C D E G A
      bass:     [131,0,0,131,  147,0,131,0,  165,0,0,147,  131,0,196,0],
      meld:     [0,0,262,0,    0,294,0,0,    330,0,262,0,  0,0,392,440],
      padChord: [262, 330, 392, 523],
    }
  }
};

// ── Active theme reference ──
let activeTheme = THEMES.cassette;
function getTheme() { return activeTheme; }
function setActiveTheme(id) {
  if (THEMES[id]) activeTheme = THEMES[id];
}
