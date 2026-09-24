import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Play,
  User,
  Car,
  Sparkles,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  List,
  CalendarDays,
  Columns,
  X,
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  Client,
  Vehicle,
  ServiceCatalogItem,
  ServicePrice,
  ExecutedService,
} from '../../types';
import { dataService } from '../../services/dataService';
import { operationService } from '../../services/operationService';
import { NewAppointmentModal } from './NewAppointmentModal';

interface AgendaViewProps {
  onStartServiceFromAppointment?: (service: ExecutedService) => void;
  onNavigateToRealizedServices?: () => void;
}

type AgendaViewMode = 'day' | 'week' | 'list';

export const AgendaView: React.FC<AgendaViewProps> = ({
  onStartServiceFromAppointment,
  onNavigateToRealizedServices,
}) => {
  const [viewMode, setViewMode] = useState<AgendaViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal para Iniciar Atendimento (Agora vs Manual)
  const [startingApt, setStartingApt] = useState<Appointment | null>(null);
  const [startMode, setStartMode] = useState<'now' | 'manual'>('now');
  const [manualStartDateTime, setManualStartDateTime] = useState<string>('');
  const [isStartingLoading, setIsStartingLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apts, clis, vehs, srvs, prcs] = await Promise.all([
        operationService.getAppointments(),
        dataService.getClients(),
        dataService.getVehicles(),
        dataService.getServices(),
        dataService.getServicePrices(),
      ]);

      setAppointments(apts);
      setClients(clis);
      setVehicles(vehs);
      setServices(srvs);
      setServicePrices(prcs);
    } catch (err) {
      console.error('Erro ao carregar dados da agenda:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper para dados associados
  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);
  const getService = (id?: string) => services.find((s) => s.id === id);

  // Navegação de datas
  const changeDateByDays = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Cálculo da semana para a visualização semanal
  const getWeekDays = (baseDateStr: string) => {
    const curr = new Date(`${baseDateStr}T12:00:00`);
    const day = curr.getDay(); // 0=domingo, 1=segunda...
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const weekDays: { dateStr: string; label: string; dayNumber: number; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = d.toISOString().split('T')[0];
      const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      weekDays.push({
        dateStr: str,
        label: daysOfWeek[i],
        dayNumber: d.getDate(),
        isToday: str === todayStr,
      });
    }
    return weekDays;
  };

  const weekDays = getWeekDays(selectedDate);

  // Filtros aplicados
  const filteredAppointments = appointments.filter((apt) => {
    // Filtro de status
    if (statusFilter !== 'all' && apt.status !== statusFilter) {
      return false;
    }

    // Filtro de busca textual
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cli = getClient(apt.client_id);
      const veh = getVehicle(apt.vehicle_id);
      const srv = getService(apt.service_catalog_id);

      const matchClient = cli?.name.toLowerCase().includes(q);
      const matchVehicle = veh?.model.toLowerCase().includes(q) || (veh?.plate && veh.plate.toLowerCase().includes(q));
      const matchService = srv?.name.toLowerCase().includes(q);

      if (!matchClient && !matchVehicle && !matchService) {
        return false;
      }
    }

    // Filtro de data conforme o modo
    if (viewMode === 'day') {
      return apt.scheduled_date === selectedDate;
    } else if (viewMode === 'week') {
      return weekDays.some((w) => w.dateStr === apt.scheduled_date);
    }
    // No modo lista, exibe todos ou conforme o filtro
    return true;
  });

  // Identificação de conflitos na data selecionada
  const getConflictingIdsOnDate = (date: string) => {
    const onDate = appointments.filter(
      (a) => a.scheduled_date === date && a.status !== 'cancelled' && a.status !== 'no_show'
    );
    const conflictIds = new Set<string>();

    const toMin = (t: string) => {
      const [h, m] = (t || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (let i = 0; i < onDate.length; i++) {
      for (let j = i + 1; j < onDate.length; j++) {
        const a = onDate[i];
        const b = onDate[j];
        const aStart = toMin(a.scheduled_start);
        const aEnd = toMin(a.scheduled_end);
        const bStart = toMin(b.scheduled_start);
        const bEnd = toMin(b.scheduled_end);

        if (aStart < bEnd && aEnd > bStart) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
    return conflictIds;
  };

  const conflictingIdsToday = getConflictingIdsOnDate(selectedDate);

  // Iniciar Atendimento a partir do Agendamento (Requisito 8 com opção Agora vs Manual)
  const openStartServiceModal = (apt: Appointment) => {
    setStartingApt(apt);
    setStartMode('now');
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setManualStartDateTime(localIso);
  };

  const confirmStartService = async () => {
    if (!startingApt) return;
    const apt = startingApt;

    const cli = getClient(apt.client_id);
    const veh = getVehicle(apt.vehicle_id);
    const srv = getService(apt.service_catalog_id);

    if (!cli || !veh || !srv) {
      alert('Dados de cliente, veículo ou serviço incompletos para iniciar o atendimento.');
      return;
    }

    if (startMode === 'manual' && !manualStartDateTime) {
      alert('Por favor, informe a data e o horário de início.');
      return;
    }

    const startedAt =
      startMode === 'manual' && manualStartDateTime
        ? new Date(manualStartDateTime).toISOString()
        : new Date().toISOString();

    // Busca preço base do catálogo
    const priceRecord = servicePrices.find(
      (p) => p.service_id === srv.id && p.commercial_category === veh.commercial_category
    );
    const basePrice = priceRecord ? priceRecord.price : 70.0;

    setIsStartingLoading(true);
    try {
      const newService = await operationService.startServiceFromAppointment(
        apt,
        cli,
        veh,
        srv,
        basePrice,
        startedAt
      );

      setStartingApt(null);
      // Recarrega agenda
      await loadData();

      if (onStartServiceFromAppointment) {
        onStartServiceFromAppointment(newService);
      } else if (onNavigateToRealizedServices) {
        onNavigateToRealizedServices();
      }
    } catch (err) {
      console.error('Erro ao iniciar atendimento:', err);
      alert('Não foi possível iniciar o atendimento.');
    } finally {
      setIsStartingLoading(false);
    }
  };

  // Cancelamento de Agendamento
  const handleCancelAppointment = async (aptId: string) => {
    if (!cancellationReason.trim()) {
      alert('Por favor, informe a justificativa do cancelamento.');
      return;
    }

    try {
      await operationService.updateAppointmentStatus(aptId, 'cancelled', cancellationReason.trim());
      setCancellingAptId(null);
      setCancellationReason('');
      await loadData();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      alert('Não foi possível cancelar o agendamento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Agenda de Atendimentos
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              Fase 3: Operação
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Planejamento diário e semanal, detecção de conflitos e início imediato de serviços.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-novo-agendamento"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Barra de Controles: Modos, Navegação de Data e Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Alternador de Modo de Visualização */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-700">
            <button
              onClick={() => setViewMode('day')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'day' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>

          {/* Navegação de Datas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDateByDays(viewMode === 'week' ? -7 : -1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={goToToday}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Hoje
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />

            <button
              onClick={() => changeDateByDays(viewMode === 'week' ? 7 : 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Filtros de Status e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">Todos os status</option>
              <option value="scheduled">Agendados</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar agendamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Alerta de Conflitos Existentes (Requisito 5 / TESTE 10 - Não Bloqueante) */}
        {conflictingIdsToday.size > 0 && viewMode === 'day' && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <strong>Atenção: Conflito de Horário Detectado.</strong> Existem atendimentos agendados com sobreposição de horário neste dia. O sistema alerta, mas permite o andamento normal para garantir flexibilidade operacional.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. VISUALIZAÇÃO DIA (PADRÃO) */}
      {/* ========================================================= */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <span className="text-xs text-slate-500">
              {filteredAppointments.length} agendamento(s)
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Nenhum agendamento para este dia
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Não há serviços programados para esta data no momento.
              </p>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agendar Atendimento Neste Dia
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map((apt) => {
                const cli = getClient(apt.client_id);
                const veh = getVehicle(apt.vehicle_id);
                const srv = getService(apt.service_catalog_id);
                const hasConflict = conflictingIdsToday.has(apt.id);

                return (
                  <div
                    key={apt.id}
                    className={`relative rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                      hasConflict
                        ? 'border-amber-300 ring-2 ring-amber-200/50'
                        : apt.status === 'in_progress'
                        ? 'border-blue-400 ring-2 ring-blue-200/50'
                        : apt.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : apt.status === 'cancelled'
                        ? 'border-slate-200 opacity-60 bg-slate-50'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Alerta de Conflito Badge */}
                    {hasConflict && (
                      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Conflito de Horário (Sobreposição)
                      </div>
                    )}

                    {/* Horário Excepcional Badge */}
                    {apt.is_exceptional_hours && (
                      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                        <Info className="h-3.5 w-3.5 text-sky-600" />
                        Horário Excepcional (Fora do Padrão)
                      </div>
                    )}

                    {/* Top Info: Horário e Status */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>
                          {apt.scheduled_start} - {apt.scheduled_end}
                        </span>
                        <span className="text-[11px] font-normal text-slate-400">
                          ({apt.estimated_duration_minutes || 60} min)
                        </span>
                      </div>

                      <div>
                        {apt.status === 'scheduled' && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                            Agendado
                          </span>
                        )}
                        {apt.status === 'in_progress' && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                            Em Andamento
                          </span>
                        )}
                        {apt.status === 'completed' && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Concluído
                          </span>
                        )}
                        {apt.status === 'cancelled' && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            Cancelado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cliente e Veículo */}
                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-slate-800 text-sm block">
                            {cli?.name || 'Cliente não identificado'}
                          </strong>
                          <span className="text-slate-500">{cli?.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Car className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-slate-700 block">
                            {veh ? `${veh.brand} ${veh.model}` : 'Veículo não selecionado'}
                          </strong>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{veh?.plate ? `Placa: ${veh.plate}` : 'Sem placa'}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-semibold">{veh?.commercial_category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1">
                        <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-indigo-900 block">
                            {srv?.name || 'Serviço sob demanda'}
                          </strong>
                          <span className="text-slate-500">
                            Preço estimado:{' '}
                            <strong className="text-slate-800">
                              R$ {(apt.estimated_price || 0).toFixed(2)}
                            </strong>
                            {apt.condition_level && apt.condition_level !== 'normal' && (
                              <span className="text-amber-700 ml-1">
                                ({apt.condition_level === 'heavy' ? 'Pesada' : apt.condition_level})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {apt.notes && (
                        <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 italic">
                          "{apt.notes}"
                        </p>
                      )}

                      {apt.cancellation_reason && (
                        <p className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-800">
                          <strong>Motivo do cancelamento:</strong> {apt.cancellation_reason}
                        </p>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      {apt.status === 'scheduled' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openStartServiceModal(apt)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" />
                            Iniciar Atendimento
                          </button>

                          <button
                            type="button"
                            onClick={() => setCancellingAptId(apt.id)}
                            className="text-slate-400 hover:text-rose-600 text-xs transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : apt.status === 'in_progress' ? (
                        <div className="w-full flex items-center justify-between text-xs">
                          <span className="text-indigo-600 font-semibold flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Atendimento em andamento
                          </span>
                          <button
                            onClick={onNavigateToRealizedServices}
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            Ver em Execução →
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {apt.status === 'completed' ? 'Atendimento finalizado' : 'Cancelado'}
                        </span>
                      )}
                    </div>

                    {/* Prompt de Cancelamento */}
                    {cancellingAptId === apt.id && (
                      <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2">
                        <span className="font-bold text-rose-900 text-xs block">
                          Cancelar Agendamento
                        </span>
                        <input
                          type="text"
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          placeholder="Informe o motivo..."
                          className="w-full rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-slate-800"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setCancellingAptId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            disabled={!cancellationReason.trim()}
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VISUALIZAÇÃO SEMANA */}
      {/* ========================================================= */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayApts = appointments.filter(
              (a) =>
                a.scheduled_date === day.dateStr &&
                (statusFilter === 'all' || a.status === statusFilter)
            );

            return (
              <div
                key={day.dateStr}
                className={`rounded-2xl border p-3 min-h-[380px] flex flex-col ${
                  day.isToday
                    ? 'border-blue-500 bg-blue-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block uppercase">
                      {day.label}
                    </span>
                    <span className={`text-base font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                      {day.dayNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDate(day.dateStr);
                      setIsNewModalOpen(true);
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                    title="Agendar neste dia"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Day Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {dayApts.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic block text-center py-6">
                      Sem agendamentos
                    </span>
                  ) : (
                    dayApts.map((apt) => {
                      const cli = getClient(apt.client_id);
                      const srv = getService(apt.service_catalog_id);

                      return (
                        <div
                          key={apt.id}
                          onClick={() => {
                            setSelectedDate(day.dateStr);
                            setViewMode('day');
                          }}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs hover:border-blue-400 hover:bg-white transition-all cursor-pointer space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-700 text-[11px]">
                              {apt.scheduled_start}
                            </span>
                            <span className={`rounded-md px-1.5 py-0.2 text-[9px] font-semibold ${
                              apt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {apt.status === 'scheduled' ? 'Agendado' : apt.status}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-800 truncate">
                            {cli?.name || 'Cliente'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {srv?.name || 'Serviço'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VISUALIZAÇÃO LISTA */}
      {/* ========================================================= */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Veículo</th>
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4 text-right">Valor Previsto</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Nenhum agendamento encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt) => {
                    const cli = getClient(apt.client_id);
                    const veh = getVehicle(apt.vehicle_id);
                    const srv = getService(apt.service_catalog_id);

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="text-slate-900 font-semibold">
                            {new Date(`${apt.scheduled_date}T12:00:00`).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {apt.scheduled_start} às {apt.scheduled_end}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {cli?.name || 'Cliente'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">
                            {veh ? `${veh.brand} ${veh.model}` : '-'}
                          </div>
                          <div className="text-[10px] text-blue-600">
                            {veh?.commercial_category}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-indigo-900 font-medium">{srv?.name || '-'}</div>
                          <div className="text-[10px] text-slate-400">
                            {apt.estimated_duration_minutes} min
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          R$ {(apt.estimated_price || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {apt.status === 'scheduled' && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                              Agendado
                            </span>
                          )}
                          {apt.status === 'in_progress' && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                              Em Andamento
                            </span>
                          )}
                          {apt.status === 'completed' && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Concluído
                            </span>
                          )}
                          {apt.status === 'cancelled' && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                              Cancelado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => openStartServiceModal(apt)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                            >
                              <Play className="h-3 w-3 fill-white" />
                              Iniciar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Início do Atendimento (Agora vs Manual) */}
      {startingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50/70 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                  <Play className="h-5 w-5 fill-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Iniciar Atendimento</h3>
                  <p className="text-xs text-slate-500">Defina o registro de horário real de início</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStartingApt(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info do Agendamento */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div>
                  <span className="text-slate-500 font-medium">Cliente: </span>
                  <strong className="text-slate-800">{getClient(startingApt.client_id)?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Veículo: </span>
                  <strong className="text-slate-800">
                    {getVehicle(startingApt.vehicle_id)?.brand} {getVehicle(startingApt.vehicle_id)?.model}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Serviço: </span>
                  <strong className="text-slate-800">{getService(startingApt.service_catalog_id)?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Planejado: </span>
                  <span className="text-slate-700 font-semibold">
                    {startingApt.scheduled_date} das {startingApt.scheduled_start} às {startingApt.scheduled_end}
                  </span>
                </div>
                {startingApt.estimated_price !== undefined && (
                  <div>
                    <span className="text-slate-500 font-medium">Valor Previsto: </span>
                    <strong className="text-emerald-700 font-bold">
                      R$ {Number(startingApt.estimated_price).toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>

              {/* Opções: Iniciar agora vs Informar manualmente */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Como deseja registrar o início real?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStartMode('now')}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                      startMode === 'now'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="h-4 w-4 mb-1" />
                    <span className="text-xs">Iniciar agora</span>
                    <span className="text-[10px] text-slate-400 font-normal">Usa data/hora atual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStartMode('manual')}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                      startMode === 'manual'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarDays className="h-4 w-4 mb-1" />
                    <span className="text-xs">Informar manualmente</span>
                    <span className="text-[10px] text-slate-400 font-normal">Data e hora reais</span>
                  </button>
                </div>
              </div>

              {startMode === 'manual' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Data e Horário Real de Início *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={manualStartDateTime}
                    onChange={(e) => setManualStartDateTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500">
                    Útil se o atendimento já foi iniciado fisicamente antes do registro.
                  </p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStartingApt(null)}
                  disabled={isStartingLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmStartService}
                  disabled={isStartingLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  {isStartingLoading ? 'Iniciando...' : 'Confirmar Início'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        initialDate={selectedDate}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={async () => {
          await loadData();
        }}
      />
    </div>
  );
};
