import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Bot, History, Key, Play, Plus, LayoutGrid } from 'lucide-react';

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
      return data || [];
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
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{session.topic}</div>
                      <div className="text-sm text-muted-foreground">
                        {t(`sessions.status.${session.status}`)} • {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
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
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{t('dashboard.configureProviders')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.configureProvidersDesc')}</div>
                </div>
              </Link>
              <Link 
                to="/agents/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{t('dashboard.createAgent')}</div>
                  <div className="text-sm text-muted-foreground">{t('dashboard.createAgentDesc')}</div>
                </div>
              </Link>
              <Link 
                to="/sessions/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
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
