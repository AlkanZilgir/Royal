// ============================================================
//  BOARD ROYAL — Chess Engine with Real SVG Pieces
// ============================================================
window.ChessGame = (() => {

  // ---- SVG Piece Definitions (viewBox 0 0 45 45) ----
  function piece(paths, isWhite) {
    const f = isWhite ? '#ffffff' : '#1a1a2e';
    const s = isWhite ? '#000000' : '#e0e0ff';
    const d = isWhite ? '#00000033' : '#ffffff33'; // detail color
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="100%" height="100%">
      <g fill="${f}" stroke="${s}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths(f,s,d)}</g>
    </svg>`;
  }

  const PAWN = (f,s,d) => `
    <circle cx="22.5" cy="10.5" r="5.5"/>
    <path d="M20,16 C17.5,18.5 16,22 16,26 C16,30 18,32.5 21,33.5 C16.5,35 11,39 11,41 L34,41 C34,39 28.5,35 24,33.5 C27,32.5 29,30 29,26 C29,22 27.5,18.5 25,16 Z"/>`;

  const ROOK = (f,s,d) => `
    <path d="M9,39 L36,39 L36,36 L33,36 L33,19 L36,19 L36,9 L29,9 L29,14 L26,14 L26,9 L19,9 L19,14 L16,14 L16,9 L9,9 L9,19 L12,19 L12,36 L9,36 Z"/>
    <line x1="12" y1="33" x2="33" y2="33" stroke="${d}" stroke-width="1"/>
    <line x1="12" y1="28" x2="33" y2="28" stroke="${d}" stroke-width="1"/>`;

  const KNIGHT = (f,s,d) => `
    <path d="M22,10 C19,10 14.5,12 13,18 C12,22 13,25 15,27 L9,39 L36,39 L31,27 C34,25 36,22 36,18 C36,12 31,9 26,9 L23,6 L16,6 Z"/>
    <circle cx="27" cy="17" r="2" fill="${s}"/>
    <path d="M14,20 C14,18 16,16 18,16" fill="none" stroke="${s}" stroke-width="1"/>
    <path d="M13.5,28 C13.5,28 16,23 20,22" fill="none" stroke="${d}" stroke-width="1"/>`;

  const BISHOP = (f,s,d) => `
    <circle cx="22.5" cy="7.5" r="3"/>
    <path d="M22.5,11 C19,14 16,18.5 16,24 C16,28.5 18.5,32 22.5,33 C26.5,32 29,28.5 29,24 C29,18.5 26,14 22.5,11 Z"/>
    <path d="M14,37 L31,37 Q31,32 22.5,31 Q14,32 14,37 Z"/>
    <line x1="20" y1="22" x2="25" y2="22" stroke="${s}" stroke-width="1"/>
    <line x1="22.5" y1="19.5" x2="22.5" y2="24.5" stroke="${s}" stroke-width="1"/>`;

  const QUEEN = (f,s,d) => `
    <circle cx="6" cy="11" r="2.5"/>
    <circle cx="14.5" cy="7.5" r="2.5"/>
    <circle cx="22.5" cy="6.5" r="2.5"/>
    <circle cx="30.5" cy="7.5" r="2.5"/>
    <circle cx="39" cy="11" r="2.5"/>
    <path d="M6,13.5 L6,31 Q14.5,27.5 22.5,29 Q30.5,27.5 39,31 L39,13.5 Q31,16 22.5,14.5 Q14,16 6,13.5 Z"/>
    <path d="M11,31 L11,38 L34,38 L34,31 Q22.5,27 11,31 Z"/>
    <line x1="11" y1="35" x2="34" y2="35" stroke="${d}" stroke-width="1"/>
    <line x1="11" y1="38" x2="34" y2="38" stroke="${s}" stroke-width="1"/>`;

  const KING = (f,s,d) => `
    <line x1="22.5" y1="4" x2="22.5" y2="14" stroke-width="1.5"/>
    <line x1="18" y1="9" x2="27" y2="9" stroke-width="1.5"/>
    <path d="M12.5,37 C18,40 27,40 32.5,37 L32.5,30 C32.5,25.5 28,22.5 22.5,22.5 C17,22.5 12.5,25.5 12.5,30 Z"/>
    <path d="M20.5,22.5 C20.5,18 17.5,15.5 17.5,13 C17.5,11 19.5,10 22.5,10 C25.5,10 27.5,11 27.5,13 C27.5,15.5 24.5,18 24.5,22.5"/>
    <line x1="12.5" y1="30" x2="32.5" y2="30" stroke="${d}" stroke-width="1"/>
    <line x1="12.5" y1="33.5" x2="32.5" y2="33.5" stroke="${d}" stroke-width="1"/>
    <line x1="12.5" y1="37" x2="32.5" y2="37" stroke="${d}" stroke-width="0.8"/>`;

  // Build all 12 pieces
  const SVG = {
    '1':  piece(PAWN,   true),  '-1': piece(PAWN,   false),
    '2':  piece(ROOK,   true),  '-2': piece(ROOK,   false),
    '3':  piece(KNIGHT, true),  '-3': piece(KNIGHT, false),
    '4':  piece(BISHOP, true),  '-4': piece(BISHOP, false),
    '5':  piece(QUEEN,  true),  '-5': piece(QUEEN,  false),
    '6':  piece(KING,   true),  '-6': piece(KING,   false),
  };

  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];

  // ---- Engine helpers ----
  const inB = (r,c) => r>=0&&r<8&&c>=0&&c<8;
  const sgn = x => x>0?1:x<0?-1:0;

  let state={}, selected=null, validMoves=[], callbacks={}, isOnlineTurn=false;

  function initState(){
    return {
      board:[
        [-2,-3,-4,-5,-6,-4,-3,-2],
        [-1,-1,-1,-1,-1,-1,-1,-1],
        [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,1,1],
        [2,3,4,5,6,4,3,2]
      ],
      current:1,
      castling:{wK:true,wQ:true,bK:true,bQ:true},
      ep:null, status:'playing',
      captured:{w:[],b:[]}
    };
  }

  function slide(b,r,c,col,dirs,out){
    for(const[dr,dc]of dirs){
      let rr=r+dr,cc=c+dc;
      while(inB(rr,cc)){
        if(b[rr][cc]===0)out.push([rr,cc]);
        else{if(sgn(b[rr][cc])!==col)out.push([rr,cc]);break;}
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
        if(castling[kk]&&b[br][5]===0&&b[br][6]===0&&!attacked(s,br,4,-col)&&!attacked(s,br,5,-col)&&!attacked(s,br,6,-col))out.push([br,6]);
        if(castling[qk]&&b[br][3]===0&&b[br][2]===0&&b[br][1]===0&&!attacked(s,br,4,-col)&&!attacked(s,br,3,-col)&&!attacked(s,br,2,-col))out.push([br,2]);
      }
    }
    return out;
  }

  function attacked(s,r,c,byCol){
    const b=s.board;
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===3*byCol)return true;}
    for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===2*byCol||v===5*byCol)return true;break;}rr+=dr;cc+=dc;}}
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===4*byCol||v===5*byCol)return true;break;}rr+=dr;cc+=dc;}}
    const pd=-byCol;for(const dc of[-1,1]){const rr=r+pd,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===byCol)return true;}
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===6*byCol)return true;}
    return false;
  }

  function findKing(b,col){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===6*col)return[r,c];}

  function applyMoveSilent(s,fr,fc,tr,tc){
    const ns={board:s.board.map(r=>[...r]),ep:null,castling:{...s.castling},current:s.current,status:s.status,captured:{w:[...s.captured.w],b:[...s.captured.b]}};
    const p=ns.board[fr][fc],t=Math.abs(p),col=sgn(p);
    if(t===1&&s.ep&&tr===s.ep[0]&&tc===s.ep[1])ns.board[fr][tc]=0;
    if(t===1&&Math.abs(tr-fr)===2)ns.ep=[(fr+tr)/2,fc];
    if(t===6&&Math.abs(tc-fc)===2){if(tc===6){ns.board[fr][5]=ns.board[fr][7];ns.board[fr][7]=0;}else{ns.board[fr][3]=ns.board[fr][0];ns.board[fr][0]=0;}}
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
      const[kr,kc]=findKing(ns.board,col);
      return !attacked(ns,kr,kc,-col);
    });
  }

  function updateStatus(s){
    const col=s.current;
    const[kr,kc]=findKing(s.board,col);
    const inChk=attacked(s,kr,kc,-col);
    let has=false;
    outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(sgn(s.board[r][c])===col&&getLegal(s,r,c).length){has=true;break outer;}
    s.status=has?(inChk?'check':'playing'):(inChk?'checkmate':'stalemate');
  }

  // ---- Render ----
  function render(container) {
    container.innerHTML = '';

    // Outer wrapper with coordinates
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:inline-flex;flex-direction:column;gap:0;user-select:none;';

    // File labels top (a-h)
    const topLabels = document.createElement('div');
    topLabels.style.cssText = 'display:flex;padding-left:20px;';
    FILES.forEach(f => {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'flex:1;text-align:center;font-size:11px;font-weight:600;color:#7c8db5;font-family:Outfit,sans-serif;padding-bottom:3px;';
      lbl.textContent = f;
      topLabels.appendChild(lbl);
    });
    wrap.appendChild(topLabels);

    // Board rows
    const boardWrap = document.createElement('div');
    boardWrap.style.cssText = 'display:flex;';

    // Rank labels left (8-1)
    const rankCol = document.createElement('div');
    rankCol.style.cssText = 'display:flex;flex-direction:column;width:20px;';
    RANKS.forEach(r => {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'flex:1;display:flex;align-items:center;font-size:11px;font-weight:600;color:#7c8db5;font-family:Outfit,sans-serif;padding-right:3px;justify-content:flex-end;';
      lbl.textContent = r;
      rankCol.appendChild(lbl);
    });
    boardWrap.appendChild(rankCol);

    // The actual board
    const boardEl = document.createElement('div');
    boardEl.className = 'chess-board';
    boardEl.style.cssText = `
      display:grid;grid-template-columns:repeat(8,1fr);
      border:3px solid #2a3550;border-radius:3px;
      box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(99,102,241,0.2);
      overflow:hidden;flex-shrink:0;
      width:min(calc(100dvh - 190px),calc(100vw - 230px),520px);
      height:min(calc(100dvh - 190px),calc(100vw - 230px),520px);
    `;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        const isLight = (r+c)%2===0;
        const p = state.board[r][c];

        let bg = isLight ? '#f0d9b5' : '#b58863';
        if (selected && selected[0]===r && selected[1]===c) bg = isLight ? '#f6f668' : '#caca44';
        else if (validMoves.some(m=>m[0]===r&&m[1]===c) && p!==0) bg = isLight ? '#e8847c' : '#c55';
        // check highlight
        if (p===6*state.current && state.status==='check') bg = '#e87070';

        cell.style.cssText = `
          aspect-ratio:1;display:flex;align-items:center;justify-content:center;
          cursor:pointer;position:relative;background:${bg};transition:background 0.1s;
        `;
        cell.dataset.r=r; cell.dataset.c=c;

        // Valid move dot
        if (validMoves.some(m=>m[0]===r&&m[1]===c) && p===0) {
          const dot = document.createElement('div');
          dot.style.cssText = 'position:absolute;width:28%;height:28%;background:rgba(0,0,0,0.2);border-radius:50%;pointer-events:none;';
          cell.appendChild(dot);
        }

        // Piece SVG
        if (p !== 0) {
          const pieceWrap = document.createElement('div');
          pieceWrap.style.cssText = 'width:88%;height:88%;pointer-events:none;drop-shadow(0 2px 4px rgba(0,0,0,0.5));';
          pieceWrap.innerHTML = SVG[String(p)] || '';
          // Add shadow to piece
          pieceWrap.querySelector('svg') && (pieceWrap.querySelector('svg').style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))');
          cell.appendChild(pieceWrap);
        }

        // Coordinate label on edge squares (bottom-right corner)
        if (c === 7) {
          const rl = document.createElement('span');
          rl.style.cssText = `position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};font-family:Outfit,sans-serif;pointer-events:none;`;
          rl.textContent = RANKS[r];
          cell.appendChild(rl);
        }
        if (r === 7) {
          const fl = document.createElement('span');
          fl.style.cssText = `position:absolute;bottom:2px;left:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};font-family:Outfit,sans-serif;pointer-events:none;`;
          fl.textContent = FILES[c];
          cell.appendChild(fl);
        }

        cell.addEventListener('click', () => handleClick(r, c, container));
        boardEl.appendChild(cell);
      }
    }

    boardWrap.appendChild(boardEl);
    wrap.appendChild(boardWrap);
    container.appendChild(wrap);

    if (callbacks.onCapturedUpdate) callbacks.onCapturedUpdate(state.captured);
    if (callbacks.onStatusUpdate)   callbacks.onStatusUpdate(state);
  }

  function handleClick(r, c, container) {
    if (isOnlineTurn) return;
    if (state.status==='checkmate'||state.status==='stalemate') return;
    const p = state.board[r][c];
    if (selected) {
      const mv = validMoves.find(m=>m[0]===r&&m[1]===c);
      if (mv) { executeMove(selected[0],selected[1],r,c,container); return; }
    }
    if (p && sgn(p)===state.current) {
      selected=[r,c]; validMoves=getLegal(state,r,c);
    } else {
      selected=null; validMoves=[];
    }
    render(container);
  }

  function executeMove(fr,fc,tr,tc,container) {
    const p=state.board[fr][fc],col=sgn(p);
    const cap=state.board[tr][tc];
    if(cap){if(sgn(cap)===1)state.captured.b.push(Math.abs(cap));else state.captured.w.push(Math.abs(cap));}
    if(Math.abs(p)===1&&state.ep&&tr===state.ep[0]&&tc===state.ep[1]){
      const ec=state.board[fr][tc];
      if(sgn(ec)===1)state.captured.b.push(1);else state.captured.w.push(1);
    }
    state=applyMoveSilent(state,fr,fc,tr,tc);
    if(Math.abs(p)===1&&(tr===0||tr===7)){
      selected=null;validMoves=[];render(container);
      showPromotion(tr,tc,col,container);return;
    }
    state.current=-state.current;
    updateStatus(state);
    selected=null;validMoves=[];
    render(container);
    if(callbacks.onMove)callbacks.onMove(getState(),state.current===1?'host':'guest');
    if(state.status==='checkmate'||state.status==='stalemate')
      setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),400);
  }

  function showPromotion(tr,tc,col,container) {
    const modal=document.getElementById('promotion-modal');
    const choices=document.getElementById('promotion-choices');
    choices.innerHTML='';
    modal.classList.remove('hidden');
    [[5,'Queen'],[4,'Bishop'],[3,'Knight'],[2,'Rook']].forEach(([t,name])=>{
      const btn=document.createElement('button');
      btn.className='promo-btn';
      btn.title=name;
      btn.innerHTML=SVG[String(t*col)];
      btn.style.width='64px';btn.style.height='64px';btn.style.padding='4px';
      btn.onclick=()=>{
        modal.classList.add('hidden');
        state.board[tr][tc]=t*col;
        state.current=-state.current;
        updateStatus(state);
        render(container);
        if(callbacks.onMove)callbacks.onMove(getState(),state.current===1?'host':'guest');
        if(state.status==='checkmate'||state.status==='stalemate')
          setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),400);
      };
      choices.appendChild(btn);
    });
  }

  function start(container,savedState,cbs,onlineTurn){
    callbacks=cbs||{}; isOnlineTurn=!!onlineTurn;
    state=savedState?JSON.parse(JSON.stringify(savedState)):initState();
    selected=null;validMoves=[];
    render(container);
  }

  function loadState(container,newState,onlineTurn){
    state=JSON.parse(JSON.stringify(newState));
    isOnlineTurn=!!onlineTurn;
    selected=null;validMoves=[];
    render(container);
    if(state.status==='checkmate'||state.status==='stalemate')
      setTimeout(()=>callbacks.onResult&&callbacks.onResult(state.status,state),300);
  }

  function getState(){return JSON.parse(JSON.stringify(state));}

  return {start,loadState,getState,initState};
})();
