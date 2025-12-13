-- Add column to track the source system agent for user customizations
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS source_system_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_source_system ON public.agents(source_system_agent_id) WHERE source_system_agent_id IS NOT NULL;

-- Update RLS policy for UPDATE to prevent modifying system agents directly
DROP POLICY IF EXISTS "Users can update their own agents and system agents" ON public.agents;

-- Users can only update their OWN agents (not system agents directly)
CREATE POLICY "Users can update their own agents" 
ON public.agents 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update SELECT policy to prefer user's personalized copies
-- (This is handled in application logic, but ensures users see both)