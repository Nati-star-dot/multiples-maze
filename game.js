const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const currentNumberElement = document.getElementById("current-number");
const safeCountElement = document.getElementById("safe-count");
const restartCountElement = document.getElementById("restart-count");
const messageElement = document.getElementById("message");
const restartButton = document.getElementById("restart-button");
const touchButtons = document.querySelectorAll(".control-button");

const rows = 13;
const cols = 13;
const tileSize = canvas.width / cols;
const startPosition = { row: 12, col: 6 };
const antidotePosition = { row: 0, col: 6 };
const minPathSteps = 15;
const maxPathSteps = 22;

let grid;
let player;
let collectedSafe;
let restartCount;
let currentNumber;
let safeNumbers;
let safeSet;
let safeCellKeys;
let antidoteNumber;
let previousPathSignature = "";

function keyFor(row, col) {
  return `${row},${col}`;
}

function fromKey(key) {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isInside(row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function neighborCells(row, col) {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ].filter((cell) => isInside(cell.row, cell.col));
}

function pathHasVariedShape(path) {
  let horizontalMoves = 0;
  let turns = 0;
  let previousDirection = null;

  for (let index = 1; index < path.length; index += 1) {
    const previous = fromKey(path[index - 1]);
    const current = fromKey(path[index]);
    const direction = {
      row: Math.sign(current.row - previous.row),
      col: Math.sign(current.col - previous.col),
    };

    if (direction.col !== 0) {
      horizontalMoves += 1;
    }

    if (
      previousDirection &&
      (previousDirection.row !== direction.row || previousDirection.col !== direction.col)
    ) {
      turns += 1;
    }

    previousDirection = direction;
  }

  return horizontalMoves >= 4 && turns >= 4;
}

function createHiddenPath() {
  const startKey = keyFor(startPosition.row, startPosition.col);
  const antidoteKey = keyFor(antidotePosition.row, antidotePosition.col);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const turnRows = shuffle([10, 9, 8, 7, 6, 5, 4, 3, 2])
      .slice(0, 3)
      .sort((left, right) => right - left);
    const firstSide = Math.random() < 0.5 ? -1 : 1;
    const columns = turnRows.map((_, index) => {
      const direction = index % 2 === 0 ? firstSide : -firstSide;
      return startPosition.col + direction * randomInt(1, 2);
    });
    const path = [startKey];
    const visited = new Set(path);
    const current = { ...startPosition };

    function append(row, col) {
      const nextKey = keyFor(row, col);
      if (visited.has(nextKey)) {
        return false;
      }
      visited.add(nextKey);
      path.push(nextKey);
      current.row = row;
      current.col = col;
      return true;
    }

    function walkHorizontal(targetCol) {
      while (current.col !== targetCol) {
        const step = Math.sign(targetCol - current.col);
        if (!append(current.row, current.col + step)) {
          return false;
        }
      }
      return true;
    }

    function walkVertical(targetRow) {
      while (current.row !== targetRow) {
        const step = Math.sign(targetRow - current.row);
        if (!append(current.row + step, current.col)) {
          return false;
        }
      }
      return true;
    }

    const ok = turnRows.every((row, index) => {
      return walkHorizontal(columns[index]) && walkVertical(row);
    }) && walkHorizontal(startPosition.col) && walkVertical(antidotePosition.row);

    const steps = path.length - 1;
    if (
      ok &&
      path[path.length - 1] === antidoteKey &&
      steps >= minPathSteps &&
      steps <= maxPathSteps &&
      pathHasVariedShape(path) &&
      path.join("|") !== previousPathSignature
    ) {
      return path;
    }
  }

  const fallbackPaths = [
    [
      startKey,
      keyFor(11, 6),
      keyFor(10, 6),
      keyFor(10, 5),
      keyFor(9, 5),
      keyFor(8, 5),
      keyFor(8, 6),
      keyFor(7, 6),
      keyFor(6, 6),
      keyFor(6, 7),
      keyFor(5, 7),
      keyFor(4, 7),
      keyFor(4, 6),
      keyFor(3, 6),
      keyFor(2, 6),
      keyFor(1, 6),
      antidoteKey,
    ],
    [
      startKey,
      keyFor(12, 5),
      keyFor(11, 5),
      keyFor(10, 5),
      keyFor(10, 6),
      keyFor(9, 6),
      keyFor(8, 6),
      keyFor(8, 5),
      keyFor(7, 5),
      keyFor(6, 5),
      keyFor(6, 6),
      keyFor(5, 6),
      keyFor(4, 6),
      keyFor(3, 6),
      keyFor(2, 6),
      keyFor(1, 6),
      antidoteKey,
    ],
    [
      startKey,
      keyFor(12, 7),
      keyFor(11, 7),
      keyFor(10, 7),
      keyFor(10, 6),
      keyFor(9, 6),
      keyFor(8, 6),
      keyFor(8, 7),
      keyFor(7, 7),
      keyFor(6, 7),
      keyFor(6, 6),
      keyFor(5, 6),
      keyFor(4, 6),
      keyFor(3, 6),
      keyFor(2, 6),
      keyFor(1, 6),
      antidoteKey,
    ],
  ];

  return shuffle(fallbackPaths).find((path) => path.join("|") !== previousPathSignature) || fallbackPaths[0];
}

function generateSafeNumbers(count) {
  const repeatedPool = [];
  const tableAfterNine = Array.from({ length: 11 }, (_, index) => (index + 2) * 9);

  while (repeatedPool.length < count - 1) {
    repeatedPool.push(...shuffle(tableAfterNine));
  }

  return [9, ...repeatedPool.slice(0, count - 1)];
}

function generateTrapNumbers(count) {
  const pool = shuffle(
    Array.from({ length: 107 }, (_, index) => index + 2).filter((number) => number % 9 !== 0 && number !== 1)
  );
  const repeatsNeeded = Math.ceil(count / pool.length);
  return Array.from({ length: repeatsNeeded }, () => shuffle(pool)).flat().slice(0, count);
}

function buildRunGrid() {
  const nextGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const hiddenPath = createHiddenPath();
  previousPathSignature = hiddenPath.join("|");
  const pathNumbers = hiddenPath.slice(1);
  const pathSet = new Set(pathNumbers);
  const trapNumbers = generateTrapNumbers(rows * cols + 16);
  let trapIndex = 0;
  const nextTrapNumber = () => {
    const number = trapNumbers[trapIndex % trapNumbers.length];
    trapIndex += 1;
    return number;
  };

  safeNumbers = generateSafeNumbers(pathNumbers.length);
  safeSet = new Set(safeNumbers);
  safeCellKeys = new Set(pathNumbers);
  antidoteNumber = safeNumbers[safeNumbers.length - 1];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      nextGrid[row][col] = nextTrapNumber();
    }
  }

  nextGrid[startPosition.row][startPosition.col] = 1;

  pathNumbers.forEach((key, index) => {
    const cell = fromKey(key);
    nextGrid[cell.row][cell.col] = safeNumbers[index];
  });

  // Keep only one opening branch safe: the first hidden-path square is always 9.
  neighborCells(startPosition.row, startPosition.col).forEach((cell) => {
    const marker = keyFor(cell.row, cell.col);
    if (!pathSet.has(marker)) {
      nextGrid[cell.row][cell.col] = nextTrapNumber();
    }
  });

  return nextGrid;
}

function setMessage(text) {
  messageElement.textContent = text;
}

function updateHud() {
  currentNumberElement.textContent = String(currentNumber);
  safeCountElement.textContent = `${collectedSafe.size}/${safeNumbers.length}`;
  restartCountElement.textContent = String(restartCount);
}

function resetRun(showMessage = true) {
  grid = buildRunGrid();
  player = { ...startPosition };
  collectedSafe = new Set();
  currentNumber = 1;
  updateHud();

  if (showMessage) {
    setMessage("Start as 1. Every square is numbered. Only multiples of 9 are safe.");
  }
}

function fullRestart() {
  restartCount = 0;
  resetRun();
}

function isWalkable(row, col) {
  return isInside(row, col);
}

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * tileSize;
      const y = row * tileSize;
      const value = grid[row][col];
      const cellKey = keyFor(row, col);
      const isStart = row === startPosition.row && col === startPosition.col;
      const isCollected = collectedSafe.has(cellKey);

      context.fillStyle = isStart ? "#dbeafe" : "#fbf7ef";
      if (isCollected) {
        context.fillStyle = "#d8f3dc";
      }
      context.fillRect(x, y, tileSize, tileSize);

      context.strokeStyle = "rgba(20, 50, 74, 0.1)";
      context.strokeRect(x, y, tileSize, tileSize);

      context.fillStyle = "#17324a";
      context.font = `700 ${tileSize * 0.22}px Space Grotesk`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(value), x + tileSize / 2, y + tileSize / 2);
    }
  }
}

function drawPlayer() {
  const x = player.col * tileSize + tileSize / 2;
  const y = player.row * tileSize + tileSize / 2;

  context.fillStyle = "#d95d39";
  context.beginPath();
  context.arc(x, y, tileSize * 0.19, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fff7ed";
  context.beginPath();
  context.arc(x - 5, y - 4, 3, 0, Math.PI * 2);
  context.arc(x + 5, y - 4, 3, 0, Math.PI * 2);
  context.fill();
}

function draw() {
  drawBoard();
  drawPlayer();
}

function reachAntidote() {
  currentNumber = 1;
  updateHud();
  setMessage("The antidote changed you back into 1. The board restarted.");
  resetRun(false);
}

function handleTrap(number) {
  restartCount += 1;
  resetRun(false);
  updateHud();
  setMessage(`${number} is not divisible by 9. You died and the whole board changed.`);
}

function movePlayer(direction) {
  const deltas = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  };

  const delta = deltas[direction];
  const nextRow = player.row + delta.row;
  const nextCol = player.col + delta.col;

  if (!isWalkable(nextRow, nextCol)) {
    return;
  }

  const number = grid[nextRow][nextCol];
  const currentKey = keyFor(nextRow, nextCol);
  player.row = nextRow;
  player.col = nextCol;
  currentNumber = number;

  if (number === 1) {
    updateHud();
    setMessage("Back at 1. Choose a neighboring 9 to begin again.");
    draw();
    return;
  }

  if (!safeSet.has(number) || !safeCellKeys.has(currentKey)) {
    draw();
    handleTrap(number);
    draw();
    return;
  }

  collectedSafe.add(currentKey);
  updateHud();

  if (nextRow === antidotePosition.row && nextCol === antidotePosition.col) {
    if (collectedSafe.size === safeNumbers.length) {
      reachAntidote();
    } else {
      setMessage("The antidote is not ready. Find every safe multiple of 9 first.");
    }
    draw();
    return;
  }

  if (collectedSafe.size === safeNumbers.length) {
    setMessage("All safe multiples found. Reach the numbered antidote square.");
  } else {
    setMessage(`${number} is safe. Keep choosing adjacent multiples of 9.`);
  }

  draw();
}

const keyMap = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!(key in keyMap)) {
    return;
  }

  event.preventDefault();
  movePlayer(keyMap[key]);
});

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    movePlayer(button.dataset.direction);
  });
});

restartButton.addEventListener("click", () => {
  fullRestart();
  draw();
});

fullRestart();
draw();
