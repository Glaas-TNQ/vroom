import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

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

export default function AgentBuilder() {
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
  });

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
      });
    }
  }, [agent]);

  const isSystemAgent = agent?.is_system === true;

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isSystemAgent) {
        throw new Error('System agents cannot be modified');
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
      toast({ title: isEditing ? 'Agent updated' : 'Agent created' });
      navigate('/agents');
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save agent', description: error.message, variant: 'destructive' });
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

  if (agentLoading) {
    return (
      <AppLayout title="Agent Builder">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? 'Edit Agent' : 'Create Agent'}>
      <div className="max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/agents')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Agent' : 'Create New Agent'}</CardTitle>
            <CardDescription>
              Configure your AI agent's personality and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="CFO Advisor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
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
                  <Label>Agent Type</Label>
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
                  <Label>Color</Label>
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
                <Label>API Provider</Label>
                <Select
                  value={formData.provider_profile_id || '__default__'}
                  onValueChange={(v) => setFormData({ ...formData, provider_profile_id: v === '__default__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use Lovable AI (default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Use Lovable AI (default)</SelectItem>
                    {providers?.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use Lovable AI, or select your own provider
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
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
                  <Label>Temperature: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    min={256}
                    max={8192}
                  />
                </div>
              </div>

              {!isSystemAgent && (
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Agent' : 'Create Agent'}
                </Button>
              )}
              {isSystemAgent && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    System agents are read-only and cannot be modified
                  </p>
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
                      });
                      if (error) {
                        toast({ title: 'Failed to duplicate', description: error.message, variant: 'destructive' });
                      } else {
                        toast({ title: 'Agent duplicated' });
                        navigate('/agents');
                      }
                    }}
                  >
                    Duplicate as Custom Agent
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
