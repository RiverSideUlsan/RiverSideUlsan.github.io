const tetrisRoot = document.querySelector('[data-tetris]');

if (tetrisRoot) {
  const boardCanvas = tetrisRoot.querySelector('.tetris-board');
  const previewCanvas = tetrisRoot.querySelector('.tetris-preview');
  const boardContext = boardCanvas.getContext('2d');
  const previewContext = previewCanvas.getContext('2d');
  const scoreElement = tetrisRoot.querySelector('[data-tetris-score]');
  const linesElement = tetrisRoot.querySelector('[data-tetris-lines]');
  const levelElement = tetrisRoot.querySelector('[data-tetris-level]');
  const messageElement = tetrisRoot.querySelector('.tetris-message');
  const startButton = tetrisRoot.querySelector('[data-tetris-start]');
  const resetButton = tetrisRoot.querySelector('[data-tetris-reset]');
  const columns = 10;
  const rows = 20;
  const cellSize = boardCanvas.width / columns;
  const shapes = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]]
  };
  const colors = {
    I: '#bca578',
    J: '#8b8275',
    L: '#d1c5ac',
    O: '#9b7a4b',
    S: '#8f9a7f',
    T: '#a78869',
    Z: '#80655a'
  };
  let board;
  let current;
  let next;
  let score;
  let lines;
  let level;
  let running = false;
  let paused = false;
  let lastDrop = 0;
  let animationFrame;

  function createBoard() {
    return Array.from({ length: rows }, () => Array(columns).fill(null));
  }

  function randomPiece() {
    const types = Object.keys(shapes);
    const type = types[Math.floor(Math.random() * types.length)];
    const matrix = shapes[type].map((row) => [...row]);

    return {
      type,
      matrix,
      x: Math.floor((columns - matrix[0].length) / 2),
      y: 0
    };
  }

  function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    return matrix.some((row, y) => row.some((value, x) => {
      if (!value) return false;
      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;

      return boardX < 0 || boardX >= columns || boardY >= rows || (boardY >= 0 && board[boardY][boardX]);
    }));
  }

  function mergePiece() {
    current.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value && current.y + y >= 0) {
        board[current.y + y][current.x + x] = current.type;
      }
    }));
  }

  function clearLines() {
    let cleared = 0;
    board = board.filter((row) => {
      if (row.every(Boolean)) {
        cleared += 1;
        return false;
      }
      return true;
    });

    while (board.length < rows) {
      board.unshift(Array(columns).fill(null));
    }

    if (cleared) {
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      score += [0, 100, 300, 500, 800][cleared] * level;
      updateStats();
    }
  }

  function rotate(matrix) {
    return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
  }

  function rotateCurrent() {
    const rotated = rotate(current.matrix);
    const shifts = [0, -1, 1, -2, 2];
    const shift = shifts.find((value) => !collides(current, value, 0, rotated));

    if (shift !== undefined) {
      current.matrix = rotated;
      current.x += shift;
    }
  }

  function spawnPiece() {
    current = next || randomPiece();
    current.x = Math.floor((columns - current.matrix[0].length) / 2);
    current.y = 0;
    next = randomPiece();

    if (collides(current)) {
      endGame();
    }
  }

  function lockPiece() {
    mergePiece();
    clearLines();
    spawnPiece();
  }

  function moveDown() {
    if (!running || paused) return;

    if (collides(current, 0, 1)) {
      lockPiece();
    } else {
      current.y += 1;
    }
  }

  function hardDrop() {
    if (!running || paused) return;

    let distance = 0;
    while (!collides(current, 0, distance + 1)) {
      distance += 1;
    }
    current.y += distance;
    score += distance * 2;
    updateStats();
    lockPiece();
  }

  function drawCell(context, x, y, color, size = cellSize) {
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size, size);
    context.strokeStyle = '#1d1b18';
    context.lineWidth = 1;
    context.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
  }

  function drawBoard() {
    boardContext.fillStyle = '#0d0d0d';
    boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    board.forEach((row, y) => row.forEach((type, x) => {
      if (type) drawCell(boardContext, x, y, colors[type]);
    }));
    current.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) drawCell(boardContext, current.x + x, current.y + y, colors[current.type]);
    }));
  }

  function drawPreview() {
    const previewSize = previewCanvas.width / 5;
    previewContext.fillStyle = '#0d0d0d';
    previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    const offsetX = (5 - next.matrix[0].length) / 2;
    const offsetY = (5 - next.matrix.length) / 2;
    next.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) drawCell(previewContext, x + offsetX, y + offsetY, colors[next.type], previewSize);
    }));
  }

  function updateStats() {
    scoreElement.textContent = String(score).padStart(6, '0');
    linesElement.textContent = String(lines).padStart(2, '0');
    levelElement.textContent = String(level).padStart(2, '0');
  }

  function showMessage(message) {
    messageElement.textContent = message;
    messageElement.classList.remove('is-hidden');
  }

  function hideMessage() {
    messageElement.classList.add('is-hidden');
  }

  function endGame() {
    running = false;
    paused = false;
    startButton.textContent = 'START';
    showMessage('GAME OVER · RESET으로 다시 시작하세요.');
  }

  function startGame() {
    if (!running) {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      next = randomPiece();
      spawnPiece();
      updateStats();
      running = true;
      paused = false;
      startButton.textContent = 'PAUSE';
      hideMessage();
    } else {
      paused = !paused;
      startButton.textContent = paused ? 'RESUME' : 'PAUSE';
      if (paused) showMessage('PAUSED'); else hideMessage();
    }
  }

  function resetGame() {
    running = false;
    paused = false;
    next = randomPiece();
    board = createBoard();
    current = randomPiece();
    score = 0;
    lines = 0;
    level = 1;
    updateStats();
    startButton.textContent = 'START';
    showMessage('START를 눌러 시작하세요.');
  }

  function gameLoop(timestamp) {
    const interval = Math.max(120, 700 - (level - 1) * 55);
    if (running && !paused && timestamp - lastDrop > interval) {
      moveDown();
      lastDrop = timestamp;
    }
    drawBoard();
    drawPreview();
    animationFrame = requestAnimationFrame(gameLoop);
  }

  document.addEventListener('keydown', (event) => {
    if (!running || paused) {
      if (event.key.toLowerCase() === 'p' && running) startGame();
      return;
    }
    const actions = {
      ArrowLeft: () => { if (!collides(current, -1, 0)) current.x -= 1; },
      ArrowRight: () => { if (!collides(current, 1, 0)) current.x += 1; },
      ArrowDown: moveDown,
      ArrowUp: rotateCurrent,
      ' ': hardDrop,
      p: startGame,
      P: startGame
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  });

  tetrisRoot.querySelectorAll('[data-tetris-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.tetrisAction;
      if (action === 'left' && running && !paused && !collides(current, -1, 0)) current.x -= 1;
      if (action === 'right' && running && !paused && !collides(current, 1, 0)) current.x += 1;
      if (action === 'down') moveDown();
      if (action === 'rotate' && running && !paused) rotateCurrent();
      if (action === 'drop') hardDrop();
    });
  });

  startButton.addEventListener('click', startGame);
  resetButton.addEventListener('click', resetGame);
  resetGame();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(gameLoop);
}
