import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Play, Square, Download, Loader2, PanelRightClose, PanelRight, FileText, ScrollText, ChevronDown } from 'lucide-react';
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

interface SessionResults {
  final_report?: string;
  methodology_used?: string;
  generated_at?: string;
}

interface Session {
  id: string;
  topic: string;
  objective: string | null;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  agent_config: AgentConfig[];
  transcript: TranscriptMessage[];
  results: SessionResults | null;
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
  const [activeTab, setActiveTab] = useState<'report' | 'transcript'>('report');

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
        results: data.results as SessionResults | null,
      } as Session;
    },
    refetchInterval: isRunning ? 2000 : false,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      setIsRunning(true);
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

  const exportReport = () => {
    if (!session || !session.results?.final_report) return;

    let markdown = `# ${session.topic}\n\n`;
    if (session.objective) {
      markdown += `> **${t('sessions.objective')}:** ${session.objective}\n\n`;
    }
    markdown += `---\n\n`;
    markdown += session.results.final_report;

    if (session.action_items && session.action_items.length > 0) {
      markdown += `\n\n---\n\n## ${t('sessionView.actionItems')}\n\n`;
      session.action_items.forEach((item: any, i: number) => {
        markdown += `${i + 1}. ${typeof item === 'string' ? item : item.title}\n`;
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vroom-report-${session.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('sessionView.reportExported') });
  };

  const exportFullSession = () => {
    if (!session) return;

    let markdown = `# ${session.topic}\n\n`;
    if (session.objective) {
      markdown += `> **${t('sessions.objective')}:** ${session.objective}\n\n`;
    }
    
    markdown += `**${t('sessions.status.completed')}:** ${session.completed_at ? new Date(session.completed_at).toLocaleString() : '-'}\n\n`;
    markdown += `---\n\n`;

    // Final Report
    if (session.results?.final_report) {
      markdown += `## ${t('sessionView.finalReport')}\n\n`;
      markdown += session.results.final_report;
      markdown += `\n\n---\n\n`;
    }

    // Action Items
    if (session.action_items && session.action_items.length > 0) {
      markdown += `## ${t('sessionView.actionItems')}\n\n`;
      session.action_items.forEach((item: any, i: number) => {
        markdown += `${i + 1}. ${typeof item === 'string' ? item : item.title}\n`;
      });
      markdown += `\n---\n\n`;
    }

    // Full Transcript
    markdown += `## ${t('sessionView.deliberationTranscript')}\n\n`;
    session.transcript.forEach((msg) => {
      markdown += `### ${msg.agent_name} (${t('sessions.round')} ${msg.round})\n\n${msg.content}\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vroom-session-full-${session.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('sessionView.sessionExported') });
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

  const hasFinalReport = session.results?.final_report;

  return (
    <AppLayout title={t('sessions.view')}>
      <div className="space-y-4">
        {/* Top Bar - always visible */}
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-2">
          <Button variant="ghost" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('sessionView.backToSessions')}
          </Button>
          <div className="flex gap-2">
            {session.status === 'completed' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('sessionView.export')}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasFinalReport && (
                    <DropdownMenuItem onClick={exportReport}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('sessionView.exportReport')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={exportFullSession}>
                    <ScrollText className="h-4 w-4 mr-2" />
                    {t('sessionView.exportFull')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Session Header - scrolls with page */}
        <div className="p-6 rounded-lg border bg-card overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-2xl font-semibold break-words min-w-0 flex-1">{session.topic}</h2>
            <div className="flex items-center gap-2 shrink-0">
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
            <p className="text-muted-foreground leading-relaxed break-words">{session.objective}</p>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground mt-3">
            <span>{t('sessions.round')} {session.current_round} {t('sessions.of')} {session.max_rounds}</span>
            <span>•</span>
            <span>{session.agent_config.length} {t('sessions.agents')}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex rounded-lg border overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Tabs for Report/Transcript */}
            {session.status === 'completed' && hasFinalReport ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'report' | 'transcript')} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b px-6 pt-2">
                  <TabsList className="bg-transparent p-0 h-auto">
                    <TabsTrigger 
                      value="report" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-4"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('sessionView.finalReport')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="transcript" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none pb-3 px-4"
                    >
                      <ScrollText className="h-4 w-4 mr-2" />
                      {t('sessionView.deliberationTranscript')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="report" className="flex-1 m-0 overflow-auto">
                  <div className="p-6 max-w-4xl">
                    <Markdown content={session.results.final_report} />
                  </div>
                </TabsContent>

                <TabsContent value="transcript" className="flex-1 m-0 overflow-auto">
                  <div className="p-6">
                    <div className="space-y-6">
                      {session.transcript.map((msg, i) => {
                        const agent = session.agent_config.find(a => a.id === msg.agent_id);
                        const agentColor = agent?.color || '#6366f1';
                        
                                        return (
                                          <div 
                                            key={i} 
                                            className="rounded-xl p-6 border-l-4 shadow-sm overflow-hidden"
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
                                            <div className="pl-[3.75rem] break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                              <Markdown content={msg.content} />
                                            </div>
                                          </div>
                                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              // Draft/Running/Cancelled or no report - show transcript
              <div className="flex-1 overflow-auto">
                <div className="p-6">
                  {session.transcript.length > 0 ? (
                    <div className="space-y-6">
                      {session.transcript.map((msg, i) => {
                        const agent = session.agent_config.find(a => a.id === msg.agent_id);
                        const agentColor = agent?.color || '#6366f1';
                        
                                        return (
                                          <div 
                                            key={i} 
                                            className="rounded-xl p-6 border-l-4 shadow-sm overflow-hidden"
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
                                            <div className="pl-[3.75rem] break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
              </div>
            )}
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
