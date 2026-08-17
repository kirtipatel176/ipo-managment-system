import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Lock, Mail } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const Login: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    
    try {
      let { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If the user doesn't exist yet, signInWithPassword returns "Invalid login credentials".
      // We can try to sign them up automatically to initialize the account.
      if (error && error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        // If sign up succeeded, clear the original error
        if (!signUpError) {
          error = null;
        }
      }

      if (error) {
        toast.error(error.message, 'Login Failed');
      } else {
        toast.success('Successfully logged in!', 'Welcome Back');
      }
    } catch (err: any) {
      toast.error(err.message, 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-black/5">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/10 text-accent-blue mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Sign in to unlock sensitive data and actions.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              required
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-2.5 text-sm"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};
