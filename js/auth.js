window.Auth = (() => {
  let _user = null, _cb = null;
  function init(cb) {
    _cb = cb;
    if (!window.FIREBASE_READY) { cb(null); return; }
    fbAuth.onAuthStateChanged(u => { _user = u; cb(u); });
  }
  async function signUp(name, email, pass) {
    const c = await fbAuth.createUserWithEmailAndPassword(email, pass);
    await c.user.updateProfile({ displayName: name });
    _user = c.user; return c.user;
  }
  async function signIn(email, pass) {
    const c = await fbAuth.signInWithEmailAndPassword(email, pass);
    _user = c.user; return c.user;
  }
  async function signOut() {
    if (window.FIREBASE_READY) await fbAuth.signOut();
    _user = null; if (_cb) _cb(null);
  }
  function playAsGuest() {
    _user = { uid:'guest_'+Math.random().toString(36).slice(2), displayName:'Guest', isAnonymous:true };
    if (_cb) _cb(_user);
  }
  function getUser() { return _user; }
  function getUserName() { return _user ? (_user.displayName || _user.email || 'Player') : 'Player'; }
  return { init, signUp, signIn, signOut, playAsGuest, getUser, getUserName };
})();
