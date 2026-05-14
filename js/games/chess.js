window.ChessGame = (() => {
  // White pieces (outline), Black pieces (filled) - styled with CSS classes
  const WP = { 1:'♙',2:'♖',3:'♘',4:'♗',5:'♕',6:'♔' };
  const BP = { 1:'♟',2:'♜',3:'♞',4:'♝',5:'♛',6:'♚' };
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];
  const inB = (r,c) => r>=0&&r<8&&c>=0&&c<8;
  const sgn = x => x>0?1:x<0?-1:0;

  let S={}, sel=null, legal=[], CB={}, onlineTurn=false;

  function initState() {
    return {
      board:[[-2,-3,-4,-5,-6,-4,-3,-2],[-1,-1,-1,-1,-1,-1,-1,-1],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1],[2,3,4,5,6,4,3,2]],
      cur:1, cast:{wK:true,wQ:true,bK:true,bQ:true}, ep:null, status:'playing', cap:{w:[],b:[]}
    };
  }

  function slide(b,r,c,col,dirs,out){for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){if(b[rr][cc]===0){out.push([rr,cc]);}else{if(sgn(b[rr][cc])!==col)out.push([rr,cc]);break;}rr+=dr;cc+=dc;}}}
  function pawnM(b,r,c,col,ep,out){const d=-col,sr=col===1?6:1;if(inB(r+d,c)&&b[r+d][c]===0){out.push([r+d,c]);if(r===sr&&b[r+2*d][c]===0)out.push([r+2*d,c]);}for(const dc of[-1,1]){const nr=r+d,nc=c+dc;if(!inB(nr,nc))continue;if(b[nr][nc]!==0&&sgn(b[nr][nc])!==col)out.push([nr,nc]);if(ep&&ep[0]===nr&&ep[1]===nc)out.push([nr,nc]);}}
  function knightM(b,r,c,col,out){for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&sgn(b[rr][cc])!==col)out.push([rr,cc]);}}
  function kingM(b,r,c,col,out){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&sgn(b[rr][cc])!==col)out.push([rr,cc]);}}

  function pseudo(s,r,c){
    const{board:b,ep,cast}=s,p=b[r][c];if(!p)return[];
    const col=sgn(p),t=Math.abs(p),out=[];
    if(t===1)pawnM(b,r,c,col,ep,out);
    else if(t===2)slide(b,r,c,col,[[0,1],[0,-1],[1,0],[-1,0]],out);
    else if(t===3)knightM(b,r,c,col,out);
    else if(t===4)slide(b,r,c,col,[[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===5)slide(b,r,c,col,[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],out);
    else if(t===6){
      kingM(b,r,c,col,out);
      const br=col===1?7:0;
      if(r===br&&c===4){
        if(cast[col===1?'wK':'bK']&&b[br][5]===0&&b[br][6]===0&&!atk(s,br,4,-col)&&!atk(s,br,5,-col)&&!atk(s,br,6,-col))out.push([br,6]);
        if(cast[col===1?'wQ':'bQ']&&b[br][3]===0&&b[br][2]===0&&b[br][1]===0&&!atk(s,br,4,-col)&&!atk(s,br,3,-col)&&!atk(s,br,2,-col))out.push([br,2]);
      }
    }
    return out;
  }

  function atk(s,r,c,by){
    const b=s.board;
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===3*by)return true;}
    for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===2*by||v===5*by)return true;break;}rr+=dr;cc+=dc;}}
    for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const v=b[rr][cc];if(v){if(v===4*by||v===5*by)return true;break;}rr+=dr;cc+=dc;}}
    for(const dc of[-1,1]){const rr=r+(-by),cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===by)return true;}
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(inB(rr,cc)&&b[rr][cc]===6*by)return true;}
    return false;
  }

  function findK(b,col){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===6*col)return[r,c];}

  function applyMove(s,fr,fc,tr,tc){
    const ns={board:s.board.map(r=>[...r]),ep:null,cast:{...s.cast},cur:s.cur,status:s.status,cap:{w:[...s.cap.w],b:[...s.cap.b]}};
    const p=ns.board[fr][fc],t=Math.abs(p),col=sgn(p);
    if(t===1&&s.ep&&tr===s.ep[0]&&tc===s.ep[1])ns.board[fr][tc]=0;
    if(t===1&&Math.abs(tr-fr)===2)ns.ep=[(fr+tr)/2,fc];
    if(t===6&&Math.abs(tc-fc)===2){if(tc===6){ns.board[fr][5]=ns.board[fr][7];ns.board[fr][7]=0;}else{ns.board[fr][3]=ns.board[fr][0];ns.board[fr][0]=0;}}
    if(t===6){if(col===1){ns.cast.wK=false;ns.cast.wQ=false;}else{ns.cast.bK=false;ns.cast.bQ=false;}}
    if(fr===7&&fc===0)ns.cast.wQ=false;if(fr===7&&fc===7)ns.cast.wK=false;
    if(fr===0&&fc===0)ns.cast.bQ=false;if(fr===0&&fc===7)ns.cast.bK=false;
    ns.board[tr][tc]=p;ns.board[fr][fc]=0;
    return ns;
  }

  function getLegal(s,r,c){
    const col=sgn(s.board[r][c]);
    return pseudo(s,r,c).filter(([tr,tc])=>{const ns=applyMove(s,r,c,tr,tc);const[kr,kc]=findK(ns.board,col);return !atk(ns,kr,kc,-col);});
  }

  function updateStatus(s){
    const col=s.cur,[kr,kc]=findK(s.board,col),inChk=atk(s,kr,kc,-col);
    let has=false;
    outer:for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(sgn(s.board[r][c])===col&&getLegal(s,r,c).length){has=true;break outer;}
    s.status=has?(inChk?'check':'playing'):(inChk?'checkmate':'stalemate');
  }

  function render(cont){
    cont.innerHTML='';
    const wrap=document.createElement('div'); wrap.className='chess-wrap';
    // File labels
    const fr=document.createElement('div'); fr.className='chess-files';
    FILES.forEach(f=>{const s=document.createElement('span');s.textContent=f;fr.appendChild(s);});
    wrap.appendChild(fr);
    const inner=document.createElement('div'); inner.className='chess-inner';
    // Rank labels
    const rc=document.createElement('div'); rc.className='chess-ranks';
    RANKS.forEach(r=>{const s=document.createElement('span');s.textContent=r;rc.appendChild(s);});
    inner.appendChild(rc);
    // Board
    const board=document.createElement('div'); board.className='chess-board';
    const[kr,kc]=findK(S.board,S.cur)||[-1,-1];
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const sq=document.createElement('div');
        sq.className='sq '+((r+c)%2===0?'lt':'dk');
        const p=S.board[r][c];
        if(sel&&sel[0]===r&&sel[1]===c)sq.classList.add('sel');
        if(S.status==='check'&&r===kr&&c===kc)sq.classList.add('chk');
        if(p!==0){
          const pc=document.createElement('div');
          const col=sgn(p),t=Math.abs(p);
          pc.className='pc '+(col===1?'w':'b');
          pc.textContent=col===1?WP[t]:BP[t];
          sq.appendChild(pc);
        }
        // Edge coords
        if(c===7){const s=document.createElement('span');s.className='coord';s.style.cssText='bottom:2px;right:3px;color:'+(((r+c)%2===0)?'#b58863':'#f0d9b5');s.textContent=RANKS[r];sq.appendChild(s);}
        if(r===7){const s=document.createElement('span');s.className='coord';s.style.cssText='bottom:2px;left:3px;color:'+(((r+c)%2===0)?'#b58863':'#f0d9b5');s.textContent=FILES[c];sq.appendChild(s);}
        sq.addEventListener('click',()=>onClick(r,c,cont));
        board.appendChild(sq);
      }
    }
    inner.appendChild(board);
    wrap.appendChild(inner);
    cont.appendChild(wrap);
    if(CB.onStatusUpdate)CB.onStatusUpdate(S);
  }

  function onClick(r,c,cont){
    if(onlineTurn||S.status==='checkmate'||S.status==='stalemate')return;
    const p=S.board[r][c];
    if(sel){
      const mv=legal.find(m=>m[0]===r&&m[1]===c);
      if(mv){doMove(sel[0],sel[1],r,c,cont);return;}
      if(p&&sgn(p)===S.cur){sel=[r,c];legal=getLegal(S,r,c);render(cont);return;}
      sel=null;legal=[];render(cont);return;
    }
    if(p&&sgn(p)===S.cur){sel=[r,c];legal=getLegal(S,r,c);render(cont);}
  }

  function doMove(fr,fc,tr,tc,cont){
    const p=S.board[fr][fc],col=sgn(p);
    const cap=S.board[tr][tc];
    if(cap){if(sgn(cap)===1)S.cap.b.push(Math.abs(cap));else S.cap.w.push(Math.abs(cap));}
    if(Math.abs(p)===1&&S.ep&&tr===S.ep[0]&&tc===S.ep[1]){const ec=S.board[fr][tc];if(sgn(ec)===1)S.cap.b.push(1);else S.cap.w.push(1);}
    S=applyMove(S,fr,fc,tr,tc);
    sel=null;legal=[];
    if(Math.abs(p)===1&&(tr===0||tr===7)){render(cont);showPromo(tr,tc,col,cont);return;}
    S.cur=-S.cur;updateStatus(S);render(cont);
    if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');
    if(S.status==='checkmate'||S.status==='stalemate')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),400);
  }

  function showPromo(tr,tc,col,cont){
    const modal=document.getElementById('promo-modal');
    const choices=document.getElementById('promo-choices');
    if(!modal||!choices)return;
    choices.innerHTML='';modal.classList.remove('hidden');
    [[5,'Queen'],[4,'Bishop'],[3,'Knight'],[2,'Rook']].forEach(([t,name])=>{
      const btn=document.createElement('button');btn.className='promo-btn';btn.title=name;
      btn.textContent=col===1?WP[t]:BP[t];btn.style.fontSize='2rem';
      btn.onclick=()=>{modal.classList.add('hidden');S.board[tr][tc]=t*col;S.cur=-S.cur;updateStatus(S);render(cont);if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');if(S.status==='checkmate'||S.status==='stalemate')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),400);};
      choices.appendChild(btn);
    });
  }

  function start(cont,saved,cbs,ot){CB=cbs||{};onlineTurn=!!ot;S=saved?JSON.parse(JSON.stringify(saved)):initState();sel=null;legal=[];render(cont);}
  function loadState(cont,ns,ot){S=JSON.parse(JSON.stringify(ns));onlineTurn=!!ot;sel=null;legal=[];render(cont);if(S.status==='checkmate'||S.status==='stalemate')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),300);}
  function getState(){return JSON.parse(JSON.stringify(S));}
  return{start,loadState,getState,initState};
})();
