import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { ICON_MAP } from '@/components/AgentIconPicker';
import { Agent } from '@/hooks/useAgents';
import { useTranslatedAgents } from '@/hooks/useSystemTranslation';

export default function Agents() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Using ICON_MAP from AgentIconPicker

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
                      {!agent.is_system && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteMutation.mutate(agent.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('agents.noAgents')}</h3>
              <p className="text-muted-foreground text-center mb-4">{t('agents.noAgentsDesc')}</p>
              <Button asChild>
                <Link to="/agents/new">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('agents.create')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
