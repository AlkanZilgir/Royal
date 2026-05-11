// ============================================================
//  BOARD ROYAL — Online Room Manager (Fixed)
// ============================================================
window.Online = (() => {
  let roomRef   = null;
  let myRole    = null;
  let _onUpdate = null;  // fires on every room change
  let _onClosed = null;  // fires if room disappears

  // ---- Helpers ----
  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  function _attach(ref) {
    ref.on('value', snap => {
      const room = snap.val();
      if (!room) {
        _onClosed && _onClosed();
        return;
      }
      _onUpdate && _onUpdate(room);
    });
  }

  // ---- Public API ----

  /** Host creates a room. Returns the 6-char room code. */
  async function createRoom(gameKey, initialState) {
    if (!window.FIREBASE_READY)
      throw new Error('Firebase not configured — online play unavailable.');

    const code = generateCode();
    const user = Auth.getUser();
    const ref  = fbDB.ref('rooms/' + code);

    await ref.set({
      game:        gameKey,
      hostName:    Auth.getUserName(),
      hostUid:     user.uid,
      guestName:   null,
      guestUid:    null,
      status:      'waiting',
      state:       initialState,
      currentTurn: 'host',
      createdAt:   Date.now()
    });

    roomRef = ref;
    myRole  = 'host';
    _attach(ref);

    // Auto-delete room after 30 min if still waiting
    setTimeout(() => {
      ref.once('value', s => {
        if (s.val() && s.val().status === 'waiting') ref.remove();
      });
    }, 30 * 60 * 1000);

    return code;
  }

  /** Guest joins a room by code. Returns the room snapshot value. */
  async function joinRoom(code, gameKey) {
    if (!window.FIREBASE_READY)
      throw new Error('Firebase not configured — online play unavailable.');

    const ref  = fbDB.ref('rooms/' + code);
    const snap = await ref.once('value');
    const room = snap.val();

    if (!room)
      throw new Error('Room not found. Check the code and try again.');
    if (room.status !== 'waiting')
      throw new Error('This room is full or the game already started.');
    if (room.game !== gameKey)
      throw new Error(
        'Wrong game! Your friend created a ' + room.game + ' room. ' +
        'Go back and pick ' + room.game + ' instead.'
      );

    const user = Auth.getUser();
    await ref.update({
      guestName:   Auth.getUserName(),
      guestUid:    user.uid,
      status:      'playing'
    });

    roomRef = ref;
    myRole  = 'guest';
    _attach(ref);

    return room; // caller uses room.state for initial board
  }

  /** Push a new game state and whose turn it is next. */
  async function sendMove(newState, nextTurn) {
    if (!roomRef) return;
    await roomRef.update({ state: newState, currentTurn: nextTurn });
  }

  /** Tear down listeners and leave the room. */
  function leaveRoom() {
    if (roomRef) {
      if (myRole === 'host') {
        roomRef.update({ status: 'abandoned' }).catch(() => {});
      }
      roomRef.off();
      roomRef = null;
    }
    myRole    = null;
    _onUpdate = null;
    _onClosed = null;
  }

  /**
   * Set the callback that fires on every Firebase room change.
   * Pass null to clear.
   *   onUpdate(room)  — room = full room object from Firebase
   *   onClosed()      — room was deleted / abandoned
   */
  function setListener(onUpdate, onClosed) {
    _onUpdate = onUpdate;
    _onClosed = onClosed;
  }

  function getRole() { return myRole; }

  return { createRoom, joinRoom, sendMove, leaveRoom, setListener, getRole };
})();
