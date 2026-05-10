// ============================================================
//  BOARD ROYAL — Connect Four Engine + Renderer
// ============================================================
window.Connect4Game = (() => {
  const ROWS = 6, COLS = 7;
  let state = {}, callbacks = {}, isOnlineTurn = false;
  let container = null;

  function initState() {
    return {
      board: Array.from({length:ROWS}, () => new Array(COLS).fill(0)),
      current: 1, status: 'playing', winner: null, winCells: []
    };
  }

  function dropPiece(board, col, player) {
    for (let r = ROWS-1; r >= 0; r--) {
      if (board[r][col] === 0) { board[r][col] = player; return r; }
    }
    return -1;
  }

  function checkWin(board, r, c, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr,dc] of dirs) {
      const cells = [[r,c]];
      for (let i=1;i<4;i++) { const nr=r+dr*i,nc=c+dc*i; if(nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]!==player)break; cells.push([nr,nc]); }
      for (let i=1;i<4;i++) { const nr=r-dr*i,nc=c-dc*i; if(nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]!==player)break; cells.push([nr,nc]); }
      if (cells.length >= 4) return cells;
    }
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
    board.className = 'connect4-board';
    for (let r=0;r<ROWS;r++) {
      const row = document.createElement('div');
      row.className = 'c4-row';
      for (let c=0;c<COLS;c++) {
        const cell = document.createElement('div');
        cell.className = 'c4-cell';
        const v = state.board[r][c];
        if (v===1) cell.classList.add('p1');
        if (v===2) cell.classList.add('p2');
        if (state.winCells && state.winCells.some(([wr,wc])=>wr===r&&wc===c)) cell.classList.add('winner-cell');
        cell.dataset.col = c;
        cell.addEventListener('click', ()=>handleClick(c));
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
    container.appendChild(board);
    if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(col) {
    if (isOnlineTurn || state.status !== 'playing') return;
    const board = state.board.map(r=>[...r]);
    const r = dropPiece(board, col, state.current);
    if (r < 0) return;
    state.board = board;
    const win = checkWin(board, r, col, state.current);
    if (win) {
      state.status = state.current===1?'p1wins':'p2wins';
      state.winCells = win;
      render();
      if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'guest':'host');
      setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),500);
      return;
    }
    if (board[0].every(v=>v!==0)) { state.status='draw'; render(); setTimeout(()=>callbacks.onResult&&callbacks.onResult('draw',state),400); return; }
    state.current = 3-state.current;
    render();
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
  }

  return { start, loadState, getState, initState };
})();
