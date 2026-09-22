import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  Search,
  Download,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
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

interface ReportsFinancialTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

const PALETTE = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#f97316',
  '#64748b',
];

export const ReportsFinancialTab: React.FC<ReportsFinancialTabProps> = ({ data, dateRange }) => {
  const { transactions, contributions, financialSummary } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');

  // Filtragem das transações do período (auditadas e sem estornos)
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.is_reversed) return false;
      const tDate = t.transaction_date.split('T')[0];
      return tDate >= dateRange.start && tDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Aportes do proprietário no período
  const periodContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (c.is_reversed || c.description?.startsWith('[ESTORNADO]')) return false;
      const cDate = c.contribution_date.split('T')[0];
      return cDate >= dateRange.start && cDate <= dateRange.end;
    });
  }, [contributions, dateRange]);

  // Totais financeiros
  const totals = useMemo(() => {
    let rev = 0;
    let exp = 0;
    for (const t of periodTransactions) {
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') rev = roundMoney(rev + amt);
      else if (t.type === 'expense') exp = roundMoney(exp + amt);
    }

    let directCash = 0;
    let ownerPaid = 0;
    for (const c of periodContributions) {
      const amt = roundMoney(c.amount);
      if (c.contribution_type === 'direct_cash') {
        directCash = roundMoney(directCash + amt);
      } else {
        ownerPaid = roundMoney(ownerPaid + amt);
      }
    }

    const operatingResult = roundMoney(rev - exp);
    const totalContributions = roundMoney(directCash + ownerPaid);

    return {
      revenue: rev,
      expenses: exp,
      operatingResult,
      directCashContributions: directCash,
      ownerPaidPurchases: ownerPaid,
      totalContributions,
    };
  }, [periodTransactions, periodContributions]);

  // Despesas por Categoria
  const expensesByCategory = useMemo<BreakdownSlice[]>(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type === 'expense') {
        const cat = t.category || 'Outras Despesas';
        map.set(cat, roundMoney((map.get(cat) || 0) + roundMoney(t.amount)));
      }
    }

    return Array.from(map.entries())
      .map(([label, value], idx) => ({
        label,
        value,
        color: PALETTE[idx % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Receitas por Forma de Pagamento
  const revenueByPaymentMethod = useMemo<BreakdownSlice[]>(() => {
    const map = new Map<string, number>();
    const methodLabels: Record<string, string> = {
      pix: 'PIX',
      cash: 'Dinheiro',
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      other: 'Outros',
    };

    for (const t of periodTransactions) {
      if (t.type === 'revenue') {
        const key = t.payment_method || 'other';
        const label = methodLabels[key] || key;
        map.set(label, roundMoney((map.get(label) || 0) + roundMoney(t.amount)));
      }
    }

    return Array.from(map.entries())
      .map(([label, value], idx) => ({
        label,
        value,
        color: PALETTE[(idx + 2) % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  // Timeline
  const timelinePoints = useMemo<TimelineDataPoint[]>(() => {
    const map = new Map<string, { rev: number; exp: number }>();
    for (const t of periodTransactions) {
      const d = t.transaction_date.split('T')[0];
      const entry = map.get(d) || { rev: 0, exp: 0 };
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') entry.rev = roundMoney(entry.rev + amt);
      else if (t.type === 'expense') entry.exp = roundMoney(entry.exp + amt);
      map.set(d, entry);
    }

    const sortedDates = Array.from(map.keys()).sort();
    return sortedDates.map((d) => {
      const entry = map.get(d)!;
      return {
        label: reportsService.formatDateBR(d),
        revenue: entry.rev,
        expense: entry.exp,
        profit: roundMoney(entry.rev - entry.exp),
      };
    });
  }, [periodTransactions]);

  // Tabela filtrada
  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (typeFilter === 'revenue' && t.type !== 'revenue') return false;
      if (typeFilter === 'expense' && t.type !== 'expense') return false;

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.payment_method && t.payment_method.toLowerCase().includes(q))
      );
    });
  }, [periodTransactions, typeFilter, searchTerm]);

  // Exportar CSV
  const handleExportCsv = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Forma de Pagamento'];
    const rows = filteredTransactions.map((t) => [
      reportsService.formatDateBR(t.transaction_date),
      t.type === 'revenue' ? 'Receita' : 'Despesa',
      t.category || '-',
      t.description || '-',
      roundMoney(t.amount).toFixed(2),
      t.payment_method || '-',
    ]);

    reportsService.exportToCsv('relatorio_financeiro_garage_car', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas Operacionais
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {reportsService.formatCurrency(totals.revenue)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento de serviços quitados no período
          </p>
        </div>

        {/* Despesas */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Operacionais
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {reportsService.formatCurrency(totals.expenses)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Saídas de caixa e custos operacionais
          </p>
        </div>

        {/* Resultado Operacional */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resultado Operacional
            </span>
            <div
              className={`p-2 rounded-lg ${
                totals.operatingResult >= 0
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                totals.operatingResult >= 0 ? 'text-blue-400' : 'text-amber-400'
              }`}
            >
              {reportsService.formatCurrency(totals.operatingResult)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Receitas menos despesas (exclui aportes)
          </p>
        </div>

        {/* Saldo Atual de Caixa (Posição Instantânea) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Atual de Caixa
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                financialSummary.currentCashBalance >= 0 ? 'text-indigo-300' : 'text-rose-400'
              }`}
            >
              {reportsService.formatCurrency(financialSummary.currentCashBalance)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Posição de caixa auditada hoje
          </p>
        </div>
      </div>

      {/* Seção Exclusiva de Aportes do Proprietário (Patrimônio) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20 border border-purple-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Aportes e Investimentos do Proprietário
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Patrimônio / Não Operacional
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores injetados pelo proprietário no período. Ficam isolados das receitas e do resultado operacional.
              </p>
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
            <span className="text-xs text-slate-400 block">Total Aportado:</span>
            <span className="text-xl font-bold font-mono text-purple-300">
              {reportsService.formatCurrency(totals.totalContributions)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300">
                Aporte em Dinheiro Direto no Caixa
              </span>
              <p className="text-[11px] text-slate-400">
                Aumenta a disponibilidade física de caixa
              </p>
            </div>
            <span className="text-sm font-bold font-mono text-purple-400">
              {reportsService.formatCurrency(totals.directCashContributions)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300">
                Compras Pagas pelo Proprietário
              </span>
              <p className="text-[11px] text-slate-400">
                Lotes/equipamentos adquiridos sem usar o caixa da oficina
              </p>
            </div>
            <span className="text-sm font-bold font-mono text-purple-400">
              {reportsService.formatCurrency(totals.ownerPaidPurchases)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Financeira */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">
            Evolução de Entradas e Saídas no Período
          </h3>
          <p className="text-xs text-slate-400">
            Visualização diária de receitas operacionais, despesas e resultado
          </p>
        </div>
        <div className="mt-4">
          <FinancialTimelineChart data={timelinePoints} />
        </div>
      </div>

      {/* Gráficos de Categorias e Formas de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Categoria */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">
              Composição de Despesas por Categoria
            </h3>
            <p className="text-xs text-slate-400">
              Detalhamento de gastos no período
            </p>
          </div>
          <div className="mt-4">
            <BreakdownList slices={expensesByCategory} totalValue={totals.expenses} />
          </div>
        </div>

        {/* Receitas por Forma de Pagamento */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">
              Receitas por Forma de Pagamento
            </h3>
            <p className="text-xs text-slate-400">
              Distribuição dos métodos de recebimento no período
            </p>
          </div>
          <div className="mt-4">
            <BreakdownList slices={revenueByPaymentMethod} totalValue={totals.revenue} />
          </div>
        </div>
      </div>

      {/* Extrato de Transações Financeiras com Busca e Exportação */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Extrato Financeiro do Período
            </h3>
            <p className="text-xs text-slate-400">
              Registros individuais de receitas e despesas auditadas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Tipo */}
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs font-medium text-slate-400">
              <button
                onClick={() => setTypeFilter('all')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-slate-700 font-bold text-white shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setTypeFilter('revenue')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  typeFilter === 'revenue'
                    ? 'bg-slate-700 font-bold text-emerald-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  typeFilter === 'expense'
                    ? 'bg-slate-700 font-bold text-rose-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Despesas
              </button>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar descrição, categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            {/* Exportar CSV */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Exportar extrato para CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela de Transações */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Forma Pgto</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-sans">
                    Nenhuma movimentação financeira encontrada para os filtros.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300">
                      {reportsService.formatDateBR(t.transaction_date)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.type === 'revenue'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {t.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {t.category || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {t.description || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 uppercase text-[10px]">
                      {t.payment_method || '-'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        t.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.type === 'expense' ? '-' : '+'}
                      {reportsService.formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
