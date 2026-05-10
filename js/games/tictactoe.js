// ============================================================
//  BOARD ROYAL — Tic-Tac-Toe Engine + Renderer
// ============================================================
window.TicTacToeGame = (() => {
  const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let state = {}, callbacks = {}, isOnlineTurn = false;
  let container = null;

  function initState() {
    return { board: new Array(9).fill(0), current:1, status:'playing', winLine:null };
  }

  function checkWin(board) {
    for (const line of WINS) {
      const [a,b,c] = line;
      if (board[a] && board[a]===board[b] && board[b]===board[c]) return { winner:board[a], line };
    }
    if (board.every(v=>v!==0)) return { winner:0, line:null }; // draw
    return null;
  }

  function start(cont, savedState, cbs, onlineTurn) {
    container = cont; callbacks = cbs||{}; isOnlineTurn = onlineTurn||false;
    state = savedState ? JSON.parse(JSON.stringify(savedState)) : initState();
    render();
  }

  function loadState(cont, newState, onlineTurn) {
    container = cont; state = JSON.parse(JSON.stringify(newState)); isOnlineTurn = onlineTurn;
    render();
    if (state.status !== 'playing') setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),300);
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  function render() {
    container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'ttt-board';
    state.board.forEach((v, i) => {
      const cell = document.createElement('div');
      cell.className = 'ttt-cell';
      if (v===1) { cell.textContent='✕'; cell.classList.add('p1'); }
      if (v===2) { cell.textContent='○'; cell.classList.add('p2'); }
      if (state.winLine && state.winLine.includes(i)) cell.classList.add('win-cell');
      cell.addEventListener('click', ()=>handleClick(i));
      board.appendChild(cell);
    });
    container.appendChild(board);
    if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(i) {
    if (isOnlineTurn || state.status !== 'playing' || state.board[i] !== 0) return;
    state.board[i] = state.current;
    const result = checkWin(state.board);
    if (result) {
      state.status = result.winner===1?'p1wins':result.winner===2?'p2wins':'draw';
      state.winLine = result.line;
      render();
      if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'guest':'host');
      setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),500);
      return;
    }
    state.current = 3-state.current;
    render();
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
  }

  return { start, loadState, getState, initState };
})();
