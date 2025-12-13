import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Zap, Sparkles, Lock, Users } from 'lucide-react';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created',
        description: 'You can now sign in with your credentials.',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Hero Section - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          <div className="space-y-8 max-w-xl">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Zap className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Vroom
              </h1>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                Your AI Boardroom.
              </h2>
              <p className="text-2xl xl:text-3xl font-semibold text-muted-foreground">
                Instant Strategic Decisions.
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground pt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50">
                <Sparkles className="h-4 w-4" />
                <span>Open Source</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50">
                <Lock className="h-4 w-4" />
                <span>BYOK</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50">
                <Users className="h-4 w-4" />
                <span>Built for Everyone</span>
              </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
        </div>

        {/* Decorative Gradient Orbs */}
        <div className="absolute top-1/4 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Auth Form - Right Side */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold">Vroom</h1>
            </div>
            <p className="text-lg font-semibold text-muted-foreground">Your AI Boardroom</p>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Mobile Features */}
          <div className="lg:hidden mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">Open Source</span>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">BYOK</span>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">Built for Everyone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
