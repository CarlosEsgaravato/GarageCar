import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Banknote,
  ShoppingBag,
  Calendar,
  Filter,
  Plus,
  RotateCcw,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Receipt,
  FileText,
  HelpCircle,
  Info,
} from 'lucide-react';
import {
  CapitalContribution,
  CapitalContributionType,
  FinancialSummary,
  ProductBatch,
} from '../../types';
import { operationService, roundMoney } from '../../services/operationService';

type PeriodOption = 'all' | 'this_month' | 'last_month' | 'last_90_days' | 'this_year' | 'custom';
type StatusFilter = 'all' | 'active' | 'reversed';

export const CapitalContributionsView: React.FC = () => {
  // Dados principais
  const [contributions, setContributions] = useState<CapitalContribution[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CapitalContributionType>('all');
  const [periodOption, setPeriodOption] = useState<PeriodOption>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modal Novo Aporte em Dinheiro (direct_cash)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newDescription, setNewDescription] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Estorno / Cancelamento
  const [reversingContribution, setReversingContribution] = useState<CapitalContribution | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Carregar dados
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [contribsData, summaryData] = await Promise.all([
        operationService.getCapitalContributions(),
        operationService.getFinancialSummary(),
      ]);

      setContributions(contribsData);
      setFinancialSummary(summaryData);
    } catch (err: any) {
      console.error('Erro ao carregar aportes de capital:', err);
      showFeedback('error', err?.message || 'Falha ao carregar aportes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Faixa de datas calculada
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (periodOption === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }

    if (periodOption === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }

    if (periodOption === 'last_90_days') {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      return { start: past.toISOString().split('T')[0], end: todayStr };
    }

    if (periodOption === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      return { start, end };
    }

    if (periodOption === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    return { start: '', end: '' };
  }, [periodOption, customStartDate, customEndDate]);

  // Lista filtrada
  const filteredContributions = useMemo(() => {
    return contributions.filter((c) => {
      // Filtro de status
      const isRev = Boolean(c.is_reversed || c.description.startsWith('[ESTORNADO]'));
      if (statusFilter === 'active' && isRev) return false;
      if (statusFilter === 'reversed' && !isRev) return false;

      // Filtro de tipo
      if (typeFilter !== 'all' && c.contribution_type !== typeFilter) {
        return false;
      }

      // Filtro de período
      if (dateRange.start && c.contribution_date < dateRange.start) {
        return false;
      }
      if (dateRange.end && c.contribution_date > dateRange.end) {
        return false;
      }

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const descMatch = c.description.toLowerCase().includes(query);
        const batchCodeMatch = c.batch?.batch_code?.toLowerCase().includes(query);
        const prodNameMatch = c.batch?.product?.name?.toLowerCase().includes(query);
        const methodMatch = c.payment_method?.toLowerCase().includes(query);
        if (!descMatch && !batchCodeMatch && !prodNameMatch && !methodMatch) {
          return false;
        }
      }

      return true;
    });
  }, [contributions, statusFilter, typeFilter, dateRange, searchTerm]);

  // Totais do período filtrado
  const filteredTotals = useMemo(() => {
    let totalDirectCash = 0;
    let totalOwnerPaid = 0;
    let totalActiveCount = 0;
    let totalReversedCount = 0;

    for (const c of filteredContributions) {
      const isRev = Boolean(c.is_reversed || c.description.startsWith('[ESTORNADO]'));
      if (isRev) {
        totalReversedCount++;
        continue;
      }

      totalActiveCount++;
      const amt = roundMoney(c.amount);
      if (c.contribution_type === 'direct_cash') {
        totalDirectCash = roundMoney(totalDirectCash + amt);
      } else if (c.contribution_type === 'owner_paid_purchase') {
        totalOwnerPaid = roundMoney(totalOwnerPaid + amt);
      }
    }

    const totalAccumulated = roundMoney(totalDirectCash + totalOwnerPaid);

    return {
      totalAccumulated,
      totalDirectCash,
      totalOwnerPaid,
      totalActiveCount,
      totalReversedCount,
    };
  }, [filteredContributions]);

  // Handler de criação manual de direct_cash
  const handleCreateDirectCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount.replace(',', '.'));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showFeedback('error', 'Informe um valor válido e positivo para o aporte.');
      return;
    }

    if (!newDescription.trim()) {
      showFeedback('error', 'Informe a descrição / justificativa do aporte.');
      return;
    }

    try {
      setIsSubmitting(true);
      await operationService.createCapitalContribution({
        contribution_type: 'direct_cash',
        amount: parsedAmount,
        contribution_date: newDate,
        description: newDescription.trim(),
        payment_method: newPaymentMethod,
      });

      showFeedback('success', `Aporte de R$ ${parsedAmount.toFixed(2)} registrado com sucesso no caixa!`);
      setIsCreateModalOpen(false);
      setNewAmount('');
      setNewDescription('');
      setNewPaymentMethod('PIX');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao registrar aporte:', err);
      showFeedback('error', err?.message || 'Falha ao registrar aporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler de estorno / cancelamento auditado
  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingContribution) return;

    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      showFeedback('error', 'Informe uma justificativa detalhada com pelo menos 5 caracteres.');
      return;
    }

    try {
      setIsSubmittingReversal(true);
      await operationService.reverseCapitalContribution(
        reversingContribution.id,
        reversalReason.trim()
      );

      showFeedback('success', 'Aporte estornado/cancelado com sucesso. O histórico contábil foi preservado.');
      setReversingContribution(null);
      setReversalReason('');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao estornar aporte:', err);
      showFeedback('error', err?.message || 'Falha ao estornar aporte.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl transition-all ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Aportes de Capital
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Registro e auditoria de recursos e bens inseridos na oficina pelo proprietário.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-contributions"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="btn-new-direct-cash"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Aporte em Dinheiro</span>
          </button>
        </div>
      </div>

      {/* Banner de Esclarecimento Contábil */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-blue-950 text-sm">
              Regras e Classificação Contábil dos Aportes (Garage Car)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/70 rounded-lg p-2.5 border border-blue-100">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5" /> 1. Dinheiro no Caixa (direct_cash):
                </span>
                <p className="text-slate-600 mt-0.5">
                  Aumenta diretamente o saldo disponível em caixa. <strong>Não é classificado como receita de serviços</strong> e não afeta o faturamento bruto.
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-2.5 border border-blue-100">
                <span className="font-bold text-indigo-800 flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> 2. Compra Paga pelo Dono (owner_paid_purchase):
                </span>
                <p className="text-slate-600 mt-0.5">
                  Incorpora insumos/lotes ao estoque. <strong>Não movimenta o caixa da empresa</strong> (saldo R$ 0,00) e não entra nas despesas operacionais da oficina.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas / Totais Aportados */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Aportado */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Aportado</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              R$ {filteredTotals.totalAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {filteredTotals.totalActiveCount} aporte(s) ativo(s) no período
            </p>
          </div>
        </div>

        {/* Dinheiro no Caixa (direct_cash) */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Injeções no Caixa (direct_cash)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-900 tracking-tight">
              R$ {filteredTotals.totalDirectCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Impacta diretamente o saldo de caixa
            </p>
          </div>
        </div>

        {/* Compras Pagas pelo Proprietário (owner_paid_purchase) */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">Compras pelo Dono (owner_paid)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-900 tracking-tight">
              R$ {filteredTotals.totalOwnerPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-indigo-700">
              Insumos adquiridos sem débito no caixa
            </p>
          </div>
        </div>

        {/* Saldo Consolidado de Caixa */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Saldo Atual do Caixa</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold tracking-tight ${
              (financialSummary?.currentCashBalance || 0) >= 0 ? 'text-blue-900' : 'text-rose-600'
            }`}>
              R$ {(financialSummary?.currentCashBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Receitas - Despesas + Dinheiro aportado
            </p>
          </div>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Busca textual */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, código do lote, nome do produto ou forma de pagamento..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Tipo */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos Tipos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('direct_cash')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  typeFilter === 'direct_cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dinheiro no Caixa
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('owner_paid_purchase')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  typeFilter === 'owner_paid_purchase'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compra pelo Dono
              </button>
            </div>

            {/* Filtro por Período */}
            <select
              value={periodOption}
              onChange={(e) => setPeriodOption(e.target.value as PeriodOption)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todo o Histórico</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Anterior</option>
              <option value="last_90_days">Últimos 90 Dias</option>
              <option value="this_year">Este Ano</option>
              <option value="custom">Data Personalizada</option>
            </select>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Somente Ativos</option>
              <option value="reversed">Somente Estornados</option>
            </select>
          </div>
        </div>

        {/* Inputs de período personalizado */}
        {periodOption === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">De:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-slate-500 font-medium">Até:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Tabela de Aportes de Capital */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Registros de Aportes ({filteredContributions.length})
            </h3>
            {filteredTotals.totalReversedCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {filteredTotals.totalReversedCount} estornado(s)
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Ordenado por data mais recente
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-xs">Carregando aportes de capital...</p>
          </div>
        ) : filteredContributions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">Nenhum aporte encontrado</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Nenhum registro de aporte de capital coincide com os filtros selecionados ou ainda não há lançamentos registrados.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Primeiro Aporte</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tipo de Aporte</th>
                  <th className="py-3 px-4">Descrição & Justificativa</th>
                  <th className="py-3 px-4">Vínculo (Lote / Produto)</th>
                  <th className="py-3 px-4">Impacto Contábil</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContributions.map((contrib) => {
                  const isRev = Boolean(contrib.is_reversed || contrib.description.startsWith('[ESTORNADO]'));
                  const isDirectCash = contrib.contribution_type === 'direct_cash';
                  const cleanDesc = contrib.description.replace(/^\[ESTORNADO\]\s*/, '');

                  return (
                    <tr
                      key={contrib.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isRev ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Data */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(contrib.contribution_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>

                      {/* Tipo com badge visual evidente */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isDirectCash ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                            isRev
                              ? 'border-slate-200 bg-slate-100 text-slate-500'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}>
                            <Banknote className="h-3 w-3" />
                            <span>Dinheiro no Caixa</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                            isRev
                              ? 'border-slate-200 bg-slate-100 text-slate-500'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-800'
                          }`}>
                            <ShoppingBag className="h-3 w-3" />
                            <span>Compra pelo Dono</span>
                          </span>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className={`font-medium ${isRev ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {cleanDesc}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {contrib.payment_method && (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                <Receipt className="h-3 w-3 text-slate-400" />
                                {contrib.payment_method}
                              </span>
                            )}
                            {isRev && (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <RotateCcw className="h-3 w-3" />
                                Estornado {contrib.reversal_reason ? `(${contrib.reversal_reason})` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Vínculo (Lote / Produto) */}
                      <td className="py-3 px-4">
                        {contrib.batch ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-800 border border-purple-200">
                              <Package className="h-3 w-3 text-purple-600" />
                              {contrib.batch.batch_code}
                            </span>
                            {contrib.batch.product && (
                              <div className="text-[11px] text-slate-600 font-medium">
                                {contrib.batch.product.name}
                              </div>
                            )}
                          </div>
                        ) : contrib.batch_id ? (
                          <span className="text-[11px] font-mono text-slate-500">
                            Lote #{contrib.batch_id.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sem vínculo (Aporte em Espécie)
                          </span>
                        )}
                      </td>

                      {/* Impacto Contábil */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isDirectCash ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" /> + Caixa da Oficina
                            </span>
                            <div className="text-[10px] text-slate-400">Sem receita operacional</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-indigo-700 font-medium text-[11px] flex items-center gap-1">
                              <Layers className="h-3 w-3" /> + Patrimônio / Estoque
                            </span>
                            <div className="text-[10px] text-slate-400">R$ 0,00 impacto no caixa</div>
                          </div>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className={`text-sm font-bold tracking-tight ${
                          isRev
                            ? 'text-slate-400 line-through'
                            : isDirectCash
                            ? 'text-emerald-700'
                            : 'text-indigo-700'
                        }`}>
                          R$ {contrib.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Ações (Auditoria / Estorno - Sem Delete Físico) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isRev ? (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Inativo
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Estornar / Cancelar Aporte (Preserva histórico contábil)"
                            onClick={() => {
                              setReversingContribution(contrib);
                              setReversalReason('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition-colors shadow-2xs"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Estornar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Novo Aporte em Dinheiro (direct_cash) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-2xs">
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Novo Aporte em Dinheiro (direct_cash)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Injeção de recursos pelo proprietário no caixa da empresa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleCreateDirectCash} className="p-6 space-y-4">
              {/* Aviso contábil */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Regra Contábil:</strong> Este aporte aumenta o saldo disponível do <strong>caixa operacional</strong> da oficina, mas <strong>NÃO</strong> é computado como receita de serviços nem entra no faturamento bruto.
                  </p>
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor do Aporte (R$) *
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Data e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data do Aporte *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Entrada / Meio
                  </label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Transferência Bancária">Transferência Bancária (TED/DOC)</option>
                    <option value="Dinheiro em Espécie">Dinheiro em Espécie (Caixa Físico)</option>
                    <option value="Depósito em Conta">Depósito em Conta Corrente</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Descrição / Motivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição / Finalidade do Aporte *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Reforço de capital de giro para início do mês, aporte do proprietário para cobertura de despesas..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Gravando aporte...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirmar Aporte</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Estorno / Cancelamento Auditado (Sem DELETE físico) */}
      {reversingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-2xs">
          <div className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-rose-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-800">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Estornar Aporte de Capital
                  </h3>
                  <p className="text-xs text-rose-200">
                    Cancelamento contábil auditado sem exclusão física
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReversingContribution(null)}
                className="rounded-lg p-1 text-rose-300 hover:bg-rose-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleConfirmReversal} className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                  Preservação Contábil
                </div>
                <p>
                  O aporte <strong>R$ {reversingContribution.amount.toFixed(2)}</strong> ({reversingContribution.contribution_type === 'direct_cash' ? 'Dinheiro no Caixa' : 'Compra pelo Dono'}) não será apagado do banco de dados. Ele será marcado como estornado e recalculado nos totais da oficina.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Justificativa do Estorno *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Informe detalhadamente por que este aporte está sendo estornado..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReversingContribution(null)}
                  disabled={isSubmittingReversal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingReversal ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processando estorno...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      <span>Confirmar Estorno</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
