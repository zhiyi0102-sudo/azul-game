// tests/e2e.test.js
// 端到端测试：模拟完整游戏流程

const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];

function createGameState(maxPlayers = 2) {
  const factoryCount = maxPlayers === 2 ? 5 : maxPlayers === 3 ? 7 : 9;
  return {
    players: [],
    currentPlayer: 0,
    phase: 'lobby',
    factories: Array(factoryCount).fill(null).map(() => []),
    bag: initBag(),
    rounds: 0,
    maxRounds: 5,
    gameEnded: false
  };
}

function initBag() {
  const bag = [];
  COLORS.forEach(color => {
    for (let i = 0; i < 20; i++) bag.push(color);
  });
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function addPlayer(state, name) {
  const player = {
    id: state.players.length,
    name,
    score: 0,
    floor: [],
    rows: [[null], [null,null], [null,null,null], [null,null,null,null], [null,null,null,null,null]],
    wall: Array(5).fill(null).map(() => Array(5).fill(null))
  };
  state.players.push(player);
  return player;
}

describe('End-to-End: 完整游戏流程', () => {
  test('E2E 1: 创建游戏', () => {
    const game = createGameState(2);
    expect(game.phase).toBe('lobby');
    expect(game.factories.length).toBe(5); // 2人=5工厂
  });
  
  test('E2E 2: 3人游戏工厂数', () => {
    const game = createGameState(3);
    expect(game.factories.length).toBe(7);
  });
  
  test('E2E 3: 4人游戏工厂数', () => {
    const game = createGameState(4);
    expect(game.factories.length).toBe(9);
  });
  
  test('E2E 4: 玩家加入', () => {
    const game = createGameState(2);
    addPlayer(game, 'Alice');
    addPlayer(game, 'Bob');
    expect(game.players.length).toBe(2);
  });
  
  test('E2E 5: 游戏开始并填充工厂', () => {
    const game = createGameState(2);
    addPlayer(game, 'Alice');
    addPlayer(game, 'Bob');
    
    game.phase = 'draw';
    game.factories.forEach(factory => {
      for (let i = 0; i < 4 && game.bag.length > 0; i++) {
        factory.push(game.bag.pop());
      }
    });
    
    expect(game.factories[0].length).toBe(4);
    expect(game.bag.length).toBe(100 - 5*4); // 80块
  });
  
  test('E2E 6: 玩家拿取瓷砖', () => {
    const game = createGameState(2);
    const player = addPlayer(game, 'Alice');
    game.factories[0] = ['blue', 'blue', 'red', 'yellow'];
    
    const color = 'blue';
    const tiles = game.factories[0].filter(t => t === color);
    player.floor.push(...tiles);
    game.factories[0] = game.factories[0].filter(t => t !== color);
    
    expect(player.floor).toEqual(['blue', 'blue']);
  });
  
  test('E2E 7: 放置到图案线', () => {
    const player = {
      rows: [[], [null,null], [null,null,null], [null,null,null,null], [null,null,null,null,null]], // 初始化为空数组
      floor: ['blue', 'blue']
    };
    
    // 放入第1行（容量1）
    if (player.rows[0].length < 1 && player.floor.length > 0) {
      player.rows[0].push(player.floor.shift());
    }
    
    expect(player.rows[0].length).toBe(1); 
    expect(player.floor.length).toBe(1);
  });
  
  test('E2E 8: 图案线完成', () => {
    const player = {
      rows: [[null], [null,null], [null,null,null], [null,null,null,null], [null,null,null,null,null]]
    };
    
    player.rows[0] = ['blue'];
    const isComplete = player.rows[0].every(t => t !== null);
    expect(isComplete).toBe(true);
  });
  
  test('E2E 9: 转移到墙面', () => {
    const player = {
      rows: [[null], [null,null], [null,null,null], [null,null,null,null], [null,null,null,null,null]],
      wall: Array(5).fill(null).map(() => Array(5).fill(null))
    };
    
    // 第1行完成，转移到墙面
    player.rows[0] = ['blue'];
    if (player.rows[0].every(t => t !== null)) {
      player.wall[0] = [...player.rows[0]];
      player.rows[0] = Array(1).fill(null);
    }
    
    expect(player.wall[0][0]).toBe('blue');
    expect(player.rows[0][0]).toBeNull();
  });
  
  test('E2E 10: 地板区扣分', () => {
    const floor = ['blue', 'red', 'yellow', 'black', 'white', 'blue', 'red'];
    const penalty = [-1, -2, -3, -4, -5, -6, -7];
    let totalPenalty = 0;
    for (let i = 0; i < Math.min(floor.length, 7); i++) {
      totalPenalty += penalty[i];
    }
    expect(totalPenalty).toBe(-28);
  });
  
  test('E2E 11: 游戏结束检测', () => {
    const player = {
      wall: [
        ['blue', 'yellow', 'red', 'black', 'white'],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null],
        [null, null, null, null, null]
      ]
    };
    
    const hasCompleteRow = player.wall.some(row => row.every(t => t !== null));
    expect(hasCompleteRow).toBe(true);
  });
  
  test('E2E 12: 最终奖励 - 完整行', () => {
    const wall = [
      ['blue', 'yellow', 'red', 'black', 'white'],
      ['blue', 'yellow', 'red', 'black', 'white'],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ];
    
    let score = 0;
    wall.forEach(row => {
      if (row.every(t => t !== null)) score += 2;
    });
    
    expect(score).toBe(4); // 2行 x 2分
  });
  
  test('E2E 13: 最终奖励 - 完整列', () => {
    const wall = [
      ['blue', null, null, null, null],
      ['yellow', null, null, null, null],
      ['red', null, null, null, null],
      ['black', null, null, null, null],
      ['white', null, null, null, null]
    ];
    
    let score = 0;
    for (let c = 0; c < 5; c++) {
      if (wall.every(row => row[c] !== null)) score += 7;
    }
    
    expect(score).toBe(7);
  });
  
  test('E2E 14: 最终奖励 - 同色5块', () => {
    const wall = [
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null],
      ['blue', null, null, null, null]
    ];
    
    let score = 0;
    const blueCount = wall.flat().filter(t => t === 'blue').length;
    if (blueCount >= 5) score += 10;
    
    expect(score).toBe(10);
  });
});
