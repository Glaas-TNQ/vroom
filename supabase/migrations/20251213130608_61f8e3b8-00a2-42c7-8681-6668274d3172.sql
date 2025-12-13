-- Add avatar_url column to agents for custom uploaded images
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for agent avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-avatars', 'agent-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar images
CREATE POLICY "Users can upload agent avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agent-avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to agent avatars
CREATE POLICY "Public read access for agent avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-avatars');

-- Allow users to update their uploaded avatars
CREATE POLICY "Users can update their agent avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'agent-avatars' AND auth.uid() IS NOT NULL);

-- Allow users to delete their uploaded avatars
CREATE POLICY "Users can delete their agent avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'agent-avatars' AND auth.uid() IS NOT NULL);