import React, { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wrench,
  Clock,
  Package,
  Percent,
  Wallet,
  Landmark,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ReportsRawData, DateRange, reportsService } from '../../../services/reportsService';
import { roundMoney } from '../../../services/operationService';
import {
  FinancialTimelineChart,
  TimelineDataPoint,
  BreakdownList,
  BreakdownSlice,
  HorizontalRankingChart,
  RankingItem,
} from './ReportsCharts';

interface ReportsOverviewTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const ReportsOverviewTab: React.FC<ReportsOverviewTabProps> = ({ data, dateRange }) => {
  const {
    transactions,
    contributions,
    executedServices,
    financialSummary,
  } = data;

  // 1. Filtragem das Transações do Período (Regra idêntica ao Dashboard / Financeiro)
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.is_reversed) return false;
      const tDate = t.transaction_date.split('T')[0];
      return tDate >= dateRange.start && tDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Faturamento e Despesas do Período
  const { periodRevenue, periodExpenses } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    for (const t of periodTransactions) {
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') {
        rev = roundMoney(rev + amt);
      } else if (t.type === 'expense') {
        exp = roundMoney(exp + amt);
      }
    }
    return { periodRevenue: rev, periodExpenses: exp };
  }, [periodTransactions]);

  // Resultado Operacional = Receitas - Despesas (Aportes NUNCA entram aqui)
  const operatingResult = useMemo(() => {
    return roundMoney(periodRevenue - periodExpenses);
  }, [periodRevenue, periodExpenses]);

  // 2. Serviços do Período (Concluídos e Não Cancelados)
  const periodServices = useMemo(() => {
    return executedServices.filter((s) => {
      if (s.status === 'cancelled') return false;
      const sDate = (s.started_at || s.created_at).split('T')[0];
      return sDate >= dateRange.start && sDate <= dateRange.end;
    });
  }, [executedServices, dateRange]);

  const completedServicesCount = useMemo(() => {
    return periodServices.filter((s) => (s.status || 'completed') === 'completed').length;
  }, [periodServices]);

  const paidServices = useMemo(() => {
    return periodServices.filter((s) => s.payment_status === 'paid');
  }, [periodServices]);

  // Faturamento focado nos serviços concluídos
  const servicesRevenueTotal = useMemo(() => {
    return roundMoney(
      paidServices.reduce((acc, s) => acc + roundMoney(s.final_price || 0), 0)
    );
  }, [paidServices]);

  // Ticket Médio (Regra idêntica ao Dashboard)
  const averageTicket = useMemo(() => {
    if (paidServices.length === 0 || periodRevenue <= 0) return 0;
    return roundMoney(periodRevenue / paidServices.length);
  }, [periodRevenue, paidServices]);

  // Receita por Hora (Regra idêntica ao Dashboard)
  const revenuePerHour = useMemo(() => {
    let totalMinutes = 0;
    let validDurationCount = 0;

    for (const s of paidServices) {
      if (s.actual_duration_minutes && s.actual_duration_minutes > 0) {
        totalMinutes += s.actual_duration_minutes;
        validDurationCount++;
      } else if (s.started_at && s.finished_at) {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.finished_at).getTime();
        const diffMinutes = Math.round((end - start) / (1000 * 60));
        if (diffMinutes > 0) {
          totalMinutes += diffMinutes;
          validDurationCount++;
        }
      }
    }

    if (totalMinutes <= 0 || periodRevenue <= 0) return 0;
    const totalHours = totalMinutes / 60;
    return roundMoney(periodRevenue / totalHours);
  }, [paidServices, periodRevenue]);

  // Custo Histórico de Produtos Utilizados (Regra estrita: usar total_products_cost / snapshots)
  const totalProductsCost = useMemo(() => {
    return roundMoney(
      periodServices.reduce((acc, s) => {
        if (s.total_products_cost !== undefined && s.total_products_cost !== null) {
          return acc + roundMoney(s.total_products_cost);
        }
        if (s.used_products && s.used_products.length > 0) {
          const sumSnap = s.used_products.reduce(
            (pAcc, p) => pAcc + roundMoney(p.total_cost_snap || 0),
            0
          );
          return acc + roundMoney(sumSnap);
        }
        return acc;
      }, 0)
    );
  }, [periodServices]);

  // Margem Simples dos Serviços (Faturamento dos serviços - Custo dos produtos)
  const simpleGrossMargin = useMemo(() => {
    return roundMoney(servicesRevenueTotal - totalProductsCost);
  }, [servicesRevenueTotal, totalProductsCost]);

  const simpleGrossMarginPercent = useMemo(() => {
    if (servicesRevenueTotal <= 0) return 0;
    return Number(((simpleGrossMargin / servicesRevenueTotal) * 100).toFixed(1));
  }, [simpleGrossMargin, servicesRevenueTotal]);

  // Aportes do Proprietário no Período (Auditados e destacados separadamente)
  const periodContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (c.is_reversed || c.description?.startsWith('[ESTORNADO]')) return false;
      const cDate = c.contribution_date.split('T')[0];
      return cDate >= dateRange.start && cDate <= dateRange.end;
    });
  }, [contributions, dateRange]);

  const periodContributionsTotal = useMemo(() => {
    return roundMoney(
      periodContributions.reduce((acc, c) => acc + roundMoney(c.amount), 0)
    );
  }, [periodContributions]);

  // 3. Preparação dos Dados para Gráficos
  // Linha do tempo: Agrupar por data
  const timelinePoints = useMemo<TimelineDataPoint[]>(() => {
    const map = new Map<string, { rev: number; exp: number }>();

    for (const t of periodTransactions) {
      const d = t.transaction_date.split('T')[0];
      const entry = map.get(d) || { rev: 0, exp: 0 };
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') {
        entry.rev = roundMoney(entry.rev + amt);
      } else if (t.type === 'expense') {
        entry.exp = roundMoney(entry.exp + amt);
      }
      map.set(d, entry);
    }

    const sortedDates = Array.from(map.keys()).sort();

    return sortedDates.map((dateStr) => {
      const entry = map.get(dateStr)!;
      const profit = roundMoney(entry.rev - entry.exp);
      return {
        label: reportsService.formatDateBR(dateStr),
        revenue: entry.rev,
        expense: entry.exp,
        profit,
      };
    });
  }, [periodTransactions]);

  // Despesas por Categoria para Gráfico de Composição
  const expenseSlices = useMemo<BreakdownSlice[]>(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type === 'expense') {
        const cat = t.category || 'Outras Despesas';
        map.set(cat, roundMoney((map.get(cat) || 0) + roundMoney(t.amount)));
      }
    }

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.map(([label, value], idx) => ({
      label,
      value,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [periodTransactions]);

  // Ranking de Serviços mais Demandados no período
  const serviceRanking = useMemo<RankingItem[]>(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const s of periodServices) {
      const name = s.service_name_snap || 'Serviço Personalizado';
      const cur = map.get(name) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total = roundMoney(cur.total + roundMoney(s.final_price || 0));
      map.set(name, cur);
    }

    const sorted = Array.from(map.entries())
      .map(([name, stat], idx) => ({
        id: `srv-${idx}`,
        label: name,
        count: stat.count,
        value: stat.total,
        highlightColor: 'bg-emerald-500',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return sorted;
  }, [periodServices]);

  return (
    <div className="space-y-6">
      {/* 8 Cards de Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Faturamento Realizado */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Faturamento Realizado
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {reportsService.formatCurrency(periodRevenue)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Receitas quitadas e não revertidas no período
          </p>
        </div>

        {/* 2. Despesas Operacionais */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Operacionais
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {reportsService.formatCurrency(periodExpenses)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Custos e despesas lançadas no período
          </p>
        </div>

        {/* 3. Resultado Operacional */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resultado Operacional
            </span>
            <div
              className={`p-2 rounded-lg ${
                operatingResult >= 0
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tracking-tight ${
                operatingResult >= 0 ? 'text-blue-400' : 'text-amber-400'
              }`}
            >
              {reportsService.formatCurrency(operatingResult)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento menos despesas operacionais
          </p>
        </div>

        {/* 4. Serviços Concluídos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Serviços Concluídos
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300 tracking-tight">
              {completedServicesCount}
            </span>
            <span className="text-xs text-slate-400">execuções</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {paidServices.length} quitados / {completedServicesCount - paidServices.length} pendentes
          </p>
        </div>

        {/* 5. Ticket Médio */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400 tracking-tight">
              {reportsService.formatCurrency(averageTicket)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento por serviço quitado
          </p>
        </div>

        {/* 6. Receita por Hora */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receita / Hora
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
              {reportsService.formatCurrency(revenuePerHour)}
            </span>
            <span className="text-xs text-slate-400">/h</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Produtividade sobre tempo real de execução
          </p>
        </div>

        {/* 7. Custo de Insumos / Produtos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Insumos Consumidos
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
              {reportsService.formatCurrency(totalProductsCost)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Custo histórico dos produtos aplicados nos serviços
          </p>
        </div>

        {/* 8. Margem Simples dos Serviços */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Margem dos Serviços
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {simpleGrossMarginPercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({reportsService.formatCurrency(simpleGrossMargin)})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento dos serviços menos custos de insumos
          </p>
        </div>
      </div>

      {/* Cards de Destaque: Aportes Patrimoniais vs Saldo Atual de Caixa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aportes do Proprietário */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-purple-500/20 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Patrimonial
                </span>
                <span className="text-xs text-slate-400">No período selecionado</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Aportes do Proprietário
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Recursos próprios injetados para capital de giro ou compras diretas.
                <strong className="text-slate-300 font-semibold block mt-0.5">
                  Não são faturamento nem alteram o resultado operacional.
                </strong>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Landmark className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Total aportado no período:</span>
            <span className="text-xl font-bold font-mono text-purple-300">
              {reportsService.formatCurrency(periodContributionsTotal)}
            </span>
          </div>
        </div>

        {/* Saldo Atual de Caixa da Garage Car */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/20 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Snapshot Atual
                </span>
                <span className="text-xs text-slate-400">Posição Instantânea</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Saldo de Caixa da Oficina
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Disponibilidade real em caixa hoje (Receitas - Despesas + Aportes em dinheiro direto).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Saldo em caixa:</span>
            <span
              className={`text-xl font-bold font-mono ${
                financialSummary.currentCashBalance >= 0 ? 'text-blue-300' : 'text-rose-400'
              }`}
            >
              {reportsService.formatCurrency(financialSummary.currentCashBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos da Visão Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução Financeira */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Evolução Financeira no Período
              </h3>
              <p className="text-xs text-slate-400">
                Comportamento diário de Receitas x Despesas x Resultado Operacional
              </p>
            </div>
          </div>
          <div className="mt-4">
            <FinancialTimelineChart data={timelinePoints} />
          </div>
        </div>

        {/* Gráfico 2: Composição de Despesas */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">
              Despesas por Categoria
            </h3>
            <p className="text-xs text-slate-400">
              Distribuição dos gastos operacionais no período
            </p>
          </div>
          <div className="mt-4">
            <BreakdownList slices={expenseSlices} totalValue={periodExpenses} />
          </div>
        </div>
      </div>

      {/* Ranking de Serviços no Período */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Top 5 Serviços em Faturamento
            </h3>
            <p className="text-xs text-slate-400">
              Serviços com maior volume financeiro no período analisado
            </p>
          </div>
        </div>
        <div className="mt-4">
          <HorizontalRankingChart items={serviceRanking} />
        </div>
      </div>
    </div>
  );
};
