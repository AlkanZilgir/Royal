window.TicTacToeGame = (() => {
  const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let S={},CB={},OT=false,CONT=null;
  function initState(){return{board:new Array(9).fill(0),cur:1,status:'playing',winLine:null};}
  function checkWin(b){for(const[a,bv,c]of WINS){if(b[a]&&b[a]===b[bv]&&b[bv]===b[c])return{winner:b[a],line:[a,bv,c]};}if(b.every(v=>v!==0))return{winner:0,line:null};return null;}

  function start(cont,saved,cbs,ot){CONT=cont;CB=cbs||{};OT=!!ot;S=saved?JSON.parse(JSON.stringify(saved)):initState();render();}
  function loadState(cont,ns,ot){CONT=cont;S=JSON.parse(JSON.stringify(ns));OT=!!ot;render();if(S.status!=='playing')setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),300);}
  function getState(){return JSON.parse(JSON.stringify(S));}

  function render(){
    CONT.innerHTML='';
    const board=document.createElement('div');board.className='ttt-board';
    S.board.forEach((v,i)=>{
      const cell=document.createElement('div');cell.className='ttt-cell';
      if(v===1){cell.textContent='✕';cell.classList.add('p1','filled');}
      if(v===2){cell.textContent='○';cell.classList.add('p2','filled');}
      if(S.winLine&&S.winLine.includes(i))cell.classList.add('win');
      cell.addEventListener('click',()=>onClick(i));
      board.appendChild(cell);
    });
    CONT.appendChild(board);
    if(CB.onStatusUpdate)CB.onStatusUpdate(S);
  }

  function onClick(i){
    if(OT||S.status!=='playing'||S.board[i]!==0)return;
    S.board[i]=S.cur;
    const res=checkWin(S.board);
    if(res){S.status=res.winner===1?'p1wins':res.winner===2?'p2wins':'draw';S.winLine=res.line;render();if(CB.onMove)CB.onMove(getState(),S.cur===1?'guest':'host');setTimeout(()=>CB.onResult&&CB.onResult(S.status,S),500);return;}
    S.cur=3-S.cur;render();
    if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');
  }
  return{start,loadState,getState,initState};
})();
