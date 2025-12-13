import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Bot, History, Key, Play, Plus } from 'lucide-react';

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [agents, sessions, providers] = await Promise.all([
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('provider_profiles').select('id', { count: 'exact', head: true }),
      ]);
      return {
        agents: agents.count || 0,
        sessions: sessions.count || 0,
        providers: providers.count || 0,
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
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome to Vroom</h1>
            <p className="text-muted-foreground">AI-powered strategic deliberation platform</p>
          </div>
          <Button asChild>
            <Link to="/sessions/new">
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.agents || 0}</div>
              <p className="text-xs text-muted-foreground">Configured agents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sessions || 0}</div>
              <p className="text-xs text-muted-foreground">Total deliberations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Providers</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.providers || 0}</div>
              <p className="text-xs text-muted-foreground">Connected providers</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest deliberation sessions</CardDescription>
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
                        {session.status} • {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions yet</p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to="/sessions/new">Start your first session</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Get started with Vroom</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link 
                to="/settings" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Configure API Providers</div>
                  <div className="text-sm text-muted-foreground">Add your OpenAI, Anthropic, or custom endpoints</div>
                </div>
              </Link>
              <Link 
                to="/agents/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Create an Agent</div>
                  <div className="text-sm text-muted-foreground">Build specialized AI agents for your deliberations</div>
                </div>
              </Link>
              <Link 
                to="/sessions/new" 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Play className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Start a Session</div>
                  <div className="text-sm text-muted-foreground">Run a multi-agent deliberation on your topic</div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
