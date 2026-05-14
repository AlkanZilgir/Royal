window.MorrisGame = (() => {
  const C=[[20,20],[230,20],[440,20],[440,230],[440,440],[230,440],[20,440],[20,230],[80,80],[230,80],[380,80],[380,230],[380,380],[230,380],[80,380],[80,230],[140,140],[230,140],[320,140],[320,230],[320,320],[230,320],[140,320],[140,230]];
  const MILLS=[[0,1,2],[2,3,4],[4,5,6],[6,7,0],[8,9,10],[10,11,12],[12,13,14],[14,15,8],[16,17,18],[18,19,20],[20,21,22],[22,23,16],[1,9,17],[3,11,19],[5,13,21],[7,15,23]];
  const ADJ={0:[1,7],1:[0,2,9],2:[1,3],3:[2,4,11],4:[3,5],5:[4,6,13],6:[5,7],7:[6,0,15],8:[9,15],9:[8,10,17],10:[9,11],11:[10,12,19],12:[11,13],13:[12,14,21],14:[13,15],15:[14,8,23],16:[17,23],17:[16,18],18:[17,19],19:[18,20],20:[19,21],21:[20,22],22:[21,23],23:[22,16]};
  let S={},CB={},OT=false,CONT=null;
  function initState(){return{board:new Array(24).fill(0),cur:1,phase:[1,1],placed:[0,0],total:9,mill:false,sel:null,status:'playing'};}
  function count(b,p){return b.filter(v=>v===p).length;}
  function isMill(b,i,p){return MILLS.some(m=>m.includes(i)&&m.every(x=>b[x]===p));}
  function targets(s,from){if(s.phase[s.cur-1]===3)return s.board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);return ADJ[from].filter(n=>s.board[n]===0);}
  function canMove(s,p){if(s.phase[p-1]===3)return true;return s.board.map((v,i)=>v===p?i:-1).filter(i=>i>=0).some(pt=>ADJ[pt].some(n=>s.board[n]===0));}
  function over(s){if(s.placed[0]>=s.total&&s.placed[1]>=s.total){for(const p of[1,2]){if(count(s.board,p)<3)return p===1?'p2wins':'p1wins';if(!canMove(s,p))return p===1?'p2wins':'p1wins';}}return null;}

  function start(cont,saved,cbs,ot){CONT=cont;CB=cbs||{};OT=!!ot;S=saved?JSON.parse(JSON.stringify(saved)):initState();render();}
  function loadState(cont,ns,ot){CONT=cont;S=JSON.parse(JSON.stringify(ns));OT=!!ot;render();const o=over(S);if(o)setTimeout(()=>CB.onResult&&CB.onResult(o,S),300);}
  function getState(){return JSON.parse(JSON.stringify(S));}

  function render(){
    CONT.innerHTML='';
    const wrap=document.createElement('div');wrap.className='morris-wrap';
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 460 460');
    const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','460');bg.setAttribute('height','460');bg.setAttribute('fill','#0d1525');svg.appendChild(bg);
    // Lines
    [[0,1,2,3,4,5,6,7,0],[8,9,10,11,12,13,14,15,8],[16,17,18,19,20,21,22,23,16],[1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23]].forEach(pts=>{
      for(let i=0;i<pts.length-1;i++){const l=document.createElementNS(ns,'line');const[x1,y1]=C[pts[i]],[x2,y2]=C[pts[i+1]];l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);l.setAttribute('stroke','#3a5a9a');l.setAttribute('stroke-width','3');svg.appendChild(l);}
    });
    // Points
    C.forEach(([x,y],i)=>{
      const g=document.createElementNS(ns,'g');g.style.cursor='pointer';
      const pl=S.board[i],isSel=S.sel===i,isRem=S.mill&&pl!==0&&pl!==S.cur;
      if(isSel||isRem){const ring=document.createElementNS(ns,'circle');ring.setAttribute('cx',x);ring.setAttribute('cy',y);ring.setAttribute('r','26');ring.setAttribute('fill',isSel?'rgba(99,102,241,.45)':'rgba(239,68,68,.35)');svg.appendChild(ring);}
      const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r','18');
      if(pl===1){circle.setAttribute('fill','#f0f0ff');circle.setAttribute('stroke','#818cf8');circle.setAttribute('stroke-width','3');}
      else if(pl===2){circle.setAttribute('fill','#7f1d1d');circle.setAttribute('stroke','#f87171');circle.setAttribute('stroke-width','3');}
      else{circle.setAttribute('fill','#1a2744');circle.setAttribute('stroke','#3a5a9a');circle.setAttribute('stroke-width','2');}
      const hit=document.createElementNS(ns,'circle');hit.setAttribute('cx',x);hit.setAttribute('cy',y);hit.setAttribute('r','26');hit.setAttribute('fill','transparent');
      g.appendChild(circle);g.appendChild(hit);g.addEventListener('click',()=>onClick(i));svg.appendChild(g);
    });
    // Status text
    let msg=S.mill?`P${S.cur}: tap opponent piece to remove`:S.phase[S.cur-1]===1?`P${S.cur}: place piece (${S.total-S.placed[S.cur-1]} left)`:`P${S.cur}: move a piece`;
    const txt=document.createElementNS(ns,'text');txt.setAttribute('x','230');txt.setAttribute('y','453');txt.setAttribute('text-anchor','middle');txt.setAttribute('fill','#64748b');txt.setAttribute('font-size','14');txt.setAttribute('font-family','Outfit,sans-serif');txt.textContent=msg;svg.appendChild(txt);
    wrap.appendChild(svg);CONT.appendChild(wrap);
    if(CB.onStatusUpdate)CB.onStatusUpdate(S);
  }

  function onClick(i){
    if(OT||S.status!=='playing')return;
    const pl=S.cur;
    if(S.mill){
      if(S.board[i]===0||S.board[i]===pl)return;
      const opp=3-pl,ops=S.board.map((v,j)=>v===opp?j:-1).filter(j=>j>=0);
      if(ops.every(p=>isMill(S.board,p,opp))===false&&isMill(S.board,i,opp))return;
      S.board[i]=0;S.mill=false;S.sel=null;finish();return;
    }
    if(S.phase[pl-1]===1){
      if(S.board[i]!==0)return;
      S.board[i]=pl;S.placed[pl-1]++;
      if(S.placed[pl-1]>=S.total)S.phase[pl-1]=2;
      if(isMill(S.board,i,pl)){S.mill=true;render();return;}
      finish();return;
    }
    if(S.sel===null){if(S.board[i]===pl){S.sel=i;render();}return;}
    if(S.sel===i){S.sel=null;render();return;}
    if(S.board[i]===pl){S.sel=i;render();return;}
    const t=targets(S,S.sel);if(!t.includes(i)){S.sel=null;render();return;}
    S.board[i]=pl;S.board[S.sel]=0;if(count(S.board,pl)===3)S.phase[pl-1]=3;
    S.sel=null;if(isMill(S.board,i,pl)){S.mill=true;render();return;}
    finish();
  }
  function finish(){S.cur=3-S.cur;const o=over(S);if(o)S.status=o;render();if(CB.onMove)CB.onMove(getState(),S.cur===1?'host':'guest');if(o)setTimeout(()=>CB.onResult&&CB.onResult(o,S),400);}
  return{start,loadState,getState,initState};
})();
