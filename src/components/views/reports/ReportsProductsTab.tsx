import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  DollarSign,
  TrendingDown,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ReportsRawData, DateRange, reportsService } from '../../../services/reportsService';
import { roundMoney } from '../../../services/operationService';
import { HorizontalRankingChart, RankingItem } from './ReportsCharts';

interface ReportsProductsTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

export const ReportsProductsTab: React.FC<ReportsProductsTabProps> = ({ data, dateRange }) => {
  const { products, batches, stockMovements, executedServices } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubView, setActiveSubView] = useState<'movements' | 'alerts'>('movements');

  // 1. Serviços concluídos no período para calcular o consumo real com snapshots
  const periodServices = useMemo(() => {
    return executedServices.filter((s) => {
      if (s.status === 'cancelled') return false;
      const sDate = (s.started_at || s.created_at).split('T')[0];
      return sDate >= dateRange.start && sDate <= dateRange.end;
    });
  }, [executedServices, dateRange]);

  // Consumo por Produto (usando snapshots históricos imutáveis de executed_service_products)
  const productConsumptionStats = useMemo(() => {
    const map = new Map<
      string,
      { productId: string; name: string; quantity: number; cost: number; unit?: string }
    >();

    let totalQuantity = 0;
    let totalCost = 0;

    for (const s of periodServices) {
      if (s.used_products && s.used_products.length > 0) {
        for (const item of s.used_products) {
          const pId = item.product_id;
          const cur = map.get(pId) || {
            productId: pId,
            name: item.product_name_snap || 'Produto',
            quantity: 0,
            cost: 0,
            unit: item.unit || 'un',
          };

          const q = Number(item.quantity_used || 0);
          const c = roundMoney(item.total_cost_snap || 0);

          cur.quantity += q;
          cur.cost = roundMoney(cur.cost + c);
          map.set(pId, cur);

          totalQuantity += q;
          totalCost = roundMoney(totalCost + c);
        }
      }
    }

    const rankingItems: RankingItem[] = Array.from(map.values())
      .map((item, idx) => ({
        id: `prod-rank-${idx}`,
        label: item.name,
        secondaryLabel: `${item.quantity.toLocaleString('pt-BR')} ${item.unit || ''}`,
        count: item.quantity,
        value: item.cost,
        highlightColor: 'bg-amber-500',
      }))
      .sort((a, b) => b.value - a.value);

    return {
      rankingItems,
      totalQuantity,
      totalCost,
    };
  }, [periodServices]);

  // 2. Métricas de Estoque Atual (Snapshot Físico)
  const stockOverview = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active);

    // Valor estimado total do estoque ativo: soma dos lotes (current_quantity * unit_cost)
    let estimatedStockValue = 0;
    for (const b of batches) {
      const q = Number(b.current_quantity || 0);
      const uCost = Number(b.unit_cost || 0);
      if (q > 0) {
        estimatedStockValue = roundMoney(estimatedStockValue + q * uCost);
      }
    }

    const lowStockProducts = activeProducts.filter((p) => {
      const cur = Number(p.current_stock || 0);
      const min = Number(p.min_stock || 0);
      return cur <= min && cur >= 0;
    });

    const negativeStockProducts = activeProducts.filter((p) => {
      const cur = Number(p.current_stock || 0);
      return cur < 0;
    });

    return {
      totalActiveProducts: activeProducts.length,
      estimatedStockValue,
      lowStockCount: lowStockProducts.length,
      negativeStockCount: negativeStockProducts.length,
      lowStockProducts,
      negativeStockProducts,
    };
  }, [products, batches]);

  // 3. Movimentações de Estoque no período
  const periodMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const mDate = m.created_at.split('T')[0];
      return mDate >= dateRange.start && mDate <= dateRange.end;
    });
  }, [stockMovements, dateRange]);

  const filteredMovements = useMemo(() => {
    if (!searchTerm) return periodMovements;
    const q = searchTerm.toLowerCase();
    return periodMovements.filter((m) => {
      const pName = m.product?.name || '';
      const reason = m.reason || '';
      return pName.toLowerCase().includes(q) || reason.toLowerCase().includes(q);
    });
  }, [periodMovements, searchTerm]);

  // Exportar Movimentações para CSV
  const handleExportCsv = () => {
    const headers = [
      'Data/Hora',
      'Produto',
      'Tipo de Movimento',
      'Quantidade',
      'Estoque Anterior',
      'Novo Estoque',
      'Motivo / Justificativa',
    ];

    const rows = filteredMovements.map((m) => {
      const typeLabel =
        m.movement_type === 'purchase'
          ? 'Compra / Entrada'
          : m.movement_type === 'service_consumption'
          ? 'Consumo em Serviço'
          : m.movement_type === 'positive_adjustment'
          ? 'Ajuste Positivo'
          : 'Ajuste Negativo';

      return [
        m.created_at,
        m.product?.name || m.product_id,
        typeLabel,
        m.quantity,
        m.previous_stock,
        m.new_stock,
        m.reason || '-',
      ];
    });

    reportsService.exportToCsv('relatorio_movimentacoes_estoque', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards Principais de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Total do Estoque Atual */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Valor do Estoque
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {reportsService.formatCurrency(stockOverview.estimatedStockValue)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stockOverview.totalActiveProducts} produtos ativos no catálogo
          </p>
        </div>

        {/* Custo de Insumos Consumidos no Período */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Consumo no Período
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {reportsService.formatCurrency(productConsumptionStats.totalCost)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Custo com snapshots dos serviços realizados
          </p>
        </div>

        {/* Produtos com Estoque Baixo */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estoque Baixo
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {stockOverview.lowStockCount}
            </span>
            <span className="text-xs text-slate-400">itens em alerta</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Estoque atual abaixo ou igual ao mínimo
          </p>
        </div>

        {/* Produtos com Estoque Negativo */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estoque Negativo
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {stockOverview.negativeStockCount}
            </span>
            <span className="text-xs text-slate-400">divergências</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Consumo registrado além dos lotes disponíveis
          </p>
        </div>
      </div>

      {/* Ranking de Produtos Mais Consumidos */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Produtos Mais Consumidos nos Serviços
            </h3>
            <p className="text-xs text-slate-400">
              Custo apurado através dos snapshots históricos imutáveis do período
            </p>
          </div>
        </div>
        <div className="mt-4">
          <HorizontalRankingChart
            items={productConsumptionStats.rankingItems}
            countLabel="consumidos"
            valueLabel="Custo Total"
          />
        </div>
      </div>

      {/* Seletor de Tabela: Movimentações x Alertas de Estoque */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubView('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeSubView === 'movements'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Movimentações do Período ({periodMovements.length})
            </button>
            <button
              onClick={() => setActiveSubView('alerts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeSubView === 'alerts'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                Alertas de Estoque ({stockOverview.lowStockCount + stockOverview.negativeStockCount})
              </span>
            </button>
          </div>

          {activeSubView === 'movements' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar movimentações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                title="Exportar movimentações para CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabela de Movimentações */}
        {activeSubView === 'movements' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                  <th className="py-2.5 px-3 text-right">Estoque Ant.</th>
                  <th className="py-2.5 px-3 text-right">Novo Estoque</th>
                  <th className="py-2.5 px-3">Motivo / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                      Nenhuma movimentação registrada no período.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-300">
                          {reportsService.formatDateBR(m.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                          {m.product?.name || m.product_id}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              m.movement_type === 'purchase'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : m.movement_type === 'service_consumption'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {m.movement_type === 'purchase'
                              ? 'Compra'
                              : m.movement_type === 'service_consumption'
                              ? 'Consumo'
                              : 'Ajuste'}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            isPositive ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {m.previous_stock}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                          {m.new_stock}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[200px]">
                          {m.reason || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tabela de Alertas de Estoque */
          <div className="space-y-4">
            {stockOverview.negativeStockProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <AlertOctagon className="h-4 w-4" />
                  <span>Produtos com Saldo Negativo</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stockOverview.negativeStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs"
                    >
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>{p.name}</span>
                        <span className="font-mono text-rose-400 font-bold">
                          {p.current_stock} {p.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Marca: {p.brand || '-'} • Mínimo: {p.min_stock} {p.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stockOverview.lowStockProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Produtos com Estoque Baixo</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stockOverview.lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                    >
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>{p.name}</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {p.current_stock} {p.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Marca: {p.brand || '-'} • Mínimo: {p.min_stock} {p.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stockOverview.lowStockProducts.length === 0 &&
              stockOverview.negativeStockProducts.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum produto em alerta de estoque baixo ou negativo no momento.
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
