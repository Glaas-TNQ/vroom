import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Key, Plus, Trash2, Check, Loader2 } from 'lucide-react';

type ProviderType = 'openai' | 'anthropic' | 'custom';

interface ProviderProfile {
  id: string;
  name: string;
  provider_type: ProviderType;
  api_key: string;
  endpoint: string | null;
  model: string | null;
  is_default: boolean;
}

export default function Settings() {
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
      toast({ title: 'Provider added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add provider', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('provider_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-profiles'] });
      toast({ title: 'Provider deleted' });
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
      toast({ title: 'Default provider updated' });
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
        toast({ title: 'Connection successful', description: 'API key is valid' });
      } else {
        toast({ title: 'Connection failed', description: data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Connection test failed', description: error.message, variant: 'destructive' });
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getProviderIcon = (type: ProviderType) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'custom': return '⚙️';
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Providers</h1>
            <p className="text-muted-foreground">Manage your AI provider configurations (BYOK)</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Provider</DialogTitle>
                <DialogDescription>Configure a new AI provider with your API key</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    placeholder="My OpenAI Key"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider_type">Provider Type</Label>
                  <Select
                    value={formData.provider_type}
                    onValueChange={(v: ProviderType) => setFormData({ ...formData, provider_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="custom">Custom Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
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
                    <Label htmlFor="endpoint">Custom Endpoint</Label>
                    <Input
                      id="endpoint"
                      placeholder="https://api.example.com/v1/chat/completions"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="model">Default Model (optional)</Label>
                  <Input
                    id="model"
                    placeholder={formData.provider_type === 'openai' ? 'gpt-4o' : formData.provider_type === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'model-name'}
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Provider'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured Providers</CardTitle>
            <CardDescription>Your API keys are stored securely and used for agent interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
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
                        Test
                      </Button>
                      {!provider.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(provider.id)}
                        >
                          Set Default
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
                <p>No providers configured yet</p>
                <p className="text-sm">Add your first API provider to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
