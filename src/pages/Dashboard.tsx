import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { supabase } from '@/integrations/supabase/client';
import { Bot, History, Key, Play, LayoutGrid, FileEdit, CheckCircle2, XCircle, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  topic: string;
  objective: string | null;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  current_round: number;
  max_rounds: number;
  created_at: string;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const statusConfig = {
  draft: {
    border: 'border-l-[hsl(var(--status-draft))]',
    icon: FileEdit,
    variant: 'outline' as const,
    animate: '',
  },
  running: {
    border: 'border-l-[hsl(var(--status-running))]',
    icon: Play,
    variant: 'default' as const,
    animate: 'animate-pulse',
  },
  completed: {
    border: 'border-l-[hsl(var(--status-completed))]',
    icon: CheckCircle2,
    variant: 'secondary' as const,
    animate: '',
  },
  cancelled: {
    border: 'border-l-[hsl(var(--status-cancelled))]',
    icon: XCircle,
    variant: 'destructive' as const,
    animate: '',
  },
};

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [agents, sessions, providers, rooms] = await Promise.all([
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('provider_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rooms').select('id', { count: 'exact', head: true }),
      ]);
      return {
        agents: agents.count || 0,
        sessions: sessions.count || 0,
        providers: providers.count || 0,
        rooms: rooms.count || 0,
      };
    },
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['recent-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as Session[];
    },
  });

  return (
    <AppLayout title={t('nav.dashboard')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.welcome')}</h1>
            <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
          <Button asChild>
            <Link to="/sessions/new">
              <Play className="h-4 w-4 mr-2" />
              {t('dashboard.startSession')}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.aiAgents')}</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.agents || 0}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.configuredAgents')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('nav.rooms')}</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.rooms || 0}</div>
              <p className="text-xs text-muted-foreground">{t('rooms.title')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.sessions')}</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sessions || 0}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalDeliberations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.apiProviders')}</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.providers || 0}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.connectedProviders')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentSessions')}</CardTitle>
              <CardDescription>{t('dashboard.recentSessionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <div className="space-y-2">
                  {recentSessions.map((session) => {
                    const config = statusConfig[session.status];
                    const Icon = config.icon;
                    return (
                      <HoverCard key={session.id} openDelay={300} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <Link
                            to={`/sessions/${session.id}`}
                            className={cn(
                              "block p-3 rounded-lg border border-l-4 hover:bg-accent/50 transition-colors",
                              config.border
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {truncateText(session.topic, 60)}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(session.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <Badge variant={config.variant} className={cn("gap-1 text-xs shrink-0", config.animate)}>
                                <Icon className="h-3 w-3" />
                                {t(`sessions.status.${session.status}`)}
                              </Badge>
                            </div>
                          </Link>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72" side="right" align="start">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-sm">{t('sessions.topic')}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {session.topic}
                              </p>
                            </div>
                            {session.objective && (
                              <div>
                                <h4 className="font-semibold text-sm flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {t('sessions.objective')}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {session.objective}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="text-xs text-muted-foreground">
                                {t('sessions.round')} {session.current_round}/{session.max_rounds}
                              </div>
                              <Badge variant={config.variant} className={cn("gap-1 text-xs", config.animate)}>
                                <Icon className="h-3 w-3" />
                                {t(`sessions.status.${session.status}`)}
                              </Badge>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('dashboard.noSessions')}</p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to="/sessions/new">{t('dashboard.startFirst')}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.quickSetup')}</CardTitle>
              <CardDescription>{t('dashboard.quickSetupDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link 
                to="/settings" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{t('dashboard.configureProviders')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.configureProvidersDesc')}</div>
                </div>
              </Link>
              <Link 
                to="/agents/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{t('dashboard.createAgent')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.createAgentDesc')}</div>
                </div>
              </Link>
              <Link 
                to="/sessions/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Play className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{t('dashboard.startASession')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.startASessionDesc')}</div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
