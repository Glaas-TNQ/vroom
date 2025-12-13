import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Check, 
  RefreshCw, 
  Pencil,
  Bot,
  Brain,
  Target,
  AlertTriangle
} from 'lucide-react';

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: string;
}

interface AgentSpec {
  name: string;
  short_description: string;
  codename: string;
  mandate: string;
  primary_domain: string;
  secondary_domains?: string[];
  exclusions?: string[];
  reasoning_mode: string;
  depth_level: string;
  decision_bias: string;
  core_responsibilities: string[];
  non_responsibilities?: string[];
  system_prompt: string;
  suggested_temperature: number;
  suggested_icon: string;
}

interface AtlasDesignWorkspaceProps {
  atlasPrompt: string | undefined;
  providers: ProviderProfile[] | undefined;
  onApply: (spec: AgentSpec, providerId: string) => void;
  onCancel: () => void;
}

export default function AtlasDesignWorkspace({
  atlasPrompt,
  providers,
  onApply,
  onCancel,
}: AtlasDesignWorkspaceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [description, setDescription] = useState('');
  const [providerId, setProviderId] = useState('');
  const [isDesigning, setIsDesigning] = useState(false);
  const [designedAgent, setDesignedAgent] = useState<AgentSpec | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [refinementRequest, setRefinementRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleDesign = async () => {
    if (!description.trim() || !atlasPrompt) return;
    
    setIsDesigning(true);
    setDesignedAgent(null);

    try {
      const { data, error } = await supabase.functions.invoke('design-agent', {
        body: { 
          description,
          atlasPrompt
        }
      });

      if (error) throw error;
      if (data?.agent) {
        setDesignedAgent(data.agent);
        setEditedPrompt(data.agent.system_prompt);
      }
    } catch (error) {
      console.error('Atlas design error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to design agent',
        variant: 'destructive' 
      });
    } finally {
      setIsDesigning(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementRequest.trim() || !designedAgent || !atlasPrompt) return;
    
    setIsRefining(true);

    try {
      const refinementPrompt = `
The user has already designed an agent with these specifications:

Name: ${designedAgent.name}
Mandate: ${designedAgent.mandate}
Primary Domain: ${designedAgent.primary_domain}
Current System Prompt:
${editedPrompt}

The user now wants to refine the design with the following request:
"${refinementRequest}"

Please update the agent specification accordingly, keeping what works and improving based on the feedback.
`;

      const { data, error } = await supabase.functions.invoke('design-agent', {
        body: { 
          description: refinementPrompt,
          atlasPrompt
        }
      });

      if (error) throw error;
      if (data?.agent) {
        setDesignedAgent(data.agent);
        setEditedPrompt(data.agent.system_prompt);
        setRefinementRequest('');
        toast({ title: t('common.success'), description: 'Agent refined successfully!' });
      }
    } catch (error) {
      console.error('Atlas refinement error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Failed to refine agent',
        variant: 'destructive' 
      });
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    if (!designedAgent) return;
    
    // Apply with edited prompt
    const finalSpec = {
      ...designedAgent,
      system_prompt: editedPrompt,
    };
    
    onApply(finalSpec, providerId);
  };

  // Initial design phase
  if (!designedAgent && !isDesigning) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-semibold">{t('agents.atlasDesigner')}</h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('agents.describeAgent')}</CardTitle>
            <CardDescription>
              {t('agents.atlasDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t('agents.atlasPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />

            <div className="space-y-2">
              <Label>{t('agents.apiProvider')}</Label>
              <Select
                value={providerId || '__default__'}
                onValueChange={(v) => setProviderId(v === '__default__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('agents.apiProviderDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('agents.apiProviderDefault')}</SelectItem>
                  {providers?.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} ({provider.provider_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleDesign} 
              disabled={!description.trim()}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('agents.design')}
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
            <h2 className="text-xl font-semibold">{t('agents.atlasDesigner')}</h2>
          </div>
        </div>

        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
              <p className="text-lg font-medium">{t('agents.designing')}</p>
              <p className="text-sm text-muted-foreground">Atlas is crafting a hyper-vertical specialist...</p>
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
            <h2 className="text-xl font-semibold">{t('agents.atlasDesigner')}</h2>
          </div>
        </div>

        <Button onClick={handleApply} size="lg">
          <Check className="h-4 w-4 mr-2" />
          {t('agents.applyDesign')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Agent Spec Overview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {designedAgent?.name}
                </CardTitle>
                <Badge variant="secondary">{designedAgent?.codename}</Badge>
              </div>
              <CardDescription className="text-xs">{designedAgent?.mandate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Short Description */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Overview (for agent selection)</Label>
                <p className="text-sm mt-1">{designedAgent?.short_description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Primary Domain
                  </Label>
                  <p className="text-sm font-medium">{designedAgent?.primary_domain}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Cognitive Style
                  </Label>
                  <p className="text-sm font-medium">{designedAgent?.reasoning_mode}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Depth & Bias</Label>
                <div className="flex gap-2">
                  <Badge variant="outline">{designedAgent?.depth_level}</Badge>
                  <Badge variant="outline">{designedAgent?.decision_bias}</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Core Responsibilities</Label>
                <ul className="text-sm space-y-1">
                  {designedAgent?.core_responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {designedAgent?.exclusions && designedAgent.exclusions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Explicit Exclusions
                    </Label>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {designedAgent.exclusions.map((e, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-destructive">✕</span>
                          <span>{e}</span>
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
                Refine with Atlas
              </CardTitle>
              <CardDescription className="text-xs">
                Ask Atlas to iterate on the current design
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="e.g., Make the agent more conservative in its recommendations, add a focus on risk assessment..."
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

          {/* Provider Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('agents.apiProvider')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={providerId || '__default__'}
                onValueChange={(v) => setProviderId(v === '__default__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('agents.apiProviderDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('agents.apiProviderDefault')}</SelectItem>
                  {providers?.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} ({provider.provider_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable System Prompt */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                System Prompt
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Editable
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Review and edit the generated system prompt before applying
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              rows={28}
              className="font-mono text-xs resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
