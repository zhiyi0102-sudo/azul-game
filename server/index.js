const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// 日志目录
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// Winston 日志配置
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') })
  ]
});

// 开发环境同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const AUTH_CODE = 'azul2026';
const sessions = new Set();

logger.info('Azul server starting...');

app.use(express.json());

// Auth page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>花砖物语 - 验证</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #1a1a2e, #16213e); min-height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; }
    .box { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; text-align: center; }
    input { padding: 12px; font-size: 16px; border-radius: 8px; border: none; width: 200px; margin: 10px; }
    button { padding: 12px 30px; font-size: 16px; background: linear-gradient(90deg, #f093fb, #f5576c); border: none; border-radius: 8px; color: white; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🎨 花砖物语</h2>
    <p>请输入访问密码</p>
    <input type="password" id="code" placeholder="访问密码">
    <br>
    <button onclick="submit()">进入游戏</button>
    <p id="msg" style="color: red; margin-top: 10px;"></p>
  </div>
  <script>
    function submit() {
      const code = document.getElementById('code').value;
      fetch('/auth', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code}) })
      .then(r => r.json()).then(d => {
        if (d.ok) { localStorage.setItem('azul_token', d.token); location.href = '/game.html'; }
        else { document.getElementById('msg').textContent = '密码错误'; }
      });
    }
  </script>
</body>
</html>`);
});

app.post('/auth', (req, res) => {
  if (req.body.code === AUTH_CODE) {
    const token = crypto.randomBytes(16).toString('hex');
    sessions.add(token);
    res.json({ok: true, token});
  } else {
    res.json({ok: false});
  }
});

app.get('/game.html', (req, res) => {
  const token = req.headers.authorization;
  if (!token || !sessions.has(token)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'game.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// WebSocket
wss.on('connection', (ws, req) => {
  logger.info('Player connected', { ip: req.socket.remoteAddress });
  ws.on('message', (message) => {
    const msg = JSON.parse(message);
    logger.debug('Received message', { type: msg.type });
    switch (msg.type) {
      case 'join':
        if (gameState.players.length < 4 && gameState.phase === 'lobby') {
          const player = { id: gameState.players.length, name: msg.name, template: JSON.parse(JSON.stringify(TEMPLATE)), score: 0, ws: ws };
          gameState.players.push(player);
          logger.info('Player joined', { playerId: player.id, playerName: player.name });
          ws.send(JSON.stringify({ type: 'joined', data: { playerId: player.id, playerName: player.name } }));
          broadcast('playerJoined', { players: gameState.players.map(p => ({ id: p.id, name: p.name })) });
        }
        break;
      case 'start':
        if (gameState.players.length >= 2 && gameState.phase === 'lobby') {
          logger.info('Game starting', { playerCount: gameState.players.length });
          gameState.phase = 'draw';
          gameState.rounds = 0;
          gameState.bag = initBag();
          gameState.currentPlayer = 0;
          startNewRound();
          broadcast('gameStart', { players: gameState.players.map(p => ({ id: p.id, name: p.name })) });
        }
        break;
      case 'drawTiles':
        if (gameState.phase === 'draw') {
          const player = gameState.players.find(p => p.id === msg.playerId);
          if (player && player.id === gameState.currentPlayer) drawTiles(msg.factoryIndex, msg.color, player);
        }
        break;
      case 'placeTile':
        if (gameState.phase === 'place') {
          const player = gameState.players.find(p => p.id === msg.playerId);
          if (player && player.id === gameState.currentPlayer) placeTile(player, msg.row);
        }
        break;
      case 'discard':
        if (gameState.phase === 'place') {
          const player = gameState.players.find(p => p.id === msg.playerId);
          if (player && player.id === gameState.currentPlayer) discardFloor(player);
        }
        break;
    }
  });
  ws.on('close', () => {
    const index = gameState.players.findIndex(p => p.ws === ws);
    if (index !== -1) { gameState.players.splice(index, 1); broadcast('playerLeft', { playerId: gameState.players[index]?.id }); }
  });
});

let gameState = { players: [], currentPlayer: 0, phase: 'lobby', factories: [], bag: [], rounds: 0, maxRounds: 5, gameEndsAfterThisRound: false, startingPlayer: 0, center: [] };
const COLORS = ['blue', 'yellow', 'red', 'black', 'white'];
const TEMPLATE = { floor: [], rows: [[null],[null,null],[null,null,null],[null,null,null,null],[null,null,null,null,null]], wall: Array(5).fill(null).map(()=>Array(5).fill(null)) };

function initBag() { const bag = []; COLORS.forEach(c => { for(let i=0;i<20;i++) bag.push(c); }); return shuffle(bag); }
function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function initFactories(numPlayers) { const numFactories = [0,0,5,7,9][numPlayers]; return Array(numFactories).fill(null).map(() => { const t=[]; for(let i=0;i<4;i++) if(gameState.bag.length>0) t.push(gameState.bag.pop()); return t; }); }
function broadcast(t, d) { wss.clients.forEach(c => { if(c.readyState===WebSocket.OPEN) c.send(JSON.stringify({type:t,data:d})); }); }
function startNewRound() { gameState.rounds++; gameState.factories=initFactories(gameState.players.length); gameState.center = ['token']; gameState.currentPlayer=gameState.startingPlayer; gameState.phase='draw'; broadcast('newRound',{round:gameState.rounds}); broadcastState(); }
function drawTiles(fi, c, p) {
  let tiles = [];
  if (fi === -1) {
    tiles = gameState.center.filter(t => t === c);
    if (gameState.center.includes('token')) {
      tiles.push('token');
      gameState.startingPlayer = p.id;
    }
    gameState.center = gameState.center.filter(t => t !== c && t !== 'token');
  } else {
    tiles = gameState.factories[fi].filter(t => t === c);
    gameState.factories[fi] = gameState.factories[fi].filter(t => t !== c);
    gameState.center.push(...gameState.factories[fi]);
    gameState.factories[fi] = [];
  }
  p.template.floor.push(...tiles); gameState.phase = 'place'; broadcastState();
}
function placeTile(p, r) {
  const color = p.template.floor[0];
  // 不能放超过行数，行内只能存在相同颜色且墙上对应位置不能已被占用
  const row = p.template.rows[r];
  const canUseRow = row.length === 0 || row.every(t => t === color);
  const col = getWallCol(r, color);
  const positionOccupied = p.template.wall[r][col] !== null;
  if (row.length < r + 1 && canUseRow && !positionOccupied) {
    row.push(color); p.template.floor.shift();
    if (p.template.rows[r].length === r + 1) scoreRow(p, r);
    nextPlayer();
  }
}
// compute which column on the wall corresponds to a given color in a particular row
function getWallCol(row, color) {
  const baseIndex = COLORS.indexOf(color);
  // pattern rotates right by row number
  return (baseIndex + row) % 5;
}

function scoreRow(p, r) {
  const tiles = p.template.rows[r];
  const color = tiles[tiles.length - 1];
  const col = getWallCol(r, color);
  // place single tile of that color into the proper column
  p.template.wall[r][col] = color;
  p.template.rows[r] = Array(r+1).fill(null);

  // compute adjacency score
  let points = 1; // the tile itself
  // horizontal
  for (let c = col-1; c>=0 && p.template.wall[r][c]===color; c--) points++;
  for (let c = col+1; c<5 && p.template.wall[r][c]===color; c++) points++;
  // vertical
  for (let rr = r-1; rr>=0 && p.template.wall[rr][col]===color; rr--) points++;
  for (let rr = r+1; rr<5 && p.template.wall[rr][col]===color; rr++) points++;

  p.score += points;
}
function discardFloor(p) { let tileCount = p.template.floor.filter(t => t !== 'token').length; p.score -= [-1,-2,-3,-4,-5,-6,-7][Math.min(tileCount-1,6)]; p.template.floor = p.template.floor.filter(t => t !== 'token'); nextPlayer(); }
function nextPlayer() {
  gameState.currentPlayer++;
  if (gameState.currentPlayer >= gameState.players.length) {
    const allEmpty = gameState.factories.every(f => f.length === 0);
    const allFloorEmpty = gameState.players.every(p => p.template.floor.length === 0);
    if (allEmpty || allFloorEmpty) {
      // Check if any player completed a full horizontal row (end condition)
      gameState.players.forEach(p => {
        for (let r = 0; r < 5; r++) {
          if (p.template.wall[r].every(t => t !== null)) {
            gameState.gameEndsAfterThisRound = true;
          }
        }
      });
      
      // Calculate end-of-round bonuses if game is ending
      if (gameState.gameEndsAfterThisRound) {
        gameState.players.forEach(p => {
          for (let r = 0; r < 5; r++) if (p.template.wall[r].every(t => t !== null)) p.score += 2;
          for (let c = 0; c < 5; c++) if (p.template.wall.every(r => r[c] !== null)) p.score += 7;
          COLORS.forEach(color => { let count = 0; for(let r=0;r<5;r++) for(let c=0;c<5;c++) if(p.template.wall[r][c]===color) count++; if(count===5) p.score += 10; });
        });
        gameState.phase = 'end';
        broadcast('gameEnd', { players: gameState.players.map(p => ({id:p.id,name:p.name,score:p.score})).sort((a,b) => b.score - a.score) });
      } else {
        startNewRound();
      }
    } else { gameState.currentPlayer = 0; gameState.phase = 'draw'; broadcastState(); }
  } else { gameState.phase = 'draw'; broadcastState(); }
}
function broadcastState() {
  broadcast('state', { phase: gameState.phase, currentPlayer: gameState.currentPlayer, round: gameState.rounds, factories: gameState.factories, center: gameState.center, players: gameState.players.map(p => ({id:p.id,name:p.name,score:p.score,template:{floor:p.template.floor,rows:p.template.rows,wall:p.template.wall}})) });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { logger.info(`Azul 服务器运行在 http://localhost:${PORT}`); logger.info(`访问密码: ${AUTH_CODE}`); });
