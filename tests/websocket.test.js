// tests/websocket.test.js
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3000';

function test(description, fn) {
  return fn().then(result => {
    console.log(`✓ ${description}`);
    return result;
  }).catch(err => {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${err.message}`);
    throw err;
  });
}

async function runTests() {
  console.log('\n=== WebSocket Tests ===\n');
  
  let ws;
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: Connect to server
    await test('Should connect to WebSocket server', () => {
      return new Promise((resolve, reject) => {
        ws = new WebSocket(WS_URL);
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    });
    passed++;
    
    // Test 2: Receive message
    await test('Should receive message on connect', () => {
      return new Promise((resolve, reject) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.type) {
            resolve(msg);
          } else {
            reject(new Error('Invalid message format'));
          }
        });
        setTimeout(() => reject(new Error('No message received')), 5000);
      });
    });
    passed++;
    
    // Test 3: Join game
    await test('Should join game with name', () => {
      return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({ type: 'join', name: 'TestPlayer' }));
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.type === 'joined') {
            resolve(msg);
          } else if (msg.type === 'playerJoined') {
            resolve(msg);
          }
        });
        setTimeout(() => reject(new Error('Join response timeout')), 5000);
      });
    });
    passed++;
    
  } catch (err) {
    failed++;
    console.log(`  ${err.message}`);
  }
  
  if (ws) ws.close();
  
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
