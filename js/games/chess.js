// ============================================================
//  BOARD ROYAL — Chess Engine + Renderer (Fixed piece colours)
//  Positive = White (P1), Negative = Black (P2)
//  1=Pawn 2=Rook 3=Knight 4=Bishop 5=Queen 6=King
// ============================================================
window.ChessGame = (() => {
  // White = outline glyphs, Black = filled glyphs
  const W = { 1:'♙', 2:'♖', 3:'♘', 4:'♗', 5:'♕', 6:'♔' };
  const B = { 1:'♟', 2:'♜', 3:'♞', 4:'♝', 5:'♛', 6:'♚' };
  const PROMO = { 5:'Queen ♕', 4:'Bishop ♗', 3:'Knight ♘', 2:'Rook ♖' };

  let state = {}, selected = null, validMoves = [], callbacks = {}, isOnlineTurn = false;

  // ---- State ----
  function initState() {
    return {
      board: [
        [-2,-3,-4,-5,-6,-4,-3,-2],
        [-1,-1,-1,-1,-1,-1,-1,-1],
        [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
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

  // ---- Move generation helpers ----
  const inB = (r,c) => r>=0&&r<8&&c>=0&&c<8;
  const sgn = x => x>0?1:x<0?-1:0;

  function slide(b,r,c,color,dirs,out) {
    for(const[dr,dc]of dirs){
      let rr=r+dr,cc=c+dc;
      while(inB(rr,cc)){
        if(b[rr][cc]===0)out.push([rr,cc]);
        else{if(sgn(b[rr][cc])!==color)out.push([rr,cc]);break;}
        rr+=dr;cc+=dc;
      }
    }
  }
  function pawnMoves(b,r,c,col,ep,out){
    const d=-col,sr=col===1?6:1;
    if(inB(r+d,c)&&b[r+d][c]===0){
      out.push([r+d,c]);
      if(r===sr&&b[r+2*d][c]===0)out.push([r+2*d,c]);
    }
    for(const dc of[-1,1]){
      const nr=r+d,nc=c+dc;
      if(!inB(nr,nc))continue;
      if(b[nr][nc]!==0&&sgn(b[nr][nc])!==col)out.push([nr,nc]);
      if(ep&&ep[0]===nr&&ep[1]===nc)out.push([nr,nc]);
    }
  }
  function pawnAtk(r,c,col,out){
    const d=-col;
    for(const dc of[-1,1])if(inB(r+d,c+dc))out.push([r+d,c+dc]);
  }
  function knightMoves(b,r,c,col,out){
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr,cc=c+dc;
      if(inB(rr,cc)&&sgn(b[rr][cc])!==col)out.push([rr,cc]);
    }
  }
  function kingBasic(b,r,c,col,out){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const rr=r+dr,cc=c+dc;
      if(inB(rr,cc)&&sgn(b[rr][cc])!==col)out.push([rr,cc]);
    }
  }

  function getPseudo(s,r,c){
    const{board:b,ep,castling}=s;
    const p=b[r][c];if(!p)return[];
    const col=sgn(p),t=Math.abs(p),out=[];
    if(t===1)pawnMoves(b,r,c,col,ep,out);
    else if(t===2)slide(b,r,c,col,[[0,1],[0,-1],[1,0],[-1,0]],out);
    else if(t===3)knightMoves(b,r,c,col,out);
    else if(t===4)slide(b,r,c,col,[[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===5)slide(b,r,c,col,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===6){
      kingBasic(b,r,c,col,out);
      const br=col===1?7:0;
      if(r===br&&c===4){
        const kk=col===1?'wK':'bK',qk=col===1?'wQ':'bQ';
        if(castling[kk]&&b[br][5]===0&&b[br][6]===0&&
           !attacked(s,br,4,-col)&&!attacked(s,br,5,-col)&&!attacked(s,br,6,-col))
          out.push([br,6]);
        if(castling[qk]&&b[br][3]===0&&b[br][2]===0&&b[br][1]===0&&
           !attacked(s,br,4,-col)&&!attacked(s,br,3,-col)&&!attacked(s,br,2,-col))
          out.push([br,2]);
      }
    }
    return out;
  }

  function attacked(s,r,c,byCol){
    const b=s.board;
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr,cc=c+dc;
      if(inB(rr,cc)&&b[rr][cc]===3*byCol)return true;
    }
    for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
      let rr=r+dr,cc=c+dc;
      while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===2*byCol||v===5*byCol)return true;break;}rr+=dr;cc+=dc;}
    }
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){
      let rr=r+dr,cc=c+dc;
      while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===4*byCol||v===5*byCol)return true;break;}rr+=dr;cc+=dc;}
    }
    const pd=-byCol;
    for(const dc of[-1,1]){const rr=r+pd,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===byCol)return true;}
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;
      const rr=r+dr,cc=c+dc;
      if(inB(rr,cc)&&b[rr][cc]===6*byCol)return true;
    }
    return false;
  }

  function findKing(b,col){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===6*col)return[r,c];
  }

  function applyMoveSilent(s,fr,fc,tr,tc){
    const ns={board:s.board.map(r=>[...r]),ep:null,castling:{...s.castling},
              current:s.current,status:s.status,captured:{w:[...s.captured.w],b:[...s.captured.b]}};
    const p=ns.board[fr][fc],t=Math.abs(p),col=sgn(p);
    if(t===1&&s.ep&&tr===s.ep[0]&&tc===s.ep[1])ns.board[fr][tc]=0;
    if(t===1&&Math.abs(tr-fr)===2)ns.ep=[(fr+tr)/2,fc];
    if(t===6&&Math.abs(tc-fc)===2){
      if(tc===6){ns.board[fr][5]=ns.board[fr][7];ns.board[fr][7]=0;}
      else{ns.board[fr][3]=ns.board[fr][0];ns.board[fr][0]=0;}
    }
    if(t===6){if(col===1){ns.castling.wK=false;ns.castling.wQ=false;}else{ns.castling.bK=false;ns.castling.bQ=false;}}
    if(fr===7&&fc===0)ns.castling.wQ=false;if(fr===7&&fc===7)ns.castling.wK=false;
    if(fr===0&&fc===0)ns.castling.bQ=false;if(fr===0&&fc===7)ns.castling.bK=false;
    ns.board[tr][tc]=p;ns.board[fr][fc]=0;
    return ns;
  }

  function getLegal(s,r,c){
    const col=sgn(s.board[r][c]);
    return getPseudo(s,r,c).filter(([tr,tc])=>{
      const ns=applyMoveSilent(s,r,c,tr,tc);
      const [kr,kc]=findKing(ns.board,col);
      return !attacked(ns,kr,kc,-col);
    });
  }

  function updateStatus(s){
    const col=s.current;
    const[kr,kc]=findKing(s.board,col);
    const inChk=attacked(s,kr,kc,-col);
    let has=false;
    outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)
      if(sgn(s.board[r][c])===col&&getLegal(s,r,c).length){has=true;break outer;}
    s.status=has?(inChk?'check':'playing'):(inChk?'checkmate':'stalemate');
  }

  // ---- Render ----
  function render(container) {
    container.innerHTML = '';
    const boardEl = document.createElement('div');
    boardEl.className = 'chess-board';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'chess-cell ' + ((r+c)%2===0 ? 'light' : 'dark');
        cell.dataset.r = r; cell.dataset.c = c;

        const p = state.board[r][c];
        if (p !== 0) {
          const span = document.createElement('span');
          const t = Math.abs(p), col = sgn(p);
          // Use DIFFERENT unicode symbols + colour class for clear distinction
          span.textContent = col === 1 ? W[t] : B[t];
          span.className   = col === 1 ? 'piece piece-white' : 'piece piece-black';
          cell.appendChild(span);
        }

        if (selected && selected[0]===r && selected[1]===c)
          cell.classList.add('selected');
        if (validMoves.some(m => m[0]===r && m[1]===c))
          cell.classList.add(p !== 0 ? 'valid-capture' : 'valid-move');

        cell.addEventListener('click', () => handleClick(r, c, container));
        boardEl.appendChild(cell);
      }
    }
    container.appendChild(boardEl);
    if (callbacks.onCapturedUpdate) callbacks.onCapturedUpdate(state.captured);
    if (callbacks.onStatusUpdate)   callbacks.onStatusUpdate(state);
  }

  // ---- Interaction ----
  function handleClick(r, c, container) {
    if (isOnlineTurn) return;
    if (state.status === 'checkmate' || state.status === 'stalemate') return;
    const p = state.board[r][c];

    if (selected) {
      const mv = validMoves.find(m => m[0]===r && m[1]===c);
      if (mv) { executeMove(selected[0], selected[1], r, c, container); return; }
    }
    if (p && sgn(p) === state.current) {
      selected = [r,c]; validMoves = getLegal(state, r, c);
    } else {
      selected = null; validMoves = [];
    }
    render(container);
  }

  function executeMove(fr, fc, tr, tc, container) {
    const p = state.board[fr][fc], col = sgn(p);
    const cap = state.board[tr][tc];
    // record capture
    if (cap) { if (sgn(cap)===1) state.captured.b.push(Math.abs(cap)); else state.captured.w.push(Math.abs(cap)); }
    // en passant capture
    if (Math.abs(p)===1 && state.ep && tr===state.ep[0] && tc===state.ep[1]) {
      const epCap = state.board[fr][tc];
      if (sgn(epCap)===1) state.captured.b.push(1); else state.captured.w.push(1);
    }
    state = applyMoveSilent(state, fr, fc, tr, tc);

    // pawn promotion
    if (Math.abs(p)===1 && (tr===0||tr===7)) {
      selected = null; validMoves = [];
      render(container);
      showPromotion(tr, tc, col, container);
      return;
    }
    state.current = -state.current;
    updateStatus(state);
    selected = null; validMoves = [];
    render(container);
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
    if (state.status==='checkmate'||state.status==='stalemate')
      setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 400);
  }

  function showPromotion(tr, tc, col, container) {
    const modal   = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    choices.innerHTML = '';
    modal.classList.remove('hidden');
    [5,4,3,2].forEach(t => {
      const btn = document.createElement('button');
      btn.className   = 'promo-btn';
      btn.textContent = col===1 ? W[t] : B[t];
      btn.title       = PROMO[t];
      btn.onclick = () => {
        modal.classList.add('hidden');
        state.board[tr][tc] = t * col;
        state.current = -state.current;
        updateStatus(state);
        render(container);
        if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
        if (state.status==='checkmate'||state.status==='stalemate')
          setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 400);
      };
      choices.appendChild(btn);
    });
  }

  // ---- Public ----
  function start(container, savedState, cbs, onlineTurn) {
    callbacks = cbs || {};
    isOnlineTurn = !!onlineTurn;
    state = savedState ? JSON.parse(JSON.stringify(savedState)) : initState();
    selected = null; validMoves = [];
    render(container);
  }

  function loadState(container, newState, onlineTurn) {
    state = JSON.parse(JSON.stringify(newState));
    isOnlineTurn = !!onlineTurn;
    selected = null; validMoves = [];
    render(container);
    if (state.status==='checkmate'||state.status==='stalemate')
      setTimeout(() => callbacks.onResult && callbacks.onResult(state.status, state), 300);
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  return { start, loadState, getState, initState };
})();
