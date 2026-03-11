-- Student Hub Supabase Schema
-- Run this in Supabase SQL Editor to set up user-specific data storage
-- This script is idempotent and safe to re-run

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) CHAT HISTORY TABLE (session-based, per user)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.chats (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL DEFAULT 'default',
    user_msg TEXT NOT NULL,
    bot_reply TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add user_id column if missing (backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'user_id') THEN
        ALTER TABLE public.chats ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add session_id column if missing (backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'session_id') THEN
        ALTER TABLE public.chats ADD COLUMN session_id TEXT DEFAULT 'default';
    END IF;
END $$;

-- Update NULL session_id values
UPDATE public.chats SET session_id = 'default' WHERE session_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) NOTES TABLE (per user)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT DEFAULT 'General',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add user_id column if missing (backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'user_id') THEN
        ALTER TABLE public.notes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) FILES TABLE (RAG sources, per user)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.files (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add user_id column if missing (backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'user_id') THEN
        ALTER TABLE public.files ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) INDEXES FOR FAST QUERIES (per user, per session)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Chats indexes
DROP INDEX IF EXISTS idx_chats_user_session;
CREATE INDEX IF NOT EXISTS idx_chats_user_session ON public.chats(user_id, session_id, timestamp DESC);
DROP INDEX IF EXISTS idx_chats_user_id;
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
DROP INDEX IF EXISTS idx_chats_timestamp;
CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON public.chats(timestamp DESC);

-- Notes indexes
DROP INDEX IF EXISTS idx_notes_user_id;
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
DROP INDEX IF EXISTS idx_notes_timestamp;
CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON public.notes(timestamp DESC);

-- Files indexes
DROP INDEX IF EXISTS idx_files_user_id;
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
DROP INDEX IF EXISTS idx_files_timestamp;
CREATE INDEX IF NOT EXISTS idx_files_timestamp ON public.files(timestamp DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) REALTIME SETUP FOR REAL-TIME SYNC
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable realtime for chats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6) ROW LEVEL SECURITY (optional - for extra security)
-- ═══════════════════════════════════════════════════════════════════════════════

-- RLS is disabled for server-side service role access
-- Enable RLS if you want database-level user isolation (requires client-side auth)
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
COMMIT;

-- Verify tables exist
SELECT 'chats' as table_name, COUNT(*) as row_count FROM public.chats
UNION ALL
SELECT 'notes', COUNT(*) FROM public.notes
UNION ALL
SELECT 'files', COUNT(*) FROM public.files;
