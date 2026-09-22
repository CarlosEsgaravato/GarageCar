import React from 'react';
import { reportsService } from '../../../services/reportsService';

// ============================================================================
// 1. GRÁFICO DE EVOLUÇÃO TEMPORAL: FATURAMENTO X DESPESAS X RESULTADO
// ============================================================================

export interface TimelineDataPoint {
  label: string; // Ex: "15/01" ou "Jan/25"
  revenue: number;
  expense: number;
  profit: number;
}

interface FinancialTimelineChartProps {
  data: TimelineDataPoint[];
}

export const FinancialTimelineChart: React.FC<FinancialTimelineChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-500">
        Nenhum dado financeiro registrado no período selecionado.
      </div>
    );
  }

  // Descobrir valor máximo para escala
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.expense, Math.abs(d.profit))),
    100
  );

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-emerald-500" />
            <span className="text-slate-300 font-medium">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-rose-500" />
            <span className="text-slate-300 font-medium">Despesas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-blue-500" />
            <span className="text-slate-300 font-medium">Resultado</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">
          Escala máxima: {reportsService.formatCurrency(maxValue)}
        </span>
      </div>

      {/* Gráfico de Barras Agrupadas Responsivo */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[500px] h-64 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
          {data.map((point, idx) => {
            const revHeight = Math.min(100, Math.round((point.revenue / maxValue) * 100));
            const expHeight = Math.min(100, Math.round((point.expense / maxValue) * 100));
            const profitHeight = Math.min(100, Math.round((Math.max(0, point.profit) / maxValue) * 100));

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip flutuante no hover */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col z-30 min-w-[140px] p-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-[10px] text-slate-200 pointer-events-none">
                  <span className="font-bold text-white border-b border-slate-800 pb-1 mb-1">
                    {point.label}
                  </span>
                  <div className="flex justify-between text-emerald-400">
                    <span>Receita:</span>
                    <span>{reportsService.formatCurrency(point.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Despesa:</span>
                    <span>{reportsService.formatCurrency(point.expense)}</span>
                  </div>
                  <div className={`flex justify-between font-semibold ${point.profit >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                    <span>Resultado:</span>
                    <span>{reportsService.formatCurrency(point.profit)}</span>
                  </div>
                </div>

                {/* Barras Lado a Lado */}
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  {/* Receita */}
                  <div
                    style={{ height: `${Math.max(4, revHeight)}%` }}
                    className="w-1/3 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-400 transition-all cursor-pointer"
                    title={`Receita: ${reportsService.formatCurrency(point.revenue)}`}
                  />
                  {/* Despesa */}
                  <div
                    style={{ height: `${Math.max(4, expHeight)}%` }}
                    className="w-1/3 rounded-t-sm bg-rose-500/80 hover:bg-rose-400 transition-all cursor-pointer"
                    title={`Despesa: ${reportsService.formatCurrency(point.expense)}`}
                  />
                  {/* Resultado Operacional */}
                  <div
                    style={{ height: `${Math.max(4, profitHeight)}%` }}
                    className={`w-1/3 rounded-t-sm ${
                      point.profit >= 0
                        ? 'bg-blue-500/80 hover:bg-blue-400'
                        : 'bg-amber-500/80 hover:bg-amber-400'
                    } transition-all cursor-pointer`}
                    title={`Resultado: ${reportsService.formatCurrency(point.profit)}`}
                  />
                </div>

                {/* Rótulo de Data / Eixo X */}
                <span className="mt-2 text-[10px] text-slate-400 font-mono truncate max-w-full text-center">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. RANKING HORIZONTAL (SERVIÇOS, PRODUTOS, OU CATEGORIAS)
// ============================================================================

export interface RankingItem {
  id: string;
  label: string;
  secondaryLabel?: string;
  count: number;
  value: number;
  highlightColor?: string;
}

interface HorizontalRankingChartProps {
  title?: string;
  items: RankingItem[];
  valueLabel?: string;
  countLabel?: string;
}

export const HorizontalRankingChart: React.FC<HorizontalRankingChartProps> = ({
  title,
  items,
  valueLabel = 'Total',
  countLabel = 'Qtd',
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-500">
        Nenhum item registrado no período.
      </div>
    );
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {title}
        </h4>
      )}
      <div className="space-y-2.5">
        {items.map((item) => {
          const percent = Math.min(100, Math.round((item.value / maxValue) * 100));

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-medium text-slate-200 truncate">{item.label}</span>
                  {item.secondaryLabel && (
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({item.secondaryLabel})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right font-mono text-[11px]">
                  <span className="text-slate-400">
                    {item.count} {countLabel}
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {reportsService.formatCurrency(item.value)}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  style={{ width: `${Math.max(3, percent)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.highlightColor || 'bg-blue-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. BARRA DE COMPOSIÇÃO / DISTRIBUIÇÃO EM PERCENTUAL
// ============================================================================

export interface BreakdownSlice {
  label: string;
  value: number;
  count?: number;
  color: string;
}

interface BreakdownListProps {
  slices: BreakdownSlice[];
  totalValue: number;
}

export const BreakdownList: React.FC<BreakdownListProps> = ({ slices, totalValue }) => {
  if (!slices || slices.length === 0 || totalValue <= 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-500">
        Nenhum registro para distribuição.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra segmentada contínua */}
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800/80">
        {slices.map((slice, idx) => {
          const pct = ((slice.value / totalValue) * 100).toFixed(1);
          if (slice.value <= 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: slice.color }}
              title={`${slice.label}: ${reportsService.formatCurrency(slice.value)} (${pct}%)`}
              className="h-full transition-all hover:opacity-85"
            />
          );
        })}
      </div>

      {/* Lista discriminada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
        {slices.map((slice, idx) => {
          const pct = ((slice.value / totalValue) * 100).toFixed(1);
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-300 truncate text-[11px] font-medium">
                  {slice.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                <span className="font-semibold text-slate-200">
                  {reportsService.formatCurrency(slice.value)}
                </span>
                <span className="text-slate-500 text-[10px]">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
