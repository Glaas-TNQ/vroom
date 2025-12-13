-- Add new provider types
ALTER TYPE public.provider_type ADD VALUE IF NOT EXISTS 'perplexity';
ALTER TYPE public.provider_type ADD VALUE IF NOT EXISTS 'tavily';