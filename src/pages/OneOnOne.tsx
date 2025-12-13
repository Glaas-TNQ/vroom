import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Markdown } from '@/components/ui/markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Bot, User, Plus, History, Trash2, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: string;
  model: string | null;
}

interface ChatSession {
  id: string;
  title: string;
  last_agent_id: string | null;
  created_at: string;
  updated_at: string;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(searchParams.get('session'));
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch agents
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

  // Fetch provider profiles
  const { data: providers } = useQuery({
    queryKey: ['provider-profiles-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('id, name, provider_type, model')
        .order('name');
      if (error) throw error;
      return data as ProviderProfile[];
    },
    enabled: !!user,
  });

  // Fetch chat sessions
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['one-on-one-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('one_on_one_sessions')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ChatSession[];
    },
    enabled: !!user,
  });

  // Load session messages when session changes
  useEffect(() => {
    const loadSession = async () => {
      if (!currentSessionId) {
        setMessages([]);
        return;
      }

      const { data: sessionData } = await supabase
        .from('one_on_one_sessions')
        .select('last_agent_id')
        .eq('id', currentSessionId)
        .maybeSingle();

      if (sessionData?.last_agent_id) {
        setSelectedAgentId(sessionData.last_agent_id);
      }

      const { data: messagesData, error } = await supabase
        .from('one_on_one_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(
        messagesData.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          agentId: m.agent_id || undefined,
          agentName: m.agent_name || undefined,
          agentColor: m.agent_color || undefined,
        }))
      );
    };

    loadSession();
  }, [currentSessionId]);

  // Update URL when session changes
  useEffect(() => {
    if (currentSessionId) {
      setSearchParams({ session: currentSessionId });
    } else {
      setSearchParams({});
    }
  }, [currentSessionId, setSearchParams]);

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId);
  const selectedProvider = providers?.find((p) => p.id === selectedProviderId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Create new session
  const createSession = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('one_on_one_sessions')
      .insert({
        user_id: user!.id,
        title: t('oneOnOne.newChat'),
      })
      .select()
      .single();

    if (error) throw error;
    refetchSessions();
    return data.id;
  };

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('one_on_one_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-sessions'] });
      if (currentSessionId === deletedId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      toast({ title: t('oneOnOne.sessionDeleted') });
    },
  });

  const handleSend = async () => {
    if (!input.trim() || !selectedAgent || isLoading) return;

    let sessionId = currentSessionId;

    // Create session if not exists
    if (!sessionId) {
      try {
        sessionId = await createSession();
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error('Failed to create session:', error);
        toast({ title: t('common.error'), variant: 'destructive' });
        return;
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to DB
      await supabase.from('one_on_one_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage.content,
      });

      // Update session title if first message
      if (messages.length === 0) {
        const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
        await supabase
          .from('one_on_one_sessions')
          .update({ title, last_agent_id: selectedAgent.id })
          .eq('id', sessionId);
        refetchSessions();
      } else {
        // Update last agent
        await supabase
          .from('one_on_one_sessions')
          .update({ last_agent_id: selectedAgent.id })
          .eq('id', sessionId);
      }

      // Get conversation history from current messages
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('one-on-one-chat', {
        body: {
          agentId: selectedAgent.id,
          message: userMessage.content,
          history: conversationHistory,
          providerOverrideId: selectedProviderId || undefined,
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

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to DB
      await supabase.from('one_on_one_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: data.response,
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        agent_color: selectedAgent.color,
      });

      refetchSessions();
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
      setMessages((prev) => [...prev, errorMessage]);
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

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    setHistoryOpen(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setHistoryOpen(false);
  };

  return (
    <AppLayout title={t('oneOnOne.title')}>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header with agent selector, provider selector, and history */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
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

          {/* Provider override selector */}
          <div className="min-w-[180px]">
            <Select value={selectedProviderId || "__default__"} onValueChange={(v) => setSelectedProviderId(v === "__default__" ? "" : v)}>
              <SelectTrigger>
                <Settings2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('oneOnOne.defaultProvider')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">
                  {t('oneOnOne.defaultProvider')}
                </SelectItem>
                {providers?.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      <span>{provider.name}</span>
                      <span className="text-xs text-muted-foreground">({provider.provider_type})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              {t('oneOnOne.newChat')}
            </Button>

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  {t('oneOnOne.history')}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t('oneOnOne.chatHistory')}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {sessions?.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('oneOnOne.noHistory')}</p>
                  )}
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                        currentSessionId === session.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSessionMutation.mutate(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
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
                <p className="text-sm text-center max-w-md">
                  {selectedAgent?.description || t('oneOnOne.startChat')}
                </p>
                {selectedProvider && (
                  <p className="text-xs text-muted-foreground">
                    Using: {selectedProvider.name} ({selectedProvider.provider_type})
                  </p>
                )}
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
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' && message.agentName && (
                        <p className="text-xs font-medium mb-1" style={{ color: message.agentColor }}>
                          {message.agentName}
                        </p>
                      )}
                      {message.role === 'assistant' ? (
                        <Markdown content={message.content} className="text-sm" />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
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
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
