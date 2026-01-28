'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import { login, register, getCurrentUser } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { fadeInVariants } from '@/lib/animations';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        console.log('Attempting login...');
        const { access_token } = await login(email, password);
        console.log('Login successful, token received:', access_token?.substring(0, 30) + '...');
        console.log('Token type:', typeof access_token);
        localStorage.setItem('token', access_token);
        const savedToken = localStorage.getItem('token');
        console.log('Token saved and verified:', savedToken?.substring(0, 30) + '...');
        const user = await getCurrentUser();
        console.log('User fetched:', user);
        setAuth(user, access_token);
        console.log('Auth set in store, redirecting...');
        // Use window.location for full page load to ensure token is read from localStorage
        window.location.href = '/';
      } else {
        console.log('Attempting registration...');
        await register(email, password, fullName);
        console.log('Registration successful, now logging in...');
        const { access_token } = await login(email, password);
        localStorage.setItem('token', access_token);
        const user = await getCurrentUser();
        setAuth(user, access_token);
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary-50/30 py-12 px-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        className="relative w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25"
          >
            <Brain className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">
            Simul
          </h1>
          <p className="text-muted-foreground mt-2">
            Reduce meeting time waste through AI-powered reasoning capture
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-xl border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-0">
            <Tabs
              value={isLogin ? 'login' : 'register'}
              onValueChange={(v) => setIsLogin(v === 'login')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Register only) */}
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required={!isLogin}
                    disabled={isLoading}
                  />
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-error-50 text-error-700 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 btn-press"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
