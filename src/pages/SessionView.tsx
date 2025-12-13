import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, Square, Download, Loader2 } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TranscriptMessage {
  agent_id: string;
  agent_name: string;
  content: string;
  round: number;
  timestamp: string;
}

interface Session {
  id: string;
  topic: string;
  objective: string | null;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  agent_config: AgentConfig[];
  transcript: TranscriptMessage[];
  results: any;
  action_items: any[];
  current_round: number;
  max_rounds: number;
  created_at: string;
  completed_at: string | null;
}

export default function SessionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      
      return {
        ...data,
        agent_config: (Array.isArray(data.agent_config) ? data.agent_config : []) as unknown as AgentConfig[],
        transcript: (Array.isArray(data.transcript) ? data.transcript : []) as unknown as TranscriptMessage[],
        action_items: (Array.isArray(data.action_items) ? data.action_items : []) as unknown as any[],
      } as Session;
    },
    refetchInterval: isRunning ? 2000 : false,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
      const { data, error } = await supabase.functions.invoke('run-session', {
        body: { sessionId: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setIsRunning(false);
      toast({ title: 'Session completed' });
    },
    onError: (error: Error) => {
      setIsRunning(false);
      toast({ title: 'Session failed', description: error.message, variant: 'destructive' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      toast({ title: 'Session stopped' });
    },
  });

  const exportMarkdown = () => {
    if (!session) return;

    let markdown = `# ${session.topic}\n\n`;
    if (session.objective) {
      markdown += `## Objective\n${session.objective}\n\n`;
    }
    
    markdown += `## Deliberation Transcript\n\n`;
    session.transcript.forEach((msg) => {
      markdown += `### ${msg.agent_name} (Round ${msg.round})\n${msg.content}\n\n`;
    });

    if (session.results) {
      markdown += `## Results\n${JSON.stringify(session.results, null, 2)}\n\n`;
    }

    if (session.action_items && session.action_items.length > 0) {
      markdown += `## Action Items\n`;
      session.action_items.forEach((item: any, i: number) => {
        markdown += `${i + 1}. ${item.title || item}\n`;
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vroom-session-${session.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const iconMap: Record<string, string> = {
    'briefcase': '💼',
    'scale': '⚖️',
    'target': '🎯',
    'brain': '🧠',
    'chart': '📊',
    'bot': '🤖',
  };

  const getStatusBadge = (status: Session['status']) => {
    const variants: Record<Session['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      running: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <AppLayout title="Session">
        <div className="text-center py-12 text-muted-foreground">Loading session...</div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout title="Session">
        <div className="text-center py-12 text-muted-foreground">Session not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Session">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <div className="flex gap-2">
            {session.status === 'completed' && (
              <Button variant="outline" onClick={exportMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                Export Markdown
              </Button>
            )}
            {session.status === 'draft' && (
              <Button onClick={() => runMutation.mutate()} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunning ? 'Running...' : 'Start Session'}
              </Button>
            )}
            {session.status === 'running' && (
              <Button variant="destructive" onClick={() => stopMutation.mutate()}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{session.topic}</CardTitle>
                  {getStatusBadge(session.status)}
                </div>
                {session.objective && (
                  <CardDescription>{session.objective}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Round {session.current_round} of {session.max_rounds}</span>
                  <span>•</span>
                  <span>{session.agent_config.length} agents</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deliberation</CardTitle>
              </CardHeader>
              <CardContent>
                {session.transcript.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {session.transcript.map((msg, i) => {
                        const agent = session.agent_config.find(a => a.id === msg.agent_id);
                        return (
                          <div key={i} className="flex gap-3">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                              style={{ backgroundColor: (agent?.color || '#6366f1') + '20' }}
                            >
                              {iconMap[agent?.icon || 'bot'] || '🤖'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{msg.agent_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Round {msg.round}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      {isRunning && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Agents are deliberating...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {session.status === 'draft' ? (
                      <p>Click "Start Session" to begin the deliberation</p>
                    ) : (
                      <p>No messages yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.agent_config.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: agent.color + '20' }}
                      >
                        {iconMap[agent.icon] || '🤖'}
                      </div>
                      <span className="font-medium text-sm">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {session.action_items && session.action_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {session.action_items.map((item: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span>{typeof item === 'string' ? item : item.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
