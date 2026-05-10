// ============================================================
//  BOARD ROYAL — Chess Engine + Renderer
//  Pieces: ±1=Pawn ±2=Rook ±3=Knight ±4=Bishop ±5=Queen ±6=King
//  Positive=White(Player1) Negative=Black(Player2)
// ============================================================
window.ChessGame = (() => {
  const SYMBOLS = {
    '1':  '♙', '-1': '♟',
    '2':  '♖', '-2': '♜',
    '3':  '♘', '-3': '♞',
    '4':  '♗', '-4': '♝',
    '5':  '♕', '-5': '♛',
    '6':  '♔', '-6': '♚'
  };
  const PROMO_NAMES = { 5:'Queen', 4:'Bishop', 3:'Knight', 2:'Rook' };

  let state = {};
  let selected = null;
  let validMoves = [];
  let callbacks = {};
  let isOnlineTurn = false;

  // ---- Init ----
  function initState() {
    return {
      board: [
        [-2,-3,-4,-5,-6,-4,-3,-2],
        [-1,-1,-1,-1,-1,-1,-1,-1],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,1,1],
        [2,3,4,5,6,4,3,2]
      ],
      current: 1,
      castling: { wK:true, wQ:true, bK:true, bQ:true },
      ep: null,
      status: 'playing',
      captured: { w:[], b:[] }
    };
  }

  // ---- Move Generation ----
  function inBounds(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
  function sign(x){ return x>0?1:x<0?-1:0; }

  function pawnMoves(b,r,c,color,ep,out){
    const d=-color, sr=color===1?6:1;
    if(inBounds(r+d,c)&&b[r+d][c]===0){
      out.push([r+d,c]);
      if(r===sr&&b[r+2*d][c]===0) out.push([r+2*d,c]);
    }
    for(const dc of[-1,1]){
      const nr=r+d,nc=c+dc;
      if(!inBounds(nr,nc)) continue;
      if(b[nr][nc]!==0&&sign(b[nr][nc])!==color) out.push([nr,nc]);
      if(ep&&ep[0]===nr&&ep[1]===nc) out.push([nr,nc]);
    }
  }

  function pawnAttacks(r,c,color,out){
    const d=-color;
    for(const dc of[-1,1]){
      if(inBounds(r+d,c+dc)) out.push([r+d,c+dc]);
    }
  }

  function slide(b,r,c,color,dirs,out){
    for(const[dr,dc]of dirs){
      let rr=r+dr,cc=c+dc;
      while(inBounds(rr,cc)){
        if(b[rr][cc]===0){out.push([rr,cc]);}
        else{if(sign(b[rr][cc])!==color)out.push([rr,cc]);break;}
        rr+=dr;cc+=dc;
      }
    }
  }

  function knightMoves(b,r,c,color,out){
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr,cc=c+dc;
      if(inBounds(rr,cc)&&sign(b[rr][cc])!==color) out.push([rr,cc]);
    }
  }

  function kingMovesBasic(b,r,c,color,out){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue;
      const rr=r+dr,cc=c+dc;
      if(inBounds(rr,cc)&&sign(b[rr][cc])!==color) out.push([rr,cc]);
    }
  }

  function getPseudo(s,r,c){
    const {board:b,ep,castling}=s;
    const p=b[r][c]; if(!p) return [];
    const color=sign(p), t=Math.abs(p), out=[];
    if(t===1) pawnMoves(b,r,c,color,ep,out);
    else if(t===2) slide(b,r,c,color,[[0,1],[0,-1],[1,0],[-1,0]],out);
    else if(t===3) knightMoves(b,r,c,color,out);
    else if(t===4) slide(b,r,c,color,[[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===5) slide(b,r,c,color,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===6){
      kingMovesBasic(b,r,c,color,out);
      const baseR=color===1?7:0;
      if(r===baseR&&c===4){
        const kKey=color===1?'wK':'bK', qKey=color===1?'wQ':'bQ';
        if(castling[kKey]&&b[baseR][5]===0&&b[baseR][6]===0&&
           !attacked(s,baseR,4,-color)&&!attacked(s,baseR,5,-color)&&!attacked(s,baseR,6,-color))
          out.push([baseR,6]);
        if(castling[qKey]&&b[baseR][3]===0&&b[baseR][2]===0&&b[baseR][1]===0&&
           !attacked(s,baseR,4,-color)&&!attacked(s,baseR,3,-color)&&!attacked(s,baseR,2,-color))
          out.push([baseR,2]);
      }
    }
    return out;
  }

  function attacked(s,r,c,byColor){
    const b=s.board;
    // Knights
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr,cc=c+dc;
      if(inBounds(rr,cc)&&b[rr][cc]===3*byColor) return true;
    }
    // Sliding
    for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
      let rr=r+dr,cc=c+dc;
      while(inBounds(rr,cc)){
        const v=b[rr][cc]; if(v!==0){
          if(v===2*byColor||v===5*byColor) return true; break;
        } rr+=dr;cc+=dc;
      }
    }
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
      let rr=r+dr,cc=c+dc;
      while(inBounds(rr,cc)){
        const v=b[rr][cc]; if(v!==0){
          if(v===4*byColor||v===5*byColor) return true; break;
        } rr+=dr;cc+=dc;
      }
    }
    // Pawns
    const pd=-byColor;
    for(const dc of[-1,1]){
      const rr=r+pd,cc=c+dc;
      if(inBounds(rr,cc)&&b[rr][cc]===byColor) return true;
    }
    // King
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue;
      const rr=r+dr,cc=c+dc;
      if(inBounds(rr,cc)&&b[rr][cc]===6*byColor) return true;
    }
    return false;
  }

  function findKing(b,color){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===6*color) return[r,c];
    return null;
  }

  function applyMoveSilent(s,fr,fc,tr,tc){
    const ns={board:s.board.map(r=>[...r]),ep:null,castling:{...s.castling},current:s.current,status:s.status,captured:{w:[...s.captured.w],b:[...s.captured.b]}};
    const p=ns.board[fr][fc], type=Math.abs(p), color=sign(p);
    // En passant capture
    if(type===1&&s.ep&&tr===s.ep[0]&&tc===s.ep[1]) ns.board[fr][tc]=0;
    // Double pawn push sets EP target
    if(type===1&&Math.abs(tr-fr)===2) ns.ep=[(fr+tr)/2,fc];
    // Castling rook
    if(type===6&&Math.abs(tc-fc)===2){
      if(tc===6){ns.board[fr][5]=ns.board[fr][7];ns.board[fr][7]=0;}
      else{ns.board[fr][3]=ns.board[fr][0];ns.board[fr][0]=0;}
    }
    // Update castling rights
    if(type===6){if(color===1){ns.castling.wK=false;ns.castling.wQ=false;}else{ns.castling.bK=false;ns.castling.bQ=false;}}
    if(fr===7&&fc===0)ns.castling.wQ=false; if(fr===7&&fc===7)ns.castling.wK=false;
    if(fr===0&&fc===0)ns.castling.bQ=false; if(fr===0&&fc===7)ns.castling.bK=false;
    if(tr===7&&tc===0)ns.castling.wQ=false; if(tr===7&&tc===7)ns.castling.wK=false;
    if(tr===0&&tc===0)ns.castling.bQ=false; if(tr===0&&tc===7)ns.castling.bK=false;
    ns.board[tr][tc]=p;
    ns.board[fr][fc]=0;
    return ns;
  }

  function getLegal(s,r,c){
    const pseudo=getPseudo(s,r,c);
    const color=sign(s.board[r][c]);
    return pseudo.filter(([tr,tc])=>{
      const ns=applyMoveSilent(s,r,c,tr,tc);
      const [kr,kc]=findKing(ns.board,color);
      return !attacked(ns,kr,kc,-color);
    });
  }

  function allLegal(s,color){
    const moves=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++)
      if(sign(s.board[r][c])===color) for(const m of getLegal(s,r,c)) moves.push({from:[r,c],to:m});
    return moves;
  }

  function updateStatus(s){
    const c=s.current;
    const [kr,kc]=findKing(s.board,c);
    const inCheck=attacked(s,kr,kc,-c);
    const has=allLegal(s,c).length>0;
    s.status=has?(inCheck?'check':'playing'):(inCheck?'checkmate':'stalemate');
  }

  // ---- Public API ----
  function start(container, savedState, cbs, onlineTurn) {
    callbacks = cbs || {};
    isOnlineTurn = onlineTurn || false;
    state = savedState ? JSON.parse(JSON.stringify(savedState)) : initState();
    selected = null; validMoves = [];
    render(container);
  }

  function loadState(container, newState, onlineTurn) {
    state = JSON.parse(JSON.stringify(newState));
    isOnlineTurn = onlineTurn;
    selected = null; validMoves = [];
    render(container);
    if (state.status !== 'playing' && state.status !== 'check') {
      setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 300);
    }
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  function render(container) {
    container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'chess-board';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'chess-cell ' + ((r+c)%2===0 ? 'light' : 'dark');
        cell.dataset.r = r; cell.dataset.c = c;
        const p = state.board[r][c];
        if (p !== 0) {
          const span = document.createElement('span');
          span.className = 'piece';
          span.textContent = SYMBOLS[String(p)] || '';
          cell.appendChild(span);
        }
        if (selected && selected[0]===r && selected[1]===c) cell.classList.add('selected');
        if (validMoves.some(m=>m[0]===r&&m[1]===c)) {
          cell.classList.add(state.board[r][c]!==0 ? 'valid-capture' : 'valid-move');
        }
        cell.addEventListener('click', () => handleClick(r, c, container));
        board.appendChild(cell);
      }
    }
    container.appendChild(board);
    // Captured
    if (callbacks.onCapturedUpdate) callbacks.onCapturedUpdate(state.captured);
    // Log
    if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(r, c, container) {
    if (isOnlineTurn) return; // Not your turn online
    if (state.status === 'checkmate' || state.status === 'stalemate') return;
    const p = state.board[r][c];
    if (selected) {
      const move = validMoves.find(m=>m[0]===r&&m[1]===c);
      if (move) {
        executeMove(selected[0], selected[1], r, c, container);
        return;
      }
    }
    if (p !== 0 && Math.sign(p) === state.current) {
      selected = [r, c];
      validMoves = getLegal(state, r, c);
    } else {
      selected = null; validMoves = [];
    }
    render(container);
  }

  function executeMove(fr, fc, tr, tc, container) {
    const piece = state.board[fr][fc];
    const captured = state.board[tr][tc];
    // Record capture
    if (captured !== 0) {
      if (Math.sign(captured) === 1) state.captured.b.push(Math.abs(captured));
      else state.captured.w.push(Math.abs(captured));
    }
    // En passant capture
    if (Math.abs(piece)===1 && state.ep && tr===state.ep[0] && tc===state.ep[1]) {
      const cap = state.board[fr][tc];
      if (Math.sign(cap)===1) state.captured.b.push(1);
      else state.captured.w.push(1);
    }
    state = applyMoveSilent(state, fr, fc, tr, tc);
    // Pawn promotion
    if (Math.abs(piece)===1 && (tr===0 || tr===7)) {
      selected = null; validMoves = [];
      render(container);
      showPromotion(fr, fc, tr, tc, piece, container);
      return;
    }
    state.current = -state.current;
    updateStatus(state);
    selected = null; validMoves = [];
    render(container);
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
    checkEnd(container);
  }

  function showPromotion(fr, fc, tr, tc, piece, container) {
    const color = Math.sign(piece);
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    choices.innerHTML = '';
    modal.classList.remove('hidden');
    [5,4,3,2].forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.textContent = SYMBOLS[String(t*color)];
      btn.title = PROMO_NAMES[t];
      btn.onclick = () => {
        modal.classList.add('hidden');
        state.board[tr][tc] = t * color;
        state.current = -state.current;
        updateStatus(state);
        render(container);
        if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
        checkEnd(container);
      };
      choices.appendChild(btn);
    });
  }

  function checkEnd(container) {
    if (state.status === 'checkmate' || state.status === 'stalemate') {
      setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 400);
    }
  }

  return { start, loadState, getState, initState };
})();
