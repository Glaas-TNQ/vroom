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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Sparkles, Loader2, Check } from 'lucide-react';

const ICONS = [
  { value: 'briefcase', label: '💼 CFO', emoji: '💼' },
  { value: 'scale', label: '⚖️ Legal', emoji: '⚖️' },
  { value: 'target', label: '🎯 Strategy', emoji: '🎯' },
  { value: 'brain', label: '🧠 Analyst', emoji: '🧠' },
  { value: 'chart', label: '📊 Data', emoji: '📊' },
  { value: 'bot', label: '🤖 General', emoji: '🤖' },
];

const COLORS = [
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#06b6d4', label: 'Cyan' },
];

const SYSTEM_PROMPT_TEMPLATES: Record<string, string> = {
  briefcase: `You are a Chief Financial Officer (CFO) agent. Your role is to:
- Analyze financial implications of decisions
- Evaluate ROI, cash flow impact, and budget considerations
- Identify financial risks and opportunities
- Provide data-driven recommendations from a financial perspective

Always be precise with numbers and conservative in your estimates. Challenge assumptions that may impact the bottom line.`,
  scale: `You are a Legal Advisor agent. Your role is to:
- Identify legal risks and compliance requirements
- Review contractual implications
- Highlight regulatory considerations
- Suggest risk mitigation strategies

Be thorough in identifying potential legal issues but also practical in suggesting solutions.`,
  target: `You are a Strategy Advisor agent. Your role is to:
- Analyze long-term strategic implications
- Evaluate competitive positioning
- Assess market opportunities and threats
- Align decisions with organizational goals

Think big picture while remaining grounded in market realities.`,
  brain: `You are a Critical Analyst (Devil's Advocate) agent. Your role is to:
- Challenge assumptions and biases in the discussion
- Present alternative viewpoints
- Identify potential blind spots
- Stress-test proposed solutions

Be constructively critical - your goal is to strengthen decisions, not obstruct them.`,
  chart: `You are a Data Analyst agent. Your role is to:
- Request and analyze relevant data
- Identify patterns and trends
- Validate claims with evidence
- Quantify impacts when possible

Be rigorous with data quality and transparent about limitations.`,
  bot: `You are a helpful AI assistant participating in a strategic deliberation. Provide thoughtful, balanced insights on the topic at hand.`,
};

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: string;
}

interface AgentSpec {
  name: string;
  codename: string;
  mandate: string;
  primary_domain: string;
  secondary_domains?: string[];
  exclusions?: string[];
  reasoning_mode: string;
  depth_level: string;
  decision_bias: string;
  core_responsibilities: string[];
  non_responsibilities?: string[];
  system_prompt: string;
  suggested_temperature: number;
  suggested_icon: string;
}

export default function AgentBuilder() {
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
    icon: 'bot',
    color: '#6366f1',
    system_prompt: SYSTEM_PROMPT_TEMPLATES['bot'],
    provider_profile_id: '',
    temperature: 0.7,
    max_tokens: 2048,
    unlimited_tokens: false,
  });

  const [atlasOpen, setAtlasOpen] = useState(false);
  const [atlasDescription, setAtlasDescription] = useState('');
  const [atlasDesigning, setAtlasDesigning] = useState(false);
  const [designedAgent, setDesignedAgent] = useState<AgentSpec | null>(null);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('agents').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: atlasAgent } = useQuery({
    queryKey: ['atlas-agent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('system_prompt')
        .eq('name', 'Atlas')
        .eq('is_system', true)
        .single();
      if (error) return null;
      return data;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ['provider-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('provider_profiles').select('id, name, provider_type');
      if (error) throw error;
      return data as ProviderProfile[];
    },
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        icon: agent.icon,
        color: agent.color,
        system_prompt: agent.system_prompt,
        provider_profile_id: agent.provider_profile_id || '',
        temperature: Number(agent.temperature),
        max_tokens: agent.max_tokens,
        unlimited_tokens: (agent as any).unlimited_tokens || false,
      });
    }
  }, [agent]);

  const isSystemAgent = agent?.is_system === true;

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isSystemAgent) {
        throw new Error(t('agents.systemAgentReadOnly'));
      }
      
      const payload = {
        user_id: user!.id,
        name: data.name,
        description: data.description || null,
        icon: data.icon,
        color: data.color,
        system_prompt: data.system_prompt,
        provider_profile_id: data.provider_profile_id || null,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        unlimited_tokens: data.unlimited_tokens,
      };

      if (isEditing) {
        const { error } = await supabase.from('agents').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agents').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: t('common.success') });
      navigate('/agents');
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleIconChange = (icon: string) => {
    setFormData({
      ...formData,
      icon,
      system_prompt: SYSTEM_PROMPT_TEMPLATES[icon] || SYSTEM_PROMPT_TEMPLATES['bot'],
    });
  };

  const handleAtlasDesign = async () => {
    if (!atlasDescription.trim() || !atlasAgent?.system_prompt) return;
    
    setAtlasDesigning(true);
    setDesignedAgent(null);

    try {
      const { data, error } = await supabase.functions.invoke('design-agent', {
        body: { 
          description: atlasDescription,
          atlasPrompt: atlasAgent.system_prompt
        }
      });

      if (error) throw error;
      if (data?.agent) {
        setDesignedAgent(data.agent);
      }
    } catch (error) {
      console.error('Atlas design error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to design agent',
        variant: 'destructive' 
      });
    } finally {
      setAtlasDesigning(false);
    }
  };

  const applyDesignedAgent = () => {
    if (!designedAgent) return;

    setFormData({
      ...formData,
      name: designedAgent.name,
      description: designedAgent.mandate,
      icon: designedAgent.suggested_icon || 'bot',
      system_prompt: designedAgent.system_prompt,
      temperature: designedAgent.suggested_temperature,
    });

    setAtlasOpen(false);
    setDesignedAgent(null);
    setAtlasDescription('');
    
    toast({ title: t('common.success'), description: 'Agent design applied!' });
  };

  if (agentLoading) {
    return (
      <AppLayout title={t('agents.builder')}>
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? t('agents.edit') : t('agents.create')}>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('agents.backToAgents')}
          </Button>
          
          {!isEditing && (
            <Dialog open={atlasOpen} onOpenChange={setAtlasOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('agents.designWithAtlas')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    {t('agents.atlasDesigner')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('agents.atlasDescription')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder={t('agents.atlasPlaceholder')}
                    value={atlasDescription}
                    onChange={(e) => setAtlasDescription(e.target.value)}
                    rows={4}
                    disabled={atlasDesigning}
                  />
                  
                  <Button 
                    onClick={handleAtlasDesign} 
                    disabled={!atlasDescription.trim() || atlasDesigning}
                    className="w-full"
                  >
                    {atlasDesigning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('agents.designing')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t('agents.design')}
                      </>
                    )}
                  </Button>

                  {designedAgent && (
                    <Card className="border-purple-200 dark:border-purple-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{designedAgent.name}</CardTitle>
                        <CardDescription>{designedAgent.mandate}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Primary Domain</Label>
                          <p className="text-sm">{designedAgent.primary_domain}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Cognitive Style</Label>
                          <p className="text-sm">{designedAgent.reasoning_mode} • {designedAgent.depth_level} • {designedAgent.decision_bias}</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Core Responsibilities</Label>
                          <ul className="text-sm list-disc list-inside">
                            {designedAgent.core_responsibilities.slice(0, 4).map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        {designedAgent.exclusions && designedAgent.exclusions.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Explicit Exclusions</Label>
                            <ul className="text-sm list-disc list-inside text-muted-foreground">
                              {designedAgent.exclusions.slice(0, 3).map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs text-muted-foreground">System Prompt Preview</Label>
                          <pre className="text-xs bg-muted p-2 rounded-md max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {designedAgent.system_prompt.substring(0, 500)}...
                          </pre>
                        </div>

                        <Button onClick={applyDesignedAgent} className="w-full">
                          <Check className="h-4 w-4 mr-2" />
                          {t('agents.applyDesign')}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? t('agents.edit') : t('agents.create')}</CardTitle>
            <CardDescription>{t('agents.configure')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('agents.name')}</Label>
                  <Input
                    id="name"
                    placeholder="CFO Advisor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('agents.description')}</Label>
                  <Input
                    id="description"
                    placeholder="Financial analysis expert"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('agents.type')}</Label>
                  <Select value={formData.icon} onValueChange={handleIconChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          {icon.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('agents.color')}</Label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          formData.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('agents.apiProvider')}</Label>
                <Select
                  value={formData.provider_profile_id || '__default__'}
                  onValueChange={(v) => setFormData({ ...formData, provider_profile_id: v === '__default__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('agents.apiProviderDefault')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{t('agents.apiProviderDefault')}</SelectItem>
                    {providers?.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('agents.apiProviderHint')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">{t('agents.systemPrompt')}</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="You are a helpful AI assistant..."
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={8}
                  required
                />
              </div>

                <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>{t('agents.temperature')}: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">{t('agents.temperatureHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_tokens">{t('agents.maxTokens')}</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    min={256}
                    max={8192}
                    disabled={formData.unlimited_tokens}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="unlimited_tokens"
                  checked={formData.unlimited_tokens}
                  onCheckedChange={(checked) => setFormData({ ...formData, unlimited_tokens: checked })}
                />
                <div>
                  <Label htmlFor="unlimited_tokens">{t('agents.unlimitedTokens')}</Label>
                  <p className="text-xs text-muted-foreground">{t('agents.unlimitedTokensHint')}</p>
                </div>
              </div>

              {!isSystemAgent && (
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? t('common.loading') : t('common.save')}
                </Button>
              )}
              {isSystemAgent && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">{t('agents.systemAgentReadOnly')}</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      const { error } = await supabase.from('agents').insert({
                        user_id: user!.id,
                        name: `${formData.name} (Copy)`,
                        description: formData.description || null,
                        icon: formData.icon,
                        color: formData.color,
                        system_prompt: formData.system_prompt,
                        provider_profile_id: formData.provider_profile_id || null,
                        temperature: formData.temperature,
                        max_tokens: formData.max_tokens,
                        unlimited_tokens: formData.unlimited_tokens,
                      });
                      if (error) {
                        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: t('agents.duplicated') });
                        navigate('/agents');
                      }
                    }}
                  >
                    {t('agents.duplicate')}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
