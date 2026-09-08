const snakeRoot = document.querySelector('[data-snake]');

if (snakeRoot) {
  const canvas = snakeRoot.querySelector('.snake-board');
  const context = canvas.getContext('2d');
  const scoreElement = snakeRoot.querySelector('[data-snake-score]');
  const lengthElement = snakeRoot.querySelector('[data-snake-length]');
  const speedElement = snakeRoot.querySelector('[data-snake-speed]');
  const messageElement = snakeRoot.querySelector('.snake-message');
  const startButton = snakeRoot.querySelector('[data-snake-start]');
  const resetButton = snakeRoot.querySelector('[data-snake-reset]');
  const cell = 18;
  const size = 20;
  let snake, food, direction, nextDirection, score, running, paused, lastMove;

  function randomFood() {
    let point;
    do { point = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) }; } while (snake.some(part => part.x === point.x && part.y === point.y));
    return point;
  }
  function hud() { scoreElement.textContent = String(score).padStart(6, '0'); lengthElement.textContent = String(snake.length).padStart(2, '0'); speedElement.textContent = String(Math.floor(score / 50) + 1).padStart(2, '0'); }
  function show(text) { messageElement.textContent = text; messageElement.classList.remove('is-hidden'); }
  function hide() { messageElement.classList.add('is-hidden'); }
  function reset() { snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }]; direction = { x: 1, y: 0 }; nextDirection = direction; score = 0; food = randomFood(); running = false; paused = false; lastMove = 0; hud(); startButton.textContent = 'START'; show('START를 눌러 시작하세요.'); }
  function start() { if (!running) { running = true; paused = false; hide(); startButton.textContent = 'PAUSE'; } else { paused = !paused; startButton.textContent = paused ? 'RESUME' : 'PAUSE'; if (paused) show('PAUSED'); else hide(); } }
  function setDirection(x, y) { if (direction.x + x !== 0 || direction.y + y !== 0) nextDirection = { x, y }; }
  function end(text) { running = false; paused = false; startButton.textContent = 'START'; show(text); }
  function move() { direction = nextDirection; const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }; if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || snake.some(part => part.x === head.x && part.y === head.y)) { end('GAME OVER · RESET으로 다시 시작하세요.'); return; } snake.unshift(head); if (head.x === food.x && head.y === food.y) { score += 10; food = randomFood(); hud(); } else snake.pop(); }
  function draw() { context.fillStyle = '#111'; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = '#292725'; for (let i = 0; i <= size; i += 1) { context.beginPath(); context.moveTo(i * cell, 0); context.lineTo(i * cell, canvas.height); context.stroke(); context.beginPath(); context.moveTo(0, i * cell); context.lineTo(canvas.width, i * cell); context.stroke(); } context.fillStyle = '#d9c79f'; context.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6); snake.forEach((part, index) => { context.fillStyle = index ? '#9B7A4B' : '#F2EFE8'; context.fillRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4); }); }
  function loop(time) { const interval = Math.max(70, 180 - Math.floor(score / 50) * 10); if (running && !paused && time - lastMove > interval) { move(); lastMove = time; } draw(); requestAnimationFrame(loop); }
  document.addEventListener('keydown', event => { const directions = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] }; if (directions[event.key]) { event.preventDefault(); setDirection(...directions[event.key]); } if (event.key.toLowerCase() === 'p' && running) start(); }); snakeRoot.querySelectorAll('[data-snake-action]').forEach(button => button.addEventListener('click', () => { const map = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }; setDirection(...map[button.dataset.snakeAction]); })); startButton.addEventListener('click', start); resetButton.addEventListener('click', reset); reset(); requestAnimationFrame(loop);
}
