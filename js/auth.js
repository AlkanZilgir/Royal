// ============================================================
//  BOARD ROYAL — Auth Module
// ============================================================
window.Auth = (() => {
  let currentUser = null;
  let onAuthChange = null;

  function init(callback) {
    onAuthChange = callback;
    if (!window.FIREBASE_READY) {
      // Guest-only mode
      callback(null);
      return;
    }
    fbAuth.onAuthStateChanged(user => {
      currentUser = user;
      callback(user);
    });
  }

  async function signUp(name, email, pass) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured.');
    const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    currentUser = cred.user;
    return cred.user;
  }

  async function signIn(email, pass) {
    if (!window.FIREBASE_READY) throw new Error('Firebase not configured.');
    const cred = await fbAuth.signInWithEmailAndPassword(email, pass);
    currentUser = cred.user;
    return cred.user;
  }

  async function signOut() {
    if (!window.FIREBASE_READY) {
      currentUser = null;
      if (onAuthChange) onAuthChange(null);
      return;
    }
    await fbAuth.signOut();
  }

  function playAsGuest() {
    currentUser = {
      uid: 'guest_' + Math.random().toString(36).slice(2, 9),
      displayName: 'Guest',
      isAnonymous: true
    };
    if (onAuthChange) onAuthChange(currentUser);
    return currentUser;
  }

  function getUser() { return currentUser; }

  function getUserName() {
    if (!currentUser) return 'Player';
    return currentUser.displayName || currentUser.email || 'Player';
  }

  return { init, signUp, signIn, signOut, playAsGuest, getUser, getUserName };
})();
