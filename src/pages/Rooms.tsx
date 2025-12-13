import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSystemTranslation } from '@/hooks/useSystemTranslation';
import { Play, Trash2, Settings, Users, RotateCcw, Sparkles } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  workflow_type: string;
  agent_ids: string[];
  max_rounds: number;
  is_system: boolean;
  available_tools: any[];
}

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  sequential_pipeline: <span>→</span>,
  cyclic: <RotateCcw className="h-3 w-3" />,
  concurrent: <Users className="h-3 w-3" />,
};

export default function Rooms() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { translateSystemRoom } = useSystemTranslation();

  const getMethodologyLabel = (methodology: string) => {
    return t(`methodologies.${methodology}.label`, { defaultValue: methodology });
  };

  const getMethodologyColor = (methodology: string): string => {
    const colors: Record<string, string> = {
      analytical_structured: 'bg-blue-500/10 text-blue-500',
      strategic_executive: 'bg-purple-500/10 text-purple-500',
      creative_brainstorming: 'bg-yellow-500/10 text-yellow-500',
      lean_iterative: 'bg-green-500/10 text-green-500',
      parallel_ensemble: 'bg-orange-500/10 text-orange-500',
      group_chat: 'bg-muted text-muted-foreground',
    };
    return colors[methodology] || 'bg-muted text-muted-foreground';
  };

  const getWorkflowLabel = (workflow: string) => {
    return t(`workflows.${workflow}.label`, { defaultValue: workflow });
  };

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const roomsData = data as Room[];
      return roomsData.map(translateSystemRoom);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: t('common.delete') });
    },
  });

  const systemRooms = rooms?.filter(r => r.is_system) || [];
  const userRooms = rooms?.filter(r => !r.is_system) || [];

  return (
    <AppLayout title={t('rooms.title')}>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">{t('rooms.description')}</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/rooms/new')}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('rooms.create')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('rooms.systemRooms')}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemRooms.map((room) => (
                <Card key={room.id} className="hover:border-primary/50 transition-colors h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      <span className="truncate">{room.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{t('rooms.system')}</Badge>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      {room.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 mt-auto">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getMethodologyColor(room.methodology)}>
                        {getMethodologyLabel(room.methodology)}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {WORKFLOW_ICONS[room.workflow_type]}
                        {getWorkflowLabel(room.workflow_type)}
                      </Badge>
                      <Badge variant="outline">{room.max_rounds} rounds</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => navigate(`/sessions/new?roomId=${room.id}`)}>
                        <Play className="h-4 w-4 mr-1" />
                        {t('rooms.startSession')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/rooms/${room.id}`)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">{t('rooms.myRooms')}</h2>
            {userRooms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userRooms.map((room) => (
                  <Card key={room.id} className="hover:border-primary/50 transition-colors h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg truncate">{room.name}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                        {room.description || t('common.noDescription')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 mt-auto">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getMethodologyColor(room.methodology)}>
                          {getMethodologyLabel(room.methodology)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {WORKFLOW_ICONS[room.workflow_type]}
                          {getWorkflowLabel(room.workflow_type)}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => navigate(`/sessions/new?roomId=${room.id}`)}>
                          <Play className="h-4 w-4 mr-1" />
                          {t('rooms.startSession')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/rooms/${room.id}`)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(room.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>{t('rooms.noCustomRooms')}</p>
                  <Button variant="link" onClick={() => navigate('/rooms/new')}>
                    {t('rooms.createFirst')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
