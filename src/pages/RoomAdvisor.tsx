import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  LayoutGrid, 
  Users, 
  Copy, 
  Check,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import ArchimedeDesignWorkspace from '@/components/ArchimedeDesignWorkspace';
import { Markdown } from '@/components/ui/markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendation?: RoomRecommendation | null;
  suggested_agents?: SuggestedAgent[];
  missing_agents?: MissingAgent[];
  ready_to_create?: boolean;
}

interface RoomRecommendation {
  methodology?: string;
  workflow_type?: string;
  max_rounds?: number;
  suggested_room_name?: string;
  suggested_description?: string;
  objective_template?: string;
}

interface SuggestedAgent {
  agent_id: string;
  agent_name: string;
  role_in_room: string;
}

interface MissingAgent {
  suggested_name: string;
  expertise: string;
  why_needed: string;
  atlas_prompt: string;
}

interface RoomSpec {
  name: string;
  short_description: string;
  methodology: string;
  workflow_type: string;
  max_rounds: number;
  agent_ids: string[];
  available_tools?: string[];
  require_consensus?: boolean;
  objective_template: string;
}

const METHODOLOGY_COLORS: Record<string, string> = {
  analytical_structured: 'bg-blue-500/10 text-blue-500',
  strategic_executive: 'bg-purple-500/10 text-purple-500',
  creative_brainstorming: 'bg-yellow-500/10 text-yellow-500',
  lean_iterative: 'bg-green-500/10 text-green-500',
  parallel_ensemble: 'bg-orange-500/10 text-orange-500',
};

export default function RoomAdvisor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('roomAdvisor.welcome'),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [archimedeMode, setArchimedeMode] = useState(false);
  const [prefilledDescription, setPrefilledDescription] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const { data: archimedeAgent } = useQuery({
    queryKey: ['archimede-agent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('system_prompt')
        .eq('name', 'Archimede')
        .eq('is_system', true)
        .single();
      if (error) return null;
      return data;
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('room-advisor', {
        body: { 
          message: userMessage, 
          userId: user?.id,
          conversationHistory 
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: data.response,
          recommendation: data.recommendation,
          suggested_agents: data.suggested_agents,
          missing_agents: data.missing_agents,
          ready_to_create: data.ready_to_create,
        },
      ]);
    } catch (error) {
      console.error('Room Advisor error:', error);
      toast({
        title: t('common.error'),
        description: t('roomAdvisor.error'),
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

  const handleCreateWithArchimede = (recommendation?: RoomRecommendation) => {
    // Build a description from the conversation and recommendation
    let description = '';
    
    // Get the last user message as context
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      description = lastUserMessage.content;
    }

    // Add recommendation details if available
    if (recommendation) {
      if (recommendation.suggested_room_name) {
        description += `\n\nRoom Name: ${recommendation.suggested_room_name}`;
      }
      if (recommendation.suggested_description) {
        description += `\nDescription: ${recommendation.suggested_description}`;
      }
      if (recommendation.methodology) {
        description += `\nMethodology: ${recommendation.methodology}`;
      }
    }

    setPrefilledDescription(description);
    setArchimedeMode(true);
  };

  const handleArchimedeApply = (spec: RoomSpec) => {
    // Navigate to room builder with prefilled data
    navigate('/rooms/new', { 
      state: { 
        prefilled: {
          name: spec.name,
          description: spec.short_description,
          methodology: spec.methodology,
          workflow_type: spec.workflow_type,
          max_rounds: spec.max_rounds,
          agent_ids: spec.agent_ids,
          objective_template: spec.objective_template,
          available_tools: spec.available_tools || [],
        }
      }
    });
  };

  const copyAtlasPrompt = async (prompt: string, agentName: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(agentName);
    toast({ title: 'Copied!', description: `Atlas prompt for "${agentName}" copied to clipboard` });
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const navigateToAtlasWithPrompt = (prompt: string) => {
    navigate('/agents/new', { state: { atlasPrompt: prompt } });
  };

  const renderRecommendationCard = (message: Message) => {
    if (!message.recommendation && !message.suggested_agents?.length && !message.missing_agents?.length) {
      return null;
    }

    return (
      <div className="mt-4 space-y-4">
        {/* Recommendation Summary */}
        {message.recommendation && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Room Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {message.recommendation.methodology && (
                  <Badge className={METHODOLOGY_COLORS[message.recommendation.methodology] || 'bg-muted'}>
                    {message.recommendation.methodology.replace('_', ' ')}
                  </Badge>
                )}
                {message.recommendation.workflow_type && (
                  <Badge variant="outline">{message.recommendation.workflow_type}</Badge>
                )}
                {message.recommendation.max_rounds && (
                  <Badge variant="outline">{message.recommendation.max_rounds} rounds</Badge>
                )}
              </div>
              {message.recommendation.suggested_room_name && (
                <p className="text-sm font-medium">{message.recommendation.suggested_room_name}</p>
              )}
              {message.recommendation.suggested_description && (
                <p className="text-xs text-muted-foreground">{message.recommendation.suggested_description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Suggested Agents */}
        {message.suggested_agents && message.suggested_agents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recommended Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {message.suggested_agents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="font-medium">{agent.agent_name}</span>
                    <span className="text-muted-foreground">— {agent.role_in_room}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Agents */}
        {message.missing_agents && message.missing_agents.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Suggested New Agents
              </CardTitle>
              <CardDescription className="text-xs">
                Click "Create with Atlas" to create the agent directly with the prompt prefilled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {message.missing_agents.map((agent, i) => (
                  <div key={i} className="p-3 rounded-lg bg-background border">
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="font-medium text-sm">{agent.suggested_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{agent.expertise}</p>
                        <p className="text-xs text-amber-600 mt-1">{agent.why_needed}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          className="flex-1"
                          onClick={() => navigateToAtlasWithPrompt(agent.atlas_prompt)}
                        >
                          <Sparkles className="h-3 w-3 mr-2" />
                          Create with Atlas
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => copyAtlasPrompt(agent.atlas_prompt, agent.suggested_name)}
                              >
                                {copiedPrompt === agent.suggested_name ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm">
                              <p className="font-medium mb-1">Copy prompt to clipboard</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Room Button */}
        {message.ready_to_create && (
          <Button 
            className="w-full" 
            onClick={() => handleCreateWithArchimede(message.recommendation || undefined)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Create Room with Archimede
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    );
  };

  // Archimede workspace mode
  if (archimedeMode) {
    return (
      <AppLayout title="Create Room with Archimede">
        <ArchimedeDesignWorkspace
          archimedePrompt={archimedeAgent?.system_prompt}
          onApply={handleArchimedeApply}
          onCancel={() => setArchimedeMode(false)}
          initialDescription={prefilledDescription}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('roomAdvisor.title')}>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <Button variant="ghost" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('roomAdvisor.backToRooms')}
          </Button>
          <Button variant="outline" onClick={() => handleCreateWithArchimede()}>
            <Sparkles className="h-4 w-4 mr-2" />
            Skip to Archimede
          </Button>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('roomAdvisor.title')} AI</CardTitle>
                <CardDescription className="mt-1">
                  {t('roomAdvisor.subtitle')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground max-w-[80%]'
                        : 'bg-muted flex-1 max-w-[90%]'
                    }`}
                  >
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <Markdown content={message.content} />
                    </div>
                    {message.role === 'assistant' && renderRecommendationCard(message)}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t p-4 shrink-0">
            <div className="flex gap-3 max-w-3xl mx-auto">
              <Textarea
                placeholder={t('roomAdvisor.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading} 
                className="shrink-0 h-auto"
                size="lg"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
