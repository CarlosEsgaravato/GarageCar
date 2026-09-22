import React, { useState } from 'react';
import {
  Car,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onOpenDbModal: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenDbModal }) => {
  const { signIn, enableDemoMode, isConfigured, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Preencha seu e-mail e senha de administrador.');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  const handleDemoAccess = () => {
    enableDemoMode();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-12">
      {/* Luz ambiente automotiva de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-900/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card Principal */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          {/* Topo do Card */}
          <div className="p-8 pb-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white">GARAGE</span>
              <span className="text-2xl font-black tracking-tight text-blue-500">CAR</span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Estética Automotiva • Gestão Administrativa
            </p>
          </div>

          {/* Formulário de Login */}
          <div className="p-8 pt-6 space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-slate-950/70 p-3 border border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Acesso exclusivo ao administrador</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
                Fase 1
              </span>
            </div>

            {(errorMessage || authError) && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage || authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@garagecar.com.br"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Autenticando...' : 'Acessar Painel'}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ou Avaliação Imediata
              </span>
            </div>

            {/* Acesso Modo Demonstração para visualização no AI Studio */}
            <button
              id="btn-demo-access"
              type="button"
              onClick={handleDemoAccess}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/60 p-3.5 text-left text-xs transition-all hover:border-blue-500 hover:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/40 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200">
                    Modo Demonstração do Administrador
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Navegue pela Fase 1, layout e arquitetura sem aguardar banco
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Rodapé do Login: Configurar Banco */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onOpenDbModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Database className="h-3.5 w-3.5" />
                <span>
                  {isConfigured ? 'Ver Conexão Supabase & SQL' : 'Configurar URL & Anon Key do Supabase'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Garage Car • Estética Automotiva • Sistema Web Administrativo
        </p>
      </div>
    </div>
  );
};
