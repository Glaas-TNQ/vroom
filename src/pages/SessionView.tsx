import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, Square, Download, Loader2, GripVertical, PanelRightClose, PanelRight } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';

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
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      // Get current locale
      const locale = localStorage.getItem('i18nextLng')?.split('-')[0] || 'en';
      const { data, error } = await supabase.functions.invoke('run-session', {
        body: { sessionId: id, locale },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setIsRunning(false);
      toast({ title: t('sessions.completed') });
    },
    onError: (error: Error) => {
      setIsRunning(false);
      toast({ title: t('sessions.failed'), description: error.message, variant: 'destructive' });
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
      toast({ title: t('sessions.stopped') });
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
    return <Badge variant={variants[status]}>{t(`sessions.status.${status}`)}</Badge>;
  };

  if (isLoading) {
    return (
      <AppLayout title={t('sessions.view')}>
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout title={t('sessions.view')}>
        <div className="text-center py-12 text-muted-foreground">{t('sessionView.notFound')}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('sessions.view')}>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('sessionView.backToSessions')}
          </Button>
          <div className="flex gap-2">
            {session.status === 'completed' && (
              <Button variant="outline" onClick={exportMarkdown}>
                <Download className="h-4 w-4 mr-2" />
                {t('sessionView.exportMarkdown')}
              </Button>
            )}
            {session.status === 'draft' && (
              <Button onClick={() => runMutation.mutate()} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunning ? t('common.running') : t('sessionView.startSession')}
              </Button>
            )}
            {session.status === 'running' && (
              <Button variant="destructive" onClick={() => stopMutation.mutate()}>
                <Square className="h-4 w-4 mr-2" />
                {t('common.stop')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex rounded-lg border overflow-hidden">
          {/* Main Content - Deliberation */}
          <div className="flex-1 h-full flex flex-col min-w-0">
            {/* Session Header */}
            <div className="p-6 border-b bg-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-semibold">{session.topic}</h2>
                <div className="flex items-center gap-2">
                  {getStatusBadge(session.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="ml-2"
                  >
                    {sidebarOpen ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {session.objective && (
                <p className="text-muted-foreground leading-relaxed">{session.objective}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground mt-3">
                <span>{t('sessions.round')} {session.current_round} {t('sessions.of')} {session.max_rounds}</span>
                <span>•</span>
                <span>{session.agent_config.length} {t('sessions.agents')}</span>
              </div>
            </div>

            {/* Deliberation Messages */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {session.transcript.length > 0 ? (
                  <div className="space-y-6">
                    {session.transcript.map((msg, i) => {
                      const agent = session.agent_config.find(a => a.id === msg.agent_id);
                      const agentColor = agent?.color || '#6366f1';
                      
                      return (
                        <div 
                          key={i} 
                          className="rounded-xl p-6 border-l-4 shadow-sm"
                          style={{ 
                            borderLeftColor: agentColor,
                            backgroundColor: `${agentColor}06`
                          }}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div
                              className="h-11 w-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
                              style={{ backgroundColor: `${agentColor}20` }}
                            >
                              {iconMap[agent?.icon || 'bot'] || '🤖'}
                            </div>
                            <div>
                              <span className="font-semibold text-base">{msg.agent_name}</span>
                              <span className="text-xs text-muted-foreground ml-3 bg-muted px-2 py-0.5 rounded-full">
                                {t('sessions.round')} {msg.round}
                              </span>
                            </div>
                          </div>
                          <div className="pl-[3.75rem]">
                            <Markdown content={msg.content} />
                          </div>
                        </div>
                      );
                    })}
                    {isRunning && (
                      <div className="flex items-center gap-3 text-muted-foreground p-6 bg-muted/30 rounded-xl">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">{t('sessionView.agentsDeliberating')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    {session.status === 'draft' ? (
                      <p className="text-lg">{t('sessionView.clickStart')}</p>
                    ) : (
                      <p className="text-lg">{t('sessionView.noMessages')}</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Collapsible Sidebar - Agents and Action Items */}
          {sidebarOpen && (
            <div className="w-72 border-l bg-muted/30 shrink-0">
              <ScrollArea className="h-full">
                <div className="p-5 space-y-6">
                  {/* Agents */}
                  <div>
                    <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">{t('nav.agents')}</h3>
                    <div className="space-y-2">
                      {session.agent_config.map((agent) => (
                        <div 
                          key={agent.id} 
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: `${agent.color}10` }}
                        >
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ backgroundColor: `${agent.color}20` }}
                          >
                            {iconMap[agent.icon] || '🤖'}
                          </div>
                          <span className="font-medium text-sm">{agent.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Items */}
                  {session.action_items && session.action_items.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">{t('sessionView.actionItems')}</h3>
                      <ul className="space-y-2">
                        {session.action_items.map((item: any, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-background border">
                            <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                            <span className="leading-relaxed">{typeof item === 'string' ? item : item.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
