import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Car,
  User,
  Package,
  TrendingUp,
  DollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  RotateCcw,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  ExecutedService,
  PaymentStatus,
  PaymentMethod,
} from '../../types';
import { operationService } from '../../services/operationService';
import { WalkInModal } from './WalkInModal';
import { FinalizeServiceModal } from './FinalizeServiceModal';
import { ServiceDetailModal } from './ServiceDetailModal';

interface ExecutedServicesViewProps {
  onNavigateToAgenda?: () => void;
}

export const ExecutedServicesView: React.FC<ExecutedServicesViewProps> = ({
  onNavigateToAgenda,
}) => {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'history'>('in_progress');
  const [services, setServices] = useState<ExecutedService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters for History
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isWalkInOpen, setIsWalkInOpen] = useState<boolean>(false);
  const [serviceToFinalize, setServiceToFinalize] = useState<ExecutedService | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ExecutedService | null>(null);

  // Live timer tick for in-progress services
  const [, setTimerTick] = useState<number>(0);

  useEffect(() => {
    loadServices();
  }, []);

  // Update timer every second for in-progress duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const data = await operationService.getExecutedServices();
      setServices(data);
    } catch (err) {
      console.error('Erro ao carregar serviços executados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const inProgressServices = services.filter((s) => s.status === 'in_progress');

  // Filter history services
  const todayStr = new Date().toISOString().split('T')[0];
  const historyServices = services.filter((s) => {
    if (s.status === 'in_progress') return false;

    // Period filter
    const serviceDate = (s.started_at || s.created_at).split('T')[0];
    if (periodFilter === 'today') {
      if (serviceDate !== todayStr) return false;
    } else if (periodFilter === 'week') {
      const now = new Date();
      const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
      if (new Date(s.started_at || s.created_at) < oneWeekAgo) return false;
    } else if (periodFilter === 'month') {
      const now = new Date();
      const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
      if (new Date(s.started_at || s.created_at) < oneMonthAgo) return false;
    }

    // Payment status filter
    if (paymentFilter !== 'all' && s.payment_status !== paymentFilter) {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchClient = s.client_name_snap.toLowerCase().includes(q);
      const matchVehicle =
        s.vehicle_model_snap.toLowerCase().includes(q) ||
        (s.vehicle_plate_snap && s.vehicle_plate_snap.toLowerCase().includes(q));
      const matchService = s.service_name_snap.toLowerCase().includes(q);
      if (!matchClient && !matchVehicle && !matchService) return false;
    }

    return true;
  });

  // Calculate top KPI statistics
  const completedToday = services.filter(
    (s) => s.status === 'completed' && (s.finished_at || s.created_at).split('T')[0] === todayStr
  );
  const revenueToday = completedToday.reduce((sum, s) => sum + (s.final_price || 0), 0);
  const pendingPayments = services.filter(
    (s) => s.status === 'completed' && s.payment_status === 'pending'
  );
  const pendingPaymentsAmount = pendingPayments.reduce(
    (sum, s) => sum + (s.final_price || 0),
    0
  );

  // Helper for live elapsed duration format
  const getElapsedDuration = (startedAt: string) => {
    try {
      const start = new Date(startedAt).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } catch {
      return '00:00:00';
    }
  };

  // Fast payment registration
  const handleFastRegisterPayment = async (serviceId: string) => {
    try {
      await operationService.registerPayment(serviceId, 'pix');
      await loadServices();
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Serviços Realizados & Operação
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Fase 3: Operação
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Execução de atendimentos, cronometragem em tempo real, baixa FIFO de insumos e margens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToAgenda && (
            <button
              onClick={onNavigateToAgenda}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Calendar className="h-4 w-4 text-blue-600" />
              Ver Agenda
            </button>
          )}

          <button
            id="btn-walkin"
            onClick={() => setIsWalkInOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Play className="h-4 w-4 fill-white" />
            Iniciar Atendimento (Walk-in)
          </button>
        </div>
      </div>

      {/* KPI Cards de Operação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Em Andamento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Em Andamento
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{inProgressServices.length}</span>
            <span className="text-xs text-slate-500 font-medium">veículo(s) no pátio</span>
          </div>
        </div>

        {/* Concluídos Hoje */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Concluídos Hoje
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{completedToday.length}</span>
            <span className="text-xs text-slate-500 font-medium">serviços entregues</span>
          </div>
        </div>

        {/* Faturamento Concluído Hoje */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Faturamento Hoje
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-900">
              R$ {revenueToday.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-medium">em serviços</span>
          </div>
        </div>

        {/* Pagamentos Pendentes (Atenção / Requisito 24 / TESTE 3) */}
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            pendingPayments.length > 0
              ? 'border-amber-300 bg-amber-50/50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              A Faturar (Pendentes)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-950">
              {pendingPayments.length}
            </span>
            <span className="text-xs font-semibold text-amber-800">
              (R$ {pendingPaymentsAmount.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Principais: Em Andamento vs Histórico */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('in_progress')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'in_progress'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          Em Andamento ({inProgressServices.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Histórico de Serviços ({services.filter((s) => s.status !== 'in_progress').length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: ATENDIMENTOS EM ANDAMENTO */}
      {/* ========================================================= */}
      {activeTab === 'in_progress' && (
        <div className="space-y-4">
          {inProgressServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Nenhum serviço em execução no momento
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
                Você pode iniciar um novo serviço diretamente por demanda (Walk-in) ou a partir de um agendamento na Agenda.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsWalkInOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Iniciar Walk-in Agora
                </button>
                {onNavigateToAgenda && (
                  <button
                    onClick={onNavigateToAgenda}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    Abrir Agenda
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {inProgressServices.map((service) => {
                const elapsed = getElapsedDuration(service.started_at || service.created_at);

                return (
                  <div
                    key={service.id}
                    className="rounded-2xl border-2 border-blue-400 bg-white p-5 shadow-md flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div>
                      {/* Top Timer Bar */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Em Execução
                          </span>
                        </div>

                        {/* Cronômetro Dinâmico em Tempo Real */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 shadow-inner">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{elapsed}</span>
                        </div>
                      </div>

                      {/* Snapshots do Cliente e Veículo */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-slate-800 text-sm block">
                              {service.client_name_snap}
                            </strong>
                            <span className="text-slate-400 text-[11px]">
                              Iniciado às{' '}
                              {new Date(service.started_at || service.created_at).toLocaleTimeString(
                                'pt-BR',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Car className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-slate-700 block">
                              {service.vehicle_model_snap}
                            </strong>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span>{service.vehicle_plate_snap || 'Sem placa'}</span>
                              <span>•</span>
                              <span className="text-blue-700 font-semibold">
                                {service.vehicle_category_snap}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                          <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="text-indigo-900 text-sm block">
                              {service.service_name_snap}
                            </strong>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-0.5">
                              <span>Preço Base: R$ {(service.base_price_snap || 0).toFixed(2)}</span>
                              {service.surcharge_amount > 0 && (
                                <span className="text-amber-700">
                                  (+R$ {service.surcharge_amount.toFixed(2)} condição)
                                </span>
                              )}
                              {service.discount_amount > 0 && (
                                <span className="text-rose-700">
                                  (-R$ {service.discount_amount.toFixed(2)} desconto)
                                </span>
                              )}
                              {service.final_price !== undefined && service.final_price !== service.base_price_snap && (
                                <span className="font-semibold text-emerald-700">
                                  • Previsto: R$ {service.final_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {service.notes && (
                          <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 italic">
                            "{service.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botão de Finalização com Baixa de Insumos */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setServiceToFinalize(service)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalizar Serviço & Insumos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: HISTÓRICO DE SERVIÇOS CONCLUÍDOS */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Barra de Filtros do Histórico */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filtro de Período */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-700">
                <button
                  onClick={() => setPeriodFilter('today')}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    periodFilter === 'today' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setPeriodFilter('week')}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    periodFilter === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Esta Semana
                </button>
                <button
                  onClick={() => setPeriodFilter('month')}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    periodFilter === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Este Mês
                </button>
                <button
                  onClick={() => setPeriodFilter('all')}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    periodFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
              </div>

              {/* Filtro de Pagamento e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">Todos pagamentos</option>
                  <option value="paid">Pagos</option>
                  <option value="pending">Pendentes</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar no histórico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-52 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabela Rica de Histórico */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Data & Horários</th>
                    <th className="py-3 px-4">Cliente / Veículo</th>
                    <th className="py-3 px-4">Serviço & Categoria</th>
                    <th className="py-3 px-4 text-center">Duração</th>
                    <th className="py-3 px-4 text-right">Produtividade</th>
                    <th className="py-3 px-4 text-right">Preço Cobrado</th>
                    <th className="py-3 px-4 text-right">Insumos & Margem</th>
                    <th className="py-3 px-4 text-center">Pagamento</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {historyServices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        Nenhum atendimento finalizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    historyServices.map((service) => {
                      const hours = Math.floor((service.actual_duration_minutes || 0) / 60);
                      const mins = (service.actual_duration_minutes || 0) % 60;

                      return (
                        <tr key={service.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Data e Horário */}
                          <td className="py-3 px-4 font-medium">
                            <div className="text-slate-900 font-semibold">
                              {new Date(service.started_at || service.created_at).toLocaleDateString(
                                'pt-BR'
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {new Date(service.started_at || service.created_at).toLocaleTimeString(
                                'pt-BR',
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                              {' às '}
                              {service.finished_at
                                ? new Date(service.finished_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--:--'}
                            </div>
                          </td>

                          {/* Cliente e Veículo */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {service.client_name_snap}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {service.vehicle_model_snap}{' '}
                              {service.vehicle_plate_snap ? `• ${service.vehicle_plate_snap}` : ''}
                            </div>
                          </td>

                          {/* Serviço */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-indigo-900">
                              {service.service_name_snap}
                            </div>
                            <div className="text-[10px] text-blue-700">
                              {service.vehicle_category_snap}
                              {service.is_rework && (
                                <span className="ml-1 rounded-md bg-blue-100 text-blue-800 px-1 py-0.2 font-semibold">
                                  Retrabalho
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Duração Real */}
                          <td className="py-3 px-4 text-center font-medium">
                            <div className="text-slate-800 font-semibold">
                              {hours}h {String(mins).padStart(2, '0')}m
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {service.actual_duration_minutes || 0} min
                            </div>
                          </td>

                          {/* Produtividade */}
                          <td className="py-3 px-4 text-right font-semibold text-blue-900">
                            R$ {(service.revenue_per_hour || 0).toFixed(2)} / h
                          </td>

                          {/* Preço Final */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-slate-900 text-sm">
                              R$ {(service.final_price || 0).toFixed(2)}
                            </div>
                            {service.surcharge_amount > 0 && (
                              <div className="text-[10px] text-amber-700">
                                +R$ {service.surcharge_amount.toFixed(2)} sujeira
                              </div>
                            )}
                          </td>

                          {/* Margem Bruta Simples */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-semibold text-emerald-700">
                              R$ {(service.simple_gross_margin || 0).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Insumos: R$ {(service.total_products_cost || 0).toFixed(2)} (
                              {(service.simple_gross_margin_percent || 0).toFixed(0)}%)
                            </div>
                          </td>

                          {/* Status Pagamento (Requisito 24 / TESTE 3) */}
                          <td className="py-3 px-4 text-center">
                            {service.payment_status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                {service.payment_method?.toUpperCase() || 'PAGO'}
                              </span>
                            ) : service.payment_status === 'pending' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                  <AlertCircle className="h-3 w-3" />
                                  Pendente
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleFastRegisterPayment(service.id)}
                                  className="block mx-auto text-[9px] font-bold text-emerald-700 hover:underline"
                                >
                                  Dar Baixa
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                                Cancelado
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setServiceDetail(service)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              title="Ver Detalhes do Atendimento"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              Detalhes
                            </button>
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
      )}

      {/* Modal Walk-in */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={async () => {
          await loadServices();
          setActiveTab('in_progress');
        }}
      />

      {/* Modal Finalizar Atendimento */}
      {serviceToFinalize && (
        <FinalizeServiceModal
          isOpen={Boolean(serviceToFinalize)}
          service={serviceToFinalize}
          onClose={() => setServiceToFinalize(null)}
          onSuccess={async () => {
            await loadServices();
            setActiveTab('history');
          }}
        />
      )}

      {/* Modal Ver Detalhes */}
      {serviceDetail && (
        <ServiceDetailModal
          isOpen={Boolean(serviceDetail)}
          service={serviceDetail}
          onClose={() => setServiceDetail(null)}
          onUpdate={async () => {
            await loadServices();
          }}
        />
      )}
    </div>
  );
};
