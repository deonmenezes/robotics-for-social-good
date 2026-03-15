-- Run this in your Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/yyczpjnbhjeemfajewrm/sql

CREATE TABLE IF NOT EXISTS video_labels (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    source TEXT,
    path TEXT,
    status TEXT DEFAULT 'classified',
    use_case TEXT,
    use_case_title TEXT,
    summary TEXT,
    nomadic_summary TEXT,
    confidence INTEGER,
    event_count INTEGER DEFAULT 0,
    event_labels TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMPTZ,
    thumbnail TEXT,
    raw_analysis JSONB,
    upload_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE video_labels ADD COLUMN IF NOT EXISTS raw_analysis JSONB;
ALTER TABLE video_labels ADD COLUMN IF NOT EXISTS upload_metadata JSONB;

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to thumbnails
CREATE POLICY "Public read thumbnails" ON storage.objects
    FOR SELECT USING (bucket_id = 'thumbnails');

-- Allow authenticated uploads to thumbnails
CREATE POLICY "Allow uploads to thumbnails" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Allow updates to thumbnails" ON storage.objects
    FOR UPDATE USING (bucket_id = 'thumbnails');
