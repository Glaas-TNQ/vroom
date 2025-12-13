import { useState } from 'react';
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
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
}

const ROOM_TEMPLATE = {
  name: 'Strategic Decision Review',
  description: 'Multi-perspective analysis for important business decisions',
  suggestedAgents: ['briefcase', 'scale', 'target', 'brain'],
  maxRounds: 3,
};

export default function NewSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    topic: '',
    objective: '',
    selectedAgentIds: [] as string[],
    maxRounds: 3,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*');
      if (error) throw error;
      return data as Agent[];
    },
  });

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
        <Button variant="ghost" onClick={() => navigate('/sessions')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        <div className="flex gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Define Your Topic</CardTitle>
              <CardDescription>
                What decision or topic do you want to deliberate on?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border mb-4">
                <div className="font-medium mb-1">{ROOM_TEMPLATE.name}</div>
                <div className="text-sm text-muted-foreground">{ROOM_TEMPLATE.description}</div>
              </div>

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
                  disabled={!canProceed || createMutation.isPending}
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
