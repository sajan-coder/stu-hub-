-- Student Hub Supabase schema (run this in Supabase SQL Editor).
-- This script is idempotent and safe to re-run.

BEGIN;

-- 1) Chat history (session-based)
CREATE TABLE IF NOT EXISTS public.chats (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL DEFAULT 'default',
    user_msg TEXT NOT NULL,
    bot_reply TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2) Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT DEFAULT 'General',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3) Indexed files (RAG sources)
CREATE TABLE IF NOT EXISTS public.files (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backward-compatible schema adjustments if tables already existed.
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.chats SET session_id = 'default' WHERE session_id IS NULL;
ALTER TABLE public.chats ALTER COLUMN session_id SET DEFAULT 'default';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes for fast history + session lookup.
CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON public.chats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_session_id ON public.chats(session_id);
CREATE INDEX IF NOT EXISTS idx_chats_session_time ON public.chats(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON public.notes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_timestamp ON public.files(timestamp DESC);

-- Optional: keep RLS disabled for server-side service-role usage.
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;

COMMIT;

