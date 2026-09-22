import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Wrench,
  Receipt,
  Clock,
  Calendar,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { NavItemKey } from '../layout/Sidebar';
import { operationService, roundMoney } from '../../services/operationService';
import { dataService } from '../../services/dataService';
import {
  Appointment,
  ExecutedService,
  FinancialTransaction,
  Product,
  ProductBatch,
} from '../../types';

export type DashboardPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

interface DashboardViewProps {
  onNavigate: (view: NavItemKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  // Estado de Filtro de Período
  const [period, setPeriod] = useState<DashboardPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Estados de Dados
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [executedServices, setExecutedServices] = useState<ExecutedService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [currentCashBalance, setCurrentCashBalance] = useState<number>(0);

  // Calcula limites de data do filtro selecionado
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'today') {
      const todayStr = toYMD(now);
      return { start: todayStr, end: todayStr };
    }

    if (period === 'this_week') {
      // Semana iniciando no domingo ou segunda (usando domingo da semana atual)
      const day = now.getDay();
      const diffStart = now.getDate() - day;
      const startDate = new Date(now.getFullYear(), now.getMonth(), diffStart);
      const endDate = new Date(now.getFullYear(), now.getMonth(), diffStart + 6);
      return { start: toYMD(startDate), end: toYMD(endDate) };
    }

    if (period === 'this_month') {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toYMD(startDate), end: toYMD(endDate) };
    }

    if (period === 'last_month') {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toYMD(startDate), end: toYMD(endDate) };
    }

    // Custom
    return {
      start: customStartDate || '1970-01-01',
      end: customEndDate || '2099-12-31',
    };
  }, [period, customStartDate, customEndDate]);

  // Carregamento dos dados
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        allTrxs,
        allServices,
        allAppts,
        allProds,
        allBatches,
        finSummary,
      ] = await Promise.all([
        operationService.getFinancialTransactions({ includeReversed: false }),
        operationService.getExecutedServices(),
        operationService.getAppointments(),
        dataService.getProducts(),
        operationService.getProductBatches(undefined, 'desc'),
        operationService.getFinancialSummary(),
      ]);

      setTransactions(allTrxs);
      setExecutedServices(allServices);
      setAppointments(allAppts);
      setProducts(allProds);
      setBatches(allBatches);
      setCurrentCashBalance(finSummary.currentCashBalance);
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Atualização reativa quando houver eventos de movimentação no sistema
    const handleFinancialUpdate = () => {
      loadDashboardData(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('garage_car_financial_updated', handleFinancialUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('garage_car_financial_updated', handleFinancialUpdate);
      }
    };
  }, [loadDashboardData]);

  // Filtra transações pelo período selecionado
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.is_reversed) return false;
      const date = t.transaction_date;
      return date >= dateRange.start && date <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Indicador 1: Faturamento do período (receitas efetivamente pagas em financial_transactions)
  const periodRevenue = useMemo(() => {
    const rev = filteredTransactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return roundMoney(rev);
  }, [filteredTransactions]);

  // Indicador 2: Despesas do período (despesas registradas em financial_transactions)
  const periodExpenses = useMemo(() => {
    const exp = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return roundMoney(exp);
  }, [filteredTransactions]);

  // Indicador 3: Resultado operacional (receitas - despesas)
  const periodOperatingResult = useMemo(() => {
    return roundMoney(periodRevenue - periodExpenses);
  }, [periodRevenue, periodExpenses]);

  // Filtra serviços executados pelo período selecionado
  const filteredServices = useMemo(() => {
    return executedServices.filter((s) => {
      if (s.status === 'cancelled') return false;
      const dateStr = (s.started_at || s.created_at || '').split('T')[0];
      return dateStr >= dateRange.start && dateStr <= dateRange.end;
    });
  }, [executedServices, dateRange]);

  // Indicador 5: Quantidade de serviços realizados no período
  const periodServicesCount = useMemo(() => {
    return filteredServices.filter((s) => s.status === 'completed').length;
  }, [filteredServices]);

  // Indicador 6: Ticket médio (faturamento pago / quantidade de serviços pagos)
  const { averageTicket, paidServicesCount } = useMemo(() => {
    // Serviços que foram pagos e estão dentro do período
    const paidServices = filteredServices.filter((s) => s.payment_status === 'paid');
    const count = paidServices.length;

    if (count === 0 || periodRevenue <= 0) {
      return { averageTicket: 0, paidServicesCount: count };
    }

    // Faturamento dos serviços pagos no período
    return {
      averageTicket: roundMoney(periodRevenue / count),
      paidServicesCount: count,
    };
  }, [filteredServices, periodRevenue]);

  // Indicador 7: Receita por hora (faturamento pago / horas reais trabalhadas nos serviços que possuem início e fim registrados)
  const revenuePerHour = useMemo(() => {
    // Serviços concluídos e pagos que possuem tanto started_at quanto finished_at válidos
    const validServices = filteredServices.filter(
      (s) => s.payment_status === 'paid' && s.started_at && s.finished_at
    );

    let totalDurationMinutes = 0;

    for (const s of validServices) {
      if (s.actual_duration_minutes && s.actual_duration_minutes > 0) {
        totalDurationMinutes += s.actual_duration_minutes;
      } else if (s.started_at && s.finished_at) {
        const start = new Date(s.started_at).getTime();
        const finish = new Date(s.finished_at).getTime();
        const diffMin = Math.round((finish - start) / (1000 * 60));
        if (diffMin > 0) {
          totalDurationMinutes += diffMin;
        }
      }
    }

    const totalHours = totalDurationMinutes / 60;

    if (totalHours <= 0 || periodRevenue <= 0) {
      return 0;
    }

    return roundMoney(periodRevenue / totalHours);
  }, [filteredServices, periodRevenue]);

  // Próximos agendamentos (a partir de hoje, ordenados por data e hora)
  const upcomingAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return appointments
      .filter((a) => {
        // Exibe agendamentos de hoje em diante que não foram cancelados
        return a.scheduled_date >= todayStr && a.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dtA = `${a.scheduled_date}T${a.scheduled_start}`;
        const dtB = `${b.scheduled_date}T${b.scheduled_start}`;
        return dtA.localeCompare(dtB);
      })
      .slice(0, 6);
  }, [appointments]);

  // Controle de Estoque (Produtos com estoque baixo e estoque negativo)
  const stockAlerts = useMemo(() => {
    let lowStockCount = 0;
    let negativeStockCount = 0;
    const criticalProducts: { product: Product; stock: number; min: number }[] = [];

    products.forEach((p) => {
      if (!p.is_active) return;
      const stock = Number(p.current_stock || 0);
      const min = Number(p.min_stock || 0);

      if (stock < 0) {
        negativeStockCount += 1;
        criticalProducts.push({ product: p, stock, min });
      } else if (stock <= min) {
        lowStockCount += 1;
        criticalProducts.push({ product: p, stock, min });
      }
    });

    return {
      lowStockCount,
      negativeStockCount,
      criticalProducts: criticalProducts.slice(0, 5),
    };
  }, [products]);

  // Formatação de valores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Agendado
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Em Andamento
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Concluído
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Não compareceu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header do Dashboard com Seletor de Período */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Operacional
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              Garage Car
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhamento consolidado de faturamento, caixa, serviços e agendamentos
          </p>
        </div>

        {/* Seletor de Período */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600 shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'today'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'this_week'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'this_month'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_month')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'last_month'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Mês anterior
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'custom'
                  ? 'bg-white font-bold text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Personalizado
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Seletor Customizado se 'custom' ativo */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <span className="font-semibold text-slate-700">Intervalo de datas:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">De:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Grid de Indicadores Principais (Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Faturamento do Período */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Faturamento ({period === 'this_month' ? 'Mês' : 'Período'})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(periodRevenue)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Receitas operacionais pagas
            </p>
          </div>
        </div>

        {/* Card 2: Despesas do Período */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Despesas ({period === 'this_month' ? 'Mês' : 'Período'})
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(periodExpenses)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Custos operacionais e insumos
            </p>
          </div>
        </div>

        {/* Card 3: Resultado Operacional */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resultado Operacional
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                periodOperatingResult >= 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                periodOperatingResult >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatCurrency(periodOperatingResult)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Receitas - Despesas no período
            </p>
          </div>
        </div>

        {/* Card 4: Saldo de Caixa (Acumulado Total) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Saldo de Caixa
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                currentCashBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatCurrency(currentCashBalance)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Saldo consolidado acumulado
            </p>
          </div>
        </div>
      </div>

      {/* Grid Secundário: Métricas Operacionais de Eficiência */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 5: Serviços Realizados */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Serviços Realizados
              </span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {periodServicesCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {periodServicesCount === 1 ? 'concluído' : 'concluídos'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Serviços com pagamento registrado:</span>
            <span className="font-semibold text-slate-700">{paidServicesCount}</span>
          </div>
        </div>

        {/* Card 6: Ticket Médio */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ticket Médio
              </span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {formatCurrency(averageTicket)}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Base de cálculo:</span>
            <span className="text-slate-700">Faturamento / serviços pagos</span>
          </div>
        </div>

        {/* Card 7: Receita por Hora */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Receita por Hora
              </span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {formatCurrency(revenuePerHour)}
                <span className="text-xs font-normal text-slate-500">/hora</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Considera:</span>
            <span className="text-slate-700">Horas reais com início e fim</span>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Próximos Agendamentos & Alertas de Estoque */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 & 2: Próximos Agendamentos */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Próximos Agendamentos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Atendimentos previstos na agenda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('agenda')}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Ver Agenda Completa</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Lista de Agendamentos */}
            <div className="mt-4 overflow-x-auto">
              {upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Calendar className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhum agendamento futuro
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Não há atendimentos previstos a partir de hoje.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('agenda')}
                    className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Agendar Atendimento
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5">Data / Hora</th>
                      <th className="px-3 py-2.5">Cliente</th>
                      <th className="px-3 py-2.5">Veículo</th>
                      <th className="px-3 py-2.5">Serviço</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDateBR(appt.scheduled_date)} às{' '}
                          <span className="text-blue-600">{appt.scheduled_start?.slice(0, 5)}</span>
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {appt.client?.name || 'Cliente'}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {appt.vehicle ? `${appt.vehicle.brand} ${appt.vehicle.model}` : 'Veículo'}
                          {appt.vehicle?.plate && (
                            <span className="ml-1.5 text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 font-mono">
                              {appt.vehicle.plate}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {appt.service?.name || 'Serviço'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {getStatusBadge(appt.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 3: Alertas de Estoque */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Controle de Estoque
                  </h2>
                  <p className="text-xs text-slate-500">
                    Status e insumos críticos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('produtos_estoque')}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Ver Estoque</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Métricas de Alerta */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Estoque Baixo
                </span>
                <div className="mt-1 text-2xl font-black text-amber-900">
                  {stockAlerts.lowStockCount}
                </div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  ≤ mínimo cadastrado
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                  Estoque Negativo
                </span>
                <div className="mt-1 text-2xl font-black text-rose-900">
                  {stockAlerts.negativeStockCount}
                </div>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Abaixo de zero (&lt; 0)
                </p>
              </div>
            </div>

            {/* Insumos Críticos ou Mensagem de OK */}
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Itens que demandam atenção:
              </div>
              {stockAlerts.criticalProducts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Todos os produtos com estoque regular ou sem insumos negativos.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {stockAlerts.criticalProducts.map(({ product, stock, min }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-900 block truncate">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Mínimo: {min} {product.unit}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold font-mono ${
                            stock < 0 ? 'text-rose-600' : 'text-amber-700'
                          }`}
                        >
                          {stock} {product.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('produtos_lotes')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Package className="h-3.5 w-3.5 text-slate-500" />
              <span>Registrar Nova Compra / Entrada de Lote</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
