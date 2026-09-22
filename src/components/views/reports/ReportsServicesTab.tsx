import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Download,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  Percent,
  CheckCircle2,
  Clock3,
  Calendar,
  Car,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { ReportsRawData, DateRange, reportsService } from '../../../services/reportsService';
import { roundMoney } from '../../../services/operationService';
import { HorizontalRankingChart, RankingItem } from './ReportsCharts';

interface ReportsServicesTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

export const ReportsServicesTab: React.FC<ReportsServicesTabProps> = ({ data, dateRange }) => {
  const { executedServices } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Filtrar serviços do período (excluindo cancelados)
  const periodServices = useMemo(() => {
    return executedServices.filter((s) => {
      if (s.status === 'cancelled') return false;
      const sDate = (s.started_at || s.created_at).split('T')[0];
      return sDate >= dateRange.start && sDate <= dateRange.end;
    });
  }, [executedServices, dateRange]);

  // Cálculos consolidados de serviços
  const stats = useMemo(() => {
    const completed = periodServices.filter((s) => (s.status || 'completed') === 'completed');
    const paid = completed.filter((s) => s.payment_status === 'paid');
    const pending = completed.filter((s) => s.payment_status === 'pending');

    const totalRevenue = roundMoney(
      paid.reduce((acc, s) => acc + roundMoney(s.final_price || 0), 0)
    );

    const ticketMedio = paid.length > 0 && totalRevenue > 0 ? roundMoney(totalRevenue / paid.length) : 0;

    // Durações reais
    let totalMinutes = 0;
    let validDurationCount = 0;
    let minDuration: { minutes: number; serviceName: string } | null = null;
    let maxDuration: { minutes: number; serviceName: string } | null = null;

    for (const s of completed) {
      let duration = s.actual_duration_minutes;
      if (!duration && s.started_at && s.finished_at) {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.finished_at).getTime();
        const diff = Math.round((end - start) / (1000 * 60));
        if (diff > 0) duration = diff;
      }

      if (duration && duration > 0) {
        totalMinutes += duration;
        validDurationCount++;

        const sName = s.service_name_snap || 'Serviço';
        if (!minDuration || duration < minDuration.minutes) {
          minDuration = { minutes: duration, serviceName: sName };
        }
        if (!maxDuration || duration > maxDuration.minutes) {
          maxDuration = { minutes: duration, serviceName: sName };
        }
      }
    }

    const avgDurationMinutes = validDurationCount > 0 ? Math.round(totalMinutes / validDurationCount) : 0;
    const totalHours = totalMinutes / 60;
    const revenuePerHour = totalHours > 0 && totalRevenue > 0 ? roundMoney(totalRevenue / totalHours) : 0;

    // Custo histórico de produtos nos serviços concluídos
    let totalProductsCost = 0;
    for (const s of completed) {
      if (s.total_products_cost !== undefined && s.total_products_cost !== null) {
        totalProductsCost = roundMoney(totalProductsCost + roundMoney(s.total_products_cost));
      } else if (s.used_products && s.used_products.length > 0) {
        const sumSnap = s.used_products.reduce(
          (acc, p) => acc + roundMoney(p.total_cost_snap || 0),
          0
        );
        totalProductsCost = roundMoney(totalProductsCost + roundMoney(sumSnap));
      }
    }

    const avgProductCost = completed.length > 0 ? roundMoney(totalProductsCost / completed.length) : 0;
    const simpleGrossMargin = roundMoney(totalRevenue - totalProductsCost);
    const simpleGrossMarginPercent =
      totalRevenue > 0 ? Number(((simpleGrossMargin / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      completedCount: completed.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      totalRevenue,
      ticketMedio,
      avgDurationMinutes,
      revenuePerHour,
      totalProductsCost,
      avgProductCost,
      simpleGrossMargin,
      simpleGrossMarginPercent,
      minDuration,
      maxDuration,
    };
  }, [periodServices]);

  // Ranking por Nome/Tipo de Serviço
  const serviceRanking = useMemo<RankingItem[]>(() => {
    const map = new Map<string, { count: number; revenue: number; type: string }>();

    for (const s of periodServices) {
      const name = s.service_name_snap || 'Serviço Personalizado';
      const cur = map.get(name) || {
        count: 0,
        revenue: 0,
        type: s.vehicle_category_snap || 'Geral',
      };
      cur.count += 1;
      if (s.payment_status === 'paid') {
        cur.revenue = roundMoney(cur.revenue + roundMoney(s.final_price || 0));
      }
      map.set(name, cur);
    }

    return Array.from(map.entries())
      .map(([name, stat], idx) => ({
        id: `srv-rank-${idx}`,
        label: name,
        secondaryLabel: stat.type,
        count: stat.count,
        value: stat.revenue,
        highlightColor: 'bg-indigo-500',
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodServices]);

  // Lista detalhada com filtro de busca e status de pagamento
  const filteredTableServices = useMemo(() => {
    return periodServices.filter((s) => {
      // Filtro de pagamento
      if (paymentFilter === 'paid' && s.payment_status !== 'paid') return false;
      if (paymentFilter === 'pending' && s.payment_status !== 'pending') return false;

      // Busca textual
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (s.client_name_snap && s.client_name_snap.toLowerCase().includes(q)) ||
        (s.vehicle_model_snap && s.vehicle_model_snap.toLowerCase().includes(q)) ||
        (s.vehicle_plate_snap && s.vehicle_plate_snap.toLowerCase().includes(q)) ||
        (s.service_name_snap && s.service_name_snap.toLowerCase().includes(q))
      );
    });
  }, [periodServices, searchTerm, paymentFilter]);

  // Exportar Tabela para CSV
  const handleExportCsv = () => {
    const headers = [
      'Data',
      'Cliente',
      'Veículo',
      'Placa',
      'Serviço',
      'Valor Final (R$)',
      'Status Pagamento',
      'Forma Pagamento',
      'Duração Real (min)',
      'Receita/Hora (R$)',
      'Custo Produtos (R$)',
      'Margem Simples (R$)',
      'Margem (%)',
    ];

    const rows = filteredTableServices.map((s) => {
      const sDate = (s.started_at || s.created_at).split('T')[0];
      const prodCost =
        s.total_products_cost !== undefined && s.total_products_cost !== null
          ? roundMoney(s.total_products_cost)
          : (s.used_products || []).reduce((a, p) => a + roundMoney(p.total_cost_snap || 0), 0);

      const margin = roundMoney(roundMoney(s.final_price || 0) - prodCost);
      const marginPct = s.final_price ? ((margin / s.final_price) * 100).toFixed(1) : '0';

      return [
        reportsService.formatDateBR(sDate),
        s.client_name_snap || '-',
        s.vehicle_model_snap || '-',
        s.vehicle_plate_snap || '-',
        s.service_name_snap || '-',
        (s.final_price || 0).toFixed(2),
        s.payment_status === 'paid' ? 'Pago' : 'Pendente',
        s.payment_method || '-',
        s.actual_duration_minutes || '-',
        (s.revenue_per_hour || 0).toFixed(2),
        prodCost.toFixed(2),
        margin.toFixed(2),
        `${marginPct}%`,
      ];
    });

    reportsService.exportToCsv('relatorio_servicos_garage_car', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas de Serviços */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Concluídos & Status */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Volume de Serviços
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {stats.completedCount}
            </span>
            <span className="text-xs text-slate-400">concluídos</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-medium">
              {stats.paidCount} pagos
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 font-medium">
              {stats.pendingCount} pendentes
            </span>
          </div>
        </div>

        {/* Ticket Médio & Faturamento */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {reportsService.formatCurrency(stats.ticketMedio)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Faturamento: {reportsService.formatCurrency(stats.totalRevenue)}
          </p>
        </div>

        {/* Duração Média & Produtividade / Hora */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Produtividade / Tempo
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {stats.avgDurationMinutes} min
            </span>
            <span className="text-xs text-slate-400">duração média</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Receita/hora: {reportsService.formatCurrency(stats.revenuePerHour)}
          </p>
        </div>

        {/* Custo de Insumos & Margem */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Margem & Insumos
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400">
              {stats.simpleGrossMarginPercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({reportsService.formatCurrency(stats.simpleGrossMargin)})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Custo médio de insumo: {reportsService.formatCurrency(stats.avgProductCost)}
          </p>
        </div>
      </div>

      {/* Cards de Maior e Menor Duração */}
      {(stats.minDuration || stats.maxDuration) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.minDuration && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Menor Duração Registrada
                </span>
                <p className="text-sm font-bold text-slate-100 mt-1">
                  {stats.minDuration.serviceName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {stats.minDuration.minutes} min
                </span>
              </div>
            </div>
          )}

          {stats.maxDuration && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Maior Duração Registrada
                </span>
                <p className="text-sm font-bold text-slate-100 mt-1">
                  {stats.maxDuration.serviceName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-amber-400">
                  {stats.maxDuration.minutes} min
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ranking de Serviços por Faturamento e Quantidade */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Desempenho por Tipo de Serviço
            </h3>
            <p className="text-xs text-slate-400">
              Volume executado e faturamento apurado por serviço no período
            </p>
          </div>
        </div>
        <div className="mt-4">
          <HorizontalRankingChart
            items={serviceRanking}
            countLabel="execuções"
            valueLabel="Faturamento"
          />
        </div>
      </div>

      {/* Tabela Detalhada com Snapshots Imutáveis */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Detalhamento de Serviços Executados
            </h3>
            <p className="text-xs text-slate-400">
              Auditoria individual com duração real, custo histórico de produtos e margem simples
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Pagamento */}
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs font-medium text-slate-400">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  paymentFilter === 'all'
                    ? 'bg-slate-700 font-bold text-white shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPaymentFilter('paid')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  paymentFilter === 'paid'
                    ? 'bg-slate-700 font-bold text-emerald-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Pagos
              </button>
              <button
                onClick={() => setPaymentFilter('pending')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  paymentFilter === 'pending'
                    ? 'bg-slate-700 font-bold text-amber-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
            </div>

            {/* Input de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar cliente, veículo, serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            {/* Botão Exportar CSV */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Exportar dados para CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Veículo</th>
                <th className="py-2.5 px-3">Serviço</th>
                <th className="py-2.5 px-3 text-right">Valor Final</th>
                <th className="py-2.5 px-3 text-center">Pagamento</th>
                <th className="py-2.5 px-3 text-right">Duração</th>
                <th className="py-2.5 px-3 text-right">Receita/h</th>
                <th className="py-2.5 px-3 text-right">Custo Insumos</th>
                <th className="py-2.5 px-3 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredTableServices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs font-sans">
                    Nenhum serviço encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTableServices.map((s) => {
                  const sDate = (s.started_at || s.created_at).split('T')[0];
                  const prodCost =
                    s.total_products_cost !== undefined && s.total_products_cost !== null
                      ? roundMoney(s.total_products_cost)
                      : (s.used_products || []).reduce(
                          (a, p) => a + roundMoney(p.total_cost_snap || 0),
                          0
                        );
                  const margin = roundMoney(roundMoney(s.final_price || 0) - prodCost);
                  const marginPct = s.final_price
                    ? ((margin / s.final_price) * 100).toFixed(0)
                    : '0';

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-300">
                        {reportsService.formatDateBR(sDate)}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200 truncate max-w-[140px]">
                        {s.client_name_snap || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 truncate max-w-[140px]">
                        <div>{s.vehicle_model_snap || '-'}</div>
                        {s.vehicle_plate_snap && (
                          <div className="text-[10px] text-slate-500 uppercase">
                            {s.vehicle_plate_snap}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">
                        <span className="font-medium">{s.service_name_snap || '-'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                        {reportsService.formatCurrency(s.final_price)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {s.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {s.actual_duration_minutes ? `${s.actual_duration_minutes}m` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-cyan-400">
                        {s.revenue_per_hour ? reportsService.formatCurrency(s.revenue_per_hour) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400">
                        {reportsService.formatCurrency(prodCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-semibold ${
                            margin >= 0 ? 'text-teal-400' : 'text-rose-400'
                          }`}
                        >
                          {reportsService.formatCurrency(margin)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({marginPct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
