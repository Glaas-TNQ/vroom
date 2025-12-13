import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Play, Layout } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
}

interface RoomTemplate {
  id: string;
  name: string;
  description: string | null;
  agent_ids: string[];
  max_rounds: number;
  objective: string | null;
  is_system: boolean;
}

export default function NewSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);

  const [formData, setFormData] = useState({
    topic: '',
    objective: '',
    selectedAgentIds: [] as string[],
    maxRounds: 3,
  });

  const { data: templates } = useQuery({
    queryKey: ['room-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_templates')
        .select('*')
        .order('is_system', { ascending: false });
      if (error) throw error;
      return data as RoomTemplate[];
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

  const selectTemplate = (template: RoomTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      objective: template.objective || '',
      selectedAgentIds: template.agent_ids,
      maxRounds: template.max_rounds,
    });
    setStep(1);
  };

  const skipTemplate = () => {
    setSelectedTemplate(null);
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
          room_template_id: selectedTemplate?.id || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Session created' });
      navigate(`/sessions/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create session', description: error.message, variant: 'destructive' });
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

  return (
    <AppLayout title="New Session">
      <div className="max-w-2xl">
        <Button variant="ghost" onClick={() => step === 0 ? navigate('/sessions') : setStep(step - 1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 0 ? 'Back to Sessions' : 'Back'}
        </Button>

        <div className="flex gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 0 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Template</CardTitle>
              <CardDescription>
                Start with a pre-configured room or create a custom session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates && templates.length > 0 ? (
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className="flex items-start gap-4 p-4 rounded-lg border text-left hover:bg-accent transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layout className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {template.name}
                          {template.is_system && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Template</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {template.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.agent_ids.length} agents • {template.max_rounds} rounds
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No templates available
                </div>
              )}

              <div className="border-t pt-4">
                <Button variant="outline" onClick={skipTemplate} className="w-full">
                  Create Custom Session
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Define Your Topic</CardTitle>
              <CardDescription>
                {selectedTemplate 
                  ? `Using template: ${selectedTemplate.name}`
                  : 'What decision or topic do you want to deliberate on?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate && (
                <div className="p-4 rounded-lg bg-muted/50 border mb-4">
                  <div className="font-medium mb-1">{selectedTemplate.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedTemplate.description}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Question</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Should we expand into the European market?"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective (optional)</Label>
                <Textarea
                  id="objective"
                  placeholder="What specific outcome are you looking for?"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Rounds</Label>
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
                Next: Select Agents
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Agents</CardTitle>
              <CardDescription>
                Choose at least 2 agents to participate in the deliberation
                {selectedTemplate && ` (pre-selected from template)`}
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
                          {agent.description || 'No description'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No agents created yet.</p>
                  <Button variant="link" onClick={() => navigate('/agents/new')}>
                    Create your first agent
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={formData.selectedAgentIds.length < 2 || createMutation.isPending}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
