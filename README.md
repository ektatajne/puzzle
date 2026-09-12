# Memory Rush — TCS EEE Expo MVP

A one-night-ready multiplayer memory + puzzle race.

## What it does

QR join → player name → waiting room → shared memory image → countdown → individually shuffled puzzle → fastest valid completion → live leaderboard.

It has three views:

- Player: `/?room=EXPO26`
- Big screen: `/display?room=EXPO26` (or `/?display=1&room=EXPO26`)
- Host/admin: `/admin` (or `/?admin=1`)

---

## 1. Install

```bash
npm install
```

## 2. Create Supabase project (Optional / Pre-configured)

Create a project at https://supabase.com/

Create `.env` from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
# Optional: Set VITE_PUBLIC_APP_URL if deploying to a custom domain/production host
# VITE_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 3. How to Run for Expo / Event (LAN Play)

To run the project so mobile phones on the same Wi-Fi can scan and join:

```bash
npm run dev
```

> ⚠️ **CRITICAL OPERATOR STEP**:
> Always open the Admin Panel and Big Screen using the **printed `Network:` IP address** (e.g. `http://192.168.x.x:5173/admin`), **NEVER `localhost`**.
> Opening the site via the Network IP ensures that the generated Join QR Code automatically encodes the Network IP address so player phones can connect directly over Wi-Fi.

---

## 4. Firewall Guidance (Windows & Mac)

When running `npm run dev` for local LAN events, mobile phones connect to port `5173` on your laptop from outside the computer.

* **Windows**: The first time you run `npm run dev`, Windows Defender Firewall will show a popup asking to allow Node.js through the firewall. **Ensure you select "Private networks" (or "Public networks" if using event Wi-Fi) and click "Allow Access".**
  * If phones cannot connect, open Windows Firewall -> "Allow an app through Windows Firewall" -> find `Node.js JavaScript Runtime` and ensure both Private & Public checkboxes are checked.
* **macOS**: Go to *System Settings -> Network -> Firewall* and ensure incoming connections to `node` / `vite` are permitted.

---

## 5. Expo Host Operator Checklist

On the host laptop:

1. Connect laptop and test phones to the **same Wi-Fi network**.
2. Run `npm run dev` in terminal. Note the printed `Network:` IP (e.g. `http://192.168.1.50:5173`).
3. Open `http://<YOUR_NETWORK_IP>:5173/admin` in your browser.
4. Open `http://<YOUR_NETWORK_IP>:5173/display?room=EXPO26` in another tab and move it to the Big Screen TV / projector (press Fullscreen).
5. Verify the Join QR Code badge says **"QR READY ✓"** (and not "LOCAL DEV ADDRESS ⚠️").
6. Have players scan the QR code with their phone cameras.
7. Select an image & round settings in Admin, then click **START ROUND**.

---

## Suggested Expo Round Settings

- **Round 1**: 9 pieces, 20s memory, 45s puzzle
- **Round 2**: 16 pieces, 15s memory, 40s puzzle
- **Round 3**: 25 pieces, 10s memory, 35s puzzle
