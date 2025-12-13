import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Trash2, Edit } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  system_prompt: string;
  is_system: boolean;
  temperature: number;
  max_tokens: number;
}

export default function Agents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: 'Agent deleted' });
    },
  });

  const iconMap: Record<string, string> = {
    'briefcase': '💼',
    'scale': '⚖️',
    'target': '🎯',
    'brain': '🧠',
    'chart': '📊',
    'bot': '🤖',
  };

  return (
    <AppLayout title="Agents">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Agents</h1>
            <p className="text-muted-foreground">Create and manage specialized AI agents for deliberations</p>
          </div>
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading agents...</div>
        ) : agents && agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="relative group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: agent.color + '20' }}
                    >
                      {iconMap[agent.icon] || '🤖'}
                    </div>
                    {!agent.is_system && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/agents/${agent.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(agent.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {agent.name}
                    {agent.is_system && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-normal">System</span>
                    )}
                  </CardTitle>
                  <CardDescription>{agent.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Temperature: {agent.temperature}</div>
                    <div>Max Tokens: {agent.max_tokens}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No agents yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first AI agent to start building deliberation teams
              </p>
              <Button asChild>
                <Link to="/agents/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
