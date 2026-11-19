# Decide For Us

A fast, real-time group decison app that helps friends pick what to eat, watch, or do togeher without endless group chat debates.

**Live App:** [https://decideforus.netlify.app/](https://decideforus.netlify.app/)

---

## Key Features

- **Instant Decision Rooms:** create a room in one click and get a unique shareable link.
- **Real-Time Sync:** Votes and new options upate live across every connected phone and laptop via Supabase.
- **Quick Fill:** Populate a room with sample ideas in one tap to get the vote started fast.
- **Zero Sign-Up Friction:** Anyone with the room link can jump in and vote immediately.

---

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Database & Real-Time Sync:** Supabase
- **Hosting & CI/CD:** Netlify & GitHub

---

## Run Localli

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/anthonykwigymi-alt/decide-for-us.git](https://github.com/anthonykwigymi-alt/decide-for-us.git)
   cd decide-for-us
   ```

2. **Instal dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment ariables:**
   Create a `.env.local` file in the root folder and add your Supabase project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
