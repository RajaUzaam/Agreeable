# 🎉 _AGREEABLE_

## 🧠 Inspiration  
I wanted to build something fast, social, and genuinely fun—like Jackbox meets memes. **AGREEABLE** lets players create and vote on funny meme captions, quotes, jokes, or hot takes in real time. Its structure and gameplay are rooted in _high interactivity_ coupled with _modern entertainment_ (e.g. Memes, Hot-Takes, etc.).

---

## ⚙️ How It Works  
Built using **Next.js**, **TailwindCSS**, and **Firebase**, the game supports:
- Real-time rooms with up to 10 players  
- Host-controlled timers and phase transitions  
- Meme captioning via **Imgflip API**  
- Persistent player data even on disconnect  

Firebase handles syncing of game state (players, rounds, time), while Next.js powers a smooth UI and routing flow.

---

## 📚 What I Learned  
- Handling multiplayer logic and race conditions  
- Using Firebase Realtime DB effectively  
- Managing auth, rejoining players, and syncing timers  
- Clean separation between host/client responsibilities  

---

## 🧱 Challenges  
- Preventing auto-redirect on restart (only redirect if “Try Again” pressed)  
- Vote integrity (no self-voting or duplicate votes)  
- UI consistency during fast-paced state changes  
- Firebase security rules

---

## 🎮 How to Play  
1. **Create** or **Join** a room using a code.  
2. Each round, players are given a template (meme, quote, etc.).  
3. Everyone submits their funniest take within the time limit.  
4. Players vote on the best one (but can't vote for themselves).  
5. The host controls the flow, and results are shown at the end.  
6. Players can **Try Again** or the host can **Restart** the game.

---

## 🚀 Future Prospects  
- Voice rounds & audio memes  
- Leaderboards & game history  
- Higher interactivity (emojis, reactions, live chat, etc.)

---

Thanks for reading — hope you *agree* it's fun 😄
