# ♛ Board Royal

A premium multi-player board game platform built as a Progressive Web App. Play **Chess**, **Nine Men's Morris**, **Checkers**, **Connect Four**, and **Tic-Tac-Toe** — online with friends or locally on the same device.

---

## 🎮 Games Included

| Game | Description |
|------|-------------|
| ♟ Chess | Full chess with legal move validation, castling, en passant, and pawn promotion |
| ◉ Nine Men's Morris | Ancient mill game — place, move, and fly across 3 concentric squares |
| ⬤ Checkers | Standard checkers with mandatory jumps and king promotion |
| ⬡ Connect Four | Drop discs, align 4 to win |
| # Tic-Tac-Toe | Classic 3×3 game |

---

## 🚀 Deployment — GitHub Pages

### Step 1: Create a GitHub Repo

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `board-royal` (or anything you like)
3. Set it to **Public** — required for free GitHub Pages
4. Click **Create repository**

### Step 2: Push the Code

```bash
cd boardroyal
git init
git add .
git commit -m "Initial commit — Board Royal"
git remote add origin https://github.com/YOUR_USERNAME/board-royal.git
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select `main` branch, root `/`
3. Click **Save**
4. Your app will be live at: `https://YOUR_USERNAME.github.io/board-royal/`

---

## 🔥 Firebase Setup (for Online Multiplayer & Auth)

### Step 1: Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `board-royal`
3. Disable Google Analytics (optional) → **Create project**

### Step 2: Enable Authentication

1. In your project → **Authentication** → **Get started**
2. Click **Email/Password** → Enable → **Save**

### Step 3: Enable Realtime Database

1. Go to **Realtime Database** → **Create database**
2. Choose a region → Start in **test mode** (for now)
3. Click **Enable**

### Step 4: Get Your Config

1. Go to **Project Settings** (gear icon) → **Your apps**
2. Click **Add app** → choose **Web** `</>`
3. Register the app → copy the `firebaseConfig` object

### Step 5: Update firebase-config.js

Open `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "board-royal-xxxxx.firebaseapp.com",
  databaseURL:       "https://board-royal-xxxxx-default-rtdb.firebaseio.com",
  projectId:         "board-royal-xxxxx",
  storageBucket:     "board-royal-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef123456"
};
```

### Step 6: Set Database Rules

In Firebase Console → **Realtime Database** → **Rules**, paste:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

Publish → commit `firebase-config.js` → push to GitHub.

---

## 📱 Install as Home Screen App (PWA)

### iPhone / iPad (Safari)
1. Open the GitHub Pages URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Scroll down → tap **Add to Home Screen**
4. Tap **Add** — Board Royal icon appears on your home screen!

### Android (Chrome)
1. Open the URL in **Chrome**
2. Tap the **⋮ menu** → **Add to Home screen**
3. Tap **Add**

### Desktop (Chrome / Edge)
1. Visit the URL
2. Click the **install icon** (⊕) in the address bar
3. Click **Install**

---

## 🎯 How to Play

### Local Mode
- Both players take turns on the same device
- Player 1 = White / Light pieces
- Player 2 = Dark pieces

### Online Mode
**Create Room:**
1. Sign in → pick a game → **Create Room**
2. Share the 6-character code with your friend

**Join Room:**
1. Sign in → pick the **same game** → **Join Room**
2. Enter the code → game starts immediately

---

## 🏗 Project Structure

```
boardroyal/
├── index.html              # App shell (all screens)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline cache)
├── css/
│   └── main.css            # Full styling
├── js/
│   ├── firebase-config.js  # ← YOUR credentials go here
│   ├── auth.js             # Sign up / sign in / guest
│   ├── online.js           # Room creation & real-time sync
│   ├── app.js              # Router, screen logic, orchestration
│   └── games/
│       ├── chess.js        # Full chess engine
│       ├── morris.js       # Nine Men's Morris engine
│       ├── checkers.js     # Checkers engine
│       ├── connect4.js     # Connect Four engine
│       └── tictactoe.js    # Tic-Tac-Toe engine
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## ⚠️ Notes

- **Guest mode**: Full local game access. No account required. Online play requires an account and Firebase.
- **Offline**: All games work offline once cached by the service worker. Online features need internet.
- **Firebase free tier**: The Spark plan supports up to 100 simultaneous connections — plenty for friends and family.
