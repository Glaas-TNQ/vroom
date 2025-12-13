import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2, Bot, User, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  unlimited_tokens: boolean;
  is_system: boolean;
  provider_profile_id: string | null;
}

const ICONS_MAP: Record<string, string> = {
  briefcase: '💼',
  scale: '⚖️',
  target: '🎯',
  brain: '🧠',
  chart: '📊',
  bot: '🤖',
};

export default function OneOnOne() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: agents } = useQuery({
    queryKey: ['agents-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${user?.id}`)
        .order('name');
      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user,
  });

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('one-on-one-chat', {
        body: {
          agentId: selectedAgent.id,
          message: userMessage.content,
          history: conversationHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        agentColor: selectedAgent.color,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('oneOnOne.error'),
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        agentColor: selectedAgent.color,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleNewSession = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <AppLayout title={t('oneOnOne.title')}>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Agent selector header */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Select value={selectedAgentId} onValueChange={handleAgentChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('oneOnOne.selectAgent')} />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{ICONS_MAP[agent.icon] || '🤖'}</span>
                      <span>{agent.name}</span>
                      {agent.is_system && (
                        <span className="text-xs text-muted-foreground">({t('agents.systemAgent')})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('oneOnOne.newSession')}
            </Button>
          )}
        </div>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {!selectedAgentId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('oneOnOne.selectAgentPrompt')}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedAgent?.color + '20' }}
                >
                  {ICONS_MAP[selectedAgent?.icon || 'bot'] || '🤖'}
                </div>
                <p className="font-medium text-foreground">{selectedAgent?.name}</p>
                <p className="text-sm text-center max-w-md">{selectedAgent?.description || t('oneOnOne.startChat')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: message.agentColor + '30' }}
                      >
                        <Bot className="h-4 w-4" style={{ color: message.agentColor }} />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' && message.agentName && (
                        <p className="text-xs font-medium mb-1" style={{ color: message.agentColor }}>
                          {message.agentName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: selectedAgent?.color + '30' }}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: selectedAgent?.color }} />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <p className="text-sm text-muted-foreground">{t('oneOnOne.thinking')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input area */}
          <CardContent className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder={selectedAgentId ? t('oneOnOne.placeholder') : t('oneOnOne.selectAgentFirst')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedAgentId || isLoading}
                rows={1}
                className="min-h-[44px] max-h-[120px] resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !selectedAgentId || isLoading}
                size="icon"
                className="h-[44px] w-[44px] flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}