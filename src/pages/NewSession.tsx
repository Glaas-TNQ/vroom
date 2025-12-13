import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Play, LayoutGrid, Sparkles, RotateCcw, Users } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  workflow_type: string;
  agent_ids: string[];
  max_rounds: number;
  objective_template: string | null;
  is_system: boolean;
}

const METHODOLOGY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  analytical_structured: { label: 'McKinsey', color: 'bg-blue-500/10 text-blue-500', icon: '📊' },
  strategic_executive: { label: 'OKR/BSC', color: 'bg-purple-500/10 text-purple-500', icon: '🎯' },
  creative_brainstorming: { label: 'Brainstorming', color: 'bg-yellow-500/10 text-yellow-500', icon: '💡' },
  lean_iterative: { label: 'Lean', color: 'bg-green-500/10 text-green-500', icon: '🚀' },
  parallel_ensemble: { label: 'Ensemble', color: 'bg-orange-500/10 text-orange-500', icon: '🔀' },
  group_chat: { label: 'Group Chat', color: 'bg-muted text-muted-foreground', icon: '💬' },
};

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  sequential_pipeline: <span>→</span>,
  cyclic: <RotateCcw className="h-3 w-3" />,
  concurrent: <Users className="h-3 w-3" />,
};

export default function NewSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRoomId = searchParams.get('roomId');
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(preselectedRoomId ? 1 : 0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [formData, setFormData] = useState({
    topic: '',
    objective: '',
    selectedAgentIds: [] as string[],
    maxRounds: 5,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Room[];
    },
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      return data as Agent[];
    },
  });

  // Pre-select room if coming from rooms page
  useEffect(() => {
    if (preselectedRoomId && rooms) {
      const room = rooms.find(r => r.id === preselectedRoomId);
      if (room) {
        selectRoom(room);
      }
    }
  }, [preselectedRoomId, rooms]);

  const selectRoom = (room: Room) => {
    setSelectedRoom(room);
    const objective = room.objective_template 
      ? room.objective_template.replace('{topic}', formData.topic || '[topic]')
      : '';
    setFormData({
      ...formData,
      objective,
      selectedAgentIds: room.agent_ids || [],
      maxRounds: room.max_rounds,
    });
    setStep(1);
  };

  const skipRoom = () => {
    setSelectedRoom(null);
    setStep(1);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const agentConfig = agents
        ?.filter(a => formData.selectedAgentIds.includes(a.id))
        .map(a => ({
          id: a.id,
          name: a.name,
          icon: a.icon,
          color: a.color,
        })) || [];

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          topic: formData.topic,
          objective: formData.objective || null,
          agent_config: agentConfig,
          max_rounds: formData.maxRounds,
          room_id: selectedRoom?.id || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Sessione creata' });
      navigate(`/sessions/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Errore nella creazione', description: error.message, variant: 'destructive' });
    },
  });

  const toggleAgent = (agentId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedAgentIds: prev.selectedAgentIds.includes(agentId)
        ? prev.selectedAgentIds.filter((id) => id !== agentId)
        : [...prev.selectedAgentIds, agentId],
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

  const canProceed = step === 1 
    ? formData.topic.trim().length > 0
    : formData.selectedAgentIds.length >= 2;

  const systemRooms = rooms?.filter(r => r.is_system) || [];
  const userRooms = rooms?.filter(r => !r.is_system) || [];

  return (
    <AppLayout title="Nuova Sessione">
      <div className="max-w-2xl">
        <Button variant="ghost" onClick={() => step === 0 ? navigate('/sessions') : setStep(step - 1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 0 ? 'Torna alle Sessioni' : 'Indietro'}
        </Button>

        <div className="flex gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 0 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Scegli una Room</CardTitle>
              <CardDescription>
                Seleziona una room con metodologia pre-configurata o crea una sessione personalizzata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Room Advisor CTA */}
              <button
                onClick={() => navigate('/rooms/advisor')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-primary">Non sai quale scegliere?</div>
                  <div className="text-sm text-muted-foreground">
                    Chiedi al Room Advisor AI di consigliarti la configurazione ideale
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </button>

              {/* System Rooms */}
              {systemRooms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Metodologie Pre-configurate</h3>
                  <div className="grid gap-3">
                    {systemRooms.map((room) => {
                      const methodology = METHODOLOGY_LABELS[room.methodology] || METHODOLOGY_LABELS.group_chat;
                      return (
                        <button
                          key={room.id}
                          onClick={() => selectRoom(room)}
                          className="flex items-start gap-4 p-4 rounded-lg border text-left hover:bg-accent hover:border-primary/50 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                            {methodology.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {room.name}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {room.description}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge className={methodology.color} variant="secondary">
                                {methodology.label}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {WORKFLOW_ICONS[room.workflow_type]}
                                {room.max_rounds} rounds
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User Rooms */}
              {userRooms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Le Mie Rooms</h3>
                  <div className="grid gap-3">
                    {userRooms.map((room) => {
                      const methodology = METHODOLOGY_LABELS[room.methodology] || METHODOLOGY_LABELS.group_chat;
                      return (
                        <button
                          key={room.id}
                          onClick={() => selectRoom(room)}
                          className="flex items-start gap-4 p-4 rounded-lg border text-left hover:bg-accent hover:border-primary/50 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{room.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {room.description}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge className={methodology.color} variant="secondary">
                                {methodology.label}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Button variant="outline" onClick={skipRoom} className="w-full">
                  Crea Sessione Personalizzata
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Definisci il Topic</CardTitle>
              <CardDescription>
                {selectedRoom 
                  ? `Room: ${selectedRoom.name}`
                  : 'Quale decisione o argomento vuoi deliberare?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRoom && (
                <div className="p-4 rounded-lg bg-muted/50 border mb-4">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <span className="text-lg">{METHODOLOGY_LABELS[selectedRoom.methodology]?.icon}</span>
                    {selectedRoom.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedRoom.description}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Domanda</Label>
                <Input
                  id="topic"
                  placeholder="es. Dovremmo espanderci nel mercato europeo?"
                  value={formData.topic}
                  onChange={(e) => {
                    const newTopic = e.target.value;
                    let newObjective = formData.objective;
                    if (selectedRoom?.objective_template) {
                      newObjective = selectedRoom.objective_template.replace('{topic}', newTopic);
                    }
                    setFormData({ ...formData, topic: newTopic, objective: newObjective });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Obiettivo (opzionale)</Label>
                <Textarea
                  id="objective"
                  placeholder="Quale risultato specifico stai cercando?"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Numero di Round</Label>
                <div className="flex gap-2">
                  {[3, 5, 7].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={formData.maxRounds === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, maxRounds: num })}
                    >
                      {num} rounds
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!canProceed}
              >
                Avanti: Seleziona Agenti
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Agenti</CardTitle>
              <CardDescription>
                Scegli almeno 2 agenti per partecipare alla deliberazione
                {selectedRoom && selectedRoom.agent_ids.length > 0 && ` (pre-selezionati dalla room)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agents && agents.length > 0 ? (
                <div className="grid gap-3">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.selectedAgentIds.includes(agent.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <Checkbox
                        checked={formData.selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgent(agent.id)}
                      />
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: agent.color + '20' }}
                      >
                        {iconMap[agent.icon] || '🤖'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {agent.description || 'Nessuna descrizione'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nessun agente disponibile.</p>
                  <Button variant="link" onClick={() => navigate('/agents/new')}>
                    Crea il tuo primo agente
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Indietro
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={formData.selectedAgentIds.length < 2 || createMutation.isPending}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? 'Creazione...' : 'Crea Sessione'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
