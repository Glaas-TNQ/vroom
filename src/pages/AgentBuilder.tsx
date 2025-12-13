import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Sparkles, MessageSquare, Thermometer, Coins, Bot } from 'lucide-react';
import AtlasDesignWorkspace from '@/components/AtlasDesignWorkspace';
import AgentIconPicker, { ICON_MAP } from '@/components/AgentIconPicker';

// Icons are now in AgentIconPicker component

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
  short_description: string;
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
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  
  // Check if navigated with an Atlas prompt prefilled from Room Advisor
  const prefilledAtlasPrompt = (location.state as { atlasPrompt?: string })?.atlasPrompt;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'bot',
    color: '#6366f1',
    avatar_url: null as string | null,
    system_prompt: SYSTEM_PROMPT_TEMPLATES['bot'],
    provider_profile_id: '',
    temperature: 0.7,
    max_tokens: 2048,
    unlimited_tokens: false,
  });

  const [atlasMode, setAtlasMode] = useState(!!prefilledAtlasPrompt);
  const [initialAtlasDescription, setInitialAtlasDescription] = useState(prefilledAtlasPrompt || '');

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
        avatar_url: (agent as any).avatar_url || null,
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
      if (isEditing && isSystemAgent) {
        // For system agents, create a user-specific copy instead of modifying the global one
        // Check if user already has a personalized copy of this system agent
        const { data: existingCopy } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user!.id)
          .eq('source_system_agent_id', id)
          .single();

        const personalizedPayload = {
          user_id: user!.id,
          name: agent!.name, // Keep original name
          description: agent!.description,
          icon: data.icon,
          color: data.color,
          avatar_url: data.avatar_url,
          system_prompt: agent!.system_prompt, // Keep original system prompt
          provider_profile_id: data.provider_profile_id || null,
          temperature: Number(agent!.temperature),
          max_tokens: agent!.max_tokens,
          unlimited_tokens: (agent as any).unlimited_tokens || false,
          is_system: false,
          source_system_agent_id: id, // Track which system agent this came from
        };

        if (existingCopy) {
          // Update existing personalized copy
          const { error } = await supabase
            .from('agents')
            .update({
              icon: data.icon,
              color: data.color,
              avatar_url: data.avatar_url,
              provider_profile_id: data.provider_profile_id || null,
            })
            .eq('id', existingCopy.id);
          if (error) throw error;
        } else {
          // Create new personalized copy
          const { error } = await supabase.from('agents').insert(personalizedPayload);
          if (error) throw error;
        }
      } else {
        const payload = {
          user_id: user!.id,
          name: data.name,
          description: data.description || null,
          icon: data.icon,
          color: data.color,
          avatar_url: data.avatar_url,
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

  const handleAtlasApply = (spec: AgentSpec, providerId: string) => {
    setFormData({
      ...formData,
      name: spec.name,
      description: spec.short_description || spec.mandate,
      icon: spec.suggested_icon || 'bot',
      system_prompt: spec.system_prompt,
      temperature: spec.suggested_temperature,
      provider_profile_id: providerId,
    });

    setAtlasMode(false);
    toast({ title: t('common.success'), description: 'Agent design applied!' });
  };

  // Remove old iconMap - now using ICON_MAP from AgentIconPicker

  const getProviderName = () => {
    if (!formData.provider_profile_id) return 'Lovable AI';
    const provider = providers?.find(p => p.id === formData.provider_profile_id);
    return provider?.name || 'Custom';
  };

  if (agentLoading) {
    return (
      <AppLayout title={t('agents.builder')}>
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  // Atlas workspace mode - full page takeover
  if (atlasMode) {
    return (
      <AppLayout title={t('agents.atlasDesigner')}>
        <AtlasDesignWorkspace
          atlasPrompt={atlasAgent?.system_prompt}
          providers={providers}
          onApply={handleAtlasApply}
          onCancel={() => {
            setAtlasMode(false);
            setInitialAtlasDescription('');
          }}
          initialDescription={initialAtlasDescription}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? t('agents.edit') : t('agents.create')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('agents.backToAgents')}
          </Button>
          
          {!isEditing && (
            <Button variant="outline" onClick={() => setAtlasMode(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              {t('agents.designWithAtlas')}
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Column - 2/3 width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? t('agents.edit') : t('agents.create')}</CardTitle>
                <CardDescription>{t('agents.configure')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info Row */}
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
                      <Label htmlFor="description">
                        {t('agents.description')} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="2-3 sentence overview of agent expertise for quick selection..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        maxLength={250}
                        required={!isSystemAgent}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.description.length}/250 - Used for agent selection and context efficiency
                      </p>
                    </div>
                  </div>

                  {/* Appearance Row */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('agents.type')}</Label>
                      <div className="flex items-center gap-3">
                        <AgentIconPicker
                          value={formData.icon}
                          avatarUrl={formData.avatar_url}
                          color={formData.color}
                          onIconChange={(icon) => setFormData({ ...formData, icon })}
                          onAvatarChange={(url) => setFormData({ ...formData, avatar_url: url })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Click to choose icon or upload image
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('agents.color')}</Label>
                      <div className="flex gap-2 pt-1">
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

                  {/* Provider */}
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

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="system_prompt">{t('agents.systemPrompt')}</Label>
                    <Textarea
                      id="system_prompt"
                      placeholder="You are a helpful AI assistant..."
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      rows={10}
                      className="font-mono text-sm"
                      required
                    />
                  </div>

                  {/* Temperature and Tokens Row */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        {t('agents.temperature')}: {formData.temperature}
                      </Label>
                      <Slider
                        value={[formData.temperature]}
                        onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">{t('agents.temperatureHint')}</p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="max_tokens" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {t('agents.maxTokens')}
                      </Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                        min={256}
                        max={8192}
                        disabled={formData.unlimited_tokens}
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="unlimited_tokens"
                          checked={formData.unlimited_tokens}
                          onCheckedChange={(checked) => setFormData({ ...formData, unlimited_tokens: checked })}
                        />
                        <Label htmlFor="unlimited_tokens" className="text-xs">{t('agents.unlimitedTokens')}</Label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  {!isSystemAgent && (
                    <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? t('common.loading') : t('common.save')}
                    </Button>
                  )}
                  {isSystemAgent && (
                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={saveMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveMutation.isPending ? t('common.loading') : t('agents.saveChanges')}
                      </Button>
                      <p className="text-sm text-muted-foreground text-center">{t('agents.systemAgentAppearanceHint')}</p>
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

          {/* Preview Column - 1/3 width */}
          <div className="space-y-4">
            {/* Agent Preview Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('agents.preview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Avatar Preview */}
                <div className="flex items-center gap-3">
                  {formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url} 
                      alt="Agent avatar" 
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${formData.color}20` }}
                    >
                      {ICON_MAP[formData.icon] || '🤖'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {formData.name || 'Agent Name'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {formData.description || 'No description'}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Thermometer className="h-3 w-3" />
                      Temperature
                    </div>
                    <div className="font-semibold">{formData.temperature}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Coins className="h-3 w-3" />
                      Tokens
                    </div>
                    <div className="font-semibold">
                      {formData.unlimited_tokens ? '∞' : formData.max_tokens}
                    </div>
                  </div>
                </div>

                {/* Provider Badge */}
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">
                    {getProviderName()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Session Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Session Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="rounded-lg p-4 border-l-4"
                  style={{ 
                    borderLeftColor: formData.color,
                    backgroundColor: `${formData.color}08`
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Agent avatar" 
                        className="h-8 w-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: `${formData.color}20` }}
                      >
                        {ICON_MAP[formData.icon] || '🤖'}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-sm">
                        {formData.name || 'Agent Name'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">Round 1</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">
                    This is how the agent's messages will appear during deliberation sessions...
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* System Prompt Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Prompt Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {formData.system_prompt || 'No system prompt defined...'}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
