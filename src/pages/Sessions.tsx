import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, Play, Plus, Trash2, Eye } from 'lucide-react';

interface Session {
  id: string;
  topic: string;
  objective: string | null;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  current_round: number;
  max_rounds: number;
  created_at: string;
  completed_at: string | null;
}

export default function Sessions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: t('sessions.deleted') });
    },
  });

  const getStatusBadge = (status: Session['status']) => {
    const variants: Record<Session['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      running: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status]}>{t(`sessions.status.${status}`)}</Badge>;
  };

  return (
    <AppLayout title={t('sessions.title')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('sessions.title')}</h1>
            <p className="text-muted-foreground">{t('sessions.subtitle')}</p>
          </div>
          <Button asChild>
            <Link to="/sessions/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('sessions.create')}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-3">
                        {session.topic}
                        {getStatusBadge(session.status)}
                      </CardTitle>
                      {session.objective && (
                        <CardDescription>{session.objective}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/sessions/${session.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.view')}
                        </Link>
                      </Button>
                      {session.status === 'draft' && (
                        <Button size="sm" asChild>
                          <Link to={`/sessions/${session.id}`}>
                            <Play className="h-4 w-4 mr-1" />
                            {t('common.start')}
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{t('sessions.round')} {session.current_round} {t('sessions.of')} {session.max_rounds}</span>
                    <span>•</span>
                    <span>{t('sessions.created')} {new Date(session.created_at).toLocaleDateString()}</span>
                    {session.completed_at && (
                      <>
                        <span>•</span>
                        <span>{t('sessions.status.completed')} {new Date(session.completed_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('sessions.noSessions')}</h3>
              <p className="text-muted-foreground text-center mb-4">{t('sessions.createFirst')}</p>
              <Button asChild>
                <Link to="/sessions/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('sessions.create')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
