-- Add unlimited_tokens flag to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS unlimited_tokens boolean DEFAULT false;

-- Update existing system agents to have unlimited_tokens false
UPDATE public.agents SET unlimited_tokens = false WHERE unlimited_tokens IS NULL;