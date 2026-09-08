const invadersRoot = document.querySelector('[data-invaders]');

if (invadersRoot) {
  const canvas = invadersRoot.querySelector('.invaders-board');
  const context = canvas.getContext('2d');
  const scoreElement = invadersRoot.querySelector('[data-invaders-score]');
  const livesElement = invadersRoot.querySelector('[data-invaders-lives]');
  const waveElement = invadersRoot.querySelector('[data-invaders-wave]');
  const messageElement = invadersRoot.querySelector('.invaders-message');
  const startButton = invadersRoot.querySelector('[data-invaders-start]');
  const resetButton = invadersRoot.querySelector('[data-invaders-reset]');
  const keys = { left: false, right: false };
  let player, aliens, bullets, enemyShots, score, lives, wave, running, paused, direction, lastShot, lastEnemyShot, lastTime, frame;

  function reset() {
    player = { x: 162, y: 382, width: 36, height: 14 };
    aliens = Array.from({ length: 32 }, (_, index) => ({ x: 34 + (index % 8) * 38, y: 44 + Math.floor(index / 8) * 28, alive: true }));
    bullets = []; enemyShots = []; score = 0; lives = 3; wave = 1; direction = 1; lastShot = 0; lastEnemyShot = 0; running = false; paused = false;
    updateHud(); showMessage('START를 눌러 시작하세요.'); startButton.textContent = 'START';
  }

  function updateHud() { scoreElement.textContent = String(score).padStart(6, '0'); livesElement.textContent = String(lives).padStart(2, '0'); waveElement.textContent = String(wave).padStart(2, '0'); }
  function showMessage(text) { messageElement.textContent = text; messageElement.classList.remove('is-hidden'); }
  function hideMessage() { messageElement.classList.add('is-hidden'); }
  function shoot() { if (!running || paused || performance.now() - lastShot < 240) return; bullets.push({ x: player.x + 16, y: player.y - 8 }); lastShot = performance.now(); }
  function start() { if (!running) { reset(); running = true; hideMessage(); startButton.textContent = 'PAUSE'; } else { paused = !paused; startButton.textContent = paused ? 'RESUME' : 'PAUSE'; if (paused) showMessage('PAUSED'); else hideMessage(); } }
  function gameOver(text) { running = false; paused = false; startButton.textContent = 'START'; showMessage(text); }
  function drawShip() { context.fillStyle = '#9B7A4B'; context.fillRect(player.x, player.y + 7, player.width, 7); context.fillRect(player.x + 10, player.y + 2, 16, 5); context.fillRect(player.x + 16, player.y, 4, 2); }
  function drawAlien(alien) { context.fillStyle = '#d4c9b5'; context.fillRect(alien.x + 5, alien.y, 14, 4); context.fillRect(alien.x + 2, alien.y + 4, 20, 8); context.fillRect(alien.x, alien.y + 8, 24, 5); context.fillRect(alien.x + 4, alien.y + 13, 4, 4); context.fillRect(alien.x + 16, alien.y + 13, 4, 4); }
  function draw() { context.fillStyle = '#0d0d0d'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#514a40'; for (let i = 0; i < 38; i += 1) context.fillRect((i * 47) % canvas.width, (i * 73) % 340, 1, 1); aliens.filter(a => a.alive).forEach(drawAlien); drawShip(); context.fillStyle = '#F2EFE8'; bullets.forEach(b => context.fillRect(b.x, b.y, 3, 8)); context.fillStyle = '#9B7A4B'; enemyShots.forEach(b => context.fillRect(b.x, b.y, 3, 8)); }
  function update(timestamp, delta) { if (!running || paused) return; if (keys.left) player.x = Math.max(8, player.x - 180 * delta); if (keys.right) player.x = Math.min(canvas.width - player.width - 8, player.x + 180 * delta); const alive = aliens.filter(a => a.alive); const speed = 18 + wave * 7; let edge = false; alive.forEach(a => { a.x += direction * speed * delta; if (a.x < 8 || a.x > canvas.width - 32) edge = true; }); if (edge) { direction *= -1; alive.forEach(a => { a.y += 12; }); } bullets.forEach(b => { b.y -= 320 * delta; }); enemyShots.forEach(b => { b.y += 180 * delta; }); bullets = bullets.filter(b => b.y > -10); enemyShots = enemyShots.filter(b => b.y < canvas.height + 10); bullets.forEach(b => alive.forEach(a => { if (a.alive && b.x > a.x && b.x < a.x + 24 && b.y > a.y && b.y < a.y + 18) { a.alive = false; b.y = -20; score += 25; updateHud(); } })); if (timestamp - lastEnemyShot > Math.max(380, 920 - wave * 60) && alive.length) { const shooter = alive[Math.floor(Math.random() * alive.length)]; enemyShots.push({ x: shooter.x + 11, y: shooter.y + 18 }); lastEnemyShot = timestamp; } enemyShots.forEach(b => { if (b.x > player.x && b.x < player.x + player.width && b.y > player.y && b.y < player.y + player.height) { b.y = canvas.height + 20; lives -= 1; updateHud(); if (!lives) gameOver('GAME OVER · RESET으로 다시 시작하세요.'); } }); if (alive.some(a => a.y > player.y - 20)) gameOver('INVADERS LANDED · RESET으로 다시 시작하세요.'); if (!aliens.some(a => a.alive)) { wave += 1; aliens = Array.from({ length: 32 }, (_, index) => ({ x: 34 + (index % 8) * 38, y: 44 + Math.floor(index / 8) * 28, alive: true })); bullets = []; enemyShots = []; updateHud(); } }
  function loop(timestamp) { const delta = Math.min(0.05, (timestamp - lastTime) / 1000 || 0); lastTime = timestamp; update(timestamp, delta); draw(); frame = requestAnimationFrame(loop); }
  document.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === ' ') event.preventDefault(); if (event.key === 'ArrowLeft') keys.left = true; if (event.key === 'ArrowRight') keys.right = true; if (event.key === ' ') shoot(); if (event.key.toLowerCase() === 'p' && running) start(); });
  document.addEventListener('keyup', event => { if (event.key === 'ArrowLeft') keys.left = false; if (event.key === 'ArrowRight') keys.right = false; });
  invadersRoot.querySelectorAll('[data-invaders-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.invadersAction; if (action === 'left') player.x = Math.max(8, player.x - 24); if (action === 'right') player.x = Math.min(canvas.width - player.width - 8, player.x + 24); if (action === 'shoot') shoot(); }));
  startButton.addEventListener('click', start); resetButton.addEventListener('click', reset); reset(); frame = requestAnimationFrame(loop);
}
