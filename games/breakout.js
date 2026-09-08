const breakoutRoot = document.querySelector('[data-breakout]');

if (breakoutRoot) {
  const canvas = breakoutRoot.querySelector('.breakout-board');
  const context = canvas.getContext('2d');
  const scoreElement = breakoutRoot.querySelector('[data-breakout-score]');
  const livesElement = breakoutRoot.querySelector('[data-breakout-lives]');
  const levelElement = breakoutRoot.querySelector('[data-breakout-level]');
  const messageElement = breakoutRoot.querySelector('.breakout-message');
  const startButton = breakoutRoot.querySelector('[data-breakout-start]');
  const resetButton = breakoutRoot.querySelector('[data-breakout-reset]');
  const keys = { left: false, right: false };
  let paddle, ball, bricks, score, lives, level, running, paused, launched, lastTime;

  function makeBricks() {
    return Array.from({ length: 5 + level }, (_, row) => Array.from({ length: 7 }, (_, column) => ({ x: 22 + column * 46, y: 36 + row * 22, alive: true, color: ['#d9c79f', '#b49362', '#8f9a7f', '#b9b2a7'][row % 4] })));
  }
  function updateHud() { scoreElement.textContent = String(score).padStart(6, '0'); livesElement.textContent = String(lives).padStart(2, '0'); levelElement.textContent = String(level).padStart(2, '0'); }
  function showMessage(text) { messageElement.textContent = text; messageElement.classList.remove('is-hidden'); }
  function hideMessage() { messageElement.classList.add('is-hidden'); }
  function placeBall() { ball = { x: paddle.x + paddle.width / 2, y: paddle.y - 8, dx: 170 + level * 18, dy: -190 - level * 18, radius: 6 }; launched = false; }
  function reset() { paddle = { x: 135, y: 366, width: 90, height: 10 }; score = 0; lives = 3; level = 1; bricks = makeBricks(); running = false; paused = false; placeBall(); updateHud(); startButton.textContent = 'START'; showMessage('START를 눌러 시작하세요.'); }
  function start() { if (!running) { running = true; paused = false; launched = true; hideMessage(); startButton.textContent = 'PAUSE'; } else { paused = !paused; startButton.textContent = paused ? 'RESUME' : 'PAUSE'; if (paused) showMessage('PAUSED'); else hideMessage(); } }
  function end(text) { running = false; paused = false; startButton.textContent = 'START'; showMessage(text); }
  function draw() { context.fillStyle = '#111'; context.fillRect(0, 0, canvas.width, canvas.height); bricks.flat().filter(b => b.alive).forEach(b => { context.fillStyle = b.color; context.fillRect(b.x, b.y, 40, 14); }); context.fillStyle = '#F2EFE8'; context.fillRect(paddle.x, paddle.y, paddle.width, paddle.height); context.beginPath(); context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); context.fillStyle = '#d9c79f'; context.fill(); }
  function update(delta) { if (!running || paused) return; if (keys.left) paddle.x = Math.max(8, paddle.x - 260 * delta); if (keys.right) paddle.x = Math.min(canvas.width - paddle.width - 8, paddle.x + 260 * delta); if (!launched) { ball.x = paddle.x + paddle.width / 2; return; } ball.x += ball.dx * delta; ball.y += ball.dy * delta; if (ball.x < ball.radius || ball.x > canvas.width - ball.radius) ball.dx *= -1; if (ball.y < ball.radius) ball.dy *= -1; if (ball.y > paddle.y && ball.y < paddle.y + paddle.height + 8 && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) { ball.dy = -Math.abs(ball.dy); ball.dx = ((ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)) * 240; } bricks.flat().filter(b => b.alive).forEach(b => { if (ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + 40 && ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + 14) { b.alive = false; ball.dy *= -1; score += 10; updateHud(); } }); if (ball.y > canvas.height + 10) { lives -= 1; updateHud(); if (!lives) end('GAME OVER · RESET으로 다시 시작하세요.'); else { placeBall(); launched = true; } } if (!bricks.flat().some(b => b.alive)) { level += 1; bricks = makeBricks(); placeBall(); launched = true; updateHud(); } }
  function loop(time) { const delta = Math.min(0.04, (time - lastTime) / 1000 || 0); lastTime = time; update(delta); draw(); requestAnimationFrame(loop); }
  document.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ') event.preventDefault(); if (event.key === 'ArrowLeft') keys.left = true; if (event.key === 'ArrowRight') keys.right = true; if (event.key === ' ' && running) launched = true; if (event.key.toLowerCase() === 'p' && running) start(); }); document.addEventListener('keyup', event => { if (event.key === 'ArrowLeft') keys.left = false; if (event.key === 'ArrowRight') keys.right = false; });
  breakoutRoot.querySelectorAll('[data-breakout-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.breakoutAction; if (action === 'left') paddle.x = Math.max(8, paddle.x - 30); if (action === 'right') paddle.x = Math.min(canvas.width - paddle.width - 8, paddle.x + 30); if (action === 'launch' && running) launched = true; })); startButton.addEventListener('click', start); resetButton.addEventListener('click', reset); reset(); requestAnimationFrame(loop);
}
