import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Info } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_system: boolean;
}

const METHODOLOGIES = [
  {
    value: 'analytical_structured',
    label: 'Analisi Strategica McKinsey',
    description: 'Approccio analitico-strutturato con scomposizione MECE del problema e sintesi gerarchica (Pyramid Principle). Ideale per problem solving complessi e due diligence.',
    icon: '📊',
  },
  {
    value: 'strategic_executive',
    label: 'Pianificazione OKR/BSC',
    description: 'Balanced Scorecard per valutare decisioni su prospettive multiple: finanziaria, clienti, processi interni, crescita. Ideale per pianificazione strategica.',
    icon: '🎯',
  },
  {
    value: 'creative_brainstorming',
    label: 'Brainstorming Creativo',
    description: 'Design Thinking con ruoli di pensiero diversi. Generazione idee divergenti, poi convergenza. Ideale per innovazione e ideazione.',
    icon: '💡',
  },
  {
    value: 'lean_iterative',
    label: 'Validazione Lean Startup',
    description: 'Ciclo Build-Measure-Learn per testare ipotesi rapidamente. Ideale per validazione idee, MVP e decisioni di pivot.',
    icon: '🚀',
  },
  {
    value: 'parallel_ensemble',
    label: 'Analisi Multi-Prospettiva',
    description: 'Analisi parallele indipendenti da specialisti diversi, poi sintesi finale. Ideale per decisioni critiche e multi-perspective analysis.',
    icon: '🔀',
  },
];

const WORKFLOWS = [
  {
    value: 'cyclic',
    label: 'Ciclico',
    description: 'Gli agenti si alternano in round successivi, costruendo sulla discussione precedente.',
  },
  {
    value: 'sequential_pipeline',
    label: 'Sequenziale (Pipeline)',
    description: 'Ogni agente elabora e passa al successivo, come in un processo a fasi.',
  },
  {
    value: 'concurrent',
    label: 'Parallelo',
    description: 'Tutti gli agenti rispondono simultaneamente, poi i risultati vengono aggregati.',
  },
];

export default function RoomBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    methodology: 'analytical_structured',
    workflow_type: 'cyclic',
    agent_ids: [] as string[],
    max_rounds: 5,
    require_consensus: false,
    objective_template: '',
    available_tools: [] as string[],
  });

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      return data as Agent[];
    },
  });

  const { data: providerProfiles } = useQuery({
    queryKey: ['provider-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('id, name, provider_type');
      if (error) throw error;
      return data;
    },
  });

  // Check if user has Perplexity or Tavily configured
  const hasPerplexity = providerProfiles?.some(p => p.provider_type === 'perplexity');
  const hasTavily = providerProfiles?.some(p => p.provider_type === 'tavily');

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        description: room.description || '',
        methodology: room.methodology,
        workflow_type: room.workflow_type,
        agent_ids: room.agent_ids || [],
        max_rounds: room.max_rounds,
        require_consensus: room.require_consensus || false,
        objective_template: room.objective_template || '',
        available_tools: (room.available_tools as string[]) || [],
      });
    }
  }, [room]);

  const isSystemRoom = room?.is_system === true;

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isSystemRoom) {
        throw new Error('Le room di sistema non possono essere modificate');
      }

      const payload = {
        user_id: user!.id,
        name: data.name,
        description: data.description || null,
        methodology: data.methodology,
        workflow_type: data.workflow_type,
        agent_ids: data.agent_ids,
        max_rounds: data.max_rounds,
        require_consensus: data.require_consensus,
        objective_template: data.objective_template || null,
        available_tools: data.available_tools,
      };

      if (isEditing) {
        const { error } = await supabase.from('rooms').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rooms').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: isEditing ? 'Room aggiornata' : 'Room creata' });
      navigate('/rooms');
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const toggleAgent = (agentId: string) => {
    setFormData((prev) => ({
      ...prev,
      agent_ids: prev.agent_ids.includes(agentId)
        ? prev.agent_ids.filter((id) => id !== agentId)
        : [...prev.agent_ids, agentId],
    }));
  };

  const toggleTool = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      available_tools: prev.available_tools.includes(tool)
        ? prev.available_tools.filter((t) => t !== tool)
        : [...prev.available_tools, tool],
    }));
  };

  const iconMap: Record<string, string> = {
    'briefcase': '💼',
    'scale': '⚖️',
    'target': '🎯',
    'brain': '🧠',
    'chart': '📊',
    'bot': '🤖',
  };

  if (roomLoading) {
    return (
      <AppLayout title="Room Builder">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? 'Modifica Room' : 'Crea Room'}>
      <div className="max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/rooms')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alle Rooms
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Base</CardTitle>
              <CardDescription>Nome e descrizione della room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Room</Label>
                  <Input
                    id="name"
                    placeholder="es. Analisi Investimento Q4"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSystemRoom}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_rounds">Numero Round</Label>
                  <Select 
                    value={formData.max_rounds.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, max_rounds: parseInt(v) })}
                    disabled={isSystemRoom}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} rounds
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi lo scopo di questa room..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  disabled={isSystemRoom}
                />
              </div>
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card>
            <CardHeader>
              <CardTitle>Metodologia</CardTitle>
              <CardDescription>Scegli l'approccio di lavoro per questa room</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.methodology}
                onValueChange={(v) => setFormData({ ...formData, methodology: v })}
                className="space-y-3"
                disabled={isSystemRoom}
              >
                {METHODOLOGIES.map((m) => (
                  <label
                    key={m.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.methodology === m.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    } ${isSystemRoom ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem value={m.value} className="mt-1" disabled={isSystemRoom} />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        {m.label}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {m.description}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Flusso di Lavoro</CardTitle>
              <CardDescription>Come interagiscono gli agenti</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.workflow_type}
                onValueChange={(v) => setFormData({ ...formData, workflow_type: v })}
                className="space-y-3"
                disabled={isSystemRoom}
              >
                {WORKFLOWS.map((w) => (
                  <label
                    key={w.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.workflow_type === w.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    } ${isSystemRoom ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem value={w.value} className="mt-1" disabled={isSystemRoom} />
                    <div className="flex-1">
                      <div className="font-medium">{w.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {w.description}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Agents */}
          <Card>
            <CardHeader>
              <CardTitle>Agenti Predefiniti</CardTitle>
              <CardDescription>Seleziona gli agenti che parteciperanno alle sessioni in questa room (opzionale)</CardDescription>
            </CardHeader>
            <CardContent>
              {agents && agents.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.agent_ids.includes(agent.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      } ${isSystemRoom ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={formData.agent_ids.includes(agent.id)}
                        onCheckedChange={() => toggleAgent(agent.id)}
                        disabled={isSystemRoom}
                      />
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: agent.color + '20' }}
                      >
                        {iconMap[agent.icon] || '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{agent.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {agent.description || 'Nessuna descrizione'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nessun agente disponibile
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          {(hasPerplexity || hasTavily) && (
            <Card>
              <CardHeader>
                <CardTitle>Strumenti Disponibili</CardTitle>
                <CardDescription>Abilita strumenti di ricerca per gli agenti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasPerplexity && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.available_tools.includes('perplexity')
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}>
                    <Checkbox
                      checked={formData.available_tools.includes('perplexity')}
                      onCheckedChange={() => toggleTool('perplexity')}
                      disabled={isSystemRoom}
                    />
                    <div>
                      <div className="font-medium">Perplexity (Deep Research)</div>
                      <div className="text-sm text-muted-foreground">
                        Ricerca web approfondita con citazioni
                      </div>
                    </div>
                  </label>
                )}
                {hasTavily && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.available_tools.includes('tavily')
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}>
                    <Checkbox
                      checked={formData.available_tools.includes('tavily')}
                      onCheckedChange={() => toggleTool('tavily')}
                      disabled={isSystemRoom}
                    />
                    <div>
                      <div className="font-medium">Tavily (Quick Search)</div>
                      <div className="text-sm text-muted-foreground">
                        Ricerca web veloce per fatti e news
                      </div>
                    </div>
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* Objective Template */}
          <Card>
            <CardHeader>
              <CardTitle>Template Obiettivo</CardTitle>
              <CardDescription>
                Definisci un template per l'obiettivo delle sessioni. Usa {'{topic}'} come placeholder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="es. Analizzare {topic} considerando implicazioni finanziarie, legali e strategiche..."
                value={formData.objective_template}
                onChange={(e) => setFormData({ ...formData, objective_template: e.target.value })}
                rows={3}
                disabled={isSystemRoom}
              />
            </CardContent>
          </Card>

          {!isSystemRoom && (
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Salvataggio...' : isEditing ? 'Aggiorna Room' : 'Crea Room'}
            </Button>
          )}
          {isSystemRoom && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted text-muted-foreground">
              <Info className="h-5 w-5" />
              <span>Le room di sistema sono in sola lettura. Puoi usarle come base per creare le tue.</span>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
