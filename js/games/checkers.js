window.CheckersGame = (() => {
  let S={},CB={},OT=false,CONT=null;
  function initState(){const b=Array.from({length:8},()=>new Array(8).fill(0));for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2===1)b[r][c]=2;for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1)b[r][c]=1;return{board:b,cur:1,sel:null,moves:[],status:'playing'};}
  const isK=v=>v===11||v===22,own=v=>v===1||v===11?1:v===2||v===22?2:0;
  function jumps(b,r,c,p,seq=[]){const out=[];const dirs=isK(p)?[[-1,-1],[-1,1],[1,-1],[1,1]]:(own(p)===1?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]);for(const[dr,dc]of dirs){const mr=r+dr,mc=c+dc,jr=r+2*dr,jc=c+2*dc;if(jr<0||jr>=8||jc<0||jc>=8)continue;if(!own(b[mr][mc])||own(b[mr][mc])===own(p))continue;if(b[jr][jc]!==0)continue;if(seq.some(s=>s[0]===mr&&s[1]===mc))continue;out.push({to:[jr,jc],over:[mr,mc],seq:[...seq,[mr,mc]]});}return out;}
  function moves(b,r,c,mj){const p=b[r][c];if(!p)return[];const jj=jumps(b,r,c,p);if(jj.length||mj)return jj.map(j=>({from:[r,c],to:j.to,over:j.over,seq:j.seq,jump:true}));const dirs=isK(p)?[[-1,-1],[-1,1],[1,-1],[1,1]]:(own(p)===1?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]);const out=[];for(const[dr,dc]of dirs){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr][nc]===0)out.push({from:[r,c],to:[nr,nc],jump:false});}return out;}
  function allMoves(b,pl){const a=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(own(b[r][c])===pl)a.push(...moves(b,r,c,false));const hj=a.some(m=>m.jump);return hj?a.filter(m=>m.jump):a;}
  function crown(r,c){const v=S.board[r][c];if(v===1&&r===0)S.board[r][c]=11;if(v===2&&r===7)S.board[r][c]=22;}

  function start(cont,saved,cbs,ot){CONT=cont;CB=cbs||{};OT=!!ot;S=saved?JSON.parse(JSON.stringify(saved)):initState();render();}
  function loadState(cont,ns,ot){CONT=cont;S=JSON.parse(JSON.stringify(ns));OT=!!ot;render();if(S.status!=='playing')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),300);}
  function getState(){return JSON.parse(JSON.stringify(S));}

  function render(){
    CONT.innerHTML='';
    const board=document.createElement('div');board.className='checkers-board';
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const sq=document.createElement('div');sq.className='csq '+((r+c)%2===0?'lt':'dk');
      if(S.sel&&S.sel[0]===r&&S.sel[1]===c)sq.classList.add('sel');
      const v=S.board[r][c];
      if(v!==0){const d=document.createElement('div');d.className='disc '+(own(v)===1?'p1':'p2')+(isK(v)?' king':'');sq.appendChild(d);}
      sq.addEventListener('click',()=>onClick(r,c));board.appendChild(sq);
    }
    CONT.appendChild(board);if(CB.onStatusUpdate)CB.onStatusUpdate(S);
  }

  function onClick(r,c){
    if(OT||S.status!=='playing')return;
    const v=S.board[r][c],am=allMoves(S.board,S.cur),mj=am.some(m=>m.jump);
    if(S.sel){
      const mv=S.moves.find(m=>m.to[0]===r&&m.to[1]===c);
      if(mv){exec(mv);return;}
    }
    if(own(v)===S.cur){const pm=moves(S.board,r,c,mj).filter(m=>!mj||(mj&&m.jump));S.sel=pm.length?[r,c]:null;S.moves=pm;}
    else{S.sel=null;S.moves=[];}
    render();
  }

  function exec(mv){
    const[fr,fc]=mv.from,[tr,tc]=mv.to,p=S.board[fr][fc];
    S.board[tr][tc]=p;S.board[fr][fc]=0;
    if(mv.jump){const[or,oc]=mv.over;S.board[or][oc]=0;crown(tr,tc);const fj=jumps(S.board,tr,tc,p,mv.seq||[]);if(fj.length){S.sel=[tr,tc];S.moves=fj.map(j=>({from:[tr,tc],to:j.to,over:j.over,seq:j.seq,jump:true}));render();return;}}
    crown(tr,tc);S.sel=null;S.moves=[];S.cur=3-S.cur;
    const p1=S.board.flat().filter(v=>own(v)===1).length,p2=S.board.flat().filter(v=>own(v)===2).length;
    if(!p1)S.status='p2wins';else if(!p2)S.status='p1wins';else if(!allMoves(S.board,S.cur).length)S.status=S.cur===1?'p2wins':'p1wins';
    render();if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');
    if(S.status!=='playing')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),400);
  }
  return{start,loadState,getState,initState};
})();
