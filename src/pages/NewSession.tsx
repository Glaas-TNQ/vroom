import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAgents, Agent } from '@/hooks/useAgents';
import { RoomAdvisorDialog } from '@/components/RoomAdvisorDialog';
import { ArrowLeft, ArrowRight, Play, LayoutGrid, Sparkles, RotateCcw, Users, Zap } from 'lucide-react';

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: string;
  model: string | null;
}

interface AgentProviderOverride {
  agentId: string;
  providerProfileId: string | null;
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

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  sequential_pipeline: <span>→</span>,
  cyclic: <RotateCcw className="h-3 w-3" />,
  concurrent: <Users className="h-3 w-3" />,
};

export default function NewSession() {
  const { t } = useTranslation();
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

  const [agentProviderOverrides, setAgentProviderOverrides] = useState<AgentProviderOverride[]>([]);
  const [globalProviderId, setGlobalProviderId] = useState<string | null>(null);
  const [roomAdvisorOpen, setRoomAdvisorOpen] = useState(false);

  const getMethodologyLabel = (methodology: string) => {
    return t(`methodologies.${methodology}.label`, { defaultValue: methodology });
  };

  const getMethodologyIcon = (methodology: string): string => {
    const icons: Record<string, string> = {
      analytical_structured: '📊',
      strategic_executive: '🎯',
      creative_brainstorming: '💡',
      lean_iterative: '🚀',
      parallel_ensemble: '🔀',
      group_chat: '💬',
    };
    return icons[methodology] || '💬';
  };

  const getMethodologyColor = (methodology: string): string => {
    const colors: Record<string, string> = {
      analytical_structured: 'bg-blue-500/10 text-blue-500',
      strategic_executive: 'bg-purple-500/10 text-purple-500',
      creative_brainstorming: 'bg-yellow-500/10 text-yellow-500',
      lean_iterative: 'bg-green-500/10 text-green-500',
      parallel_ensemble: 'bg-orange-500/10 text-orange-500',
      group_chat: 'bg-muted text-muted-foreground',
    };
    return colors[methodology] || 'bg-muted text-muted-foreground';
  };

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

  const { data: agents } = useAgents();

  const { data: providerProfiles } = useQuery({
    queryKey: ['provider-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('id, name, provider_type, model')
        .order('name');
      if (error) throw error;
      return data as ProviderProfile[];
    },
  });

  const getAgentProvider = (agentId: string): string | null => {
    const override = agentProviderOverrides.find(o => o.agentId === agentId);
    if (override) return override.providerProfileId;
    const agent = agents?.find(a => a.id === agentId);
    return agent?.provider_profile_id || null;
  };

  const setAgentProvider = (agentId: string, providerProfileId: string | null) => {
    setAgentProviderOverrides(prev => {
      const existing = prev.find(o => o.agentId === agentId);
      if (existing) {
        return prev.map(o => o.agentId === agentId ? { ...o, providerProfileId } : o);
      }
      return [...prev, { agentId, providerProfileId }];
    });
  };

  const applyGlobalProvider = () => {
    if (!globalProviderId) return;
    const newOverrides = formData.selectedAgentIds.map(agentId => ({
      agentId,
      providerProfileId: globalProviderId,
    }));
    setAgentProviderOverrides(newOverrides);
  };

  const getProviderDisplayName = (providerId: string | null): string => {
    if (!providerId) return 'Lovable AI';
    const provider = providerProfiles?.find(p => p.id === providerId);
    if (!provider) return 'Lovable AI';
    return `${provider.name}${provider.model ? ` (${provider.model})` : ''}`;
  };

  const getProviderBadgeColor = (providerId: string | null): string => {
    if (!providerId) return 'bg-primary/10 text-primary';
    const provider = providerProfiles?.find(p => p.id === providerId);
    if (!provider) return 'bg-muted text-muted-foreground';
    const colors: Record<string, string> = {
      openai: 'bg-emerald-500/10 text-emerald-600',
      anthropic: 'bg-orange-500/10 text-orange-600',
      perplexity: 'bg-blue-500/10 text-blue-600',
      tavily: 'bg-purple-500/10 text-purple-600',
      custom: 'bg-muted text-muted-foreground',
    };
    return colors[provider.provider_type] || 'bg-muted text-muted-foreground';
  };

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
        .map(a => {
          const overrideProviderId = getAgentProvider(a.id);
          const provider = overrideProviderId 
            ? providerProfiles?.find(p => p.id === overrideProviderId)
            : null;
          return {
            id: a.id,
            name: a.name,
            icon: a.icon,
            color: a.color,
            provider_profile_id: overrideProviderId,
            provider_name: provider?.name || null,
            provider_type: provider?.provider_type || null,
            provider_model: provider?.model || null,
          };
        }) || [];

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
      toast({ title: t('newSession.sessionCreated') });
      navigate(`/sessions/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: t('newSession.errorCreating'), description: error.message, variant: 'destructive' });
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
    <AppLayout title={t('newSession.title')}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => step === 0 ? navigate('/sessions') : setStep(step - 1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 0 ? t('newSession.backToSessions') : t('common.back')}
        </Button>

        <div className="flex gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 0 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('newSession.chooseRoom')}</CardTitle>
              <CardDescription>{t('newSession.chooseRoomDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <button
                onClick={() => setRoomAdvisorOpen(true)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-primary">{t('newSession.dontKnow')}</div>
                  <div className="text-sm text-muted-foreground">{t('newSession.askAdvisor')}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </button>

              <RoomAdvisorDialog
                open={roomAdvisorOpen}
                onOpenChange={setRoomAdvisorOpen}
                rooms={rooms || []}
                onSelectRoom={selectRoom}
              />

              {systemRooms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('newSession.preConfigured')}</h3>
                  <div className="grid gap-3">
                    {systemRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => selectRoom(room)}
                        className="flex items-start gap-4 p-4 rounded-lg border text-left hover:bg-accent hover:border-primary/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                          {getMethodologyIcon(room.methodology)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {room.description}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={getMethodologyColor(room.methodology)} variant="secondary">
                              {getMethodologyLabel(room.methodology)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {WORKFLOW_ICONS[room.workflow_type]}
                              {room.max_rounds} rounds
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {userRooms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('newSession.myRooms')}</h3>
                  <div className="grid gap-3">
                    {userRooms.map((room) => (
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
                            <Badge className={getMethodologyColor(room.methodology)} variant="secondary">
                              {getMethodologyLabel(room.methodology)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Button variant="outline" onClick={skipRoom} className="w-full">
                  {t('newSession.createCustom')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('newSession.defineTopic')}</CardTitle>
              <CardDescription>
                {selectedRoom 
                  ? `Room: ${selectedRoom.name}`
                  : t('newSession.topicPlaceholder')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedRoom && (
                <div className="p-4 rounded-lg bg-muted/50 border mb-4">
                  <div className="font-medium mb-1 flex items-center gap-2">
                    <span className="text-lg">{getMethodologyIcon(selectedRoom.methodology)}</span>
                    {selectedRoom.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedRoom.description}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topic">{t('newSession.topicQuestion')}</Label>
                <Input
                  id="topic"
                  placeholder={t('newSession.topicPlaceholder')}
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
                <Label htmlFor="objective">{t('newSession.objective')}</Label>
                <Textarea
                  id="objective"
                  placeholder={t('newSession.objectivePlaceholder')}
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('newSession.numRounds')}</Label>
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
                {t('newSession.nextSelectAgents')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('newSession.selectAgents')}</CardTitle>
              <CardDescription>
                {t('newSession.selectAgentsDesc')}
                {selectedRoom && selectedRoom.agent_ids.length > 0 && ` (${t('newSession.preSelectedFromRoom')})`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Provider Selection */}
              {providerProfiles && providerProfiles.length > 0 && (
                <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <Label className="font-medium">{t('newSession.globalProvider')}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={globalProviderId || 'lovable-ai'}
                      onValueChange={(v) => setGlobalProviderId(v === 'lovable-ai' ? null : v)}
                    >
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder={t('newSession.selectProvider')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lovable-ai">Lovable AI (default)</SelectItem>
                        {providerProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.model && `(${p.model})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="secondary" 
                      onClick={applyGlobalProvider}
                      disabled={formData.selectedAgentIds.length === 0}
                    >
                      {t('newSession.applyToAll')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('newSession.globalProviderDesc')}
                  </p>
                </div>
              )}

              {agents && agents.length > 0 ? (
                <div className="grid gap-3">
                  {agents.map((agent) => {
                    const isSelected = formData.selectedAgentIds.includes(agent.id);
                    const currentProviderId = getAgentProvider(agent.id);
                    
                    return (
                      <div
                        key={agent.id}
                        className={`rounded-lg border transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        }`}
                      >
                        <label className="flex items-center gap-3 p-3 cursor-pointer">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAgent(agent.id)}
                          />
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                            style={{ backgroundColor: agent.color + '20' }}
                          >
                            {iconMap[agent.icon] || '🤖'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{agent.name}</span>
                              <Badge variant="secondary" className={`text-xs ${getProviderBadgeColor(currentProviderId)}`}>
                                {getProviderDisplayName(currentProviderId)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {agent.description || t('agents.noAgents')}
                            </div>
                          </div>
                        </label>
                        
                        {isSelected && providerProfiles && providerProfiles.length > 0 && (
                          <div className="px-3 pb-3 pt-0 ml-14">
                            <Select
                              value={currentProviderId || 'lovable-ai'}
                              onValueChange={(v) => setAgentProvider(agent.id, v === 'lovable-ai' ? null : v)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lovable-ai">Lovable AI (default)</SelectItem>
                                {providerProfiles.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} {p.model && `(${p.model})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('newSession.noAgents')}</p>
                  <Button variant="link" onClick={() => navigate('/agents/new')}>
                    {t('newSession.createFirstAgent')}
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.back')}
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={formData.selectedAgentIds.length < 2 || createMutation.isPending}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? t('newSession.creating') : t('newSession.createSession')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
