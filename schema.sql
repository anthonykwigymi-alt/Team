-- ============================================================================
-- Decide For Us (V2) - Supabase Database Schema & RLS Policies
-- Fast, no-login-required group decision and tie-breaker tool
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (code);

-- 2. OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_options_room_id ON public.options (room_id);

-- 3. VOTES TABLE
-- Points values: 0 = "Pass", 1 = "Down", 2 = "Must Do"
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.options(id) ON DELETE CASCADE,
  voter_name TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points IN (0, 1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_votes_room_id ON public.votes (room_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON public.votes (option_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable public anonymous access so anyone with a room link can create rooms,
-- view/manage options, and cast votes without logging in.
-- ============================================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Rooms policies: Public Read & Public Insert
DROP POLICY IF EXISTS "Allow public read access on rooms" ON public.rooms;
CREATE POLICY "Allow public read access on rooms"
  ON public.rooms
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access on rooms" ON public.rooms;
CREATE POLICY "Allow public insert access on rooms"
  ON public.rooms
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Options policies: Public Read, Public Insert, Public Delete (Host Option Cleanup)
DROP POLICY IF EXISTS "Allow public read access on options" ON public.options;
CREATE POLICY "Allow public read access on options"
  ON public.options
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access on options" ON public.options;
CREATE POLICY "Allow public insert access on options"
  ON public.options
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on options" ON public.options;
CREATE POLICY "Allow public delete access on options"
  ON public.options
  FOR DELETE
  TO public
  USING (true);

-- Votes policies: Public Read, Public Insert, Public Update, Public Delete
DROP POLICY IF EXISTS "Allow public read access on votes" ON public.votes;
CREATE POLICY "Allow public read access on votes"
  ON public.votes
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access on votes" ON public.votes;
CREATE POLICY "Allow public insert access on votes"
  ON public.votes
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on votes" ON public.votes;
CREATE POLICY "Allow public update access on votes"
  ON public.votes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on votes" ON public.votes;
CREATE POLICY "Allow public delete access on votes"
  ON public.votes
  FOR DELETE
  TO public
  USING (true);

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- Broadcast changes on votes and options so the Live Leaderboard and
-- host cleanup / tie-breaker decisions sync instantaneously across all devices.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'options'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.options;
  END IF;
END $$;
