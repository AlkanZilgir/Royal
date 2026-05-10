// ============================================================
//  BOARD ROYAL — Nine Men's Morris Engine + SVG Renderer
//  Phases: 1=Placement, 2=Movement, 3=Flying(3 pieces left)
//  Points 0-23 arranged in 3 concentric squares
// ============================================================
window.MorrisGame = (() => {
  /* Point layout - 3 concentric squares, 8 points each
     Outer:  0  1  2  3  4  5  6  7
     Middle: 8  9  10 11 12 13 14 15
     Inner: 16 17 18 19 20 21 22 23  */

  // SVG coordinates for each point (in a 460x460 space, center 230,230)
  const COORDS = [
    [20,20],[230,20],[440,20],[440,230],[440,440],[230,440],[20,440],[20,230],  // outer
    [80,80],[230,80],[380,80],[380,230],[380,380],[230,380],[80,380],[80,230],  // middle
    [140,140],[230,140],[320,140],[320,230],[320,320],[230,320],[140,320],[140,230] // inner
  ];

  // Mills: all possible lines of 3 that form a mill
  const MILLS = [
    [0,1,2],[2,3,4],[4,5,6],[6,7,0],        // outer
    [8,9,10],[10,11,12],[12,13,14],[14,15,8],// middle
    [16,17,18],[18,19,20],[20,21,22],[22,23,16],// inner
    [1,9,17],[3,11,19],[5,13,21],[7,15,23]  // spokes
  ];

  // Adjacency for movement phase
  const ADJACENT = {
    0:[1,7],1:[0,2,9],2:[1,3],3:[2,4,11],4:[3,5],5:[4,6,13],6:[5,7],7:[6,0,15],
    8:[9,15],9:[8,10,17],10:[9,11],11:[10,12,19],12:[11,13],13:[12,14,21],14:[13,15],15:[14,8,23],
    16:[17,23],17:[16,18],18:[17,19],19:[18,20],20:[19,21],21:[20,22],22:[21,23],23:[22,16]
  };

  let state = {}, callbacks = {}, isOnlineTurn = false;
  let container = null;

  function initState() {
    return {
      board: new Array(24).fill(0), // 0=empty, 1=p1, 2=p2
      current: 1,
      phase: [1, 1],     // phase[0] for p1, phase[1] for p2
      placed: [0, 0],    // pieces placed
      removed: [0, 0],   // pieces removed from opponent
      total: 9,          // pieces per player
      pendingMill: false, // player must remove opponent piece
      selected: null,    // point index for move phase
      status: 'playing'
    };
  }

  function countPieces(board, player) {
    return board.filter(v => v === player).length;
  }

  function checkMill(board, point, player) {
    return MILLS.some(mill => mill.includes(point) && mill.every(p => board[p] === player));
  }

  function hasAdjacentEmpty(board, point) {
    return ADJACENT[point].some(n => board[n] === 0);
  }

  function canMove(s, player) {
    const phase = s.phase[player - 1];
    if (phase === 3) return true; // flying — any empty
    const points = s.board.map((v, i) => v === player ? i : -1).filter(i => i >= 0);
    return points.some(p => ADJACENT[p].some(n => s.board[n] === 0));
  }

  function getValidTargets(s, from) {
    const player = s.current;
    const phase = s.phase[player - 1];
    if (phase === 3) return s.board.map((v,i) => v===0 ? i : -1).filter(i=>i>=0);
    return ADJACENT[from].filter(n => s.board[n] === 0);
  }

  function checkGameOver(s) {
    if (s.placed[0] >= s.total && s.placed[1] >= s.total) {
      for (const player of [1, 2]) {
        const pieces = countPieces(s.board, player);
        if (pieces < 3) return player === 1 ? 'p2wins' : 'p1wins';
        if (!canMove(s, player)) return player === 1 ? 'p2wins' : 'p1wins';
      }
    }
    return null;
  }

  // ---- Public API ----
  function start(cont, savedState, cbs, onlineTurn) {
    container = cont;
    callbacks = cbs || {};
    isOnlineTurn = onlineTurn || false;
    state = savedState ? JSON.parse(JSON.stringify(savedState)) : initState();
    render();
  }

  function loadState(cont, newState, onlineTurn) {
    container = cont;
    state = JSON.parse(JSON.stringify(newState));
    isOnlineTurn = onlineTurn;
    render();
    const over = checkGameOver(state);
    if (over) setTimeout(() => callbacks.onResult && callbacks.onResult(over, state), 300);
  }

  function getState() { return JSON.parse(JSON.stringify(state)); }

  function render() {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'morris-board-wrap';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 460 460');

    // Board lines
    const lines = [
      // squares
      [0,1,2,3,4,5,6,7,0],[8,9,10,11,12,13,14,15,8],[16,17,18,19,20,21,22,23,16],
      // spokes
      [1,9],[3,11],[5,13],[7,15],[9,17],[11,19],[13,21],[15,23]
    ];
    lines.forEach(pts => {
      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS(ns, 'line');
        const [x1,y1]=COORDS[pts[i]], [x2,y2]=COORDS[pts[i+1]];
        line.setAttribute('x1',x1);line.setAttribute('y1',y1);
        line.setAttribute('x2',x2);line.setAttribute('y2',y2);
        line.setAttribute('stroke','#5a4420');line.setAttribute('stroke-width','3');
        svg.appendChild(line);
      }
    });

    // Points
    COORDS.forEach(([x,y], i) => {
      const g = document.createElementNS(ns, 'g');
      g.classList.add('morris-point');
      g.dataset.idx = i;

      const player = state.board[i];
      const isSelected = state.selected === i;
      const isValidTarget = state.selected !== null && getValidTargets(state, state.selected).includes(i);
      const isRemovable = state.pendingMill && player !== 0 && player !== state.current;

      // Outer ring / highlight
      const outer = document.createElementNS(ns, 'circle');
      outer.setAttribute('cx',x); outer.setAttribute('cy',y); outer.setAttribute('r','22');
      outer.setAttribute('fill', isSelected ? 'rgba(200,169,81,.5)' : isValidTarget ? 'rgba(200,169,81,.25)' : isRemovable ? 'rgba(139,26,26,.4)' : 'transparent');
      svg.appendChild(outer);

      // Main circle
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx',x); circle.setAttribute('cy',y); circle.setAttribute('r','16');
      if (player === 1) {
        circle.setAttribute('fill','#f5f0e8');
        circle.setAttribute('stroke','#c8a951');
        circle.setAttribute('stroke-width','2');
      } else if (player === 2) {
        circle.setAttribute('fill','#1a0e05');
        circle.setAttribute('stroke','#5a4420');
        circle.setAttribute('stroke-width','2');
      } else {
        circle.setAttribute('fill','#2a1c0e');
        circle.setAttribute('stroke','#5a4420');
        circle.setAttribute('stroke-width','1.5');
      }
      g.appendChild(outer);
      g.appendChild(circle);

      // Hover area
      const hit = document.createElementNS(ns, 'circle');
      hit.setAttribute('cx',x); hit.setAttribute('cy',y); hit.setAttribute('r','22');
      hit.setAttribute('fill','transparent');
      g.appendChild(hit);

      g.addEventListener('click', () => handleClick(i));
      svg.appendChild(g);
    });

    // Phase indicator badge
    const phaseInfo = document.createElementNS(ns, 'text');
    let phaseText = '';
    if (state.pendingMill) phaseText = `P${state.current}: Remove opponent piece`;
    else if (state.phase[state.current-1] === 1) phaseText = `P${state.current}: Place piece (${state.total - state.placed[state.current-1]} left)`;
    else phaseText = `P${state.current}: Move a piece`;
    phaseInfo.setAttribute('x','230');phaseInfo.setAttribute('y','452');
    phaseInfo.setAttribute('text-anchor','middle');
    phaseInfo.setAttribute('fill','#7a6330');phaseInfo.setAttribute('font-size','13');
    phaseInfo.textContent = phaseText;
    svg.appendChild(phaseInfo);

    wrap.appendChild(svg);
    container.appendChild(wrap);
    if (callbacks.onStatusUpdate) callbacks.onStatusUpdate(state);
  }

  function handleClick(idx) {
    if (isOnlineTurn) return;
    if (state.status !== 'playing') return;
    const player = state.current;
    const phase = state.phase[player - 1];

    // Remove phase (after mill)
    if (state.pendingMill) {
      if (state.board[idx] !== 0 && state.board[idx] !== player) {
        // Can't remove a piece that's in a mill unless all enemy pieces are in mills
        const opponent = 3 - player;
        const opPieces = state.board.map((v,i) => v===opponent ? i : -1).filter(i=>i>=0);
        const allInMill = opPieces.every(p => checkMill(state.board, p, opponent));
        if (!allInMill && checkMill(state.board, idx, opponent)) return; // skip
        state.board[idx] = 0;
        state.removed[player - 1]++;
        state.pendingMill = false;
        state.selected = null;
        finishTurn();
      }
      return;
    }

    // Phase 1: Placement
    if (phase === 1) {
      if (state.board[idx] !== 0) return;
      state.board[idx] = player;
      state.placed[player - 1]++;
      if (state.placed[player - 1] >= state.total) state.phase[player - 1] = 2;
      if (checkMill(state.board, idx, player)) {
        state.pendingMill = true;
        render();
        return;
      }
      finishTurn();
      return;
    }

    // Phase 2/3: Movement
    if (state.selected === null) {
      if (state.board[idx] === player) { state.selected = idx; render(); }
      return;
    }
    // Clicking same piece — deselect
    if (state.selected === idx) { state.selected = null; render(); return; }
    // Clicking another own piece — re-select
    if (state.board[idx] === player) { state.selected = idx; render(); return; }
    // Attempt move
    const targets = getValidTargets(state, state.selected);
    if (!targets.includes(idx)) { state.selected = null; render(); return; }
    state.board[idx] = player;
    state.board[state.selected] = 0;
    // Check flying
    if (countPieces(state.board, player) === 3) state.phase[player-1] = 3;
    state.selected = null;
    if (checkMill(state.board, idx, player)) {
      state.pendingMill = true;
      render();
      return;
    }
    finishTurn();
  }

  function finishTurn() {
    state.current = 3 - state.current;
    const over = checkGameOver(state);
    if (over) { state.status = over; }
    render();
    if (callbacks.onMove) callbacks.onMove(getState(), state.current===1?'host':'guest');
    if (over) setTimeout(() => callbacks.onResult && callbacks.onResult(over, state), 400);
  }

  function initStateExport() { return initState(); }

  return { start, loadState, getState, initState: initStateExport };
})();
