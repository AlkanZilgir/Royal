const firebaseConfig = {
  apiKey:            "AIzaSyBIyzkFbAB9zgb96gU4X-0Wi9tO79GfCFs",
  authDomain:        "royal-85724.firebaseapp.com",
  databaseURL:       "https://royal-85724-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "royal-85724",
  storageBucket:     "royal-85724.firebasestorage.app",
  messagingSenderId: "25019549689",
  appId:             "1:25019549689:web:72b2377d4df90ad5eb9f28"
};

try {
  firebase.initializeApp(firebaseConfig);
  window.fbAuth = firebase.auth();
  window.fbDB   = firebase.database();
  window.FIREBASE_READY = true;
} catch (e) {
  console.warn('Firebase error', e);
  window.FIREBASE_READY = false;
}
