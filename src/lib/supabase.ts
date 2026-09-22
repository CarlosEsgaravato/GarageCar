import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'garage_car_supabase_url';
const STORAGE_KEY_ANON = 'garage_car_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

/**
 * Obtém a configuração ativa do Supabase (prioriza customizado no localStorage, depois env)
 */
export function getActiveSupabaseConfig(): SupabaseConfig {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY_URL);
    const customAnon = localStorage.getItem(STORAGE_KEY_ANON);
    if (customUrl && customAnon) {
      return { url: customUrl, anonKey: customAnon, source: 'custom' };
    }
  }

  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) : undefined) ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined)
  ) as string | undefined;

  const envAnon = (
    (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : undefined) ||
    (typeof process !== 'undefined' && process.env ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : undefined)
  ) as string | undefined;

  if (envUrl && envAnon && !envUrl.includes('your-project')) {
    return { url: envUrl.trim(), anonKey: envAnon.trim(), source: 'env' };
  }

  return { url: '', anonKey: '', source: 'none' };
}

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

/**
 * Retorna o cliente Supabase instanciado, ou null se não configurado
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getActiveSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const clientKey = `${config.url}-${config.anonKey}`;
  if (cachedClient && currentClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    currentClientKey = clientKey;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar Supabase client:', err);
    return null;
  }
}

/**
 * Salva credenciais do Supabase no localStorage para a sessão do navegador
 */
export function saveCustomSupabaseCredentials(url: string, anonKey: string): boolean {
  if (!url || !anonKey) return false;
  try {
    new URL(url); // Valida formato de URL
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    cachedClient = null;
    currentClientKey = '';
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove credenciais customizadas
 */
export function clearCustomSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  cachedClient = null;
  currentClientKey = '';
}

/**
 * Retorna se o modo de demonstração local explícito está ativo
 */
export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('garage_car_demo_mode') === 'true';
}

/**
 * Testa a conexão com o Supabase
 */
export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}> {
  const url = customUrl || getActiveSupabaseConfig().url;
  const key = customKey || getActiveSupabaseConfig().anonKey;

  if (!url || !key) {
    return {
      success: false,
      message: 'URL e Anon Key do Supabase não configurados.',
    };
  }

  try {
    const testClient = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Teste 1: Checa ping de autenticação ou query de health
    const { error } = await testClient.from('system_settings').select('count', { count: 'exact', head: true });
    
    // Se tabela ainda não existe (código 42P01 ou similar), mas Supabase respondeu, consideramos conexão OK!
    if (error && error.code === '42P01') {
      return {
        success: true,
        message: 'Conectado ao Supabase com sucesso! (As tabelas ainda precisam ser criadas pelo script SQL da Fase 1)',
        details: { code: error.code },
      };
    }

    if (error && error.message.includes('Invalid API key')) {
      return {
        success: false,
        message: 'Chave de API (Anon Key) inválida.',
        details: { error: error.message },
      };
    }

    // Se respondeu sem erro ou com erro normal de RLS para usuário anônimo
    return {
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso e banco online!',
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Falha na conexão: ${errMessage}`,
    };
  }
}
