import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Wrench,
  Package,
  Users,
  Layers,
  RefreshCw,
  Calendar,
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import {
  reportsService,
  ReportsPeriod,
  ReportsRawData,
  DateRange,
} from '../../services/reportsService';
import { ReportsOverviewTab } from './reports/ReportsOverviewTab';
import { ReportsServicesTab } from './reports/ReportsServicesTab';
import { ReportsFinancialTab } from './reports/ReportsFinancialTab';
import { ReportsProductsTab } from './reports/ReportsProductsTab';
import { ReportsClientsTab } from './reports/ReportsClientsTab';
import { ReportsEquipmentTab } from './reports/ReportsEquipmentTab';

type ReportTab =
  | 'overview'
  | 'services'
  | 'financial'
  | 'products'
  | 'clients'
  | 'equipment';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<ReportsPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportsRawData | null>(null);

  // Calcula o intervalo de datas do período selecionado
  const dateRange: DateRange = useMemo(() => {
    return reportsService.getPeriodDateRange(period, customStartDate, customEndDate);
  }, [period, customStartDate, customEndDate]);

  // Carregamento de dados reais do Supabase
  const loadReportsData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await reportsService.fetchAllReportsData();
      setData(result);
    } catch (err: any) {
      console.error('Erro ao carregar dados consolidados para relatórios:', err);
      setError(err.message || 'Falha ao carregar dados do Supabase. Verifique a conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Definição das Abas
  const tabs = [
    {
      id: 'overview' as ReportTab,
      label: 'Visão Geral',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'services' as ReportTab,
      label: 'Serviços',
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      id: 'financial' as ReportTab,
      label: 'Financeiro',
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      id: 'products' as ReportTab,
      label: 'Produtos / Estoque',
      icon: <Package className="h-4 w-4" />,
    },
    {
      id: 'clients' as ReportTab,
      label: 'Clientes / Veículos',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'equipment' as ReportTab,
      label: 'Equipamentos',
      icon: <Layers className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header do Módulo com Seletor de Período */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Relatórios Gerenciais
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Dados Reais Supabase
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consolidação analítica de serviços, faturamento, despesas, estoque físico e patrimônio
          </p>
        </div>

        {/* Seletor de Período e Botão de Atualização */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Botões de Período Preset */}
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'today'
                  ? 'bg-slate-800 font-bold text-slate-100 shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_week')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'this_week'
                  ? 'bg-slate-800 font-bold text-slate-100 shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setPeriod('this_month')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'this_month'
                  ? 'bg-slate-800 font-bold text-slate-100 shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_month')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'last_month'
                  ? 'bg-slate-800 font-bold text-slate-100 shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Mês Anterior
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                period === 'custom'
                  ? 'bg-slate-800 font-bold text-slate-100 shadow-xs'
                  : 'hover:text-slate-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {/* Botão Atualizar */}
          <button
            type="button"
            onClick={() => loadReportsData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
            title="Atualizar dados analíticos"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`}
            />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Seletor Customizado se 'custom' ativo */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-xs">
          <span className="font-semibold text-slate-300">Intervalo de datas:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">De:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Badge Informativo do Intervalo Vigente */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-blue-400" />
          <span>
            Período analisado:{' '}
            <strong className="text-slate-200">{dateRange.label}</strong> (
            {reportsService.formatDateBR(dateRange.start)} até{' '}
            {reportsService.formatDateBR(dateRange.end)})
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] text-slate-500">
          Valores monetários em BRL (R$)
        </span>
      </div>

      {/* 2. Barra de Navegação das Abas */}
      <div className="border-b border-slate-800 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                  isActive
                    ? 'border-blue-500 bg-slate-900 text-blue-400 shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Conteúdo Principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">
            Consolidando dados analíticos do Supabase...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao consolidar relatórios</span>
          </div>
          <p className="text-xs text-rose-300/80">{error}</p>
          <button
            onClick={() => loadReportsData()}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : !data ? null : (
        <div>
          {activeTab === 'overview' && (
            <ReportsOverviewTab data={data} dateRange={dateRange} />
          )}

          {activeTab === 'services' && (
            <ReportsServicesTab data={data} dateRange={dateRange} />
          )}

          {activeTab === 'financial' && (
            <ReportsFinancialTab data={data} dateRange={dateRange} />
          )}

          {activeTab === 'products' && (
            <ReportsProductsTab data={data} dateRange={dateRange} />
          )}

          {activeTab === 'clients' && (
            <ReportsClientsTab data={data} dateRange={dateRange} />
          )}

          {activeTab === 'equipment' && (
            <ReportsEquipmentTab data={data} dateRange={dateRange} />
          )}
        </div>
      )}
    </div>
  );
};
