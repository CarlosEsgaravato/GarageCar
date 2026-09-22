import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Server,
  Key,
  Globe,
} from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { GARAGE_CAR_SQL_SCHEMA } from '../../db/schemaSql';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const { isConfigured, isDemoMode, refreshConfig } = useAuth();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [source, setSource] = useState<'env' | 'custom' | 'none'>('none');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'schema' | 'rules'>('connection');
  const [schemaSql, setSchemaSql] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const config = getActiveSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setSource(config.source);
      setTestResult(null);
      setSchemaSql(GARAGE_CAR_SQL_SCHEMA);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(url, anonKey);
    setTesting(false);
    setTestResult(result);
  };

  const handleSaveCredentials = () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Informe a URL e a Anon Key do Supabase.' });
      return;
    }
    const success = saveCustomSupabaseCredentials(url, anonKey);
    if (success) {
      refreshConfig();
      setTestResult({
        success: true,
        message: 'Credenciais salvas com sucesso no navegador! Conexão atualizada.',
      });
    } else {
      setTestResult({
        success: false,
        message: 'URL inválida. Verifique o formato https://xyz.supabase.co',
      });
    }
  };

  const handleClearCredentials = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setSource('none');
    refreshConfig();
    setTestResult({
      success: true,
      message: 'Credenciais removidas. O sistema retornou ao modo inicial.',
    });
  };

  const handleCopySql = () => {
    if (schemaSql) {
      navigator.clipboard.writeText(schemaSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Supabase & Arquitetura de Banco de Dados
              </h2>
              <p className="text-xs text-slate-300">
                Fase 1: Fundação, DDL PostgreSQL, RLS e Credenciais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('connection')}
            className={`border-b-2 py-3 px-4 text-xs font-semibold transition-colors ${
              activeTab === 'connection'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Conexão Supabase
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`border-b-2 py-3 px-4 text-xs font-semibold transition-colors ${
              activeTab === 'schema'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Script SQL / DDL & RLS
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`border-b-2 py-3 px-4 text-xs font-semibold transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Regras de Banco e Segurança
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'connection' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Status Atual */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Estado da Conexão
                      </h4>
                      <p className="text-sm font-semibold text-slate-700">
                        {isConfigured && !isDemoMode
                          ? 'Conectado ao Supabase Oficial'
                          : isDemoMode
                          ? 'Modo Demonstração (Administrador Local)'
                          : 'Aguardando Configuração de URL e Chave'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isConfigured && !isDemoMode
                        ? 'bg-emerald-100 text-emerald-800'
                        : isDemoMode
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {source === 'env' ? 'Via .env' : source === 'custom' ? 'Via Navegador' : 'Sem Credencial'}
                  </span>
                </div>
              </div>

              {/* Formulário de Configuração */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">
                  Configurar Projeto Supabase
                </h3>
                <p className="text-xs text-slate-500">
                  Insira a URL e a Anon Key do seu projeto Supabase. Estas chaves são salvas com segurança no navegador ou podem ser definidas no arquivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">.env</code>.
                </p>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-500" />
                      Supabase Project URL
                    </span>
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://exemplo.supabase.co"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-slate-500" />
                      Supabase Anon Key
                    </span>
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>

                {testResult && (
                  <div
                    className={`flex items-start gap-2.5 rounded-lg p-3 text-xs font-medium ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !url || !anonKey}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {source === 'custom' && (
                      <button
                        onClick={handleClearCredentials}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Remover Salvas
                      </button>
                    )}
                    <button
                      onClick={handleSaveCredentials}
                      disabled={!url || !anonKey}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Salvar e Conectar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Script SQL Completo (PostgreSQL + Supabase)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Execute este script no <strong>SQL Editor</strong> do Supabase para provisionar as 16 tabelas, políticas de RLS, Storage e dados iniciais.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar SQL Completo</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px]">
                <pre className="whitespace-pre">{schemaSql}</pre>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <h4 className="text-sm font-bold text-blue-900 mb-1">
                  Diretrizes Rigorosas de Arquitetura da Garage Car
                </h4>
                <p className="text-xs text-blue-800">
                  Todas as decisões técnicas e regras de negócio da Fase 1 foram implementadas em total conformidade com o documento de requisitos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-blue-600" />
                    Identificadores & Tipagem Financeira
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li><strong>UUID</strong> em todas as entidades (<code className="font-mono">gen_random_uuid()</code>).</li>
                    <li>Valores financeiros usam <strong>NUMERIC(10,2)</strong> e <strong>NUNCA FLOAT</strong>.</li>
                    <li>Quantidades de estoque e custos unitários usam <strong>NUMERIC(12,4)</strong>.</li>
                    <li><strong>NÃO criar CPF</strong> em nenhuma parte do sistema.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Segurança & RLS (Row Level Security)
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>RLS ativado em <strong>100% das tabelas</strong>.</li>
                    <li>Nenhum dado acessível para usuários anônimos.</li>
                    <li>Acesso estritamente restrito a <code className="font-mono">authenticated</code>.</li>
                    <li>Bucket de Storage configurado para a logo da oficina.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-purple-600" />
                    Snapshots & Histórico Imutável
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Serviços realizados salvam snapshots completos de cliente, modelo, categoria, preço base e produtos.</li>
                    <li>Alterações futuras de preço não alteram serviços passados.</li>
                    <li>Auditoria estruturada na tabela <code className="font-mono">audit_logs</code>.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Server className="h-4 w-4 text-amber-600" />
                    Estoque FIFO & Financeiro
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Algoritmo FIFO para consumo automático de lotes.</li>
                    <li>Estoque negativo permitido com alerta visual.</li>
                    <li>Aportes diferenciados de compras diretas pelo proprietário.</li>
                    <li>Receita somente quando pagamento estiver <strong>Pago</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-xs text-slate-500">
            Fase 1: Fundação & Segurança Concluída
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
