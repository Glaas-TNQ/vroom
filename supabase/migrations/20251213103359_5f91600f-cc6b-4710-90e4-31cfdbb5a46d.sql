-- Create rooms table for defining interaction rules and methodologies
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text,
  
  -- Metodologia di lavoro
  methodology text NOT NULL DEFAULT 'group_chat',
  -- Valori: 'analytical_structured', 'strategic_executive', 'creative_brainstorming', 'lean_iterative', 'parallel_ensemble'
  
  -- Flusso di lavoro
  workflow_type text NOT NULL DEFAULT 'cyclic',
  -- Valori: 'sequential_pipeline', 'cyclic', 'concurrent'
  
  -- Configurazione
  agent_ids uuid[] NOT NULL DEFAULT '{}',
  max_rounds integer NOT NULL DEFAULT 5,
  require_consensus boolean DEFAULT false,
  
  -- Strumenti disponibili (Perplexity, Tavily)
  available_tools jsonb DEFAULT '[]',
  
  -- Objective template per la room
  objective_template text,
  
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Users can view their own rooms and system rooms" 
ON public.rooms 
FOR SELECT 
USING ((auth.uid() = user_id) OR (is_system = true));

CREATE POLICY "Users can insert their own rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rooms" 
ON public.rooms 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_system = false));

-- Add room_id to sessions
ALTER TABLE public.sessions ADD COLUMN room_id uuid REFERENCES public.rooms(id);

-- Create trigger for updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system rooms based on methodologies
INSERT INTO public.rooms (name, description, methodology, workflow_type, agent_ids, max_rounds, objective_template, is_system) VALUES
(
  'Analisi Strategica McKinsey',
  'Approccio analitico-strutturato con scomposizione MECE del problema e sintesi gerarchica (Pyramid Principle)',
  'analytical_structured',
  'sequential_pipeline',
  '{}',
  5,
  'Analizzare {topic} seguendo un approccio strutturato: definizione del problema, scomposizione in sotto-problemi, analisi dei dati, sintesi delle soluzioni.',
  true
),
(
  'Pianificazione OKR/BSC',
  'Approccio strategico-esecutivo con Balanced Scorecard per allineare attività a obiettivi di lungo termine',
  'strategic_executive',
  'cyclic',
  '{}',
  5,
  'Valutare {topic} su prospettive multiple: finanziaria, clienti, processi interni, crescita. Definire KPI e piani d''azione.',
  true
),
(
  'Brainstorming Creativo',
  'Approccio Design Thinking con ruoli di pensiero diversi (creativo, critico, ottimista) per generare idee innovative',
  'creative_brainstorming',
  'cyclic',
  '{}',
  6,
  'Esplorare creativamente {topic}: generare idee divergenti, costruire sulle proposte altrui, poi convergere verso soluzioni innovative.',
  true
),
(
  'Validazione Lean Startup',
  'Ciclo Build-Measure-Learn per testare rapidamente ipotesi e adattarsi in cicli brevi',
  'lean_iterative',
  'cyclic',
  '{}',
  4,
  'Applicare il ciclo Lean a {topic}: definire ipotesi, proporre MVP/esperimenti, valutare feedback, decidere se procedere o pivotare.',
  true
),
(
  'Analisi Multi-Prospettiva',
  'Approccio ensemble con analisi parallele indipendenti da specialisti diversi, poi sintesi finale',
  'parallel_ensemble',
  'concurrent',
  '{}',
  3,
  'Analizzare {topic} da prospettive multiple e indipendenti, poi integrare i diversi punti di vista in una sintesi coerente.',
  true
);