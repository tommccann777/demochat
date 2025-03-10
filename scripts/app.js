const PIECE_RADIUS = 18;
const PIECE_DIAMETER = PIECE_RADIUS + PIECE_RADIUS;
const VERTICAL_TOLERANCE = 4;

const pieces = document.querySelectorAll('.piece');
const coordsField = document.querySelector('#coords');
const pointField = document.querySelector('#point');
const startingField = document.querySelector('#starting');

let region, point;

const boardElement = document.getElementById('board');
const boardLeftOffset = boardElement.getBoundingClientRect().left;
const boardTopOffset = boardElement.getBoundingClientRect().top;
//console.log('boardLeftOffset = ', boardLeftOffset, ', boardTopOffset = ', boardTopOffset);

console.log('Using Firebase in app.js:', window.firebaseApp);
const db = window.database;
console.log(db);

function rollOnce() {
  board.throwDice(1);
  startingField.value = board.diceThrows;
}

function rollTwice() {
  board.throwDice(2);
  startingField.value = board.diceThrows;
}

class CoordinateMapper {
  constructor() {
    this.coordinates = new Map();
  }

  // Add a coordinate mapping
  addCoordinate(pt, pos, x, y) {
    const key = `${x},${y}`;
    this.coordinates.set(key, { pt, pos });
  }

  // Find the exact point and pos for given x,y coordinates
  findPointAndPos(x, y) {
    const key = `${x},${y}`;
    let result = this.coordinates.get(key);
    return result === undefined ? { pt: 0, pos: 0 } : result;
  }
}

let activePlayer = 'w';
let myPlayer = 'w';
let currentMove = {};

const mapper = new CoordinateMapper();
defineCoordMap();

// Create the board object
//  - 0 represents nowhere or invalid position
//  - 1 to 24 represents the actual points
//  - 25 represents red-bar
//  - 26 represents white-bar
const board = {
  contents: Array.from({ length: 27 }, () => ({
    color: '',
    occupied: [],
  })),

  diceThrows: [0, 0, 0, 0],

  onTheMove: '', // piece id that is currently on the move

  // populate dice throws
  throwDice(numberOfDice) {
    // clear previous throw
    this.diceThrows.fill(0);

    if (numberOfDice == 1) {
      this.diceThrows[0] = Math.floor(Math.random() * 6) + 1;
    } else if (numberOfDice == 2) {
      this.diceThrows[0] = Math.floor(Math.random() * 6) + 1;
      this.diceThrows[1] = Math.floor(Math.random() * 6) + 1;

      if (this.diceThrows[0] == this.diceThrows[1]) {
        this.diceThrows[2] = this.diceThrows[0];
        this.diceThrows[3] = this.diceThrows[0];
      }
    }
  },

  // Method to update a specific point by index
  updatePoint(index, newContent) {
    if (index < 0 || index >= this.contents.length) {
      console.error('Index out of bounds');
      return;
    }
    this.contents[index] = { ...this.contents[index], ...newContent };
  },

  // Method to reset the board
  resetBoard() {
    this.contents = this.contents.map(() => ({
      // color: '',
      occupied: [],
    }));

    // Starting positions
    this.contents[1].occupied = ['r1'];
    this.contents[2].occupied = ['r2'];
    this.contents[3].occupied = [];
    this.contents[4].occupied = [];
    this.contents[5].occupied = [];
    this.contents[6].occupied = ['w1', 'w2', 'w3', 'w4', 'w5'];
    this.contents[7].occupied = [];
    this.contents[8].occupied = ['w6', 'w7', 'w8'];
    this.contents[9].occupied = [];
    this.contents[10].occupied = [];
    this.contents[11].occupied = [];
    this.contents[12].occupied = ['r3', 'r4', 'r5', 'r6', 'r7'];
    this.contents[13].occupied = ['w9', 'w10', 'w11', 'w12', 'w13'];
    this.contents[14].occupied = [];
    this.contents[15].occupied = [];
    this.contents[16].occupied = [];
    this.contents[17].occupied = ['r8', 'r9', 'r10'];
    this.contents[18].occupied = [];
    this.contents[19].occupied = ['r11', 'r12', 'r13', 'r14', 'r15'];
    this.contents[20].occupied = [];
    this.contents[21].occupied = [];
    this.contents[22].occupied = [];
    this.contents[23].occupied = [];
    this.contents[24].occupied = ['w14', 'w15'];
  },

  movePiece(player, fromPoint, toPoint) {
    this.contents[toPoint].occupied.push(board.onTheMove);
    board.onTheMove = ''; // finished moving
  },

  updatePointOccupation(pointNumber) {
    const pieceNumberId = 'pieceNumber' + pointNumber;
    const pointsNumber = document.getElementById(pieceNumberId);

    let occupied = this.contents[pointNumber].occupied.length;
    //let color = this.contents[pointNumber].color;
    let pointColor = this.colorOfPoint(pointNumber);

    let limit = pointNumber < 25 ? 5 : 1; // 5 points without occupied number, 1 on bars (points 25 and 26)

    if (occupied <= limit) {
      pointsNumber.textContent = '';
    } else {
      pointsNumber.textContent = '' + occupied;
      if (pointColor == 'w') pointsNumber.style.color = 'gray';
      if (pointColor == 'r') pointsNumber.style.color = 'white';
    }
  },

  colorOfPoint(pointNumber) {
    if (this.contents[pointNumber].occupied.length == 0) {
      return '';
    } else {
      return this.contents[pointNumber].occupied[0][0];
    }
  },

  // Method to print the current state of the board
  printBoard() {
    console.log(this.contents);
  },
};

board.resetBoard();
drawBoard();

// Install event listeners on each piece
pieces.forEach((piece) => {
  piece.addEventListener('mousedown', (e) => {
    const type = piece.dataset.type;

    // which piece?
    const x = piece.offsetLeft + PIECE_RADIUS;
    const y = piece.offsetTop + PIECE_RADIUS;
    // console.log(x, y);
    const { pt, pos } = mapper.findPointAndPos(x, y);
    //console.log('Grabbed at pt = ', pt, ' pos = ', pos);

    //console.log(`piece X: ${x}, Y: ${y}`);
    startingField.value = '[' + pt + ',' + pos + ']';

    if (!isPieceMovable(piece, pt, pos)) {
      // Prevent moving piece
      console.log('Movement disallowed.');
      return; // Exit the handler
    }

    // Bring the current piece to the front
    piece.style.zIndex = '1000'; // Set a high z-index value

    let point = identifyPoint(e.pageX, e.pageY);
    currentMove.player = activePlayer;
    currentMove.from = point;
    currentMove.to = 0;

    // record the piece as being 'on the move'
    board.onTheMove = piece.id;
    board.contents[point].occupied.pop();
    board.updatePointOccupation(point);

    // startingField.value = '[' + point + ']';

    // Store the starting position
    let startX = piece.style.left || '0px';
    let startY = piece.style.top || '0px';

    const onMouseMove = (event) => {
      piece.style.left =
        event.pageX - piece.offsetWidth / 2 - boardLeftOffset + 'px';
      piece.style.top =
        event.pageY - piece.offsetHeight / 2 - boardTopOffset + 'px';
      coordsField.value = event.pageX + ', ' + event.pageY;
      let point = identifyPoint(event.pageX, event.pageY);
      pointField.value = point;
      applyHighlight(point, 1);
    };

    document.addEventListener('mousemove', onMouseMove);

    piece.addEventListener(
      'mouseup',
      (event) => {
        //console.log('startX = ' + startX + ', startY = ' + startY);
        document.removeEventListener('mousemove', onMouseMove);
        piece.style.zIndex = '';
        applyHighlight(0, 0);

        let point = identifyPoint(event.pageX, event.pageY);
        currentMove.to = point;
        // console.log(currentMove);

        applyMove(piece, currentMove);
      },
      { once: true }
    );
  });
});

async function applyMove(piece, move) {
  // either snap or return depending on move legality

  // const toColor = board.contents[move.to].color;
  const toColor = board.colorOfPoint(move.to);
  const toOccupied = board.contents[move.to].occupied.length;

  // console.log(
  //   '*** color of ' +
  //     piece.id +
  //     ' at ' +
  //     move.to +
  //     ' is ' +
  //     toColor +
  //     ' myPlayer = ' +
  //     myPlayer +
  //     ', toOccupied = ' +
  //     toOccupied
  // );

  // console.log(
  //   'Move by ',
  //   myPlayer,
  //   ': from ',
  //   move.from,
  //   ' to ',
  //   move.to,
  //   ' (occupied by ',
  //   toOccupied,
  //   ' ',
  //   toColor,
  //   ') ',
  //   toColor,
  //   toOccupied
  // );

  // RETURNING
  if (
    move.to == 0 ||
    move.to == 25 ||
    move.to == 26 ||
    move.to == move.from ||
    (myPlayer == 'w' && move.to > move.from) ||
    (myPlayer == 'r' && move.to < move.from) ||
    (toColor != '' && toColor != myPlayer && toOccupied > 1)
  ) {
    //console.log('Returning piece');
    // return back to beginning
    board.contents[move.from].occupied.push(board.onTheMove);
    board.onTheMove = '';
    let posToOccupy = board.contents[move.from].occupied.length;
    let [x, y] = getPieceCoords(move.from, posToOccupy);
    await animateMovePiece(piece, x, y, 0.5);
    board.updatePointOccupation(move.from);
    return;
  }

  // TAKING A BLOT
  if (toColor != myPlayer && toOccupied == 1) {
    board.movePiece(activePlayer, move.from, move.to);

    // snap into place
    let posToOccupy = 1;
    let [x, y] = getPieceCoords(move.to, posToOccupy);
    await animateMovePiece(piece, x, y, 0.5);

    // animate the blot to the bar. Red bar = 25, White bar = 26
    let barPoint = myPlayer == 'r' ? 26 : 25;
    let pieceId = board.contents[move.to].occupied[0];
    board.onTheMove = pieceId;
    board.movePiece(activePlayer, move.to, barPoint);
    board.contents[move.to].occupied = [piece.id];

    [x, y] = getPieceCoords(barPoint, 1);
    let blotPiece = document.getElementById(pieceId);
    await animateMovePiece(blotPiece, x, y, 0.5);
    board.updatePointOccupation(barPoint);

    return;
  }

  // ORDINARY MOVE
  let posToOccupy = board.contents[move.to].occupied.length + 1;
  let [x, y] = getPieceCoords(move.to, posToOccupy);

  // console.log(
  //   'Before',
  //   '\tOnTheMove: ' + board.onTheMove,
  //   '\tAt ' + move.from + ': ' + board.contents[move.from].occupied,
  //   '\tAt ' + move.to + ': ' + board.contents[move.to].occupied
  // );

  board.movePiece(activePlayer, move.from, move.to);

  // console.log(
  //   'After',
  //   '\tOnTheMove: ' + board.onTheMove,
  //   '\tAt ' + move.from + ': ' + board.contents[move.from].occupied,
  //   '\tAt ' + move.to + ': ' + board.contents[move.to].occupied
  // );

  board.updatePointOccupation(move.to);
  await animateMovePiece(piece, x, y, 0.5);
}

function applyHighlight(point, state) {
  for (pt = 1; pt <= 24; pt++) {
    const id = `highlight${pt}`; // Construct the element ID
    const element = document.getElementById(id); // Get the element by ID

    if (point == pt && state == 1) {
      // Check if the element exists
      element.style.backgroundColor = 'orange'; // Set the background color
    } else {
      element.style.backgroundColor = 'white';
    }
  }
}

async function drawBoard() {
  for (let pt = 1; pt <= 26; pt++) {
    const occupiedList = board.contents[pt].occupied;

    for (let pos = 1; pos <= occupiedList.length; pos++) {
      const id = occupiedList[pos - 1];
      const piece = document.getElementById(id);
      let [x, y] = getPieceCoords(pt, pos);
      await animateMovePiece(piece, x, y, 5);
    }
  }
}

// Function to move the piece back to its original position over a given duration
function animateMovePiece(piece, targetX, targetY, speed) {
  return new Promise((resolve) => {
    const initialX = parseFloat(piece.style.left) || 0;
    const initialY = parseFloat(piece.style.top) || 0;
    const deltaX = parseFloat(targetX) - PIECE_RADIUS - initialX;
    const deltaY = parseFloat(targetY) - PIECE_RADIUS - initialY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate duration based on distance and speed
    const duration = distance / speed;

    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1); // Cap at 1 (100%)

      // Set the new position based on progress
      piece.style.left = initialX + deltaX * progress + 'px';
      piece.style.top = initialY + deltaY * progress + 'px';

      if (progress < 1) {
        requestAnimationFrame(animate); // Continue animation
      } else {
        resolve(); // Animation complete, resolve the promise
      }
    }

    requestAnimationFrame(animate); // Start animation
  });
}

// Function to identify point from mouse coordinates
function identifyPoint(x, y) {
  let point;

  if (
    // upper left
    x >= 72 + boardLeftOffset &&
    x < 324 + boardLeftOffset &&
    y >= 16 + boardTopOffset &&
    y <= 226 + boardTopOffset + PIECE_RADIUS - VERTICAL_TOLERANCE
  ) {
    // region = '18-13';

    let n = Math.floor((x - boardLeftOffset - 72) / 42);
    point = 13 + n;
  } else if (
    // upper right
    x >= 354 + boardLeftOffset &&
    x < 604 + boardLeftOffset &&
    y >= 16 + boardTopOffset &&
    y <= 226 + boardTopOffset + PIECE_RADIUS - VERTICAL_TOLERANCE
  ) {
    // region = '24-19';

    let n = Math.floor((x - boardLeftOffset - 354) / 42);
    point = 19 + n;
  } else if (
    // lower left
    x >= 72 + boardLeftOffset &&
    x < 324 + boardLeftOffset &&
    y >=
      272 +
        boardTopOffset -
        PIECE_RADIUS +
        VERTICAL_TOLERANCE +
        VERTICAL_TOLERANCE &&
    y <= 478 + boardTopOffset + VERTICAL_TOLERANCE + VERTICAL_TOLERANCE
  ) {
    // region = '12-7';
    let n = Math.floor((x - boardLeftOffset - 72) / 42);
    point = 12 - n;
  } else if (
    // lower right
    x >= 354 + boardLeftOffset &&
    x < 604 + boardLeftOffset &&
    y >=
      272 +
        boardTopOffset -
        PIECE_RADIUS +
        VERTICAL_TOLERANCE +
        VERTICAL_TOLERANCE &&
    y <= 478 + boardTopOffset + VERTICAL_TOLERANCE + VERTICAL_TOLERANCE
  ) {
    // region = '6-1';
    let n = Math.floor((x - boardLeftOffset - 354) / 42);
    point = 6 - n;
  } else if (
    x >= 314 + boardLeftOffset &&
    x <= 364 + boardLeftOffset &&
    y >= 220 + boardTopOffset &&
    y <= 244 + boardTopOffset
  ) {
    // region = 'Red Bar';
    point = 25;
  } else if (
    x >= 314 + boardLeftOffset &&
    x <= 364 + boardLeftOffset &&
    y >= 245 + boardTopOffset &&
    y <= 268 + boardTopOffset
  ) {
    // region = 'White Bar';
    point = 26;
  } else {
    point = 0;
  }

  if (activePlayer == 'r') {
    // reverse board
    if (point >= 1 && point <= 24) {
      if (point >= 13) {
        point = point - 12;
      } else {
        point = point + 12;
      }
    }
  }

  return point;
}

function getPieceCoords(point, reqPosition) {
  let x = 0,
    y = 0;

  if (point == 0 || reqPosition == 0) return [x, y];

  // position for requested positions > 5 are set to position 5
  position = reqPosition > 5 ? 5 : reqPosition;

  // upper right
  if (point <= 24 && point >= 19) {
    x = 567 + PIECE_RADIUS + (point - 24) * 42;
    y = 20 + PIECE_RADIUS + (position - 1) * (PIECE_DIAMETER + 2);
    return [x, y];
  }

  // upper left
  if (point <= 18 && point >= 13) {
    x = 284 + PIECE_RADIUS + (point - 18) * 42;
    y = 20 + PIECE_RADIUS + (position - 1) * (PIECE_DIAMETER + 2);
    return [x, y];
  }

  if (point <= 12 && point >= 7) {
    x = 74 + PIECE_RADIUS + (12 - point) * 42;
    y = 485 - PIECE_RADIUS - (position - 1) * (PIECE_DIAMETER + 2);
    return [x, y];
  }

  if (point <= 6 && point >= 1) {
    x = 105 + PIECE_RADIUS + (12 - point) * 42;
    y = 485 - PIECE_RADIUS - (position - 1) * (PIECE_DIAMETER + 2);
    return [x, y];
  }

  if (point == 25) {
    // red bar
    return [338, 231];
  }

  if (point == 26) {
    // white bar
    return [338, 269];
  }
}

function defineCoordMap() {
  mapper.addCoordinate(1, 1, 585, 467);
  mapper.addCoordinate(1, 2, 585, 429);
  mapper.addCoordinate(1, 3, 585, 391);
  mapper.addCoordinate(1, 4, 585, 353);
  mapper.addCoordinate(1, 5, 585, 315);
  mapper.addCoordinate(2, 1, 543, 467);
  mapper.addCoordinate(2, 2, 543, 429);
  mapper.addCoordinate(2, 3, 543, 391);
  mapper.addCoordinate(2, 4, 543, 353);
  mapper.addCoordinate(2, 5, 543, 315);
  mapper.addCoordinate(3, 1, 501, 467);
  mapper.addCoordinate(3, 2, 501, 429);
  mapper.addCoordinate(3, 3, 501, 391);
  mapper.addCoordinate(3, 4, 501, 353);
  mapper.addCoordinate(3, 5, 501, 315);
  mapper.addCoordinate(4, 1, 459, 467);
  mapper.addCoordinate(4, 2, 459, 429);
  mapper.addCoordinate(4, 3, 459, 391);
  mapper.addCoordinate(4, 4, 459, 353);
  mapper.addCoordinate(4, 5, 459, 315);
  mapper.addCoordinate(5, 1, 417, 467);
  mapper.addCoordinate(5, 2, 417, 429);
  mapper.addCoordinate(5, 3, 417, 391);
  mapper.addCoordinate(5, 4, 417, 353);
  mapper.addCoordinate(5, 5, 417, 315);
  mapper.addCoordinate(6, 1, 375, 467);
  mapper.addCoordinate(6, 2, 375, 429);
  mapper.addCoordinate(6, 3, 375, 391);
  mapper.addCoordinate(6, 4, 375, 353);
  mapper.addCoordinate(6, 5, 375, 315);
  mapper.addCoordinate(7, 1, 302, 467);
  mapper.addCoordinate(7, 2, 302, 429);
  mapper.addCoordinate(7, 3, 302, 391);
  mapper.addCoordinate(7, 4, 302, 353);
  mapper.addCoordinate(7, 5, 302, 315);
  mapper.addCoordinate(8, 1, 260, 467);
  mapper.addCoordinate(8, 2, 260, 429);
  mapper.addCoordinate(8, 3, 260, 391);
  mapper.addCoordinate(8, 4, 260, 353);
  mapper.addCoordinate(8, 5, 260, 315);
  mapper.addCoordinate(9, 1, 218, 467);
  mapper.addCoordinate(9, 2, 218, 429);
  mapper.addCoordinate(9, 3, 218, 391);
  mapper.addCoordinate(9, 4, 218, 353);
  mapper.addCoordinate(9, 5, 218, 315);
  mapper.addCoordinate(10, 1, 176, 467);
  mapper.addCoordinate(10, 2, 176, 429);
  mapper.addCoordinate(10, 3, 176, 391);
  mapper.addCoordinate(10, 4, 176, 353);
  mapper.addCoordinate(10, 5, 176, 315);
  mapper.addCoordinate(11, 1, 134, 467);
  mapper.addCoordinate(11, 2, 134, 429);
  mapper.addCoordinate(11, 3, 134, 391);
  mapper.addCoordinate(11, 4, 134, 353);
  mapper.addCoordinate(11, 5, 134, 315);
  mapper.addCoordinate(12, 1, 92, 467);
  mapper.addCoordinate(12, 2, 92, 429);
  mapper.addCoordinate(12, 3, 92, 391);
  mapper.addCoordinate(12, 4, 92, 353);
  mapper.addCoordinate(12, 5, 92, 315);
  mapper.addCoordinate(13, 1, 92, 38);
  mapper.addCoordinate(13, 2, 92, 76);
  mapper.addCoordinate(13, 3, 92, 114);
  mapper.addCoordinate(13, 4, 92, 152);
  mapper.addCoordinate(13, 5, 92, 190);
  mapper.addCoordinate(14, 1, 134, 38);
  mapper.addCoordinate(14, 2, 134, 76);
  mapper.addCoordinate(14, 3, 134, 114);
  mapper.addCoordinate(14, 4, 134, 152);
  mapper.addCoordinate(14, 5, 134, 190);
  mapper.addCoordinate(15, 1, 176, 38);
  mapper.addCoordinate(15, 2, 176, 76);
  mapper.addCoordinate(15, 3, 176, 114);
  mapper.addCoordinate(15, 4, 176, 152);
  mapper.addCoordinate(15, 5, 176, 190);
  mapper.addCoordinate(16, 1, 218, 38);
  mapper.addCoordinate(16, 2, 218, 76);
  mapper.addCoordinate(16, 3, 218, 114);
  mapper.addCoordinate(16, 4, 218, 152);
  mapper.addCoordinate(16, 5, 218, 190);
  mapper.addCoordinate(17, 1, 260, 38);
  mapper.addCoordinate(17, 2, 260, 76);
  mapper.addCoordinate(17, 3, 260, 114);
  mapper.addCoordinate(17, 4, 260, 152);
  mapper.addCoordinate(17, 5, 260, 190);
  mapper.addCoordinate(18, 1, 302, 38);
  mapper.addCoordinate(18, 2, 302, 76);
  mapper.addCoordinate(18, 3, 302, 114);
  mapper.addCoordinate(18, 4, 302, 152);
  mapper.addCoordinate(18, 5, 302, 190);
  mapper.addCoordinate(19, 1, 375, 38);
  mapper.addCoordinate(19, 2, 375, 76);
  mapper.addCoordinate(19, 3, 375, 114);
  mapper.addCoordinate(19, 4, 375, 152);
  mapper.addCoordinate(19, 5, 375, 190);
  mapper.addCoordinate(20, 1, 417, 38);
  mapper.addCoordinate(20, 2, 417, 76);
  mapper.addCoordinate(20, 3, 417, 114);
  mapper.addCoordinate(20, 4, 417, 152);
  mapper.addCoordinate(20, 5, 417, 190);
  mapper.addCoordinate(21, 1, 459, 38);
  mapper.addCoordinate(21, 2, 459, 76);
  mapper.addCoordinate(21, 3, 459, 114);
  mapper.addCoordinate(21, 4, 459, 152);
  mapper.addCoordinate(21, 5, 459, 190);
  mapper.addCoordinate(22, 1, 501, 38);
  mapper.addCoordinate(22, 2, 501, 76);
  mapper.addCoordinate(22, 3, 501, 114);
  mapper.addCoordinate(22, 4, 501, 152);
  mapper.addCoordinate(22, 5, 501, 190);
  mapper.addCoordinate(23, 1, 543, 38);
  mapper.addCoordinate(23, 2, 543, 76);
  mapper.addCoordinate(23, 3, 543, 114);
  mapper.addCoordinate(23, 4, 543, 152);
  mapper.addCoordinate(23, 5, 543, 190);
  mapper.addCoordinate(24, 1, 585, 38);
  mapper.addCoordinate(24, 2, 585, 76);
  mapper.addCoordinate(24, 3, 585, 114);
  mapper.addCoordinate(24, 4, 585, 152);
  mapper.addCoordinate(24, 5, 585, 190);
  mapper.addCoordinate(25, 1, 338, 231);
  mapper.addCoordinate(26, 1, 338, 269);
}

// Game Play

function isPieceMovable(piece, pt, pos) {
  // console.log('isPieceMovable called for pt = ', pt, ' pos = ', pos);

  // if piece is not being moved from a valid position
  if (piece == 0 && pos == 0) {
    console.log('Not moving from a valid position');
    return false;
  }

  // check is piece is my colour
  if (activePlayer != piece.dataset.type) return false;

  // don't move unless topmost piece
  if (pos < board.contents[pt].occupied.length && pos < 5) {
    return false;
  }

  return true;
}
