import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  'analytical_structured',
  'strategic_executive',
  'creative_brainstorming',
  'lean_iterative',
  'parallel_ensemble',
];

const METHODOLOGY_ICONS: Record<string, string> = {
  analytical_structured: '📊',
  strategic_executive: '🎯',
  creative_brainstorming: '💡',
  lean_iterative: '🚀',
  parallel_ensemble: '🔀',
};

const WORKFLOWS = ['cyclic', 'sequential_pipeline', 'concurrent'];

export default function RoomBuilder() {
  const { t } = useTranslation();
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
      const { data, error } = await supabase.from('provider_profiles').select('id, name, provider_type');
      if (error) throw error;
      return data;
    },
  });

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
        throw new Error(t('rooms.systemRoomReadOnly'));
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
      toast({ title: t('common.success') });
      navigate('/rooms');
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
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
      <AppLayout title={t('rooms.builder')}>
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? t('rooms.edit') : t('rooms.create')}>
      <div className="max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/rooms')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('rooms.backToRooms')}
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('rooms.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('rooms.roomName')}</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q4 Investment Analysis"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSystemRoom}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_rounds">{t('rooms.numRounds')}</Label>
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
                        <SelectItem key={n} value={n.toString()}>{n} rounds</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('agents.description')}</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this room..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  disabled={isSystemRoom}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('rooms.methodology')}</CardTitle>
              <CardDescription>{t('rooms.methodologyDesc')}</CardDescription>
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
                    key={m}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.methodology === m ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    } ${isSystemRoom ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem value={m} className="mt-1" disabled={isSystemRoom} />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        <span className="text-xl">{METHODOLOGY_ICONS[m]}</span>
                        {t(`methodologies.${m}.label`)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t(`methodologies.${m}.description`)}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('rooms.workflow')}</CardTitle>
              <CardDescription>{t('rooms.workflowDesc')}</CardDescription>
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
                    key={w}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.workflow_type === w ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    } ${isSystemRoom ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem value={w} className="mt-1" disabled={isSystemRoom} />
                    <div className="flex-1">
                      <div className="font-medium">{t(`workflows.${w}.label`)}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {t(`workflows.${w}.description`)}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('rooms.defaultAgents')}</CardTitle>
              <CardDescription>{t('rooms.defaultAgentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {agents && agents.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.agent_ids.includes(agent.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent'
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
                          {agent.description || 'No description'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {t('rooms.noAgentsAvailable')}
                </div>
              )}
            </CardContent>
          </Card>

          {(hasPerplexity || hasTavily) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('rooms.availableTools')}</CardTitle>
                <CardDescription>{t('rooms.availableToolsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasPerplexity && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.available_tools.includes('perplexity') ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}>
                    <Checkbox
                      checked={formData.available_tools.includes('perplexity')}
                      onCheckedChange={() => toggleTool('perplexity')}
                      disabled={isSystemRoom}
                    />
                    <div>
                      <div className="font-medium">{t('rooms.perplexityDeepResearch')}</div>
                      <div className="text-sm text-muted-foreground">{t('rooms.perplexityDesc')}</div>
                    </div>
                  </label>
                )}
                {hasTavily && (
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.available_tools.includes('tavily') ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}>
                    <Checkbox
                      checked={formData.available_tools.includes('tavily')}
                      onCheckedChange={() => toggleTool('tavily')}
                      disabled={isSystemRoom}
                    />
                    <div>
                      <div className="font-medium">{t('rooms.tavilyQuickSearch')}</div>
                      <div className="text-sm text-muted-foreground">{t('rooms.tavilyDesc')}</div>
                    </div>
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('rooms.objectiveTemplate')}</CardTitle>
              <CardDescription>{t('rooms.objectiveTemplateDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Analyze {topic} considering financial, legal, and strategic implications..."
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
              {saveMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          )}
          {isSystemRoom && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted text-muted-foreground">
              <Info className="h-5 w-5" />
              <span>{t('rooms.systemRoomReadOnly')}</span>
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
