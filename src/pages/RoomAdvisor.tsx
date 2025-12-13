import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function RoomAdvisor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Ciao! Sono il Room Advisor, il tuo consulente AI per la configurazione delle deliberazioni.

Raccontami cosa vuoi ottenere dalla tua prossima sessione di lavoro e ti consiglierò:
- La **metodologia** più adatta (McKinsey, OKR, Brainstorming, Lean, Ensemble)
- Il **flusso di lavoro** ideale (ciclico, sequenziale, parallelo)
- Gli **agenti** più indicati per il tuo obiettivo
- Il numero di **round** consigliato

Ad esempio, puoi dirmi:
- "Devo valutare se investire in una nuova linea di prodotto"
- "Voglio generare idee per una campagna marketing innovativa"
- "Devo decidere se acquisire una startup competitor"`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('room-advisor', {
        body: { message: userMessage, userId: user?.id },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Room Advisor error:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile contattare il Room Advisor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AppLayout title="Room Advisor">
      <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
        <Button variant="ghost" onClick={() => navigate('/rooms')} className="mb-4 self-start">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alle Rooms
        </Button>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Room Advisor AI
            </CardTitle>
            <CardDescription>
              Descrivi il tuo obiettivo e ricevi consigli personalizzati sulla configurazione della room
            </CardDescription>
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg p-4 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardContent className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Descrivi cosa vuoi ottenere..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
