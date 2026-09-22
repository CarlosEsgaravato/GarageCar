import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, getActiveSupabaseConfig } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  enableDemoMode: () => void;
  refreshConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: {},
  user_metadata: { name: 'Administrador Garage Car', role: 'admin' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'admin@garagecar.com.br',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkConfigAndSession = async () => {
    setLoading(true);
    setError(null);
    const config = getActiveSupabaseConfig();
    const hasConfig = Boolean(config.url && config.anonKey);
    setIsConfigured(hasConfig);

    // Checar se usuário já estava em modo de demonstração gravado
    const savedDemo = localStorage.getItem('garage_car_demo_mode') === 'true';

    if (!hasConfig) {
      if (savedDemo) {
        setIsDemoMode(true);
        setUser(DEMO_USER);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      if (savedDemo) {
        setIsDemoMode(true);
        setUser(DEMO_USER);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        console.warn('Erro ao obter sessão Supabase:', sessionError.message);
        if (savedDemo) {
          setIsDemoMode(true);
          setUser(DEMO_USER);
        }
      } else if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsDemoMode(false);
      } else if (savedDemo) {
        setIsDemoMode(true);
        setUser(DEMO_USER);
      }
    } catch (err) {
      console.error('Falha ao autenticar com Supabase:', err);
      if (savedDemo) {
        setIsDemoMode(true);
        setUser(DEMO_USER);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfigAndSession();

    const client = getSupabaseClient();
    if (!client) return;

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession) {
          setIsDemoMode(false);
          localStorage.removeItem('garage_car_demo_mode');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const client = getSupabaseClient();

    if (!client) {
      return {
        success: false,
        error: 'Supabase não configurado. Por favor, configure a URL e a Chave de API ou acesse o Modo de Demonstração.',
      };
    }

    try {
      const { data, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }

      setSession(data.session);
      setUser(data.user);
      setIsDemoMode(false);
      localStorage.removeItem('garage_car_demo_mode');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Erro ao deslogar do Supabase:', err);
      }
    }
    setUser(null);
    setSession(null);
    setIsDemoMode(false);
    localStorage.removeItem('garage_car_demo_mode');
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
    setUser(DEMO_USER);
    localStorage.setItem('garage_car_demo_mode', 'true');
  };

  const refreshConfig = () => {
    checkConfigAndSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        isDemoMode,
        error,
        signIn,
        signOut,
        enableDemoMode,
        refreshConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
