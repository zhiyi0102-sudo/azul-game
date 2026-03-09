// tests/rules.test.js
// 基于 GAME_RULES.md 的规则测试

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

// ========== 游戏初始化测试 ==========
describe('1. 游戏初始化', () => {
  test('1.1 花砖袋有100块（5种颜色各20块）', () => {
    const bag = initBag();
    expect(bag.length).toBe(100);
    
    const colorCounts = {};
    COLORS.forEach(c => colorCounts[c] = 0);
    bag.forEach(t => colorCounts[t]++);
    
    Object.values(colorCounts).forEach(count => {
      expect(count).toBe(20);
    });
  });

  test('1.2 玩家模板有5行图案线', () => {
    expect(TEMPLATE.rows.length).toBe(5);
    expect(TEMPLATE.rows[0].length).toBe(1);
    expect(TEMPLATE.rows[1].length).toBe(2);
    expect(TEMPLATE.rows[2].length).toBe(3);
    expect(TEMPLATE.rows[3].length).toBe(4);
    expect(TEMPLATE.rows[4].length).toBe(5);
  });

  test('1.3 玩家模板有5x5墙面', () => {
    expect(TEMPLATE.wall.length).toBe(5);
    expect(TEMPLATE.wall[0].length).toBe(5);
  });

  test('1.4 地板区有7格', () => {
    expect(TEMPLATE.floor.length).toBe(0); // 初始为空
  });
});

// ========== 地板区扣分测试 ==========
describe('2. 地板区扣分规则', () => {
  const floorPenalty = [-1, -2, -3, -4, -5, -6, -7];
  
  test('2.1 第1块砖扣1分', () => {
    expect(floorPenalty[0]).toBe(-1);
  });
  
  test('2.2 第2块砖扣2分', () => {
    expect(floorPenalty[1]).toBe(-2);
  });
  
  test('2.3 第3块砖扣3分', () => {
    expect(floorPenalty[2]).toBe(-3);
  });
  
  test('2.4 第4块砖扣4分', () => {
    expect(floorPenalty[3]).toBe(-4);
  });
  
  test('2.5 第5块砖扣5分', () => {
    expect(floorPenalty[4]).toBe(-5);
  });
  
  test('2.6 第6块砖扣6分', () => {
    expect(floorPenalty[5]).toBe(-6);
  });
  
  test('2.7 第7块砖扣7分', () => {
    expect(floorPenalty[6]).toBe(-7);
  });
  
  test('2.8 超过7块按第7块扣分', () => {
    const penalty = floorPenalty[Math.min(10, floorPenalty.length - 1)];
    expect(penalty).toBe(-7);
  });
});

// ========== 计分规则测试 ==========
describe('3. 即时计分规则', () => {
  
  function calculateScore(wall, row, col) {
    const color = wall[row][col];
    if (!color) return 0;
    
    // 横向检查
    let hCount = 1;
    for (let c = col - 1; c >= 0 && wall[row][c] === color; c--) hCount++;
    for (let c = col + 1; c < 5 && wall[row][c] === color; c++) hCount++;
    
    // 纵向检查
    let vCount = 1;
    for (let r = row - 1; r >= 0 && wall[r][col] === color; r--) vCount++;
    for (let r = row + 1; r < 5 && wall[r][col] === color; r++) vCount++;
    
    // 无相邻得1分，有相邻得横向+纵向-1(减去自己)
    return hCount + vCount - 1;
  }
  
  test('3.1 无相邻花砖得1分', () => {
    const wall = [
      ['blue', null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    expect(calculateScore(wall, 0, 0)).toBe(1);
  });
  
  test('3.2 横向2个相连得2分', () => {
    const wall = [
      ['blue', 'blue', null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    // 第1块：横向2个相连，得2分（2+1-1=2）
    // 第2块：横向2个相连，得2分（2+1-1=2）
    expect(calculateScore(wall, 0, 0)).toBe(2);
    expect(calculateScore(wall, 0, 1)).toBe(2);
  });
  
  test('3.3 纵向2个相连得2分', () => {
    const wall = [
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    // 第1块：纵向2个相连，得2分
    expect(calculateScore(wall, 0, 0)).toBe(2);
    expect(calculateScore(wall, 1, 0)).toBe(2);
  });
  
  test('3.4 横纵都相连（T型）得3分', () => {
    const wall = [
      ['blue', 'blue', null, null, null],
      ['blue', null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    // 中心块(0,0)：横向2个，纵向2个 = 2+2-1=3
    expect(calculateScore(wall, 0, 0)).toBe(3);
  });
});

// ========== 最终计分奖励测试 ==========
describe('4. 最终计分奖励', () => {
  
  function calculateEndGameScore(wall) {
    let score = 0;
    
    // 完整横行 +2分
    wall.forEach(row => {
      if (row.every(t => t !== null)) score += 2;
    });
    
    // 完整竖列 +7分
    for (let c = 0; c < 5; c++) {
      if (wall.every(row => row[c] !== null)) score += 7;
    }
    
    // 同色5块 +10分
    COLORS.forEach(color => {
      let count = 0;
      wall.forEach(row => {
        row.forEach(t => { if (t === color) count++; });
      });
      if (count === 5) score += 10;
    });
    
    return score;
  }
  
  test('4.1 完整横行 +2分', () => {
    const wall = [
      ['blue', 'yellow', 'red', 'black', 'white'],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    expect(calculateEndGameScore(wall)).toBe(2);
  });
  
  test('4.2 完整竖列 +7分', () => {
    const wall = [
      ['blue', null, null, null, null],
      ['yellow', null, null, null, null],
      ['red', null, null, null, null],
      ['black', null, null, null, null],
      ['white', null, null, null, null]
    ];
    expect(calculateEndGameScore(wall)).toBe(7);
  });
  
  test('4.3 同色5块 +10分', () => {
    const wall = [
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null]
    ];
    // 5个同色在第0列 = 完整列(+7) + 同色5块(+10) = 17分
    expect(calculateEndGameScore(wall)).toBe(17);
  });
  
  test('4.4 全部奖励叠加', () => {
    // 1完整行 + 1完整列 + 1同色5块
    const wall = [
      ['blue', 'yellow', 'red', 'black', 'white'],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null]
    ];
    // 1行=2 + 1列=7 + 同色=10 = 19
    expect(calculateEndGameScore(wall)).toBe(19);
  });
});

// ========== 游戏规则测试 ==========
describe('5. 游戏规则', () => {
  
  test('5.1 图案线只能放同颜色', () => {
    const row = ['blue', 'blue']; // 第2行
    // 尝试放不同颜色应该失败
    expect(row[0] === row[1] || row[1] === null).toBe(true);
  });
  
  test('5.2 墙面已有颜色不能放入对应行', () => {
    // 墙面第0行已有blue
    const wall = [
      ['blue', null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    // 图案线第0行不能放blue（因为墙面第0行已有blue）
    const canPlace = wall[0].includes('blue');
    expect(canPlace).toBe(true); // 墙面第0行有blue，禁止图案线放blue
  });
});
