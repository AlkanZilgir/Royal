// Board Royal — App Controller
(function(){
  const GAMES={
    chess:    {name:'Chess',         icon:'♟',engine:window.ChessGame},
    morris:   {name:"Nine Men's Morris",icon:'◉',engine:window.MorrisGame},
    checkers: {name:'Checkers',      icon:'⬤',engine:window.CheckersGame},
    connect4: {name:'Connect Four',  icon:'⬡',engine:window.Connect4Game},
    tictactoe:{name:'Tic-Tac-Toe',  icon:'#', engine:window.TicTacToeGame}
  };

  let game=null, mode=null, role=null, started=false;

  // ---- helpers ----
  function el(id){return document.getElementById(id);}
  function show(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','fade'));
    const s=el('screen-'+id);
    if(s){s.classList.add('active','fade');}
  }
  function errMsg(code){
    return({'auth/user-not-found':'No account with that email.','auth/wrong-password':'Wrong password.','auth/email-already-in-use':'Email already registered.','auth/weak-password':'Password needs 6+ characters.','auth/invalid-email':'Invalid email.','auth/too-many-requests':'Too many attempts, try later.','auth/invalid-credential':'Email or password incorrect.'})[code]||'Something went wrong, try again.';
  }

  // ---- AUTH ----
  el('btn-login').addEventListener('click',async()=>{
    const email=el('login-email').value.trim(),pass=el('login-pass').value,err=el('login-err');
    err.textContent='';
    if(!email||!pass){err.textContent='Fill in all fields.';return;}
    try{await Auth.signIn(email,pass);}catch(e){err.textContent=errMsg(e.code);}
  });
  el('btn-signup').addEventListener('click',async()=>{
    const name=el('signup-name').value.trim(),email=el('signup-email').value.trim(),pass=el('signup-pass').value,err=el('signup-err');
    err.textContent='';
    if(!name||!email||!pass){err.textContent='Fill in all fields.';return;}
    try{await Auth.signUp(name,email,pass);}catch(e){err.textContent=errMsg(e.code);}
  });
  el('btn-guest').addEventListener('click',()=>Auth.playAsGuest());
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    el('auth-form-'+t.dataset.tab).classList.add('active');
  }));

  // ---- HOME ----
  el('btn-logout').addEventListener('click',async()=>{Online.leaveRoom();await Auth.signOut();show('auth');});
  document.querySelectorAll('.game-card').forEach(card=>{
    card.addEventListener('click',()=>{
      game=card.dataset.game;
      el('mode-icon').textContent=GAMES[game].icon;
      el('mode-title').textContent=GAMES[game].name;
      el('join-err').textContent='';
      el('room-code-input').value='';
      show('mode');
    });
  });

  // ---- MODE ----
  el('mode-back').addEventListener('click',()=>show('home'));

  el('btn-local').addEventListener('click',()=>{
    mode='local';role=null;Online.leaveRoom();startGame();
  });

  el('btn-create').addEventListener('click',async()=>{
    if(!window.FIREBASE_READY){alert('Firebase not configured — online play unavailable.');return;}
    const u=Auth.getUser();
    if(!u||u.isAnonymous){alert('Sign in with an account to play online.');return;}
    try{
      mode='online';role='host';started=false;
      const init=GAMES[game].engine.initState();
      const code=await Online.createRoom(game,init);
      el('room-code-show').textContent=code;
      show('waiting');
      Online.setListener(room=>{
        if(room.status==='playing'&&!started){started=true;startOnlineGame(room.state,'host',room.guestName||'Opponent');}
      },()=>{alert('Room closed.');show('mode');});
    }catch(e){alert('Could not create room: '+e.message);mode=null;role=null;}
  });

  el('btn-copy').addEventListener('click',()=>{
    const code=el('room-code-show').textContent;
    navigator.clipboard.writeText(code).then(()=>{
      const b=el('btn-copy'),o=b.textContent;b.textContent='✅ Copied!';setTimeout(()=>b.textContent=o,2000);
    }).catch(()=>prompt('Share this code:',code));
  });

  el('waiting-back').addEventListener('click',()=>{Online.leaveRoom();mode=null;role=null;show('mode');});

  el('btn-join').addEventListener('click',async()=>{
    if(!window.FIREBASE_READY){alert('Firebase not configured — online play unavailable.');return;}
    const u=Auth.getUser();
    if(!u||u.isAnonymous){alert('Sign in with an account to play online.');return;}
    const code=el('room-code-input').value.trim().toUpperCase();
    const err=el('join-err');err.textContent='';
    if(code.length!==6){err.textContent='Enter the 6-character room code.';return;}
    try{
      mode='online';role='guest';
      const room=await Online.joinRoom(code,game);
      startOnlineGame(room.state,'guest',room.hostName||'Opponent');
    }catch(e){err.textContent=e.message;mode=null;role=null;}
  });

  // ---- GAME SCREEN BUTTONS ----
  el('btn-quit').addEventListener('click',()=>{
    if(!confirm('Quit the current game?'))return;
    Online.leaveRoom();el('result-modal').classList.add('hidden');mode=null;role=null;show('home');
  });
  el('btn-restart').addEventListener('click',()=>{
    if(mode==='online'){if(!confirm('End online game and restart locally?'))return;Online.leaveRoom();mode='local';role=null;}
    el('result-modal').classList.add('hidden');startGame();
  });
  el('btn-again').addEventListener('click',()=>{
    el('result-modal').classList.add('hidden');
    if(mode==='online'){Online.leaveRoom();mode='local';role=null;}
    startGame();
  });
  el('btn-home').addEventListener('click',()=>{
    el('result-modal').classList.add('hidden');Online.leaveRoom();mode=null;role=null;show('home');
  });

  // ---- START LOCAL GAME ----
  function startGame(){
    const g=GAMES[game];
    el('game-name').textContent=g.name;
    el('game-badge').textContent='Local';
    el('p1-name').textContent='Player 1';
    el('p2-name').textContent='Player 2';
    el('result-modal').classList.add('hidden');
    const board=el('board');
    g.engine.start(board,null,callbacks(),false);
    setActive(1);
    show('game');
  }

  // ---- START ONLINE GAME ----
  function startOnlineGame(state,myRole,oppName){
    role=myRole;
    const g=GAMES[game];
    el('game-name').textContent=g.name;
    el('game-badge').textContent='Online';
    el('result-modal').classList.add('hidden');
    if(myRole==='host'){el('p1-name').textContent=Auth.getUserName();el('p2-name').textContent=oppName;}
    else{el('p1-name').textContent=oppName;el('p2-name').textContent=Auth.getUserName();}
    const myTurn=(myRole==='host'&&state.cur===1)||(myRole==='guest'&&state.cur===2)
               ||(myRole==='host'&&state.current===1)||(myRole==='guest'&&state.current===2);
    const board=el('board');
    g.engine.start(board,state,callbacks(),!myTurn);
    setActive(state.cur||state.current||1);
    show('game');
    Online.setListener(room=>{
      if(room.status==='abandoned'){alert('Opponent left.');Online.leaveRoom();show('home');return;}
      if(room.status!=='playing')return;
      const nowMine=(role==='host'&&room.currentTurn==='host')||(role==='guest'&&room.currentTurn==='guest');
      g.engine.loadState(board,room.state,!nowMine);
      setActive(room.state.cur||room.state.current||1);
    },()=>{alert('Connection lost.');Online.leaveRoom();show('home');});
  }

  // ---- CALLBACKS ----
  function callbacks(){
    return{
      onMove(ns,nextTurn){
        setActive(ns.cur||ns.current||1);
        if(mode==='online')Online.sendMove(ns,nextTurn);
      },
      onResult(status,fs){showResult(status,fs);},
      onStatusUpdate(s){updateTurn(s);}
    };
  }

  function setActive(cur){
    el('p1-pill').classList.toggle('active',cur===1);
    el('p2-pill').classList.toggle('active',cur===2);
  }

  function updateTurn(s){
    const cur=s.cur||s.current||1;
    const who='Player '+(cur===1?'1':'2');
    const txt=el('turn-txt');
    if(s.status==='checkmate'){txt.textContent='Checkmate!';return;}
    if(s.status==='stalemate'){txt.textContent='Stalemate — Draw';return;}
    if(s.mill||s.pendingMill){txt.textContent=who+': remove a piece';return;}
    if(mode==='online'){
      const mine=(role==='host'&&cur===1)||(role==='guest'&&cur===2);
      txt.textContent=s.status==='check'?(mine?'⚠ You are in Check!':'⚠ Opponent in Check!'):mine?'Your Turn':"Opponent's Turn…";
    }else{
      txt.textContent=s.status==='check'?'⚠ '+who+' in Check!':who+"'s Turn";
    }
  }

  function showResult(status,fs){
    const cur=fs&&(fs.cur||fs.current)||1;
    const map={
      checkmate:{icon:'♛',title:'Checkmate!',msg:cur===1?'Player 2 Wins!':'Player 1 Wins!'},
      stalemate:{icon:'🤝',title:'Stalemate!',msg:'The game is a draw.'},
      p1wins:   {icon:'🏆',title:'Player 1 Wins!',msg:'Well played!'},
      p2wins:   {icon:'🏆',title:'Player 2 Wins!',msg:'Well played!'},
      draw:     {icon:'🤝',title:"It's a Draw!",msg:'Evenly matched!'}
    };
    const r=map[status]||{icon:'♛',title:'Game Over',msg:''};
    el('result-icon').textContent=r.icon;
    el('result-title').textContent=r.title;
    el('result-msg').textContent=r.msg;
    el('result-modal').classList.remove('hidden');
  }

  // ---- BOOT ----
  Auth.init(user=>{
    setTimeout(()=>{
      if(user){el('user-name').textContent=Auth.getUserName();show('home');}
      else show('auth');
    },1000);
  });

})();
