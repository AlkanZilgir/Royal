// ============================================================
//  BOARD ROYAL — Main App Controller
// ============================================================
(function() {

  // ---- Game Registry ----
  const GAMES = {
    chess:     { name:'Chess',          icon:'♟', engine: window.ChessGame,     logName:'chess' },
    morris:    { name:"Nine Men's Morris", icon:'◉', engine: window.MorrisGame, logName:'morris' },
    checkers:  { name:'Checkers',       icon:'⬤', engine: window.CheckersGame,  logName:'checkers' },
    connect4:  { name:'Connect Four',   icon:'⬡', engine: window.Connect4Game,  logName:'connect4' },
    tictactoe: { name:'Tic-Tac-Toe',   icon:'#',  engine: window.TicTacToeGame, logName:'tictactoe' }
  };

  // ---- App State ----
  let currentGame  = null; // game key
  let currentMode  = null; // 'local' | 'online'
  let onlineRole   = null; // 'host' | 'guest'
  let gameLog      = [];

  // ---- Screens ----
  function showScreen(id, animate=true) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active','slide-in'));
    const target = document.getElementById('screen-' + id);
    if (!target) return;
    target.classList.add('active');
    if (animate) target.classList.add('slide-in');
  }

  // ---- Auth Screen ----
  function setupAuthScreen() {
    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('auth-form-' + tab.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pass  = document.getElementById('login-pass').value;
      const err   = document.getElementById('login-err');
      err.textContent = '';
      if (!email || !pass) { err.textContent = 'Please fill in all fields.'; return; }
      try {
        await Auth.signIn(email, pass);
      } catch(e) {
        err.textContent = friendlyAuthError(e.code || e.message);
      }
    });

    document.getElementById('btn-signup').addEventListener('click', async () => {
      const name  = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pass  = document.getElementById('signup-pass').value;
      const err   = document.getElementById('signup-err');
      err.textContent = '';
      if (!name || !email || !pass) { err.textContent = 'Please fill in all fields.'; return; }
      try {
        await Auth.signUp(name, email, pass);
      } catch(e) {
        err.textContent = friendlyAuthError(e.code || e.message);
      }
    });

    document.getElementById('btn-guest').addEventListener('click', () => {
      Auth.playAsGuest();
      showHome();
    });
  }

  function friendlyAuthError(code) {
    const map = {
      'auth/user-not-found':'No account found with that email.',
      'auth/wrong-password':'Incorrect password.',
      'auth/email-already-in-use':'That email is already registered.',
      'auth/weak-password':'Password must be at least 6 characters.',
      'auth/invalid-email':'Please enter a valid email address.',
      'auth/too-many-requests':'Too many attempts. Try again later.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  // ---- Home Screen ----
  function showHome() {
    const user = Auth.getUser();
    document.getElementById('user-display-name').textContent = Auth.getUserName();
    showScreen('home');
  }

  function setupHomeScreen() {
    document.getElementById('btn-logout').addEventListener('click', async () => {
      Online.leaveRoom();
      await Auth.signOut();
      showScreen('auth');
    });
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        currentGame = card.dataset.game;
        showModeScreen();
      });
    });
  }

  // ---- Mode Screen ----
  function showModeScreen() {
    const g = GAMES[currentGame];
    document.getElementById('mode-game-icon').textContent  = g.icon;
    document.getElementById('mode-game-title').textContent = g.name;
    document.getElementById('join-err').textContent = '';
    document.getElementById('room-code-input').value = '';
    showScreen('mode');
  }

  function setupModeScreen() {
    document.getElementById('mode-back').addEventListener('click', () => showScreen('home'));

    document.getElementById('mode-local').querySelector('button').addEventListener('click', () => {
      currentMode = 'local'; onlineRole = null;
      Online.leaveRoom();
      startGame();
    });

    document.getElementById('mode-online-create').querySelector('button').addEventListener('click', async () => {
      if (!window.FIREBASE_READY) { alert('Firebase not configured. See README for setup instructions.'); return; }
      try {
        const engine = GAMES[currentGame].engine;
        const initState = engine.initState();
        const code = await Online.createRoom(currentGame, initState);
        currentMode = 'online'; onlineRole = 'host';
        showWaitingScreen(code);
      } catch(e) {
        alert(e.message);
      }
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
      if (!window.FIREBASE_READY) { alert('Firebase not configured. See README for setup instructions.'); return; }
      const code = document.getElementById('room-code-input').value.trim().toUpperCase();
      const errEl = document.getElementById('join-err');
      errEl.textContent = '';
      if (code.length !== 6) { errEl.textContent = 'Please enter a 6-character room code.'; return; }
      try {
        currentMode = 'online'; onlineRole = 'guest';
        const room = await Online.joinRoom(code, currentGame);
        // Directly start game with room state
        startOnlineGame(room.state, 'guest');
      } catch(e) {
        errEl.textContent = e.message;
        currentMode = null; onlineRole = null;
      }
    });
  }

  // ---- Waiting Screen ----
  function showWaitingScreen(code) {
    document.getElementById('room-code-show').textContent = code;
    showScreen('waiting');
    Online.setCallbacks(
      (roomState, currentTurn, room) => {
        // Guest joined, start game
        if (room.status === 'playing') {
          startOnlineGame(roomState, 'host');
        }
      },
      () => { alert('Room closed.'); showScreen('home'); }
    );
  }

  function setupWaitingScreen() {
    document.getElementById('waiting-back').addEventListener('click', () => {
      Online.leaveRoom();
      showScreen('mode');
    });
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('room-code-show').textContent;
      navigator.clipboard.writeText(code).then(()=>{
        const btn = document.getElementById('btn-copy-code');
        btn.textContent = 'Copied!';
        setTimeout(()=>btn.textContent='Copy Code', 2000);
      });
    });
  }

  // ---- Game Screen ----
  function startGame() {
    gameLog = [];
    const g = GAMES[currentGame];
    document.getElementById('game-title-bar-name').textContent = g.name;
    document.getElementById('game-mode-badge').textContent = currentMode === 'local' ? 'Local' : 'Online';

    const p1Name = currentMode==='online' ? Auth.getUserName() : 'Player 1';
    const p2Name = currentMode==='local' ? 'Player 2' : 'Opponent';
    document.getElementById('player1-name').textContent = p1Name;
    document.getElementById('player2-name').textContent = p2Name;

    document.getElementById('captured-pieces-panel').style.display = currentGame==='chess' ? '' : 'none';
    document.getElementById('game-log-list').innerHTML = '';

    const cont = document.getElementById('game-board-container');
    const cbs  = buildCallbacks(cont);

    g.engine.start(cont, null, cbs, false);
    updatePlayerIndicators(1);
    showScreen('game');
  }

  function startOnlineGame(savedState, myRole) {
    gameLog = [];
    const g = GAMES[currentGame];
    document.getElementById('game-title-bar-name').textContent = g.name;
    document.getElementById('game-mode-badge').textContent = 'Online';
    document.getElementById('captured-pieces-panel').style.display = currentGame==='chess' ? '' : 'none';
    document.getElementById('game-log-list').innerHTML = '';

    const myName = Auth.getUserName();
    if (myRole === 'host') {
      document.getElementById('player1-name').textContent = myName;
      document.getElementById('player2-name').textContent = 'Opponent';
    } else {
      document.getElementById('player1-name').textContent = 'Opponent';
      document.getElementById('player2-name').textContent = myName;
    }

    const isMyTurn = (myRole==='host' && savedState.current===1) || (myRole==='guest' && savedState.current===2);
    const cont = document.getElementById('game-board-container');
    const cbs  = buildCallbacks(cont);

    g.engine.start(cont, savedState, cbs, !isMyTurn);
    updatePlayerIndicators(savedState.current);
    showScreen('game');

    // Set up live listener
    Online.setCallbacks(
      (newState, currentTurn) => {
        const myTurnNow = (myRole==='host'&&currentTurn==='host')||(myRole==='guest'&&currentTurn==='guest');
        g.engine.loadState(cont, newState, !myTurnNow);
        updatePlayerIndicators(newState.current);
        addLogEntry(`Move received`);
      },
      () => {
        alert('Your opponent left the game.');
        Online.leaveRoom();
        showScreen('home');
      }
    );
  }

  function buildCallbacks(cont) {
    return {
      onMove(newState, nextTurn) {
        addLogEntry(getMoveDescription(newState));
        updatePlayerIndicators(newState.current);
        if (currentMode === 'online') Online.sendMove(newState, nextTurn);
      },
      onResult(status, finalState) {
        showResult(status, finalState);
      },
      onStatusUpdate(s) {
        updateTurnDisplay(s);
      },
      onCapturedUpdate(captured) {
        if (currentGame !== 'chess') return;
        const pieceSyms = { 1:'♟',2:'♜',3:'♞',4:'♝',5:'♛' };
        document.getElementById('captured-white').innerHTML =
          '<div class="captured-row">' + (captured.w||[]).map(p=>pieceSyms[p]||'').join('') + '</div>';
        document.getElementById('captured-black').innerHTML =
          '<div class="captured-row">' + (captured.b||[]).map(p=>pieceSyms[p]||'').join('') + '</div>';
      }
    };
  }

  function updatePlayerIndicators(currentPlayer) {
    const p1 = document.getElementById('player1-indicator');
    const p2 = document.getElementById('player2-indicator');
    p1.classList.toggle('active-player', currentPlayer===1);
    p2.classList.toggle('active-player', currentPlayer===2);
  }

  function updateTurnDisplay(state) {
    const el = document.getElementById('turn-display');
    if (!state) return;
    const status = state.status;
    const p = state.current===1?'Player 1':'Player 2';
    if (status==='check') el.textContent = `${p} is in Check!`;
    else if (status==='checkmate') el.textContent = 'Checkmate!';
    else if (status==='stalemate') el.textContent = 'Stalemate!';
    else if (state.pendingMill) el.textContent = `${p}: Remove a piece`;
    else el.textContent = `${p}'s Turn`;

    if (currentMode==='online') {
      const myRole = Online.getRole() || onlineRole;
      const isMyTurn = (myRole==='host'&&state.current===1)||(myRole==='guest'&&state.current===2);
      if (!isMyTurn) el.textContent = "Opponent's Turn…";
    }
  }

  function getMoveDescription(state) {
    const player = state.current===1?'P2':'P1'; // current switched already
    return `${player} moved`;
  }

  function addLogEntry(text) {
    const list = document.getElementById('game-log-list');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `${gameLog.length+1}. ${text}`;
    gameLog.push(text);
    list.appendChild(entry);
    list.scrollTop = list.scrollHeight;
  }

  function showResult(status, finalState) {
    document.getElementById('result-modal').classList.remove('hidden');
    const icon  = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const msg   = document.getElementById('result-msg');

    const statusMap = {
      'checkmate': { icon:'♛', title:'Checkmate!', msg: finalState.current===1?'Player 2 wins!':'Player 1 wins!' },
      'stalemate': { icon:'🤝', title:'Stalemate!', msg:'The game is a draw.' },
      'p1wins':    { icon:'♛', title:'Player 1 Wins!', msg:'Congratulations!' },
      'p2wins':    { icon:'♛', title:'Player 2 Wins!', msg:'Congratulations!' },
      'draw':      { icon:'🤝', title:'It\'s a Draw!', msg:'Well played by both sides.' }
    };
    const result = statusMap[status] || { icon:'♛', title:'Game Over', msg:'' };
    icon.textContent  = result.icon;
    title.textContent = result.title;
    msg.textContent   = result.msg;
  }

  function setupGameScreen() {
    document.getElementById('game-back').addEventListener('click', () => {
      if (confirm('Quit the current game?')) {
        Online.leaveRoom();
        document.getElementById('result-modal').classList.add('hidden');
        showScreen('home');
      }
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      if (currentMode === 'online') {
        if (confirm('This will end the online game. Play locally instead?')) {
          Online.leaveRoom();
          currentMode = 'local';
        } else return;
      }
      startGame();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      if (currentMode === 'online') {
        Online.leaveRoom();
        currentMode = 'local';
      }
      startGame();
    });

    document.getElementById('btn-back-home').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      Online.leaveRoom();
      showScreen('home');
    });
  }

  // ---- Bootstrap ----
  Auth.init(user => {
    setTimeout(() => {
      if (user) {
        showHome();
      } else {
        showScreen('auth');
      }
    }, 1200); // let loading animation finish
  });

  setupAuthScreen();
  setupHomeScreen();
  setupModeScreen();
  setupWaitingScreen();
  setupGameScreen();

})();
