import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Plus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  FileText,
  RefreshCw,
  Info,
  Car,
  Tag,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  FinancialTransaction,
  FinancialTransactionType,
  PaymentMethod,
  FinancialSummary,
} from '../../types';
import { operationService, roundMoney } from '../../services/operationService';

type PeriodOption = 'today' | 'this_month' | 'last_month' | 'custom';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Insumos / Estoque',
  'Equipamentos / Imobilizado',
  'Aluguel',
  'Energia / Água / Utilidades',
  'Manutenção de Equipamentos',
  'Salários e Pró-labore',
  'Marketing e Publicidade',
  'Impostos e Taxas',
  'Software e Telefonia',
  'Limpeza e Conservação',
  'Outras Despesas',
];

export const FinancialTransactionsView: React.FC = () => {
  // Dados principais
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Período de visualização
  const [periodOption, setPeriodOption] = useState<PeriodOption>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Filtros de extrato
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FinancialTransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [includeReversed, setIncludeReversed] = useState<boolean>(true);

  // Modal Nova Despesa
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('pix');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Modal Estorno
  const [reversingTransaction, setReversingTransaction] = useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  // Toast Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Cálculo das datas com base no período selecionado
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (periodOption === 'today') {
      return { start: todayStr, end: todayStr };
    }

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

    return {
      start: customStartDate || '1970-01-01',
      end: customEndDate || '2099-12-31',
    };
  }, [periodOption, customStartDate, customEndDate]);

  // Carregar dados
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [allTrxs, summary] = await Promise.all([
        operationService.getFinancialTransactions({ includeReversed: true }),
        operationService.getFinancialSummary(),
      ]);

      setTransactions(allTrxs);
      setFinancialSummary(summary);
    } catch (err: any) {
      console.error('Erro ao carregar movimentações financeiras:', err);
      showFeedback('error', err.message || 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleFinancialUpdate = () => {
      loadData();
    };
    window.addEventListener('garage_car_financial_updated', handleFinancialUpdate);
    return () => {
      window.removeEventListener('garage_car_financial_updated', handleFinancialUpdate);
    };
  }, []);

  // Categorias disponíveis no histórico para o filtro
  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
    set.add('Serviço Realizado');
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filtragem de transações dentro do período selecionado para o cálculo do resumo do período
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.transaction_date < dateRange.start || t.transaction_date > dateRange.end) {
        return false;
      }
      return true;
    });
  }, [transactions, dateRange]);

  // Resumo do período selecionado (sem aportes, estornos excluídos do cálculo de resultado)
  const periodSummary = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let revenueCount = 0;
    let expenseCount = 0;

    periodTransactions.forEach((t) => {
      if (t.is_reversed) return;
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') {
        revenue = roundMoney(revenue + amt);
        revenueCount++;
      } else if (t.type === 'expense') {
        expenses = roundMoney(expenses + amt);
        expenseCount++;
      }
    });

    const operatingProfit = roundMoney(revenue - expenses);

    return {
      revenue,
      expenses,
      operatingProfit,
      revenueCount,
      expenseCount,
    };
  }, [periodTransactions]);

  // Transações filtradas para a tabela de extrato
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filtro de data
      if (t.transaction_date < dateRange.start || t.transaction_date > dateRange.end) {
        return false;
      }

      // Filtro de estornadas
      if (!includeReversed && t.is_reversed) {
        return false;
      }

      // Filtro de tipo
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Filtro de categoria
      if (categoryFilter !== 'all' && t.category !== categoryFilter) {
        return false;
      }

      // Filtro de método de pagamento
      if (paymentMethodFilter !== 'all' && t.payment_method !== paymentMethodFilter) {
        return false;
      }

      // Busca textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchCat = t.category?.toLowerCase().includes(q);
        const matchService = t.executed_service?.service_name_snap?.toLowerCase().includes(q) ||
                             t.executed_service?.vehicle_model_snap?.toLowerCase().includes(q);
        const matchAmount = t.amount.toString().includes(q);
        if (!matchDesc && !matchCat && !matchService && !matchAmount) {
          return false;
        }
      }

      return true;
    });
  }, [
    transactions,
    dateRange,
    includeReversed,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    searchTerm,
  ]);

  // Formatação de moeda BRL
  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Formatação de data brasileira
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  // Ícone e label para Método de Pagamento
  const getPaymentMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'pix':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <QrCode className="h-3 w-3" /> PIX
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <Banknote className="h-3 w-3" /> Dinheiro
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CreditCard className="h-3 w-3" /> Débito
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CreditCard className="h-3 w-3" /> Crédito
          </span>
        );
      case 'other':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <FileText className="h-3 w-3" /> Outro
          </span>
        );
    }
  };

  // Submeter criação de despesa
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : expenseCategory;
    if (!finalCategory) {
      showFeedback('error', 'Informe a categoria da despesa.');
      return;
    }

    if (!expenseDescription.trim()) {
      showFeedback('error', 'Informe a descrição da despesa.');
      return;
    }

    const numAmount = parseFloat(expenseAmount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      showFeedback('error', 'O valor deve ser maior que zero.');
      return;
    }

    if (!expenseDate) {
      showFeedback('error', 'Informe a data da despesa.');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      await operationService.createFinancialExpense({
        category: finalCategory,
        description: expenseDescription.trim(),
        amount: roundMoney(numAmount),
        transaction_date: expenseDate,
        payment_method: expensePaymentMethod,
        notes: expenseNotes.trim() || undefined,
      });

      showFeedback('success', 'Despesa registrada com sucesso!');
      setIsExpenseModalOpen(false);

      // Limpar formulário
      setExpenseDescription('');
      setExpenseAmount('');
      setExpenseNotes('');
      setCustomCategoryInput('');
      setIsCustomCategory(false);
      setExpenseCategory(DEFAULT_EXPENSE_CATEGORIES[0]);

      // Recarregar dados
      await loadData();
    } catch (err: any) {
      console.error('Erro ao registrar despesa:', err);
      showFeedback('error', err.message || 'Falha ao registrar despesa.');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Abrir modal de estorno
  const handleOpenReversalModal = (trx: FinancialTransaction) => {
    if (trx.is_reversed) {
      showFeedback('error', 'Esta movimentação já foi estornada.');
      return;
    }
    setReversingTransaction(trx);
    setReversalReason('');
  };

  // Submeter estorno
  const handleSubmitReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTransaction) return;

    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      showFeedback('error', 'Informe o motivo do estorno com ao menos 5 caracteres.');
      return;
    }

    setIsSubmittingReversal(true);
    try {
      await operationService.reverseFinancialTransaction(
        reversingTransaction.id,
        reversalReason.trim()
      );

      showFeedback('success', 'Movimentação estornada com sucesso.');
      setReversingTransaction(null);
      setReversalReason('');

      await loadData();
    } catch (err: any) {
      console.error('Erro ao estornar movimentação:', err);
      showFeedback('error', err.message || 'Falha ao estornar movimentação.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast de Notificação */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            feedback.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-rose-500/50 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Movimentações Financeiras
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Fluxo de Caixa
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestão auditada de entradas de serviços quitados, saídas operacionais e resultado da oficina.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-financial"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/80 transition-all disabled:opacity-50"
            title="Atualizar transações"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-new-expense"
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-sm font-semibold shadow-lg shadow-rose-900/30 transition-all active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Barra de Período do Resumo */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-sm backdrop-blur-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Período do Resumo:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriodOption('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodOption === 'today'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => setPeriodOption('this_month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodOption === 'this_month'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            Este Mês
          </button>

          <button
            type="button"
            onClick={() => setPeriodOption('last_month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodOption === 'last_month'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            Mês Anterior
          </button>

          <button
            type="button"
            onClick={() => setPeriodOption('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              periodOption === 'custom'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            Personalizado
          </button>

          {/* Inputs de Data Personalizada */}
          {periodOption === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                title="Data Inicial"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                title="Data Final"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cards de Resumo Financeiro (Auditados e Sem Aportes nas Receitas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Atual em Caixa */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/30 rounded-2xl p-5 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Atual em Caixa
            </span>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">
              {formatCurrency(financialSummary?.currentCashBalance ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Disponível em caixa da empresa</span>
            </div>
          </div>
        </div>

        {/* Card 2: Receitas no Período */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-emerald-500/30 rounded-2xl p-5 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas (Entradas)
            </span>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(periodSummary.revenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span>{periodSummary.revenueCount} serviços pagos no período</span>
            </div>
          </div>
        </div>

        {/* Card 3: Despesas no Período */}
        <div className="bg-slate-900/90 border border-slate-800/90 hover:border-rose-500/30 rounded-2xl p-5 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas (Saídas)
            </span>
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">
              {formatCurrency(periodSummary.expenses)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span>{periodSummary.expenseCount} saídas operacionais / compras</span>
            </div>
          </div>
        </div>

        {/* Card 4: Resultado Operacional no Período */}
        <div
          className={`bg-slate-900/90 border rounded-2xl p-5 shadow-sm transition-all ${
            periodSummary.operatingProfit >= 0
              ? 'border-slate-800/90 hover:border-emerald-500/30'
              : 'border-slate-800/90 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resultado Operacional
            </span>
            <div
              className={`p-2.5 rounded-xl border ${
                periodSummary.operatingProfit >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              {periodSummary.operatingProfit >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownLeft className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                periodSummary.operatingProfit >= 0 ? 'text-emerald-300' : 'text-amber-400'
              }`}
            >
              {formatCurrency(periodSummary.operatingProfit)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span
                className={`font-semibold ${
                  periodSummary.operatingProfit >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {periodSummary.operatingProfit >= 0 ? 'Superávit' : 'Déficit'}
              </span>
              <span>(Receitas - Despesas)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nota Informativa sobre Aportes e Isolamento Contábil */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400">
        <Info className="h-4 w-4 text-blue-400 shrink-0" />
        <span>
          <strong>Regra Contábil Garage Car:</strong> Aportes do proprietário são geridos separadamente e{' '}
          <strong>nunca</strong> são computados como receita ou resultado operacional.
        </span>
      </div>

      {/* Barra de Filtros do Extrato */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, serviço, categoria ou valor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/80"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros em Linha */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Tipo: Todos</option>
              <option value="revenue">Apenas Receitas (+)</option>
              <option value="expense">Apenas Despesas (-)</option>
            </select>

            {/* Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Categoria: Todas</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Método de Pagamento */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Método: Todos</option>
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="debit">Cartão Débito</option>
              <option value="credit">Cartão Crédito</option>
              <option value="other">Outro</option>
            </select>

            {/* Toggle Estornadas */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 select-none">
              <input
                type="checkbox"
                checked={includeReversed}
                onChange={(e) => setIncludeReversed(e.target.checked)}
                className="rounded-sm border-slate-700 text-emerald-600 focus:ring-emerald-500/20 bg-slate-900 h-4 w-4"
              />
              <span>Exibir Estornos</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/40">
          <span>
            Exibindo <strong>{filteredTransactions.length}</strong> de{' '}
            <strong>{transactions.length}</strong> movimentações registradas
          </span>
          {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || paymentMethodFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setCategoryFilter('all');
                setPaymentMethodFilter('all');
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Extrato Cronológico */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-400" />
            <p className="text-sm font-medium">Carregando movimentações do caixa...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-slate-800/80 rounded-2xl text-slate-500">
              <DollarSign className="h-8 w-8" />
            </div>
            <p className="text-base font-semibold text-slate-200">
              Nenhuma movimentação financeira encontrada
            </p>
            <p className="text-sm text-slate-400 max-w-md">
              Não há registros para os filtros selecionados. Serviços executados e pagos, compras de
              insumos ou despesas operacionais manuais aparecerão aqui cronologicamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Descrição</th>
                  <th className="py-3.5 px-4">Serviço Relacionado</th>
                  <th className="py-3.5 px-4">Método</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((trx) => {
                  const isRevenue = trx.type === 'revenue';
                  return (
                    <tr
                      key={trx.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        trx.is_reversed ? 'bg-slate-950/30 opacity-75' : ''
                      }`}
                    >
                      {/* Data */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-medium text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatDateBR(trx.transaction_date)}</span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isRevenue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ArrowDownLeft className="h-3 w-3" /> Receita
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowUpRight className="h-3 w-3" /> Despesa
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {trx.category}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="py-3.5 px-4 text-slate-200 min-w-[220px]">
                        <div className={`font-medium ${trx.is_reversed ? 'line-through text-slate-400' : ''}`}>
                          {trx.description}
                        </div>
                        {trx.is_reversed && trx.reversal_reason && (
                          <div className="text-xs text-rose-400/90 mt-1 flex items-start gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>Motivo do estorno: {trx.reversal_reason}</span>
                          </div>
                        )}
                      </td>

                      {/* Serviço Relacionado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {trx.executed_service_id ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400">
                              <Car className="h-3 w-3" />
                              OS #{trx.executed_service_id.slice(0, 8)}
                            </span>
                            {trx.executed_service && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {trx.executed_service.service_name_snap} • {trx.executed_service.vehicle_model_snap}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>

                      {/* Método */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPaymentMethodBadge(trx.payment_method)}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-sm">
                        <span
                          className={`${
                            trx.is_reversed
                              ? 'line-through text-slate-500'
                              : isRevenue
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {isRevenue ? '+' : '-'} {formatCurrency(trx.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {trx.is_reversed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            title={trx.reversal_reason || 'Movimentação estornada'}
                          >
                            <AlertCircle className="h-3 w-3" /> Estornada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" /> Liquidada
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {trx.is_reversed ? (
                          <span className="text-xs text-slate-500 italic">Estornada</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReversalModal(trx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700/50 transition-all"
                            title="Estornar movimentação auditada"
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

      {/* MODAL: NOVA DESPESA OPERACIONAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Nova Despesa Operacional</h2>
                  <p className="text-xs text-slate-400">
                    Lançamento de saída do caixa da Garage Car
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Categoria da Despesa *
                </label>
                {!isCustomCategory ? (
                  <div className="space-y-2">
                    <select
                      value={expenseCategory}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                          setCustomCategoryInput('');
                        } else {
                          setExpenseCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500"
                    >
                      {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__custom__">+ Outra Categoria Personalizada...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Nome da categoria personalizada..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(false)}
                      className="px-3 py-2.5 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição *
                </label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Ex: Conta de energia ref. Set/26, Compra de fitas crepe..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              {/* Grid: Valor, Data, Método de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Valor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-semibold focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                {/* Método de Pagamento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pagamento *
                  </label>
                  <select
                    value={expensePaymentMethod}
                    onChange={(e) => setExpensePaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="debit">Cartão Débito</option>
                    <option value="credit">Cartão Crédito</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observações Adicionais (opcional)
                </label>
                <textarea
                  rows={2}
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Número de nota fiscal, fornecedor, detalhes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-rose-500 resize-none"
                />
              </div>

              {/* Ações do Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
                >
                  {isSubmittingExpense && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>Registrar Despesa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO AUDITADO */}
      {reversingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Estornar Movimentação</h2>
                  <p className="text-xs text-slate-400">
                    Operação auditada e irreversível
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReversingTransaction(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumo da Transação Selecionada */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo:</span>
                <span
                  className={`font-semibold ${
                    reversingTransaction.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reversingTransaction.type === 'revenue' ? 'Receita (+)' : 'Despesa (-)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(reversingTransaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data:</span>
                <span className="text-slate-200">
                  {formatDateBR(reversingTransaction.transaction_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria:</span>
                <span className="text-slate-200">{reversingTransaction.category}</span>
              </div>
              <div className="pt-1 border-t border-slate-800 text-slate-300">
                <span className="text-slate-400">Descrição: </span>
                {reversingTransaction.description}
              </div>
            </div>

            {/* Alerta de Preservação de Histórico */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                O registro <strong>não será excluído</strong> do banco de dados para garantir auditoria fiscal e contábil.
                Ele será marcado como estornado e seu valor deduzido do caixa imediatamente.
              </span>
            </div>

            <form onSubmit={handleSubmitReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Motivo Obrigatório do Estorno *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ex: Lançamento em duplicidade, cancelamento de serviço pelo cliente, erro no valor digitado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-amber-500 resize-none"
                  autoFocus
                />
                <span className="text-[11px] text-slate-400">
                  Mínimo de 5 caracteres.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversingTransaction(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal || reversalReason.trim().length < 5}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
                >
                  {isSubmittingReversal && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>Confirmar Estorno</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
