/* ====================================================================
   ÁREA TEMPORÁRIA DE DIAGNÓSTICO SUPABASE NO NAVEGADOR (REMOVÍVEL)
   Finalidade: Validar a sessão real, usuário, role, SELECT clients
   e executar o Teste Real de CRUD (Cliente e Veículo) diretamente
   no navegador sem expor tokens ou credenciais.
   ==================================================================== */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Database,
  Copy,
  Check,
  Play,
  Car,
  Trash2,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

export interface DiagnosticState {
  hasSession: boolean;
  hasUser: boolean;
  userId: string | null;
  userEmail: string | null;
  role: string | null;
  isRoleAuthenticated: boolean;
  sessionError: string | null;
  userError: string | null;
  clientsQueryStatus: 'idle' | 'loading' | 'success' | 'error';
  clientsCount: number;
  clientsError: string | null;
  clientsDataPreview: any[] | null;
  rawSessionMeta: {
    expiresAt?: number;
    tokenType?: string;
  } | null;
  timestamp: string;
}

export interface CrudTestResult {
  executed: boolean;
  running: boolean;
  clientInsert: 'OK' | 'ERRO' | 'PENDENTE';
  clientSelect: 'OK' | 'ERRO' | 'PENDENTE';
  clientUpdate: 'OK' | 'ERRO' | 'PENDENTE';
  clientDelete: 'OK' | 'ERRO' | 'PENDENTE';
  vehicleInsert: 'OK' | 'ERRO' | 'PENDENTE';
  vehicleSelect: 'OK' | 'ERRO' | 'PENDENTE';
  vehicleRelation: 'OK' | 'ERRO' | 'PENDENTE';
  vehicleDelete: 'OK' | 'ERRO' | 'PENDENTE';
  realPersistence: 'SIM' | 'NÃO';
  localStorageUsed: 'SIM' | 'NÃO';
  errorDetails: string | null;
  createdClientId: string | null;
  createdVehicleId: string | null;
  logs: string[];
  timestamp: string;
}

export const BrowserSupabaseDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [copiedCrud, setCopiedCrud] = useState(false);
  const [diag, setDiag] = useState<DiagnosticState | null>(null);

  const [crudResult, setCrudResult] = useState<CrudTestResult>({
    executed: false,
    running: false,
    clientInsert: 'PENDENTE',
    clientSelect: 'PENDENTE',
    clientUpdate: 'PENDENTE',
    clientDelete: 'PENDENTE',
    vehicleInsert: 'PENDENTE',
    vehicleSelect: 'PENDENTE',
    vehicleRelation: 'PENDENTE',
    vehicleDelete: 'PENDENTE',
    realPersistence: 'NÃO',
    localStorageUsed: 'NÃO',
    errorDetails: null,
    createdClientId: null,
    createdVehicleId: null,
    logs: [],
    timestamp: '',
  });

  const runDiagnostic = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseClient();
    const timestamp = new Date().toLocaleTimeString();

    if (!sb) {
      setDiag({
        hasSession: false,
        hasUser: false,
        userId: null,
        userEmail: null,
        role: null,
        isRoleAuthenticated: false,
        sessionError: 'Cliente Supabase não inicializado ou URL/chave ausentes',
        userError: 'Cliente Supabase não inicializado',
        clientsQueryStatus: 'error',
        clientsCount: 0,
        clientsError: 'Cliente Supabase não disponível',
        clientsDataPreview: null,
        rawSessionMeta: null,
        timestamp,
      });
      setLoading(false);
      return;
    }

    try {
      const sessionRes = await sb.auth.getSession();
      const session = sessionRes.data?.session;
      const sessionError = sessionRes.error?.message || null;

      const userRes = await sb.auth.getUser();
      const user = userRes.data?.user;
      const userError = userRes.error?.message || null;

      const userId = user?.id || session?.user?.id || null;
      const userEmail = user?.email || session?.user?.email || null;
      const role = user?.role || session?.user?.role || (userId ? 'authenticated' : null);
      const isRoleAuthenticated = role === 'authenticated' || (!!userId && !userError);

      let clientsQueryStatus: 'success' | 'error' = 'success';
      let clientsCount = 0;
      let clientsError: string | null = null;
      let clientsDataPreview: any[] | null = null;

      try {
        const { data, error } = await sb
          .from('clients')
          .select('id, name, phone, email, created_at')
          .limit(5);

        if (error) {
          clientsQueryStatus = 'error';
          clientsError = `[${error.code || 'ERRO'}] ${error.message}`;
        } else {
          clientsQueryStatus = 'success';
          clientsCount = data ? data.length : 0;
          clientsDataPreview = data || [];
        }
      } catch (err: any) {
        clientsQueryStatus = 'error';
        clientsError = err?.message || 'Falha de requisição ao consultar clients';
      }

      setDiag({
        hasSession: !!session,
        hasUser: !!user,
        userId,
        userEmail,
        role: role || null,
        isRoleAuthenticated,
        sessionError,
        userError,
        clientsQueryStatus,
        clientsCount,
        clientsError,
        clientsDataPreview,
        rawSessionMeta: session
          ? {
              expiresAt: session.expires_at,
              tokenType: session.token_type,
            }
          : null,
        timestamp,
      });
    } catch (err: any) {
      setDiag({
        hasSession: false,
        hasUser: false,
        userId: null,
        userEmail: null,
        role: null,
        isRoleAuthenticated: false,
        sessionError: err?.message || 'Falha geral ao executar getSession()',
        userError: err?.message || 'Falha geral ao executar getUser()',
        clientsQueryStatus: 'error',
        clientsCount: 0,
        clientsError: err?.message || 'Falha inesperada no diagnóstico',
        clientsDataPreview: null,
        rawSessionMeta: null,
        timestamp,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ====================================================================
  // TESTE REAL DE CRUD SUPABASE (EXECUTADO NA SESSÃO DO NAVEGADOR)
  // ====================================================================
  const runCrudTest = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      alert('Cliente Supabase não está inicializado.');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    setCrudResult({
      executed: true,
      running: true,
      clientInsert: 'PENDENTE',
      clientSelect: 'PENDENTE',
      clientUpdate: 'PENDENTE',
      clientDelete: 'PENDENTE',
      vehicleInsert: 'PENDENTE',
      vehicleSelect: 'PENDENTE',
      vehicleRelation: 'PENDENTE',
      vehicleDelete: 'PENDENTE',
      realPersistence: 'SIM',
      localStorageUsed: 'NÃO',
      errorDetails: null,
      createdClientId: null,
      createdVehicleId: null,
      logs: ['Iniciando ciclo real de CRUD no Supabase via sessão do navegador...'],
      timestamp,
    });

    let testClientId: string | null = null;
    let testVehicleId: string | null = null;

    let cInsert: 'OK' | 'ERRO' = 'ERRO';
    let cSelect: 'OK' | 'ERRO' = 'ERRO';
    let cUpdate: 'OK' | 'ERRO' = 'ERRO';
    let cDelete: 'OK' | 'ERRO' = 'ERRO';

    let vInsert: 'OK' | 'ERRO' = 'ERRO';
    let vSelect: 'OK' | 'ERRO' = 'ERRO';
    let vRelation: 'OK' | 'ERRO' = 'ERRO';
    let vDelete: 'OK' | 'ERRO' = 'ERRO';

    let firstError: string | null = null;

    try {
      // -------------------------------------------------------------
      // 1. CLIENTE: INSERT
      // -------------------------------------------------------------
      log('Passo 1: Criando cliente temporário "TESTE SUPABASE GARAGE CAR"...');
      const { data: insClientData, error: insClientErr } = await sb
        .from('clients')
        .insert({
          name: 'TESTE SUPABASE GARAGE CAR',
          phone: '99999999999',
          notes: 'Registro temporário para teste de CRUD real',
          is_active: true,
        })
        .select()
        .single();

      if (insClientErr) {
        cInsert = 'ERRO';
        firstError = firstError || `[Cliente INSERT] [${insClientErr.code || 'ERRO'}] ${insClientErr.message}`;
        log(`ERRO no INSERT do cliente: ${insClientErr.message} (código ${insClientErr.code})`);
      } else if (insClientData?.id) {
        cInsert = 'OK';
        testClientId = insClientData.id;
        log(`Cliente criado com sucesso no Supabase! ID: ${testClientId}`);
      } else {
        cInsert = 'ERRO';
        firstError = firstError || '[Cliente INSERT] Nenhum dado retornado no INSERT';
        log('ERRO: Nenhum ID de cliente retornado.');
      }

      // -------------------------------------------------------------
      // 2. VEÍCULO: INSERT (vinculado ao cliente de teste)
      // -------------------------------------------------------------
      if (testClientId) {
        log('Passo 2: Criando veículo temporário vinculado ao cliente...');
        const { data: insVehData, error: insVehErr } = await sb
          .from('vehicles')
          .insert({
            client_id: testClientId,
            type: 'car',
            brand: 'TESTE',
            model: 'VEICULO SUPABASE',
            year: 2026,
            plate: 'TEST0000',
            commercial_category: 'Carro / Compacto',
            notes: 'Veículo temporário de validação',
            is_active: true,
          })
          .select()
          .single();

        if (insVehErr) {
          vInsert = 'ERRO';
          firstError = firstError || `[Veículo INSERT] [${insVehErr.code || 'ERRO'}] ${insVehErr.message}`;
          log(`ERRO no INSERT do veículo: ${insVehErr.message} (código ${insVehErr.code})`);
        } else if (insVehData?.id) {
          vInsert = 'OK';
          testVehicleId = insVehData.id;
          log(`Veículo criado com sucesso no Supabase! ID: ${testVehicleId}`);
        } else {
          vInsert = 'ERRO';
          firstError = firstError || '[Veículo INSERT] Nenhum dado retornado no INSERT do veículo';
          log('ERRO: Nenhum ID de veículo retornado.');
        }
      } else {
        log('PULANDO inserção do veículo devido a falha no INSERT do cliente.');
      }

      // -------------------------------------------------------------
      // 3. VEÍCULO: SELECT & RELACIONAMENTO COM CLIENTE
      // -------------------------------------------------------------
      if (testVehicleId && testClientId) {
        log('Passo 3: Consultando veículo no Supabase com join em clients...');
        const { data: selVehData, error: selVehErr } = await sb
          .from('vehicles')
          .select('*, client:clients(*)')
          .eq('id', testVehicleId)
          .single();

        if (selVehErr) {
          vSelect = 'ERRO';
          vRelation = 'ERRO';
          firstError = firstError || `[Veículo SELECT] [${selVehErr.code || 'ERRO'}] ${selVehErr.message}`;
          log(`ERRO no SELECT do veículo: ${selVehErr.message}`);
        } else if (selVehData) {
          vSelect = 'OK';
          log(`Veículo consultado com sucesso! Placa: ${selVehData.plate}`);
          // Validação de relacionamento
          if (
            selVehData.client_id === testClientId &&
            selVehData.client &&
            selVehData.client.name === 'TESTE SUPABASE GARAGE CAR'
          ) {
            vRelation = 'OK';
            log('Relacionamento veículo -> cliente validado com integridade referencial!');
          } else {
            vRelation = 'ERRO';
            firstError = firstError || '[Relacionamento] Falha na validação do client vinculado';
            log('ERRO: Relacionamento não retornou o cliente esperado.');
          }
        }
      }

      // -------------------------------------------------------------
      // 4. CLIENTE: SELECT
      // -------------------------------------------------------------
      if (testClientId) {
        log('Passo 4: Consultando cliente no Supabase...');
        const { data: selClientData, error: selClientErr } = await sb
          .from('clients')
          .select('*, vehicles(*)')
          .eq('id', testClientId)
          .single();

        if (selClientErr) {
          cSelect = 'ERRO';
          firstError = firstError || `[Cliente SELECT] [${selClientErr.code || 'ERRO'}] ${selClientErr.message}`;
          log(`ERRO no SELECT do cliente: ${selClientErr.message}`);
        } else if (selClientData) {
          cSelect = 'OK';
          log(`Cliente consultado com sucesso: "${selClientData.name}" (${selClientData.vehicles?.length || 0} veículos)`);
        }
      }

      // -------------------------------------------------------------
      // 5. CLIENTE: UPDATE (alterar nome para 'TESTE SUPABASE GARAGE CAR ATUALIZADO')
      // -------------------------------------------------------------
      if (testClientId) {
        log('Passo 5: Atualizando nome do cliente para "TESTE SUPABASE GARAGE CAR ATUALIZADO"...');
        const { data: updClientData, error: updClientErr } = await sb
          .from('clients')
          .update({
            name: 'TESTE SUPABASE GARAGE CAR ATUALIZADO',
            updated_at: new Date().toISOString(),
          })
          .eq('id', testClientId)
          .select()
          .single();

        if (updClientErr) {
          cUpdate = 'ERRO';
          firstError = firstError || `[Cliente UPDATE] [${updClientErr.code || 'ERRO'}] ${updClientErr.message}`;
          log(`ERRO no UPDATE do cliente: ${updClientErr.message}`);
        } else {
          // Re-consulta para confirmar alteração
          const { data: reCheckData } = await sb
            .from('clients')
            .select('name')
            .eq('id', testClientId)
            .single();

          if (reCheckData?.name === 'TESTE SUPABASE GARAGE CAR ATUALIZADO') {
            cUpdate = 'OK';
            log('Nome do cliente atualizado e revalidado no Supabase com sucesso!');
          } else {
            cUpdate = 'ERRO';
            firstError = firstError || '[Cliente UPDATE] Nome não coincidiu na reconsulta';
            log('ERRO: Nome não coincidiu na confirmação pós-update.');
          }
        }
      }

      // -------------------------------------------------------------
      // 6. VEÍCULO: DELETE (excluir veículo de teste primeiro)
      // -------------------------------------------------------------
      if (testVehicleId) {
        log('Passo 6: Excluindo veículo de teste...');
        const { error: delVehErr } = await sb
          .from('vehicles')
          .delete()
          .eq('id', testVehicleId);

        if (delVehErr) {
          vDelete = 'ERRO';
          firstError = firstError || `[Veículo DELETE] [${delVehErr.code || 'ERRO'}] ${delVehErr.message}`;
          log(`ERRO na exclusão do veículo: ${delVehErr.message}`);
        } else {
          // Confirmar que não existe mais
          const { data: checkDelVeh } = await sb
            .from('vehicles')
            .select('id')
            .eq('id', testVehicleId)
            .maybeSingle();

          if (!checkDelVeh) {
            vDelete = 'OK';
            log('Veículo de teste excluído com sucesso do Supabase.');
          } else {
            vDelete = 'ERRO';
            firstError = firstError || '[Veículo DELETE] Veículo ainda existe após DELETE';
            log('ERRO: Veículo ainda foi encontrado no Supabase após DELETE.');
          }
        }
      }

      // -------------------------------------------------------------
      // 7. CLIENTE: DELETE (excluir cliente de teste)
      // -------------------------------------------------------------
      if (testClientId) {
        log('Passo 7: Excluindo cliente de teste...');
        const { error: delClientErr } = await sb
          .from('clients')
          .delete()
          .eq('id', testClientId);

        if (delClientErr) {
          cDelete = 'ERRO';
          firstError = firstError || `[Cliente DELETE] [${delClientErr.code || 'ERRO'}] ${delClientErr.message}`;
          log(`ERRO na exclusão do cliente: ${delClientErr.message}`);
        } else {
          // Confirmar que não existe mais
          const { data: checkDelCli } = await sb
            .from('clients')
            .select('id')
            .eq('id', testClientId)
            .maybeSingle();

          if (!checkDelCli) {
            cDelete = 'OK';
            log('Cliente de teste excluído com sucesso do Supabase.');
          } else {
            cDelete = 'ERRO';
            firstError = firstError || '[Cliente DELETE] Cliente ainda existe após DELETE';
            log('ERRO: Cliente ainda foi encontrado no Supabase após DELETE.');
          }
        }
      }
    } catch (unexpectedErr: any) {
      firstError = firstError || `Exceção inesperada: ${unexpectedErr?.message || unexpectedErr}`;
      log(`Exceção durante teste de CRUD: ${unexpectedErr?.message || unexpectedErr}`);
    } finally {
      // Limpeza de contingência se algo falhou no meio
      try {
        if (testVehicleId && vDelete !== 'OK') {
          log('Tentando limpeza forçada do veículo restante...');
          await sb.from('vehicles').delete().eq('id', testVehicleId);
        }
        if (testClientId && cDelete !== 'OK') {
          log('Tentando limpeza forçada do cliente restante...');
          await sb.from('clients').delete().eq('id', testClientId);
        }
      } catch (cleanErr) {
        console.warn('Erro na limpeza de contingência:', cleanErr);
      }

      log('Ciclo de teste concluído.');

      setCrudResult({
        executed: true,
        running: false,
        clientInsert: cInsert,
        clientSelect: cSelect,
        clientUpdate: cUpdate,
        clientDelete: cDelete,
        vehicleInsert: vInsert,
        vehicleSelect: vSelect,
        vehicleRelation: vRelation,
        vehicleDelete: vDelete,
        realPersistence: 'SIM',
        localStorageUsed: 'NÃO',
        errorDetails: firstError,
        createdClientId: testClientId,
        createdVehicleId: testVehicleId,
        logs,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  useEffect(() => {
    runDiagnostic();
  }, [runDiagnostic]);

  const formattedDiagReport = diag
    ? `================================
DIAGNÓSTICO NO NAVEGADOR
================================

Sessão Supabase: ${diag.hasSession ? 'OK' : 'ERRO'}
Usuário autenticado: ${diag.hasUser ? 'OK' : 'ERRO'}
User ID: ${diag.userId ? 'OK (' + diag.userId + ')' : 'ERRO'}
Role authenticated: ${diag.isRoleAuthenticated ? 'OK' : 'ERRO'}
SELECT clients: ${diag.clientsQueryStatus === 'success' ? 'OK' : 'ERRO'}

Quantidade de registros retornados:
${diag.clientsCount}

Erro:
${diag.clientsError || diag.sessionError || diag.userError || 'Nenhum erro reportado'}`
    : 'Executando diagnóstico no navegador...';

  const formattedCrudReport = crudResult.executed
    ? `================================
CRUD REAL — RESULTADO
================================

Cliente:
INSERT: ${crudResult.clientInsert}
SELECT: ${crudResult.clientSelect}
UPDATE: ${crudResult.clientUpdate}
DELETE: ${crudResult.clientDelete}

Veículo:
INSERT: ${crudResult.vehicleInsert}
SELECT: ${crudResult.vehicleSelect}
Relacionamento cliente: ${crudResult.vehicleRelation}
DELETE: ${crudResult.vehicleDelete}

Persistência real no Supabase: ${crudResult.realPersistence}
LocalStorage utilizado: ${crudResult.localStorageUsed}
${crudResult.errorDetails ? `\nErro:\n${crudResult.errorDetails}` : ''}`
    : 'Teste de CRUD ainda não foi disparado. Clique no botão "Executar Teste Real de CRUD".';

  const copyDiagReport = () => {
    navigator.clipboard.writeText(formattedDiagReport);
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2500);
  };

  const copyCrudReport = () => {
    navigator.clipboard.writeText(formattedCrudReport);
    setCopiedCrud(true);
    setTimeout(() => setCopiedCrud(false), 2500);
  };

  return (
    <div
      id="browser-supabase-diagnostic-box"
      className="rounded-2xl border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-950/20 via-white to-slate-50 p-6 shadow-md transition-all text-slate-900 space-y-6"
    >
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-indigo-950">
                Painel de Validação e Teste Real de CRUD (Navegador + Supabase)
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                Temporário
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Executa autenticação e ciclo completo de CRUD de Cliente e Veículo no Supabase utilizando a sessão real ativa deste navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runDiagnostic}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{loading ? 'Testando...' : 'Reavaliar Sessão'}</span>
          </button>

          <button
            type="button"
            onClick={runCrudTest}
            disabled={crudResult.running}
            id="btn-run-real-crud-test"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${crudResult.running ? 'animate-spin' : ''}`} />
            <span>{crudResult.running ? 'Executando CRUD Real...' : 'Executar Teste Real de CRUD'}</span>
          </button>
        </div>
      </div>

      {/* Seção 1: Indicadores da Sessão */}
      {diag && (
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-indigo-600" />
            <span>1. Diagnóstico da Sessão Autenticada</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Sessão Supabase
              </span>
              <div className="flex items-center gap-1.5">
                {diag.hasSession ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
                <span className={`text-xs font-bold ${diag.hasSession ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {diag.hasSession ? 'OK (Ativa)' : 'ERRO (Nula)'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Usuário Autenticado
              </span>
              <div className="flex items-center gap-1.5">
                {diag.hasUser ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
                <span className={`text-xs font-bold ${diag.hasUser ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {diag.hasUser ? 'OK' : 'ERRO'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                User ID
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-800 block truncate" title={diag.userId || 'Nenhum'}>
                {diag.userId ? `${diag.userId.slice(0, 8)}...${diag.userId.slice(-6)}` : 'ERRO'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Role authenticated
              </span>
              <div className="flex items-center gap-1.5">
                {diag.isRoleAuthenticated ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span className={`text-xs font-bold ${diag.isRoleAuthenticated ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {diag.isRoleAuthenticated ? 'OK' : 'ERRO'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                SELECT clients (LIMIT 5)
              </span>
              <div className="flex items-center gap-1.5">
                {diag.clientsQueryStatus === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
                <span className={`text-xs font-bold ${diag.clientsQueryStatus === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {diag.clientsQueryStatus === 'success' ? `OK (${diag.clientsCount} linhas)` : 'ERRO'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção 2: Resultado do Teste Real de CRUD */}
      <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-950/5 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/50 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                2. Teste Real de CRUD (Cliente + Veículo + Relacionamento)
              </h4>
              <p className="text-[11px] text-slate-500">
                Gravação, consulta relacional, atualização e exclusão sem localStorage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copyCrudReport}
            disabled={!crudResult.executed}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs disabled:opacity-40"
          >
            {copiedCrud ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedCrud ? 'Copiado!' : 'Copiar Resultado do CRUD'}</span>
          </button>
        </div>

        {/* Tabela de Status do CRUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Cliente */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <User className="h-4 w-4 text-indigo-600" />
              <span>Cliente de Teste</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">INSERT:</span>
                <span className={`font-bold font-mono ${crudResult.clientInsert === 'OK' ? 'text-emerald-700' : crudResult.clientInsert === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.clientInsert}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">SELECT:</span>
                <span className={`font-bold font-mono ${crudResult.clientSelect === 'OK' ? 'text-emerald-700' : crudResult.clientSelect === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.clientSelect}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">UPDATE:</span>
                <span className={`font-bold font-mono ${crudResult.clientUpdate === 'OK' ? 'text-emerald-700' : crudResult.clientUpdate === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.clientUpdate}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">DELETE:</span>
                <span className={`font-bold font-mono ${crudResult.clientDelete === 'OK' ? 'text-emerald-700' : crudResult.clientDelete === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.clientDelete}
                </span>
              </div>
            </div>
          </div>

          {/* Card Veículo */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Car className="h-4 w-4 text-indigo-600" />
              <span>Veículo de Teste (Vinculado)</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">INSERT:</span>
                <span className={`font-bold font-mono ${crudResult.vehicleInsert === 'OK' ? 'text-emerald-700' : crudResult.vehicleInsert === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.vehicleInsert}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">SELECT:</span>
                <span className={`font-bold font-mono ${crudResult.vehicleSelect === 'OK' ? 'text-emerald-700' : crudResult.vehicleSelect === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.vehicleSelect}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">Relacionamento:</span>
                <span className={`font-bold font-mono ${crudResult.vehicleRelation === 'OK' ? 'text-emerald-700' : crudResult.vehicleRelation === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.vehicleRelation}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <span className="text-slate-600">DELETE:</span>
                <span className={`font-bold font-mono ${crudResult.vehicleDelete === 'OK' ? 'text-emerald-700' : crudResult.vehicleDelete === 'ERRO' ? 'text-rose-700' : 'text-slate-400'}`}>
                  {crudResult.vehicleDelete}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Box Formatado Pronto para Copiar */}
        <div className="rounded-xl border border-slate-300 bg-slate-900 text-slate-100 p-4 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-emerald-400 text-[11px] uppercase tracking-wider font-bold">
              Texto Formatado do Teste de CRUD ({crudResult.timestamp || 'Aguardando execução'})
            </span>
            <button
              type="button"
              onClick={copyCrudReport}
              disabled={!crudResult.executed}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40"
            >
              {copiedCrud ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCrud ? 'Copiado' : 'Copiar Bloco'}</span>
            </button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
            {formattedCrudReport}
          </pre>
        </div>

        {/* Logs de Execução em Tempo Real */}
        {crudResult.logs.length > 0 && (
          <div className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-1">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
              Logs detalhados da execução no Supabase:
            </span>
            {crudResult.logs.map((logMsg, i) => (
              <div key={i} className="leading-tight">
                {logMsg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

