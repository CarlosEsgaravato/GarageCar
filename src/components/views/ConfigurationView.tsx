import React, { useState } from 'react';
import {
  Settings,
  Database,
  ShieldCheck,
  Clock,
  Coins,
  Save,
  CheckCircle2,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getActiveSupabaseConfig, saveCustomSupabaseCredentials } from '../../lib/supabase';
/* === ÁREA TEMPORÁRIA DE DIAGNÓSTICO SUPABASE NO NAVEGADOR (REMOVÍVEL) === */
import { BrowserSupabaseDiagnostic } from '../diagnostics/BrowserSupabaseDiagnostic';

interface ConfigurationViewProps {
  onOpenDbModal: () => void;
}

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({ onOpenDbModal }) => {
  const { isConfigured, isDemoMode, refreshConfig } = useAuth();
  const config = getActiveSupabaseConfig();

  const [supabaseUrl, setSupabaseUrl] = useState(config.url);
  const [supabaseKey, setSupabaseKey] = useState(config.anonKey);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Valores padrão dos acréscimos (Seção 10)
  const [surcharges, setSurcharges] = useState({
    normal: 0.0,
    above_normal: 10.0,
    heavy: 20.0,
  });

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      saveCustomSupabaseCredentials(supabaseUrl, supabaseKey);
      refreshConfig();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Topo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Configurações do Sistema Garage Car
              </h2>
              <p className="text-xs text-slate-500">
                Parâmetros operacionais, conexão Supabase, segurança e regras de negócio
              </p>
            </div>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
            Fase 1
          </span>
        </div>
      </div>

      {/* === ÁREA TEMPORÁRIA DE DIAGNÓSTICO SUPABASE NO NAVEGADOR (REMOVÍVEL) === */}
      <BrowserSupabaseDiagnostic />

      {/* Card 1: Conexão Supabase */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Conexão Backend (Supabase)
            </h3>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isConfigured && !isDemoMode
                ? 'bg-emerald-100 text-emerald-800'
                : isDemoMode
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isConfigured && !isDemoMode
              ? 'Conectado Oficial'
              : isDemoMode
              ? 'Modo Demonstração'
              : 'Não Configurado'}
          </span>
        </div>

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://exemplo.supabase.co"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Credenciais salvas com sucesso!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onOpenDbModal}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Abrir Inspetor de DDL & Teste de Conexão
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Salvar Credenciais</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Horários Operacionais Padrão (Seção 11) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Horários de Funcionamento (Seção 11)
            </h3>
            <p className="text-xs text-slate-500">
              A Garage Car funciona principalmente aos finais de semana, mas o sistema permite exceções em qualquer dia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Sábado</span>
              <span className="text-slate-500">Principal dia de atendimento</span>
            </div>
            <span className="font-mono font-semibold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">
              08:00 - 18:00
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Domingo</span>
              <span className="text-slate-500">Atendimento parcial</span>
            </div>
            <span className="font-mono font-semibold text-blue-600 bg-white px-2 py-1 rounded border border-slate-200">
              08:00 - 14:00
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between sm:col-span-2">
            <div>
              <span className="font-bold text-slate-900 block">Segunda a Sexta (Dias de Exceção)</span>
              <span className="text-slate-500">Normalmente fechado, mas livremente agendável (ex: Quarta 17:00 às 21:00)</span>
            </div>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              Sem bloqueio de data
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Sugestões de Acréscimos (Seção 10) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Coins className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabela Sugerida de Acréscimos (Seção 10)
            </h3>
            <p className="text-xs text-slate-500">
              Valores sugeridos para condições do veículo no momento do serviço.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500 block mb-1">Normal</span>
            <span className="text-base font-bold text-slate-900">R$ 0,00</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500 block mb-1">Acima do normal</span>
            <span className="text-base font-bold text-blue-600">+ R$ 10,00</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500 block mb-1">Pesada</span>
            <span className="text-base font-bold text-blue-600">+ R$ 20,00</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-slate-500 block mb-1">Extrema</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
              Manual no ato
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
