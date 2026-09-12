# 🧩 MEMORY RUSH — HOW TO PLAY & EVENT GUIDE

A step-by-step guide for host booth operators and mobile participants playing **Memory Rush**.

---

## 💻 FOR HOST BOOTH OPERATORS

### Step 1: Launch Development Server
1. Connect your laptop to the event Wi-Fi network.
2. Open terminal in `memory-rush/memory-rush/memory-rush` and run:
   ```bash
   npm run dev
   ```
3. Note the printed **`Network:`** IP address (e.g. `http://192.168.1.9:5173`).

---

### Step 2: Open Control Center & Big Screen TV
1. **Admin Control Center**: Open **`http://192.168.1.9:5173/admin`** on your laptop.
   * Enter password `admin123` to unlock control.
2. **Big Screen TV**: Open **`http://192.168.1.9:5173/display?room=EXPO26`** in a second tab.
   * Drag this tab to the external Big Screen TV / Projector and click **ENTER FULLSCREEN ⛶**.
3. Verify the QR code on screen displays the **`QR READY ✓`** green badge.

---

### Step 3: Start & Manage a Round
1. The **`▶ START ROUND 1`** button is **ACTIVE and pre-selected by default** with a starter AI image on launch!
2. Click **▶ START ROUND 1** to begin the round immediately once players are in the lobby.
3. (Optional): Go to **Image Library** to pick a different image or **Round Config** to adjust timers.

---

### Step 4: Manage Joined Players & Remove Players
1. View live joined participants in the **LIVE PLAYERS** table on the Admin Dashboard.
2. To remove or kick an invalid participant, click the **`🗑️ Remove`** button in the **ACTIONS** column next to their name.

---

### Step 5: View Live Winners & Rankings
1. Go to the **🏅 Ranking & Winner** tab in Admin during or after a round.
2. View the **👑 #1 WINNER Spotlight** (fastest player name & solve time in seconds to 2 decimal places).
3. Filter results by `All Rounds`, `Round 1`, `Round 2`, or `Round 3`.

---

## 📱 FOR MOBILE PLAYERS

### Step 1: Join the Room
1. Connect your phone to the **same Wi-Fi network** as the host computer.
2. Open your phone camera and **scan the QR code** on the Big Screen TV (or visit `http://192.168.1.9:5173/join?room=EXPO26`).
3. Type your **Name** and tap **JOIN THE CHALLENGE**.
4. You will enter the **Waiting Room** where you can see all other joined players live!

---

### Step 2: Memory Phase (20 Seconds)
1. When the host starts the round, the target AI image appears on your phone screen.
2. **Study the image details closely** (colors, shapes, background patterns) before the timer runs out.

---

### Step 3: Countdown (3 Seconds)
1. **3.. 2.. 1.. GO!** 
2. The image disappears from your screen.

---

### Step 4: Reconstruct the Puzzle (45 Seconds)
1. Your phone will show shuffled visual image tiles.
2. **How to Move Tiles**:
   * **Tap one tile** to select it (it will glow purple).
   * **Tap a second tile** to swap their positions.
3. Keep swapping tiles from memory until the full picture is restored!

---

### Step 5: Win & Score
1. As soon as your puzzle is correctly solved, your completion time is automatically verified and submitted.
2. The **fastest solver wins 1st Place (🥇 100 PTS)**!
3. View your official rank, time, and total points on your phone, the Big Screen TV, and the Admin Ranking tab!

---

## 🔗 SUMMARY OF URLS

| View | Access URL | Target User |
| :--- | :--- | :--- |
| **Player Join** | `http://192.168.1.9:5173/join?room=EXPO26` | Mobile Phones (QR Code) |
| **Admin Control** | `http://192.168.1.9:5173/admin` | Host Laptop Operator |
| **Big Screen TV** | `http://192.168.1.9:5173/display?room=EXPO26` | Expo Projector / TV Screen |
