-- Create table for 1-on-1 chat sessions
CREATE TABLE public.one_on_one_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  last_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for 1-on-1 chat messages
CREATE TABLE public.one_on_one_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.one_on_one_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name TEXT,
  agent_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.one_on_one_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_on_one_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.one_on_one_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.one_on_one_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.one_on_one_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.one_on_one_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for messages (through session ownership)
CREATE POLICY "Users can view messages from their sessions"
  ON public.one_on_one_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages to their sessions"
  ON public.one_on_one_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages from their sessions"
  ON public.one_on_one_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s 
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- Trigger to update session updated_at
CREATE TRIGGER update_one_on_one_sessions_updated_at
  BEFORE UPDATE ON public.one_on_one_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_one_on_one_messages_session_id ON public.one_on_one_messages(session_id);
CREATE INDEX idx_one_on_one_sessions_user_id ON public.one_on_one_sessions(user_id);