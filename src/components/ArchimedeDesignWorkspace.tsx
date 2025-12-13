import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Markdown } from '@/components/ui/markdown';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Check, 
  RefreshCw, 
  Pencil,
  LayoutGrid,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  Send,
  Bot,
  User,
  Copy,
  Plus,
  Zap
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface AgentRole {
  agent_name: string;
  role_in_room: string;
}

interface MissingAgent {
  suggested_name: string;
  expertise: string;
  why_needed: string;
  atlas_prompt: string;
}

interface EphemeralAgent {
  name: string;
  description: string;
  system_prompt: string;
  role_in_room: string;
}

interface RoomSpec {
  name: string;
  short_description: string;
  methodology: string;
  methodology_justification?: string;
  workflow_type: string;
  workflow_justification?: string;
  max_rounds: number;
  max_rounds_rationale?: string;
  agent_ids: string[];
  agent_roles?: AgentRole[];
  available_tools?: string[];
  require_consensus?: boolean;
  objective_template: string;
  ideal_use_cases?: string[];
  not_suitable_for?: string[];
  session_tips?: string[];
  missing_agents?: MissingAgent[];
  ephemeral_agents?: EphemeralAgent[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  recommendation?: RoomSpec | null;
}

interface ArchimedeDesignWorkspaceProps {
  archimedePrompt: string | undefined;
  onApply: (spec: RoomSpec) => void;
  onCancel: () => void;
  initialDescription?: string;
}

const METHODOLOGY_COLORS: Record<string, string> = {
  analytical_structured: 'bg-blue-500/10 text-blue-500',
  strategic_executive: 'bg-purple-500/10 text-purple-500',
  creative_brainstorming: 'bg-yellow-500/10 text-yellow-500',
  lean_iterative: 'bg-green-500/10 text-green-500',
  parallel_ensemble: 'bg-orange-500/10 text-orange-500',
};

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  sequential: <ArrowRight className="h-3 w-3" />,
  cyclic: <RotateCcw className="h-3 w-3" />,
  parallel: <Users className="h-3 w-3" />,
};

export default function ArchimedeDesignWorkspace({
  archimedePrompt,
  onApply,
  onCancel,
  initialDescription = '',
}: ArchimedeDesignWorkspaceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat mode state
  const [chatMode, setChatMode] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Archimede, your Room Designer. Tell me about the deliberation, analysis, or decision you need to make, and I'll design the optimal room configuration with the right methodology, agents, and workflow.\n\nBe specific about your objectives, context, and expected outcomes.",
    },
  ]);
  const [chatInput, setChatInput] = useState(initialDescription);
  const [isThinking, setIsThinking] = useState(false);
  
  // Design mode state
  const [designedRoom, setDesignedRoom] = useState<RoomSpec | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [refinementRequest, setRefinementRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // Ephemeral agents state
  const [ephemeralAgents, setEphemeralAgents] = useState<EphemeralAgent[]>([]);
  const [showEphemeralForm, setShowEphemeralForm] = useState(false);
  const [newEphemeralAgent, setNewEphemeralAgent] = useState<Partial<EphemeralAgent>>({});
  
  // Copy state
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Auto-send if initialDescription is provided
  useEffect(() => {
    if (initialDescription && messages.length === 1) {
      setChatInput(initialDescription);
      // Small delay to show the input before sending
      setTimeout(() => sendChatMessage(initialDescription), 500);
    }
  }, []);

  const sendChatMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || chatInput.trim();
    if (!messageToSend || isThinking) return;

    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsThinking(true);

    // Get current locale
    const locale = localStorage.getItem('i18nextLng')?.split('-')[0] || 'en';

    try {
      // Build conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('design-room', {
        body: { 
          description: messageToSend,
          archimedePrompt,
          userId: user?.id,
          conversationHistory,
          mode: 'conversational',
          locale
        }
      });

      if (error) throw error;
      
      if (data?.room) {
        setDesignedRoom(data.room);
        setEditedTemplate(data.room.objective_template);
        setAvailableAgents(data.availableAgents || []);
        if (data.room.ephemeral_agents) {
          setEphemeralAgents(data.room.ephemeral_agents);
        }
        
        // Add assistant message with recommendation
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response || `I've designed a room called **"${data.room.name}"**. Here's the configuration:`,
          recommendation: data.room
        }]);
      } else if (data?.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response
        }]);
      }
    } catch (error) {
      console.error('Archimede chat error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to process request',
        variant: 'destructive' 
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error. Please try again with more details about your deliberation needs."
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const handleRefine = async () => {
    if (!refinementRequest.trim() || !designedRoom || !archimedePrompt) return;
    
    setIsRefining(true);

    try {
      const refinementPrompt = `
The user has already designed a Room with these specifications:

Name: ${designedRoom.name}
Methodology: ${designedRoom.methodology}
Workflow: ${designedRoom.workflow_type}
Max Rounds: ${designedRoom.max_rounds}
Current Objective Template:
${editedTemplate}

The user now wants to refine the design with the following request:
"${refinementRequest}"

Please update the Room specification accordingly, keeping what works and improving based on the feedback.
`;

      const locale = localStorage.getItem('i18nextLng')?.split('-')[0] || 'en';
      
      const { data, error } = await supabase.functions.invoke('design-room', {
        body: { 
          description: refinementPrompt,
          archimedePrompt,
          userId: user?.id,
          mode: 'refine',
          locale
        }
      });

      if (error) throw error;
      if (data?.room) {
        setDesignedRoom(data.room);
        setEditedTemplate(data.room.objective_template);
        if (data.room.ephemeral_agents) {
          setEphemeralAgents(prev => [...prev, ...data.room.ephemeral_agents]);
        }
        setRefinementRequest('');
        toast({ title: t('common.success'), description: 'Room refined successfully!' });
      }
    } catch (error) {
      console.error('Archimede refinement error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to refine room',
        variant: 'destructive' 
      });
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    if (!designedRoom) return;
    
    const finalSpec: RoomSpec = {
      ...designedRoom,
      objective_template: editedTemplate,
      ephemeral_agents: ephemeralAgents.length > 0 ? ephemeralAgents : undefined,
    };
    
    onApply(finalSpec);
  };

  const getAgentName = (agentId: string): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
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

  const addEphemeralAgent = () => {
    if (!newEphemeralAgent.name || !newEphemeralAgent.system_prompt) return;
    
    const agent: EphemeralAgent = {
      name: newEphemeralAgent.name,
      description: newEphemeralAgent.description || '',
      system_prompt: newEphemeralAgent.system_prompt,
      role_in_room: newEphemeralAgent.role_in_room || 'Specialist',
    };
    
    setEphemeralAgents(prev => [...prev, agent]);
    setNewEphemeralAgent({});
    setShowEphemeralForm(false);
    toast({ title: 'Ephemeral agent added', description: `"${agent.name}" will be created for this session only.` });
  };

  const removeEphemeralAgent = (index: number) => {
    setEphemeralAgents(prev => prev.filter((_, i) => i !== index));
  };

  const proceedToDesignMode = () => {
    setChatMode(false);
  };

  // Render recommendation card in chat
  const renderRecommendationCard = (room: RoomSpec) => (
    <div className="mt-4 space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            {room.name}
          </CardTitle>
          <CardDescription className="text-xs">{room.short_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className={METHODOLOGY_COLORS[room.methodology] || 'bg-muted'}>
              {room.methodology?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {WORKFLOW_ICONS[room.workflow_type]}
              {room.workflow_type}
            </Badge>
            <Badge variant="outline">{room.max_rounds} rounds</Badge>
          </div>
          
          {/* Agents */}
          {room.agent_roles && room.agent_roles.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Agents</Label>
              <div className="space-y-1">
                {room.agent_roles.map((role, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="font-medium">{role.agent_name}</span>
                    <span className="text-muted-foreground">— {role.role_in_room}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Agents */}
      {room.missing_agents && room.missing_agents.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Suggested New Agents
            </CardTitle>
            <CardDescription className="text-xs">
              These agents would improve this room but don't exist yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {room.missing_agents.map((agent, i) => (
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
                          <TooltipContent side="left">Copy prompt</TooltipContent>
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

      <Button className="w-full" onClick={proceedToDesignMode}>
        <Check className="h-4 w-4 mr-2" />
        Review & Customize Design
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  // Chat mode UI
  if (chatMode) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Archimede Room Designer</h2>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>Archimede</CardTitle>
                <CardDescription className="mt-1">
                  Your AI Room Design Assistant
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-5 w-5 text-purple-500" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground max-w-[75%] p-5'
                        : 'bg-muted/50 flex-1 max-w-[85%] p-5 border'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown content={message.content} />
                    </div>
                    {message.role === 'assistant' && message.recommendation && renderRecommendationCard(message.recommendation)}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isThinking && (
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="bg-muted/50 rounded-xl p-5 border">
                    <div className="flex gap-2">
                      <span className="w-2.5 h-2.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-2.5 h-2.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-2.5 h-2.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="border-t p-5 shrink-0 bg-background">
            <div className="flex gap-3">
              <Textarea
                placeholder="Describe your deliberation, analysis, or decision-making need..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="resize-none flex-1 text-base"
                disabled={isThinking}
              />
              <Button 
                onClick={() => sendChatMessage()} 
                disabled={!chatInput.trim() || isThinking} 
                className="shrink-0 h-auto px-6"
                size="lg"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Design review workspace (after chat creates a room)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setChatMode(true)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Review Design</h2>
          </div>
        </div>

        <Button onClick={handleApply} size="lg">
          <Check className="h-4 w-4 mr-2" />
          Apply & Create Room
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Room Spec Overview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  {designedRoom?.name}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">{designedRoom?.short_description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Methodology & Workflow */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Methodology
                  </Label>
                  <Badge className={METHODOLOGY_COLORS[designedRoom?.methodology || ''] || 'bg-muted'}>
                    {designedRoom?.methodology?.replace('_', ' ')}
                  </Badge>
                  {designedRoom?.methodology_justification && (
                    <p className="text-xs text-muted-foreground mt-1">{designedRoom.methodology_justification}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    {WORKFLOW_ICONS[designedRoom?.workflow_type || 'cyclic']}
                    Workflow
                  </Label>
                  <Badge variant="outline">{designedRoom?.workflow_type}</Badge>
                  {designedRoom?.workflow_justification && (
                    <p className="text-xs text-muted-foreground mt-1">{designedRoom.workflow_justification}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Parameters */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Configuration</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{designedRoom?.max_rounds} rounds</Badge>
                  {designedRoom?.require_consensus && <Badge variant="outline">Consensus required</Badge>}
                  {designedRoom?.available_tools?.map(tool => (
                    <Badge key={tool} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Agent Composition */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Agent Composition
                </Label>
                <ul className="text-sm space-y-2">
                  {designedRoom?.agent_roles?.map((role, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                      <div>
                        <span className="font-medium">{role.agent_name}</span>
                        <span className="text-muted-foreground"> — {role.role_in_room}</span>
                      </div>
                    </li>
                  )) || designedRoom?.agent_ids?.map((id, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                      <span>{getAgentName(id)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ephemeral Agents */}
              {ephemeralAgents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Ephemeral Agents (Session Only)
                    </Label>
                    <ul className="text-sm space-y-2">
                      {ephemeralAgents.map((agent, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 p-2 bg-amber-500/5 rounded border border-amber-500/20">
                          <div>
                            <span className="font-medium">{agent.name}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">ephemeral</Badge>
                            <p className="text-xs text-muted-foreground mt-1">{agent.role_in_room}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeEphemeralAgent(i)}
                            className="shrink-0"
                          >
                            ×
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Add Ephemeral Agent */}
              {!showEphemeralForm ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setShowEphemeralForm(true)}
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Add Ephemeral Agent
                </Button>
              ) : (
                <Card className="border-dashed border-amber-500/30">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">New Ephemeral Agent</span>
                    </div>
                    <Input
                      placeholder="Agent name"
                      value={newEphemeralAgent.name || ''}
                      onChange={(e) => setNewEphemeralAgent(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Role in this room"
                      value={newEphemeralAgent.role_in_room || ''}
                      onChange={(e) => setNewEphemeralAgent(prev => ({ ...prev, role_in_room: e.target.value }))}
                    />
                    <Textarea
                      placeholder="System prompt (define the agent's expertise and behavior)"
                      value={newEphemeralAgent.system_prompt || ''}
                      onChange={(e) => setNewEphemeralAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addEphemeralAgent} disabled={!newEphemeralAgent.name || !newEphemeralAgent.system_prompt}>
                        Add
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowEphemeralForm(false); setNewEphemeralAgent({}); }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Use Cases */}
              {designedRoom?.ideal_use_cases && designedRoom.ideal_use_cases.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Ideal Use Cases
                    </Label>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {designedRoom.ideal_use_cases.map((uc, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{uc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {designedRoom?.not_suitable_for && designedRoom.not_suitable_for.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Not Suitable For
                    </Label>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {designedRoom.not_suitable_for.map((ns, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-destructive">✕</span>
                          <span>{ns}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Refinement Card */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refine with Archimede
              </CardTitle>
              <CardDescription className="text-xs">
                Ask Archimede to iterate on the current design
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="e.g., Add more focus on risk assessment, reduce the number of rounds, include a legal perspective..."
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                rows={3}
                className="resize-none text-sm"
                disabled={isRefining}
              />
              <Button 
                onClick={handleRefine} 
                disabled={!refinementRequest.trim() || isRefining}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refine Design
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable Objective Template & Tips */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Objective Template
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Editable
                </Badge>
              </div>
              <CardDescription className="text-xs">
                This template will guide session objectives. Edit as needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedTemplate}
                onChange={(e) => setEditedTemplate(e.target.value)}
                rows={12}
                className="font-mono text-xs resize-none"
              />
            </CardContent>
          </Card>

          {/* Session Tips */}
          {designedRoom?.session_tips && designedRoom.session_tips.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Session Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {designedRoom.session_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Missing Agents in review mode */}
          {designedRoom?.missing_agents && designedRoom.missing_agents.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Suggested New Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {designedRoom.missing_agents.map((agent, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border">
                      <p className="font-medium text-sm">{agent.suggested_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{agent.expertise}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          className="flex-1"
                          onClick={() => navigateToAtlasWithPrompt(agent.atlas_prompt)}
                        >
                          <Sparkles className="h-3 w-3 mr-2" />
                          Create with Atlas
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyAtlasPrompt(agent.atlas_prompt, agent.suggested_name)}
                        >
                          {copiedPrompt === agent.suggested_name ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
