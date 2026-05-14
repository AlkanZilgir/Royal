window.Online = (() => {
  let _ref = null, _role = null, _onUpdate = null, _onClose = null;
  function _code() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
  }
  function _listen(ref) {
    ref.on('value', snap => {
      const r = snap.val();
      if (!r) { _onClose && _onClose(); return; }
      _onUpdate && _onUpdate(r);
    });
  }
  async function createRoom(gameKey, initialState) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured.');
    const code = _code();
    const u = Auth.getUser();
    const ref = fbDB.ref('rooms/' + code);
    await ref.set({ game:gameKey, hostName:Auth.getUserName(), hostUid:u.uid, guestName:null, guestUid:null, status:'waiting', state:initialState, currentTurn:'host', createdAt:Date.now() });
    _ref = ref; _role = 'host';
    _listen(ref);
    setTimeout(() => ref.once('value', s => { if (s.val() && s.val().status === 'waiting') ref.remove(); }), 30*60*1000);
    return code;
  }
  async function joinRoom(code, gameKey) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured.');
    const ref = fbDB.ref('rooms/' + code);
    const snap = await ref.once('value');
    const room = snap.val();
    if (!room) throw new Error('Room not found. Check the code.');
    if (room.status !== 'waiting') throw new Error('Room is full or game already started.');
    if (room.game !== gameKey) throw new Error('Wrong game! This room is for: ' + room.game);
    const u = Auth.getUser();
    await ref.update({ guestName:Auth.getUserName(), guestUid:u.uid, status:'playing' });
    _ref = ref; _role = 'guest';
    _listen(ref);
    return room;
  }
  async function sendMove(state, nextTurn) {
    if (_ref) await _ref.update({ state, currentTurn: nextTurn });
  }
  function setListener(onUpdate, onClose) { _onUpdate = onUpdate; _onClose = onClose; }
  function leaveRoom() {
    if (_ref) { if (_role==='host') _ref.update({status:'abandoned'}).catch(()=>{}); _ref.off(); _ref = null; }
    _role = null; _onUpdate = null; _onClose = null;
  }
  function getRole() { return _role; }
  return { createRoom, joinRoom, sendMove, setListener, leaveRoom, getRole };
})();
