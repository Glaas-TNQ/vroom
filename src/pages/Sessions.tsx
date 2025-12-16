import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, Play, Plus, Trash2, Clock, CheckCircle2, XCircle, FileEdit, Target, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { CardActionsMenu } from '@/components/CardActionsMenu';

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

export default function Sessions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={cn("gap-1 text-xs", config.animate)}>
        <Icon className="h-3 w-3" />
        {t(`sessions.status.${status}`)}
      </Badge>
    );
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
          <div className="space-y-3">
            {sessions.map((session) => {
              const config = statusConfig[session.status];
              return (
                <HoverCard key={session.id} openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Link to={`/sessions/${session.id}`} className="block">
                      <Card 
                        className={cn(
                          "group border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer",
                          config.border
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-lg font-semibold truncate max-w-[500px]">
                                  {truncateText(session.topic, 80)}
                                </h3>
                                {getStatusBadge(session.status)}
                              </div>
                            </div>
                            <CardActionsMenu
                              actions={[
                                {
                                  label: t('sessions.view'),
                                  icon: ExternalLink,
                                  onClick: () => navigate(`/sessions/${session.id}`),
                                },
                                {
                                  label: t('common.delete'),
                                  icon: Trash2,
                                  onClick: () => deleteMutation.mutate(session.id),
                                  variant: 'destructive',
                                  separator: true,
                                },
                              ]}
                            />
                          </div>
                        </CardHeader>
                      
                      {session.objective && (
                        <CardContent className="pb-2">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.objective}
                          </p>
                        </CardContent>
                      )}
                      
                      <CardFooter className="pt-2 border-t border-border/50">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('sessions.round')} {session.current_round}/{session.max_rounds}
                          </span>
                          <span className="text-border">•</span>
                          <span>{new Date(session.created_at).toLocaleDateString()}</span>
                          {session.completed_at && (
                            <>
                              <span className="text-border">•</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {new Date(session.completed_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </CardFooter>
                      </Card>
                    </Link>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" side="top" align="start">
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
                          {t('sessions.round')} {session.current_round} {t('sessions.of')} {session.max_rounds}
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title={t('sessions.noSessions')}
            description={t('sessions.createFirst')}
            action={{
              label: t('sessions.create'),
              href: '/sessions/new',
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
