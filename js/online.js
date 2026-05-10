// ============================================================
//  BOARD ROYAL — Online Room Manager
// ============================================================
window.Online = (() => {
  let roomRef = null;
  let myRole = null; // 'host' | 'guest'
  let onStateUpdate = null;
  let onOpponentLeft = null;

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async function createRoom(gameKey, initialState) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured. Set up firebase-config.js to play online.');
    const code = generateCode();
    const user = Auth.getUser();
    const ref = fbDB.ref(`rooms/${code}`);
    await ref.set({
      game: gameKey,
      host: { uid: user.uid, name: Auth.getUserName() },
      guest: null,
      status: 'waiting',
      state: initialState,
      currentTurn: 'host',
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    roomRef = ref;
    myRole = 'host';
    _listenForGuest(ref, code);
    // Clean up room after 30 min if still waiting
    setTimeout(() => { if (ref) ref.once('value', s => { if (s.val()?.status === 'waiting') ref.remove(); }); }, 30*60*1000);
    return code;
  }

  function _listenForGuest(ref, code) {
    ref.on('value', snap => {
      const room = snap.val();
      if (!room) return;
      if (room.status === 'playing' && onStateUpdate) {
        onStateUpdate(room.state, room.currentTurn, room);
      }
    });
    // Monitor for guest disconnect
    ref.child('guest').on('value', snap => {
      if (snap.val() && onStateUpdate) {
        // Guest joined, update status
        ref.update({ status: 'playing' });
      }
    });
  }

  async function joinRoom(code, gameKey) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured.');
    const ref = fbDB.ref(`rooms/${code}`);
    const snap = await ref.once('value');
    const room = snap.val();
    if (!room) throw new Error('Room not found. Check the code and try again.');
    if (room.status !== 'waiting') throw new Error('Room is no longer available.');
    if (room.game !== gameKey) throw new Error(`This room is for a different game: ${room.game}`);
    const user = Auth.getUser();
    await ref.update({
      guest: { uid: user.uid, name: Auth.getUserName() },
      status: 'playing'
    });
    roomRef = ref;
    myRole = 'guest';
    ref.on('value', snap => {
      const r = snap.val();
      if (!r) { if (onOpponentLeft) onOpponentLeft(); return; }
      if (onStateUpdate) onStateUpdate(r.state, r.currentTurn, r);
    });
    return room;
  }

  async function sendMove(newState, nextTurn) {
    if (!roomRef) return;
    await roomRef.update({ state: newState, currentTurn: nextTurn });
  }

  function leaveRoom() {
    if (roomRef) {
      if (myRole === 'host') {
        roomRef.update({ status: 'abandoned' });
      }
      roomRef.off();
      roomRef = null;
    }
    myRole = null;
    onStateUpdate = null;
  }

  function getRole() { return myRole; }

  function setCallbacks(stateUpdate, opponentLeft) {
    onStateUpdate = stateUpdate;
    onOpponentLeft = opponentLeft;
  }

  return { createRoom, joinRoom, sendMove, leaveRoom, getRole, setCallbacks };
})();
