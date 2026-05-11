// ============================================================
//  BOARD ROYAL — Firebase Configuration
//  TODO: Replace with YOUR Firebase project credentials
//  Get these from: https://console.firebase.google.com
//  → Your Project → Project Settings → "Your apps" → Config
// ============================================================

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  window.fbAuth = firebase.auth();
  window.fbDB   = firebase.database();
  window.FIREBASE_READY = true;
} catch (e) {
  console.warn('Firebase not configured — online features disabled.', e);
  window.FIREBASE_READY = false;
}
