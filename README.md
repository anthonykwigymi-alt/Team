# Decide For Us (V2)

A fast, real-time, no-login-required group decision and tie-breaker app that helps friends pick what to eat, watch, play, or do together without endless group chat debates.

**Live App:** [https://decideforus.netlify.app/](https://decideforus.netlify.app/)  
**Repository:** [https://github.com/anthonykwigymi-alt/Team](https://github.com/anthonykwigymi-alt/Team)

---

## Key Features (V2)

- **Instant Decision Rooms:** Create a room with 2–10 options in seconds and get a unique 6-character code and shareable link (`/room/[code]`).
- **Smart Randomized Quick-Fill Engine:** 165+ curated options across 5 categories (**Food & Drinks**, **Movies & Watchlist**, **Games**, **Hangouts & Activities**, and **Wildcard**) with title keyword **Auto-Detect** and a Fisher-Yates shuffle that never adds duplicate options.
- **Weighted Card-by-Card Voting:** Swipe or tap through contenders with **Pass (`0 pts`)**, **Down (`+1 pt`)**, or **Must Do (`+2 pts`)**.
- **Real-Time Live Leaderboard:** Scores, vote breakdowns, and voter badges sync live across every connected phone and laptop via Supabase Realtime.
- **Synced Tie-Breaker & Winner Reveal:** Break ties (or let the host pick a final winner) with a roulette shuffle that persists and syncs the final decision across every connected device.
- **Mobile Share & Inline SVG QR Code:** Native mobile share sheet (`navigator.share`), desktop clipboard toast, and an instant scannable inline SVG QR code modal for friends in the same room.
- **Host Option Cleanup:** Remembers the room creator in `localStorage` so the host can remove typo or spam options in real time.
- **Zero Sign-Up Friction:** Anyone with the room link or QR code can enter a display name and vote immediately.

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Database & Real-Time Sync:** Supabase (`@supabase/supabase-js`, Postgres RLS, Supabase Realtime)
- **Hosting & CI/CD:** Netlify & GitHub

---

## Database Setup (`schema.sql`)

Run [`schema.sql`](./schema.sql) in the **Supabase SQL Editor** to create:
- `public.rooms` (`id`, `code`, `title`, `created_at`)
- `public.options` (`id`, `room_id`, `label`, `position`, `created_at`)
- `public.votes` (`id`, `room_id`, `option_id`, `voter_name`, `points`, `created_at`)
- Public anonymous Row Level Security (RLS) policies and `supabase_realtime` publication settings.

---

## Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anthonykwigymi-alt/Team.git
   cd Team
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root folder and add your Supabase project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
