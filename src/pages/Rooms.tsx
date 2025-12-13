import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Play, Trash2, Settings, Users, RotateCcw, Sparkles } from 'lucide-react';

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

const METHODOLOGY_LABELS: Record<string, { label: string; color: string }> = {
  analytical_structured: { label: 'McKinsey', color: 'bg-blue-500/10 text-blue-500' },
  strategic_executive: { label: 'OKR/BSC', color: 'bg-purple-500/10 text-purple-500' },
  creative_brainstorming: { label: 'Brainstorming', color: 'bg-yellow-500/10 text-yellow-500' },
  lean_iterative: { label: 'Lean', color: 'bg-green-500/10 text-green-500' },
  parallel_ensemble: { label: 'Ensemble', color: 'bg-orange-500/10 text-orange-500' },
  group_chat: { label: 'Group Chat', color: 'bg-muted text-muted-foreground' },
};

const WORKFLOW_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  sequential_pipeline: { label: 'Sequenziale', icon: <span>→</span> },
  cyclic: { label: 'Ciclico', icon: <RotateCcw className="h-3 w-3" /> },
  concurrent: { label: 'Parallelo', icon: <Users className="h-3 w-3" /> },
};

export default function Rooms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Room[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room eliminata' });
    },
  });

  const systemRooms = rooms?.filter(r => r.is_system) || [];
  const userRooms = rooms?.filter(r => !r.is_system) || [];

  return (
    <AppLayout title="Rooms">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Le rooms definiscono le regole di interazione per le sessioni di deliberazione
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/rooms/advisor')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Room Advisor
          </Button>
          <Button onClick={() => navigate('/rooms/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Room
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-8">
          {/* System Rooms */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Metodologie Pre-configurate
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemRooms.map((room) => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  onStart={() => navigate(`/sessions/new?roomId=${room.id}`)}
                  onEdit={() => navigate(`/rooms/${room.id}`)}
                />
              ))}
            </div>
          </div>

          {/* User Rooms */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Le Mie Rooms</h2>
            {userRooms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userRooms.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onStart={() => navigate(`/sessions/new?roomId=${room.id}`)}
                    onEdit={() => navigate(`/rooms/${room.id}`)}
                    onDelete={() => deleteMutation.mutate(room.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Non hai ancora creato rooms personalizzate.</p>
                  <Button variant="link" onClick={() => navigate('/rooms/new')}>
                    Crea la tua prima room
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

function RoomCard({ 
  room, 
  onStart, 
  onEdit,
  onDelete 
}: { 
  room: Room; 
  onStart: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const methodology = METHODOLOGY_LABELS[room.methodology] || METHODOLOGY_LABELS.group_chat;
  const workflow = WORKFLOW_LABELS[room.workflow_type] || WORKFLOW_LABELS.cyclic;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {room.name}
              {room.is_system && (
                <Badge variant="secondary" className="text-xs">Sistema</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {room.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={methodology.color}>
            {methodology.label}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {workflow.icon}
            {workflow.label}
          </Badge>
          <Badge variant="outline">
            {room.max_rounds} rounds
          </Badge>
        </div>

        {room.available_tools && room.available_tools.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Tools: {room.available_tools.map((t: any) => t.name || t).join(', ')}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onStart}>
            <Play className="h-4 w-4 mr-1" />
            Start Session
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Settings className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
