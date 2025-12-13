import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Key, Plus, Trash2, Check, Loader2, Globe } from 'lucide-react';

type ProviderType = 'openai' | 'anthropic' | 'perplexity' | 'tavily' | 'custom';

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: ProviderType;
  api_key: string;
  endpoint: string | null;
  model: string | null;
  is_default: boolean;
}

const OPENAI_MODELS = [
  { value: 'gpt-5', label: 'GPT-5 (Latest)' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'o3', label: 'O3 (Reasoning)' },
  { value: 'o4-mini', label: 'O4 Mini (Fast Reasoning)' },
  { value: 'gpt-4o', label: 'GPT-4o (Legacy)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Legacy)' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Premium)' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Smart)' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Snapshot)' },
  { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5 (Snapshot)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Snapshot)' },
];

const PERPLEXITY_MODELS = [
  { value: 'sonar', label: 'Sonar (Fast Search)' },
  { value: 'sonar-pro', label: 'Sonar Pro (Multi-step Reasoning)' },
  { value: 'sonar-reasoning', label: 'Sonar Reasoning (Chain-of-thought)' },
  { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Advanced)' },
  { value: 'sonar-deep-research', label: 'Sonar Deep Research (Expert)' },
];

const TAVILY_MODELS = [
  { value: 'search', label: 'Search API' },
  { value: 'extract', label: 'Extract API' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'openai' as ProviderType,
    api_key: '',
    endpoint: '',
    model: '',
  });

  const getModelsForProvider = (provider: ProviderType) => {
    switch (provider) {
      case 'openai': return OPENAI_MODELS;
      case 'anthropic': return ANTHROPIC_MODELS;
      case 'perplexity': return PERPLEXITY_MODELS;
      case 'tavily': return TAVILY_MODELS;
      default: return [];
    }
  };

  const { data: providers, isLoading } = useQuery({
    queryKey: ['provider-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProviderProfile[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('provider_profiles').insert({
        user_id: user!.id,
        name: data.name,
        provider_type: data.provider_type,
        api_key: data.api_key,
        endpoint: data.endpoint || null,
        model: data.model || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profiles'] });
      setIsDialogOpen(false);
      setFormData({ name: '', provider_type: 'openai', api_key: '', endpoint: '', model: '' });
      toast({ title: t('settings.providerAdded') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('provider_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profiles'] });
      toast({ title: t('settings.providerDeleted') });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('provider_profiles').update({ is_default: false }).eq('user_id', user!.id);
      const { error } = await supabase.from('provider_profiles').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profiles'] });
      toast({ title: t('settings.defaultUpdated') });
    },
  });

  const testConnection = async (provider: ProviderProfile) => {
    setTestingId(provider.id);
    try {
      const { data, error } = await supabase.functions.invoke('test-provider', {
        body: { 
          provider_type: provider.provider_type,
          api_key: provider.api_key,
          endpoint: provider.endpoint,
          model: provider.model,
        },
      });
      
      if (error) throw error;
      if (data?.success) {
        toast({ title: t('settings.connectionSuccess'), description: t('settings.connectionSuccessDesc') });
      } else {
        toast({ title: t('settings.connectionFailed'), description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: t('settings.testFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const getProviderIcon = (type: ProviderType) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'perplexity': return '🔍';
      case 'tavily': return '🌐';
      case 'custom': return '⚙️';
    }
  };

  return (
    <AppLayout title={t('settings.title')}>
      <div className="max-w-3xl space-y-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('settings.language')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                </div>
                <Select value={i18n.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Providers */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('settings.providers')}</h2>
            <p className="text-muted-foreground">{t('settings.providersDesc')}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.addProvider')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.addProvider')}</DialogTitle>
                <DialogDescription>{t('settings.addProviderDesc')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('settings.profileName')}</Label>
                  <Input
                    id="name"
                    placeholder="My OpenAI Key"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider_type">{t('settings.providerType')}</Label>
                  <Select
                    value={formData.provider_type}
                    onValueChange={(v: ProviderType) => setFormData({ ...formData, provider_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="perplexity">Perplexity (Search)</SelectItem>
                      <SelectItem value="tavily">Tavily (Web Search)</SelectItem>
                      <SelectItem value="custom">Custom Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_key">{t('settings.apiKey')}</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="sk-..."
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    required
                  />
                </div>
                {formData.provider_type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">{t('settings.customEndpoint')}</Label>
                    <Input
                      id="endpoint"
                      placeholder="https://api.example.com/v1/chat/completions"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="model">{t('settings.defaultModel')}</Label>
                  {formData.provider_type === 'custom' ? (
                    <Input
                      id="model"
                      placeholder="model-name"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  ) : (
                    <Select
                      value={formData.model}
                      onValueChange={(v) => setFormData({ ...formData, model: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.selectModel')} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {getModelsForProvider(formData.provider_type).map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.adding') : t('settings.addProvider')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.configuredProviders')}</CardTitle>
            <CardDescription>{t('settings.configuredProvidersDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : providers && providers.length > 0 ? (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {provider.name}
                          {provider.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t('common.default')}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {provider.provider_type} • {provider.model || 'No model set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(provider)}
                        disabled={testingId === provider.id}
                      >
                        {testingId === provider.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {t('common.test')}
                      </Button>
                      {!provider.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(provider.id)}
                        >
                          {t('common.setDefault')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(provider.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('settings.noProviders')}</p>
                <p className="text-sm">{t('settings.noProvidersDesc')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
