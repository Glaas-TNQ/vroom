-- Allow updates on system agents regardless of user ownership
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;

CREATE POLICY "Users can update their own agents and system agents"
ON public.agents
FOR UPDATE
USING ((auth.uid() = user_id) OR (is_system = true));