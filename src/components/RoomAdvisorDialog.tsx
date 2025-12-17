import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Markdown } from '@/components/ui/markdown';
import { Bot, User, Send, Sparkles, Check, RotateCcw, Users, ArrowRight } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  workflow_type: string;
  agent_ids: string[];
  max_rounds: number;
  objective_template: string | null;
  is_system: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendedRoomId?: string | null;
}

interface RoomAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  sequential_pipeline: <ArrowRight className="h-3 w-3" />,
  cyclic: <RotateCcw className="h-3 w-3" />,
  concurrent: <Users className="h-3 w-3" />,
};

const METHODOLOGY_COLORS: Record<string, string> = {
  analytical_structured: 'bg-blue-500/10 text-blue-500',
  strategic_executive: 'bg-purple-500/10 text-purple-500',
  creative_brainstorming: 'bg-yellow-500/10 text-yellow-500',
  lean_iterative: 'bg-green-500/10 text-green-500',
  parallel_ensemble: 'bg-orange-500/10 text-orange-500',
  group_chat: 'bg-muted text-muted-foreground',
};

export function RoomAdvisorDialog({ open, onOpenChange, rooms, onSelectRoom }: RoomAdvisorDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm the Room Advisor. Tell me about the deliberation or decision you need to make, and I'll recommend the best room for your needs.",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [recommendedRoom, setRecommendedRoom] = useState<Room | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setMessages([
        {
          role: 'assistant',
          content: "Hi! I'm the Room Advisor. Tell me about the deliberation or decision you need to make, and I'll recommend the best room for your needs.",
        },
      ]);
      setChatInput('');
      setRecommendedRoom(null);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!chatInput.trim() || isThinking) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);

    const locale = localStorage.getItem('i18nextLng')?.split('-')[0] || 'en';

    try {
      const roomSummaries = rooms.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        methodology: r.methodology,
        workflow_type: r.workflow_type,
        max_rounds: r.max_rounds,
      }));

      const { data, error } = await supabase.functions.invoke('room-advisor', {
        body: {
          description: userMessage,
          rooms: roomSummaries,
          userId: user?.id,
          locale,
        },
      });

      if (error) throw error;

      const response = data?.response || "I couldn't analyze your request. Please try again with more details.";
      const recommendedRoomId = data?.recommendedRoomId;

      if (recommendedRoomId) {
        const room = rooms.find(r => r.id === recommendedRoomId);
        if (room) {
          setRecommendedRoom(room);
        }
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response,
        recommendedRoomId 
      }]);
    } catch (error) {
      console.error('Room Advisor error:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to get recommendation',
        variant: 'destructive',
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error. Please try again.",
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectRoom = () => {
    if (recommendedRoom) {
      onSelectRoom(recommendedRoom);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t('newSession.roomAdvisor')}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{t('newSession.askAdvisor')}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground max-w-[75%] p-4'
                      : 'bg-card text-card-foreground flex-1 max-w-[85%] p-4 border'
                  }`}
                >
                  <Markdown content={message.content} />
                </div>
                {message.role === 'user' && (
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-4">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-card text-card-foreground rounded-xl p-4 border">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}

            {/* Recommended Room Card */}
            {recommendedRoom && (
              <div className="ml-13 mt-4">
                <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                      {recommendedRoom.methodology === 'analytical_structured' ? '📊' :
                       recommendedRoom.methodology === 'strategic_executive' ? '🎯' :
                       recommendedRoom.methodology === 'creative_brainstorming' ? '💡' :
                       recommendedRoom.methodology === 'lean_iterative' ? '🚀' : '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{recommendedRoom.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {recommendedRoom.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={METHODOLOGY_COLORS[recommendedRoom.methodology] || 'bg-muted'}>
                      {recommendedRoom.methodology?.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {WORKFLOW_ICONS[recommendedRoom.workflow_type]}
                      {recommendedRoom.max_rounds} rounds
                    </Badge>
                  </div>
                  <Button onClick={handleSelectRoom} className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    {t('newSession.useThisRoom')}
                  </Button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 shrink-0 bg-background">
          <div className="flex gap-3">
            <Textarea
              placeholder={t('newSession.describeNeed')}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none flex-1"
              disabled={isThinking}
            />
            <Button
              onClick={sendMessage}
              disabled={!chatInput.trim() || isThinking}
              className="shrink-0 h-auto px-5"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
