// ============================================================
//  BOARD ROYAL — Nine Men's Morris (Fixed piece visibility)
// ============================================================
window.MorrisGame = (() => {
  const COORDS = [
    [20,20],[230,20],[440,20],[440,230],[440,440],[230,440],[20,440],[20,230],
    [80,80],[230,80],[380,80],[380,230],[380,380],[230,380],[80,380],[80,230],
    [140,140],[230,140],[320,140],[320,230],[320,320],[230,320],[140,320],[140,230]
  ];
  const MILLS = [
    [0,1,2],[2,3,4],[4,5,6],[6,7,0],
    [8,9,10],[10,11,12],[12,13,14],[14,15,8],
    [16,17,18],[18,19,20],[20,21,22],[22,23,16],
    [1,9,17],[3,11,19],[5,13,21],[7,15,23]
  ];
  const ADJACENT = {
    0:[1,7],1:[0,2,9],2:[1,3],3:[2,4,11],4:[3,5],5:[4,6,13],6:[5,7],7:[6,0,15],
    8:[9,15],9:[8,10,17],10:[9,11],11:[10,12,19],12:[11,13],13:[12,14,21],14:[13,15],15:[14,8,23],
    16:[17,23],17:[16,18],18:[17,19],19:[18,20],20:[19,21],21:[20,22],22:[21,23],23:[22,16]
  };

  let state={}, callbacks={}, isOnlineTurn=false, container=null;

  function initState(){
    return {
      board: new Array(24).fill(0),
      current:1, phase:[1,1], placed:[0,0], removed:[0,0],
      total:9, pendingMill:false, selected:null, status:'playing'
    };
  }

  function countPieces(board,p){ return board.filter(v=>v===p).length; }
  function checkMill(board,pt,p){ return MILLS.some(m=>m.includes(pt)&&m.every(i=>board[i]===p)); }

  function getValidTargets(s,from){
    const p=s.current, phase=s.phase[p-1];
    if(phase===3) return s.board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
    return ADJACENT[from].filter(n=>s.board[n]===0);
  }

  function canMove(s,player){
    if(s.phase[player-1]===3) return true;
    return s.board.map((v,i)=>v===player?i:-1).filter(i=>i>=0)
      .some(p=>ADJACENT[p].some(n=>s.board[n]===0));
  }

  function checkGameOver(s){
    if(s.placed[0]>=s.total&&s.placed[1]>=s.total){
      for(const p of[1,2]){
        if(countPieces(s.board,p)<3) return p===1?'p2wins':'p1wins';
        if(!canMove(s,p)) return p===1?'p2wins':'p1wins';
      }
    }
    return null;
  }

  function start(cont,savedState,cbs,onlineTurn){
    container=cont; callbacks=cbs||{}; isOnlineTurn=!!onlineTurn;
    state=savedState?JSON.parse(JSON.stringify(savedState)):initState();
    render();
  }

  function loadState(cont,newState,onlineTurn){
    container=cont; state=JSON.parse(JSON.stringify(newState)); isOnlineTurn=!!onlineTurn;
    render();
    const over=checkGameOver(state);
    if(over) setTimeout(()=>callbacks.onResult&&callbacks.onResult(over,state),300);
  }

  function getState(){ return JSON.parse(JSON.stringify(state)); }

  function render(){
    container.innerHTML='';
    const wrap=document.createElement('div');
    wrap.className='morris-board-wrap';
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 460 460');

    // Board background
    const bg=document.createElementNS(ns,'rect');
    bg.setAttribute('width','460'); bg.setAttribute('height','460');
    bg.setAttribute('fill','#1a2744'); bg.setAttribute('rx','8');
    svg.appendChild(bg);

    // Draw lines
    const lineGroups=[
      [0,1,2,3,4,5,6,7,0],[8,9,10,11,12,13,14,15,8],[16,17,18,19,20,21,22,23,16],
      [1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23]
    ];
    lineGroups.forEach(pts=>{
      for(let i=0;i<pts.length-1;i++){
        const line=document.createElementNS(ns,'line');
        const[x1,y1]=COORDS[pts[i]],[x2,y2]=COORDS[pts[i+1]];
        line.setAttribute('x1',x1);line.setAttribute('y1',y1);
        line.setAttribute('x2',x2);line.setAttribute('y2',y2);
        line.setAttribute('stroke','#4a6fa5');line.setAttribute('stroke-width','3');
        svg.appendChild(line);
      }
    });

    // Draw points
    COORDS.forEach(([x,y],i)=>{
      const g=document.createElementNS(ns,'g');
      g.style.cursor='pointer';
      const player=state.board[i];
      const isSel=state.selected===i;
      const isTarget=state.selected!==null&&getValidTargets(state,state.selected).includes(i);
      const isRemovable=state.pendingMill&&player!==0&&player!==state.current;

      // Highlight ring
      if(isSel||isTarget||isRemovable){
        const ring=document.createElementNS(ns,'circle');
        ring.setAttribute('cx',x);ring.setAttribute('cy',y);ring.setAttribute('r','24');
        ring.setAttribute('fill', isSel?'rgba(99,102,241,0.4)':isTarget?'rgba(99,102,241,0.2)':'rgba(239,68,68,0.3)');
        svg.appendChild(ring);
      }

      // Main piece or empty slot
      const circle=document.createElementNS(ns,'circle');
      circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r','17');

      if(player===1){
        // Player 1 — bright white/cream piece
        circle.setAttribute('fill','#f0f0ff');
        circle.setAttribute('stroke','#6366f1');
        circle.setAttribute('stroke-width','3');
      } else if(player===2){
        // Player 2 — vivid red piece (clearly visible on dark blue)
        circle.setAttribute('fill','#ef4444');
        circle.setAttribute('stroke','#fca5a5');
        circle.setAttribute('stroke-width','3');
      } else {
        // Empty slot
        circle.setAttribute('fill','#243558');
        circle.setAttribute('stroke','#4a6fa5');
        circle.setAttribute('stroke-width','2');
      }

      // Hit area
      const hit=document.createElementNS(ns,'circle');
      hit.setAttribute('cx',x);hit.setAttribute('cy',y);hit.setAttribute('r','24');
      hit.setAttribute('fill','transparent');

      g.appendChild(circle);
      g.appendChild(hit);
      g.addEventListener('click',()=>handleClick(i));
      svg.appendChild(g);
    });

    // Legend
    const legend1=document.createElementNS(ns,'text');
    legend1.setAttribute('x','10');legend1.setAttribute('y','456');
    legend1.setAttribute('fill','#f0f0ff');legend1.setAttribute('font-size','13');
    legend1.setAttribute('font-family','sans-serif');
    legend1.textContent='● P1 (White)';
    svg.appendChild(legend1);

    const legend2=document.createElementNS(ns,'text');
    legend2.setAttribute('x','340');legend2.setAttribute('y','456');
    legend2.setAttribute('fill','#ef4444');legend2.setAttribute('font-size','13');
    legend2.setAttribute('font-family','sans-serif');
    legend2.textContent='● P2 (Red)';
    svg.appendChild(legend2);

    wrap.appendChild(svg);
    container.appendChild(wrap);
    if(callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(idx){
    if(isOnlineTurn||state.status!=='playing') return;
    const player=state.current;
    const phase=state.phase[player-1];

    if(state.pendingMill){
      const opponent=3-player;
      if(state.board[idx]!==opponent) return;
      const opPieces=state.board.map((v,i)=>v===opponent?i:-1).filter(i=>i>=0);
      const allInMill=opPieces.every(p=>checkMill(state.board,p,opponent));
      if(!allInMill&&checkMill(state.board,idx,opponent)) return;
      state.board[idx]=0;
      state.removed[player-1]++;
      state.pendingMill=false;
      state.selected=null;
      finishTurn();
      return;
    }

    if(phase===1){
      if(state.board[idx]!==0) return;
      state.board[idx]=player;
      state.placed[player-1]++;
      if(state.placed[player-1]>=state.total) state.phase[player-1]=2;
      if(checkMill(state.board,idx,player)){ state.pendingMill=true; render(); return; }
      finishTurn();
      return;
    }

    if(state.selected===null){
      if(state.board[idx]===player){ state.selected=idx; render(); }
      return;
    }
    if(state.selected===idx){ state.selected=null; render(); return; }
    if(state.board[idx]===player){ state.selected=idx; render(); return; }

    const targets=getValidTargets(state,state.selected);
    if(!targets.includes(idx)){ state.selected=null; render(); return; }

    state.board[idx]=player;
    state.board[state.selected]=0;
    if(countPieces(state.board,player)===3) state.phase[player-1]=3;
    state.selected=null;
    if(checkMill(state.board,idx,player)){ state.pendingMill=true; render(); return; }
    finishTurn();
  }

  function finishTurn(){
    state.current=3-state.current;
    const over=checkGameOver(state);
    if(over) state.status=over;
    render();
    if(callbacks.onMove) callbacks.onMove(getState(),state.current===1?'host':'guest');
    if(over) setTimeout(()=>callbacks.onResult&&callbacks.onResult(over,state),400);
  }

  return { start, loadState, getState, initState };
})();
