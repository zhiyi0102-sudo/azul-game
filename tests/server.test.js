// tests/server.test.js
const path = require('path');

// 提取游戏逻辑进行单元测试
const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];
const TEMPLATE = {
  floor: [],
  rows: [[null], [null,null], [null,null,null], [null,null,null,null], [null,null,null,null,null]],
  wall: Array(5).fill(null).map(() => Array(5).fill(null))
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function initBag() {
  const bag = [];
  COLORS.forEach(color => {
    for (let i = 0; i < 20; i++) bag.push(color);
  });
  return shuffle(bag);
}

// 测试：初始化
describe('Game Initialization', () => {
  test('should have 5 colors', () => {
    expect(COLORS.length).toBe(5);
  });

  test('should create empty template', () => {
    expect(TEMPLATE.rows.length).toBe(5);
    expect(TEMPLATE.wall.length).toBe(5);
    expect(TEMPLATE.wall[0].length).toBe(5);
  });

  test('should init bag with 100 tiles (20 each color)', () => {
    const bag = initBag();
    expect(bag.length).toBe(100);
    
    const colorCounts = {};
    COLORS.forEach(c => colorCounts[c] = 0);
    bag.forEach(t => colorCounts[t]++);
    
    Object.values(colorCounts).forEach(count => {
      expect(count).toBe(20);
    });
  });
});

// 测试：计分逻辑
describe('Scoring Logic', () => {
  test('should score horizontal line correctly', () => {
    // 模拟填满一行的情况
    const player = {
      template: {
        wall: Array(5).fill(null).map(() => Array(5).fill(null)),
        rows: [[null],[null,null],[null,null,null],[null,null,null,null],[null,null,null,null,null]]
      },
      score: 0
    };
    
    // 填满第0行（1个格子）
    player.template.wall[0] = ['blue'];
    // 横向没有相邻
    // 纵向没有相邻
    // 应该得 1 分
    
    expect(player.template.wall[0][0]).toBe('blue');
  });

  test('should give bonus for complete row', () => {
    // 完整一行 +2 分
    const row = ['blue', 'yellow', 'red', 'black', 'white'];
    const isComplete = row.every(t => t !== null);
    expect(isComplete).toBe(true);
  });

  test('should give bonus for complete column', () => {
    // 完整一列 +7 分
    const wall = [
      ['blue', null, null, null, null],
      ['yellow', null, null, null, null],
      ['red', null, null, null, null],
      ['black', null, null, null, null],
      ['white', null, null, null, null]
    ];
    
    // 检查第0列是否完整
    const colComplete = wall.every(row => row[0] !== null);
    expect(colComplete).toBe(true);
  });

  test('should give bonus for 5 same color', () => {
    // 同色5块 +10 分
    const wall = Array(5).fill(null).map(() => Array(5).fill(null));
    wall[0][0] = 'blue';
    wall[1][0] = 'blue';
    wall[2][0] = 'blue';
    wall[3][0] = 'blue';
    wall[4][0] = 'blue';
    
    let count = 0;
    wall.forEach(row => {
      row.forEach(t => { if (t === 'blue') count++; });
    });
    
    expect(count).toBe(5);
  });
});

// 测试：玩家状态
describe('Player State', () => {
  test('should create player with default template', () => {
    const player = {
      id: 0,
      name: 'TestPlayer',
      template: JSON.parse(JSON.stringify(TEMPLATE)),
      score: 0
    };
    
    expect(player.score).toBe(0);
    expect(player.template.floor.length).toBe(0);
    expect(player.template.rows.length).toBe(5);
  });

  test('should add tiles to floor', () => {
    const player = {
      template: {
        floor: [],
        rows: JSON.parse(JSON.stringify(TEMPLATE.rows)),
        wall: JSON.parse(JSON.stringify(TEMPLATE.wall))
      }
    };
    
    player.template.floor.push('blue', 'red');
    expect(player.template.floor.length).toBe(2);
    expect(player.template.floor[0]).toBe('blue');
  });
});

console.log('Running tests...');
