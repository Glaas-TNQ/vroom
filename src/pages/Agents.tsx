import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Trash2, Settings } from 'lucide-react';
import { ICON_MAP } from '@/components/AgentIconPicker';
import { Agent } from '@/hooks/useAgents';
import { useTranslatedAgents } from '@/hooks/useSystemTranslation';
import { EmptyState } from '@/components/EmptyState';
import { CardActionsMenu } from '@/components/CardActionsMenu';

export default function Agents() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: agents, isLoading } = useTranslatedAgents();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({ title: t('agents.deleted') });
    },
  });

  return (
    <AppLayout title={t('agents.title')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('agents.title')}</h1>
            <p className="text-muted-foreground">{t('agents.subtitle')}</p>
          </div>
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('agents.create')}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
        ) : agents && agents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link key={agent.id} to={`/agents/${agent.id}`} className="block h-full">
                <Card className="relative group hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between">
                      {agent.avatar_url ? (
                        <img 
                          src={agent.avatar_url} 
                          alt={agent.name} 
                          className="h-12 w-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div 
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: agent.color + '20' }}
                        >
                          {ICON_MAP[agent.icon] || '🤖'}
                        </div>
                      )}
                      <CardActionsMenu
                        actions={[
                          {
                            label: t('common.settings'),
                            icon: Settings,
                            onClick: () => navigate(`/agents/${agent.id}`),
                          },
                          ...(!agent.is_system ? [{
                            label: t('common.delete'),
                            icon: Trash2,
                            onClick: () => deleteMutation.mutate(agent.id),
                            variant: 'destructive' as const,
                            separator: true,
                          }] : []),
                        ]}
                      />
                    </div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      <span className="truncate">{agent.name}</span>
                      {agent.is_system && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded font-normal shrink-0">{t('agents.systemAgent')}</span>
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      {agent.description || t('common.noDescription')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bot}
            title={t('agents.noAgents')}
            description={t('agents.noAgentsDesc')}
            action={{
              label: t('agents.create'),
              href: '/agents/new',
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
