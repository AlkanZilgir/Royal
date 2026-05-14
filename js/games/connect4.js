window.Connect4Game = (() => {
  const R=6,C=7;
  let S={},CB={},OT=false,CONT=null;
  function initState(){return{board:Array.from({length:R},()=>new Array(C).fill(0)),cur:1,status:'playing',win:[]};}
  function drop(b,col,p){for(let r=R-1;r>=0;r--){if(b[r][col]===0){b[r][col]=p;return r;}}return -1;}
  function checkWin(b,r,c,p){const dirs=[[0,1],[1,0],[1,1],[1,-1]];for(const[dr,dc]of dirs){const cells=[[r,c]];for(let i=1;i<4;i++){const nr=r+dr*i,nc=c+dc*i;if(nr<0||nr>=R||nc<0||nc>=C||b[nr][nc]!==p)break;cells.push([nr,nc]);}for(let i=1;i<4;i++){const nr=r-dr*i,nc=c-dc*i;if(nr<0||nr>=R||nc<0||nc>=C||b[nr][nc]!==p)break;cells.push([nr,nc]);}if(cells.length>=4)return cells;}return null;}

  function start(cont,saved,cbs,ot){CONT=cont;CB=cbs||{};OT=!!ot;S=saved?JSON.parse(JSON.stringify(saved)):initState();render();}
  function loadState(cont,ns,ot){CONT=cont;S=JSON.parse(JSON.stringify(ns));OT=!!ot;render();if(S.status!=='playing')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),300);}
  function getState(){return JSON.parse(JSON.stringify(S));}

  function render(){
    CONT.innerHTML='';
    const board=document.createElement('div');board.className='c4-board';
    for(let r=0;r<R;r++){
      const row=document.createElement('div');row.className='c4-row';
      for(let c=0;c<C;c++){
        const cell=document.createElement('div');cell.className='c4-cell';
        if(S.board[r][c]===1)cell.classList.add('p1');
        if(S.board[r][c]===2)cell.classList.add('p2');
        if(S.win.some(([wr,wc])=>wr===r&&wc===c))cell.classList.add('win');
        cell.addEventListener('click',()=>onClick(c));
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
    CONT.appendChild(board);
    if(CB.onStatusUpdate)CB.onStatusUpdate(S);
  }

  function onClick(col){
    if(OT||S.status!=='playing')return;
    const b=S.board.map(r=>[...r]);
    const r=drop(b,col,S.cur);
    if(r<0)return;
    S.board=b;
    const w=checkWin(b,r,col,S.cur);
    if(w){S.status=S.cur===1?'p1wins':'p2wins';S.win=w;render();if(CB.onMove)CB.onMove(getState(),S.cur===1?'guest':'host');setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),500);return;}
    if(b[0].every(v=>v!==0)){S.status='draw';render();setTimeout(()=>CB.onResult&&CB.onResult('draw',S),400);return;}
    S.cur=3-S.cur;render();
    if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');
  }
  return{start,loadState,getState,initState};
})();
