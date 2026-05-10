// ============================================================
//  BOARD ROYAL — Checkers Engine + Renderer
//  Board: 8×8 dark squares only. P1=bottom(red) P2=top(dark)
//  Pieces: 1=P1 2=P2 11=P1King 22=P2King
// ============================================================
window.CheckersGame = (() => {
  let state = {}, callbacks = {}, isOnlineTurn = false;
  let container = null;

  function initState() {
    const board = Array.from({length:8}, () => new Array(8).fill(0));
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 8; c++)
        if ((r+c)%2===1) board[r][c]=2;
    for (let r = 5; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((r+c)%2===1) board[r][c]=1;
    return { board, current:1, selected:null, validMoves:[], mustJump:false, status:'playing', captured:{p1:0,p2:0} };
  }

  function isKing(v){ return v===11||v===22; }
  function owner(v){ return v===1||v===11?1:v===2||v===22?2:0; }

  function getJumps(board, r, c, piece, seq=[]) {
    const jumps = [];
    const dirs = isKing(piece) ? [[-1,-1],[-1,1],[1,-1],[1,1]] : (owner(piece)===1?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]);
    for (const [dr,dc] of dirs) {
      const mr=r+dr, mc=c+dc, jr=r+2*dr, jc=c+2*dc;
      if (jr<0||jr>=8||jc<0||jc>=8) continue;
      if (owner(board[mr][mc])===0||owner(board[mr][mc])===owner(piece)) continue;
      if (board[jr][jc]!==0) continue;
      // Avoid capturing same square twice in sequence
      if (seq.some(s=>s[0]===mr&&s[1]===mc)) continue;
      jumps.push({to:[jr,jc],over:[mr,mc],seq:[...seq,[mr,mc]]});
    }
    return jumps;
  }

  function getMoves(board, r, c, mustJump) {
    const piece = board[r][c];
    const moves = [];
    if (!piece) return moves;
    // Jumps
    const jumps = getJumps(board, r, c, piece);
    if (jumps.length > 0 || mustJump) {
      jumps.forEach(j => moves.push({from:[r,c],to:j.to,over:j.over,seq:j.seq,isJump:true}));
      return moves;
    }
    // Regular moves
    const dirs = isKing(piece)?[[-1,-1],[-1,1],[1,-1],[1,1]]:(owner(piece)===1?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]);
    for (const [dr,dc] of dirs) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===0) moves.push({from:[r,c],to:[nr,nc],isJump:false});
    }
    return moves;
  }

  function getAllMoves(board, player) {
    const allMoves = [];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
      if (owner(board[r][c])===player) allMoves.push(...getMoves(board,r,c,false));
    const hasJump = allMoves.some(m=>m.isJump);
    return hasJump ? allMoves.filter(m=>m.isJump) : allMoves;
  }

  function start(cont, savedState, cbs, onlineTurn) {
    container = cont;
    callbacks = cbs || {};
    isOnlineTurn = onlineTurn || false;
    state = savedState ? JSON.parse(JSON.stringify(savedState)) : initState();
    state.selected = null; state.validMoves = [];
    render();
  }

  function loadState(cont, newState, onlineTurn) {
    container = cont;
    state = JSON.parse(JSON.stringify(newState));
    isOnlineTurn = onlineTurn;
    state.selected = null; state.validMoves = [];
    render();
    if (state.status !== 'playing') setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 300);
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  function render() {
    container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'checkers-board';
    const allMoves = getAllMoves(state.board, state.current);
    const mustJump = allMoves.some(m=>m.isJump);

    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const cell = document.createElement('div');
      cell.className='checkers-cell '+((r+c)%2===0?'light':'dark');
      cell.dataset.r=r; cell.dataset.c=c;
      const v=state.board[r][c];
      if (state.selected && state.selected[0]===r && state.selected[1]===c) cell.classList.add('selected');
      if (state.validMoves.some(m=>m.to[0]===r&&m.to[1]===c)) cell.classList.add('valid-move');
      if (v!==0) {
        const disc=document.createElement('div');
        disc.className='checker '+(owner(v)===1?'p1-checker':'p2-checker')+(isKing(v)?' king':'');
        if(isKing(v)) disc.textContent='♔';
        cell.appendChild(disc);
      }
      cell.addEventListener('click',()=>handleClick(r,c));
      board.appendChild(cell);
    }
    container.appendChild(board);
    if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(r, c) {
    if (isOnlineTurn) return;
    if (state.status !== 'playing') return;
    const v = state.board[r][c];
    const allMoves = getAllMoves(state.board, state.current);
    const mustJump = allMoves.some(m=>m.isJump);

    if (state.selected) {
      const move = state.validMoves.find(m=>m.to[0]===r&&m.to[1]===c);
      if (move) { executeMove(move); return; }
    }
    if (owner(v)===state.current) {
      const pieceMoves = getMoves(state.board, r, c, mustJump).filter(m=>!mustJump||(mustJump&&m.isJump));
      const filteredMoves = mustJump ? pieceMoves.filter(m=>m.isJump) : pieceMoves;
      state.selected = filteredMoves.length>0 ? [r,c] : null;
      state.validMoves = filteredMoves;
    } else {
      state.selected = null; state.validMoves = [];
    }
    render();
  }

  function executeMove(move) {
    const [fr,fc]=move.from, [tr,tc]=move.to;
    const piece = state.board[fr][fc];
    state.board[tr][tc]=piece;
    state.board[fr][fc]=0;
    if (move.isJump) {
      const [or,oc]=move.over;
      const cap=state.board[or][oc];
      if(owner(cap)===1) state.captured.p2++;
      else state.captured.p1++;
      state.board[or][oc]=0;
      // Check for further jumps
      const furtherJumps = getJumps(state.board,tr,tc,piece,move.seq||[]);
      if (furtherJumps.length>0) {
        // Must jump again
        state.selected=[tr,tc];
        state.validMoves=furtherJumps.map(j=>({from:[tr,tc],to:j.to,over:j.over,seq:j.seq,isJump:true}));
        // King promotion before continuing
        checkKing(tr,tc);
        render();
        return;
      }
    }
    checkKing(tr,tc);
    state.selected=null; state.validMoves=[];
    state.current=3-state.current;
    // Check win
    const p1 = state.board.flat().filter(v=>owner(v)===1).length;
    const p2 = state.board.flat().filter(v=>owner(v)===2).length;
    if (p1===0) state.status='p2wins';
    else if (p2===0) state.status='p1wins';
    else if (getAllMoves(state.board,state.current).length===0) state.status=state.current===1?'p2wins':'p1wins';
    render();
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
    if (state.status!=='playing') setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),400);
  }

  function checkKing(r,c) {
    const v=state.board[r][c];
    if (v===1&&r===0) state.board[r][c]=11;
    if (v===2&&r===7) state.board[r][c]=22;
  }

  return { start, loadState, getState, initState };
})();
