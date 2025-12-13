import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
  ArrowRight
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
}

interface ArchimedeDesignWorkspaceProps {
  archimedePrompt: string | undefined;
  onApply: (spec: RoomSpec) => void;
  onCancel: () => void;
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
}: ArchimedeDesignWorkspaceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [isDesigning, setIsDesigning] = useState(false);
  const [designedRoom, setDesignedRoom] = useState<RoomSpec | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [refinementRequest, setRefinementRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleDesign = async () => {
    if (!description.trim() || !archimedePrompt) return;
    
    setIsDesigning(true);
    setDesignedRoom(null);

    try {
      const { data, error } = await supabase.functions.invoke('design-room', {
        body: { 
          description,
          archimedePrompt,
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data?.room) {
        setDesignedRoom(data.room);
        setEditedTemplate(data.room.objective_template);
        setAvailableAgents(data.availableAgents || []);
      }
    } catch (error) {
      console.error('Archimede design error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to design room',
        variant: 'destructive' 
      });
    } finally {
      setIsDesigning(false);
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

      const { data, error } = await supabase.functions.invoke('design-room', {
        body: { 
          description: refinementPrompt,
          archimedePrompt,
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data?.room) {
        setDesignedRoom(data.room);
        setEditedTemplate(data.room.objective_template);
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
    
    const finalSpec = {
      ...designedRoom,
      objective_template: editedTemplate,
    };
    
    onApply(finalSpec);
  };

  const getAgentName = (agentId: string): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  // Initial design phase
  if (!designedRoom && !isDesigning) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Archimede Room Designer</h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Describe your deliberation need</CardTitle>
            <CardDescription>
              Tell Archimede what decision you need to make, what problem you're solving, or what analysis you need. 
              He will design the optimal Room configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., I need to evaluate whether to expand into the European market. We should consider financial viability, regulatory requirements, competitive landscape, and strategic fit with our 3-year plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />

            <Button 
              onClick={handleDesign} 
              disabled={!description.trim()}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Design Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isDesigning) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Archimede Room Designer</h2>
          </div>
        </div>

        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
              <p className="text-lg font-medium">Designing optimal Room...</p>
              <p className="text-sm text-muted-foreground">Archimede is configuring methodology, agents, and parameters...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Design review workspace
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Archimede Room Designer</h2>
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
              {/* Overview Box */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{designedRoom?.short_description}</p>
              </div>

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
                {designedRoom?.max_rounds_rationale && (
                  <p className="text-xs text-muted-foreground">{designedRoom.max_rounds_rationale}</p>
                )}
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
        </div>
      </div>
    </div>
  );
}
