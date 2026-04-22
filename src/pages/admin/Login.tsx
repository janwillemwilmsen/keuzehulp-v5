import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // If VITE_SUPABASE_ANON_KEY is not set, we'll hit an error right away.
    if (import.meta.env.VITE_SUPABASE_ANON_KEY === undefined) {
      setError("Missende Supabase Anon Key in de .env file.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <div className="w-full max-w-md p-8 bg-card rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold text-center mb-6">Inloggen Beheer</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wachtwoord</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <div className="text-destructive text-sm font-medium p-2 bg-destructive/10 rounded">{error}</div>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
