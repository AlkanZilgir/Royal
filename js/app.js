// ============================================================
//  BOARD ROYAL — App Controller (Fixed online flow)
// ============================================================
(function () {

  const GAMES = {
    chess:     { name: 'Chess',             icon: '♟', engine: window.ChessGame     },
    morris:    { name: "Nine Men's Morris", icon: '◉', engine: window.MorrisGame    },
    checkers:  { name: 'Checkers',          icon: '⬤', engine: window.CheckersGame  },
    connect4:  { name: 'Connect Four',      icon: '⬡', engine: window.Connect4Game  },
    tictactoe: { name: 'Tic-Tac-Toe',      icon: '#',  engine: window.TicTacToeGame }
  };

  let currentGame = null;   // game key string
  let currentMode = null;   // 'local' | 'online'
  let myRole      = null;   // 'host' | 'guest'  (online only)
  let gameStarted = false;  // guard against double-start for host
  let gameLog     = [];
  let boardContainer = null;

  // ===================== UTILITIES =====================

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'slide-in');
    });
    const el = document.getElementById('screen-' + id);
    if (!el) return;
    el.classList.add('active', 'slide-in');
  }

  function friendlyAuthErr(code) {
    const m = {
      'auth/user-not-found':     'No account with that email.',
      'auth/wrong-password':     'Incorrect password.',
      'auth/email-already-in-use': 'Email already registered.',
      'auth/weak-password':      'Password must be at least 6 characters.',
      'auth/invalid-email':      'Invalid email address.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
      'auth/invalid-credential': 'Email or password is incorrect.',
    };
    return m[code] || 'Something went wrong. Please try again.';
  }

  // ===================== AUTH =====================

  function setupAuth() {
    // Tab switching
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
        // onAuthStateChanged will handle the redirect
      } catch (e) {
        err.textContent = friendlyAuthErr(e.code || '');
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
      } catch (e) {
        err.textContent = friendlyAuthErr(e.code || '');
      }
    });

    document.getElementById('btn-guest').addEventListener('click', () => {
      Auth.playAsGuest();
    });
  }

  // ===================== HOME =====================

  function setupHome() {
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

  function showHomeScreen() {
    document.getElementById('user-display-name').textContent = Auth.getUserName();
    showScreen('home');
  }

  // ===================== MODE SELECT =====================

  function setupMode() {
    document.getElementById('mode-back').addEventListener('click', () => showScreen('home'));

    // Local play
    document.getElementById('mode-local').querySelector('button').addEventListener('click', () => {
      currentMode = 'local';
      myRole = null;
      Online.leaveRoom();
      startLocalGame();
    });

    // Create online room
    document.getElementById('mode-online-create').querySelector('button').addEventListener('click', async () => {
      if (!window.FIREBASE_READY) {
        alert('Firebase is not configured yet.\nOnline play is unavailable until you add your Firebase credentials to js/firebase-config.js.');
        return;
      }
      const user = Auth.getUser();
      if (!user || user.isAnonymous) {
        alert('Please sign in with an account to play online.\nGuests can only play locally.');
        return;
      }
      try {
        currentMode = 'online';
        myRole = 'host';
        gameStarted = false;
        const engine      = GAMES[currentGame].engine;
        const initialState = engine.initState();
        const code        = await Online.createRoom(currentGame, initialState);
        showWaitingScreen(code);
      } catch (e) {
        alert('Could not create room:\n' + e.message);
        currentMode = null; myRole = null;
      }
    });

    // Join online room
    document.getElementById('btn-join-room').addEventListener('click', async () => {
      if (!window.FIREBASE_READY) {
        alert('Firebase is not configured yet.\nOnline play is unavailable until you add your Firebase credentials.');
        return;
      }
      const user = Auth.getUser();
      if (!user || user.isAnonymous) {
        alert('Please sign in with an account to play online.');
        return;
      }
      const code   = document.getElementById('room-code-input').value.trim().toUpperCase();
      const errEl  = document.getElementById('join-err');
      errEl.textContent = '';
      if (code.length !== 6) { errEl.textContent = 'Please enter the 6-character room code.'; return; }
      try {
        currentMode = 'online';
        myRole = 'guest';
        const room = await Online.joinRoom(code, currentGame);
        // Guest starts the game immediately with the room's current state
        startOnlineGame(room.state, 'guest', room.hostName || 'Opponent');
      } catch (e) {
        errEl.textContent = e.message;
        currentMode = null; myRole = null;
      }
    });
  }

  function showModeScreen() {
    const g = GAMES[currentGame];
    document.getElementById('mode-game-icon').textContent  = g.icon;
    document.getElementById('mode-game-title').textContent = g.name;
    document.getElementById('join-err').textContent        = '';
    document.getElementById('room-code-input').value       = '';
    showScreen('mode');
  }

  // ===================== WAITING ROOM =====================

  function setupWaiting() {
    document.getElementById('waiting-back').addEventListener('click', () => {
      Online.leaveRoom();
      currentMode = null; myRole = null;
      showScreen('mode');
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('room-code-show').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-copy-code');
        const orig = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = orig, 2000);
      }).catch(() => {
        // Fallback for older browsers
        prompt('Copy this code and send to your friend:', code);
      });
    });
  }

  function showWaitingScreen(code) {
    document.getElementById('room-code-show').textContent = code;
    showScreen('waiting');
    gameStarted = false;

    // Listen for guest to join
    Online.setListener(
      room => {
        if (room.status === 'playing' && !gameStarted) {
          gameStarted = true;
          // Move listener to game handler inside startOnlineGame
          startOnlineGame(room.state, 'host', room.guestName || 'Opponent');
        }
      },
      () => {
        alert('Room closed.');
        showScreen('mode');
      }
    );
  }

  // ===================== GAME — LOCAL =====================

  function startLocalGame() {
    gameLog = [];
    const g = GAMES[currentGame];
    document.getElementById('game-title-bar-name').textContent = g.name;
    document.getElementById('game-mode-badge').textContent     = 'Local';
    document.getElementById('player1-name').textContent        = 'Player 1';
    document.getElementById('player2-name').textContent        = 'Player 2';
    document.getElementById('captured-pieces-panel').style.display = currentGame === 'chess' ? '' : 'none';
    document.getElementById('game-log-list').innerHTML = '';

    boardContainer = document.getElementById('game-board-container');
    g.engine.start(boardContainer, null, buildCallbacks(), false);
    setPlayerActive(1);
    showScreen('game');
  }

  // ===================== GAME — ONLINE =====================

  function startOnlineGame(savedState, role, opponentName) {
    myRole = role;
    gameLog = [];
    const g = GAMES[currentGame];

    document.getElementById('game-title-bar-name').textContent = g.name;
    document.getElementById('game-mode-badge').textContent     = 'Online';
    document.getElementById('captured-pieces-panel').style.display = currentGame === 'chess' ? '' : 'none';
    document.getElementById('game-log-list').innerHTML = '';

    const myName = Auth.getUserName();
    if (role === 'host') {
      document.getElementById('player1-name').textContent = myName;
      document.getElementById('player2-name').textContent = opponentName;
    } else {
      document.getElementById('player1-name').textContent = opponentName;
      document.getElementById('player2-name').textContent = myName;
    }

    // Am I player 1 (host) or player 2 (guest)?
    // Host = Player 1 (white / first mover)
    // Guest = Player 2
    const isMyTurn = (role === 'host' && savedState.current === 1) ||
                     (role === 'guest' && savedState.current === 2);

    boardContainer = document.getElementById('game-board-container');
    g.engine.start(boardContainer, savedState, buildCallbacks(), !isMyTurn);
    setPlayerActive(savedState.current);
    showScreen('game');

    // Now replace the listener with the in-game one
    Online.setListener(
      room => {
        if (room.status === 'abandoned') {
          alert('Your opponent left the game.');
          Online.leaveRoom();
          showScreen('home');
          return;
        }
        if (room.status !== 'playing') return;

        const nowMyTurn = (myRole === 'host' && room.currentTurn === 'host') ||
                          (myRole === 'guest' && room.currentTurn === 'guest');
        g.engine.loadState(boardContainer, room.state, !nowMyTurn);
        setPlayerActive(room.state.current);
        addLog('Move received');
      },
      () => {
        alert('Connection lost. Your opponent may have left.');
        Online.leaveRoom();
        showScreen('home');
      }
    );
  }

  // ===================== CALLBACKS FOR ENGINE =====================

  function buildCallbacks() {
    return {
      onMove(newState, nextTurn) {
        addLog(nextTurn === 'host' ? 'P1 moved' : 'P2 moved');
        setPlayerActive(newState.current);
        if (currentMode === 'online') {
          Online.sendMove(newState, nextTurn);
        }
      },
      onResult(status, finalState) {
        showResult(status, finalState);
      },
      onStatusUpdate(s) {
        updateTurnDisplay(s);
      },
      onCapturedUpdate(captured) {
        if (currentGame !== 'chess') return;
        const sym = { 1:'♟',2:'♜',3:'♞',4:'♝',5:'♛' };
        document.getElementById('captured-white').innerHTML =
          (captured.w || []).map(p => `<span class="cap-piece cap-white">${sym[p]||''}</span>`).join('');
        document.getElementById('captured-black').innerHTML =
          (captured.b || []).map(p => `<span class="cap-piece cap-black">${sym[p]||''}</span>`).join('');
      }
    };
  }

  // ===================== GAME SCREEN CONTROLS =====================

  function setupGameScreen() {
    document.getElementById('game-back').addEventListener('click', () => {
      if (!confirm('Quit the current game?')) return;
      Online.leaveRoom();
      document.getElementById('result-modal').classList.add('hidden');
      currentMode = null; myRole = null;
      showScreen('home');
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
      if (currentMode === 'online') {
        if (!confirm('This will end the online game and restart locally. Continue?')) return;
        Online.leaveRoom();
        currentMode = 'local'; myRole = null;
      }
      document.getElementById('result-modal').classList.add('hidden');
      startLocalGame();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      if (currentMode === 'online') { Online.leaveRoom(); currentMode = 'local'; myRole = null; }
      startLocalGame();
    });

    document.getElementById('btn-back-home').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      Online.leaveRoom();
      currentMode = null; myRole = null;
      showScreen('home');
    });
  }

  // ===================== UI HELPERS =====================

  function setPlayerActive(currentPlayer) {
    document.getElementById('player1-indicator').classList.toggle('active-player', currentPlayer === 1);
    document.getElementById('player2-indicator').classList.toggle('active-player', currentPlayer === 2);
  }

  function updateTurnDisplay(s) {
    const el  = document.getElementById('turn-display');
    const who = s.current === 1 ? 'Player 1' : 'Player 2';

    if (currentMode === 'online') {
      const nowMyTurn = (myRole === 'host' && s.current === 1) ||
                        (myRole === 'guest' && s.current === 2);
      if (s.status === 'check')      el.textContent = `${who} is in Check!`;
      else if (s.status === 'checkmate') el.textContent = 'Checkmate!';
      else if (s.status === 'stalemate') el.textContent = 'Stalemate!';
      else if (s.pendingMill)            el.textContent = `${who}: Remove a piece`;
      else el.textContent = nowMyTurn ? 'Your Turn' : "Opponent's Turn…";
    } else {
      if (s.status === 'check')      el.textContent = `${who} is in Check!`;
      else if (s.status === 'checkmate') el.textContent = 'Checkmate!';
      else if (s.status === 'stalemate') el.textContent = 'Stalemate!';
      else if (s.pendingMill)            el.textContent = `${who}: Remove a piece`;
      else el.textContent = `${who}'s Turn`;
    }
  }

  function addLog(text) {
    const list  = document.getElementById('game-log-list');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `${++gameLog.length}. ${text}`;
    gameLog.push(text);
    list.appendChild(entry);
    list.scrollTop = list.scrollHeight;
  }

  function showResult(status, finalState) {
    const modal = document.getElementById('result-modal');
    const results = {
      checkmate: { icon:'♛', title:'Checkmate!',       msg: finalState.current===1?'Player 2 Wins!':'Player 1 Wins!' },
      stalemate: { icon:'🤝', title:'Stalemate!',       msg:'The game is a draw.' },
      p1wins:    { icon:'♛', title:'Player 1 Wins!',   msg:'Well played!' },
      p2wins:    { icon:'♛', title:'Player 2 Wins!',   msg:'Well played!' },
      draw:      { icon:'🤝', title:"It's a Draw!",     msg:'Evenly matched!' }
    };
    const r = results[status] || { icon:'♛', title:'Game Over', msg:'' };
    document.getElementById('result-icon').textContent  = r.icon;
    document.getElementById('result-title').textContent = r.title;
    document.getElementById('result-msg').textContent   = r.msg;
    modal.classList.remove('hidden');
  }

  // ===================== BOOTSTRAP =====================

  Auth.init(user => {
    setTimeout(() => {
      if (user) showHomeScreen();
      else showScreen('auth');
    }, 1100);
  });

  setupAuth();
  setupHome();
  setupMode();
  setupWaiting();
  setupGameScreen();

})();
