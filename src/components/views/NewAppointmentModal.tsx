import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Car,
  User,
  Sparkles,
  AlertTriangle,
  Info,
  Check,
  Tag,
  DollarSign,
} from 'lucide-react';
import {
  Appointment,
  Client,
  Vehicle,
  ServiceCatalogItem,
  ServicePrice,
  ConditionLevel,
  SystemSettings,
} from '../../types';
import { dataService } from '../../services/dataService';
import { operationService } from '../../services/operationService';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  initialDate?: string;
  initialStartTime?: string;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialStartTime,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // Form State
  const [clientId, setClientId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [scheduledStart, setScheduledStart] = useState<string>(initialStartTime || '09:00');
  const [scheduledEnd, setScheduledEnd] = useState<string>('10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>('normal');
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [chargedPrice, setChargedPrice] = useState<number | ''>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Status Alerts
  const [isExceptionalHour, setIsExceptionalHour] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [cliList, vehList, srvList, prcList, settings] = await Promise.all([
        dataService.getClients(),
        dataService.getVehicles(),
        dataService.getServices(),
        dataService.getServicePrices(),
        operationService.getSystemSettings(),
      ]);

      setClients(cliList.filter((c) => c.is_active));
      setVehicles(vehList.filter((v) => v.is_active));
      setServices(srvList.filter((s) => s.is_active));
      setServicePrices(prcList.filter((p) => p.is_active));
      setSystemSettings(settings);

      if (initialDate) setScheduledDate(initialDate);
      if (initialStartTime) setScheduledStart(initialStartTime);
    } catch (err) {
      console.error('Erro ao carregar dados do agendamento:', err);
    }
  };

  // Filtra veículos do cliente selecionado
  const clientVehicles = vehicles.filter((v) => v.client_id === clientId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedService = services.find((s) => s.id === serviceId);

  // Auto-seleciona primeiro veículo se o cliente tiver apenas um
  useEffect(() => {
    if (clientVehicles.length === 1 && !vehicleId) {
      setVehicleId(clientVehicles[0].id);
    } else if (clientVehicles.length > 0 && !clientVehicles.some((v) => v.id === vehicleId)) {
      setVehicleId('');
    }
  }, [clientId, clientVehicles]);

  // Recalcula horário de término estimado ao alterar duração ou início
  useEffect(() => {
    if (selectedService?.estimated_duration_minutes) {
      setDurationMinutes(selectedService.estimated_duration_minutes);
    }
  }, [selectedService]);

  useEffect(() => {
    if (scheduledStart && durationMinutes) {
      const [h, m] = scheduledStart.split(':').map(Number);
      const startMin = (h || 0) * 60 + (m || 0);
      const endMin = startMin + durationMinutes;
      const endH = Math.floor(endMin / 60) % 24;
      const endM = endMin % 60;
      const formatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      setScheduledEnd(formatted);
    }
  }, [scheduledStart, durationMinutes]);

  // Busca preço base compatível no catálogo de preços por categoria do veículo
  const getBasePrice = (): number => {
    if (!selectedService || !selectedVehicle) return 0;
    const priceRecord = servicePrices.find(
      (p) =>
        p.service_id === selectedService.id &&
        p.commercial_category === selectedVehicle.commercial_category
    );
    return priceRecord ? priceRecord.price : 0;
  };

  const basePrice = getBasePrice();
  const suggestedPrice = Math.max(0, basePrice + Number(surchargeAmount || 0) - Number(discountAmount || 0));

  // Sugestão automática do catálogo para novos serviços/veículos quando não editado manualmente
  useEffect(() => {
    if (!isPriceCustomized) {
      if (selectedService && selectedVehicle) {
        const priceRecord = servicePrices.find(
          (p) =>
            p.service_id === selectedService.id &&
            p.commercial_category === selectedVehicle.commercial_category
        );
        const base = priceRecord ? priceRecord.price : 0;
        setChargedPrice(Math.max(0, base + Number(surchargeAmount || 0) - Number(discountAmount || 0)));
      } else {
        setChargedPrice('');
      }
    }
  }, [selectedService?.id, selectedVehicle?.commercial_category, isPriceCustomized, surchargeAmount, discountAmount]);

  // Recalcula acréscimo ao mudar nível de condição
  const handleConditionChange = (newLevel: ConditionLevel) => {
    setConditionLevel(newLevel);
    if (systemSettings) {
      const suggested = systemSettings.condition_surcharges[newLevel] || 0;
      setSurchargeAmount(suggested);
      if (!isPriceCustomized) {
        setChargedPrice(Math.max(0, basePrice + suggested - Number(discountAmount || 0)));
      }
    }
  };

  const handleSurchargeChange = (val: number) => {
    setSurchargeAmount(val);
    if (!isPriceCustomized) {
      setChargedPrice(Math.max(0, basePrice + val - Number(discountAmount || 0)));
    }
  };

  const handleDiscountChange = (val: number) => {
    setDiscountAmount(val);
    if (!isPriceCustomized) {
      setChargedPrice(Math.max(0, basePrice + Number(surchargeAmount || 0) - val));
    }
  };

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    setIsPriceCustomized(false);
  };

  const handleChargedPriceChange = (val: number | '') => {
    setIsPriceCustomized(true);
    setChargedPrice(val);
  };

  const handleRestoreSuggested = () => {
    setIsPriceCustomized(false);
    setChargedPrice(suggestedPrice);
  };

  // Verificação de conflito e horários excepcionais em tempo real (Não bloqueantes)
  useEffect(() => {
    const checkStatus = async () => {
      if (!scheduledDate || !scheduledStart || !scheduledEnd) return;

      // 1. Horário excepcional
      const isExcep = await operationService.isExceptionalHour(
        scheduledDate,
        scheduledStart,
        scheduledEnd
      );
      setIsExceptionalHour(isExcep);

      // 2. Conflito de horários (Requisito 5 / TESTE 10)
      const conflictResult = await operationService.checkAppointmentConflict(
        scheduledDate,
        scheduledStart,
        scheduledEnd
      );
      if (conflictResult.hasConflict) {
        const other = conflictResult.conflictingAppointments[0];
        setConflictWarning(
          `Atenção: Já existe agendamento ativo nesta data entre ${other.scheduled_start} e ${other.scheduled_end}. O sistema permite continuar se desejar.`
        );
      } else {
        setConflictWarning(null);
      }
    };

    checkStatus();
  }, [scheduledDate, scheduledStart, scheduledEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    if (!vehicleId) {
      alert('Por favor, selecione um veículo.');
      return;
    }

    const effectivePrice =
      chargedPrice === ''
        ? suggestedPrice
        : Math.max(0, Number(chargedPrice));

    setIsLoading(true);
    try {
      const saved = await operationService.saveAppointment({
        client_id: clientId,
        vehicle_id: vehicleId,
        service_catalog_id: serviceId || undefined,
        scheduled_date: scheduledDate,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        estimated_duration_minutes: durationMinutes,
        estimated_price: effectivePrice,
        condition_level: conditionLevel,
        surcharge_amount: Number(surchargeAmount || 0),
        discount_amount: Number(discountAmount || 0),
        status: 'scheduled',
        notes: notes.trim(),
      });

      onSuccess(saved);
      onClose();
    } catch (err) {
      console.error('Erro ao agendar:', err);
      alert('Ocorreu um erro ao salvar o agendamento.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Novo Agendamento</h3>
              <p className="text-xs text-slate-500">
                Planejamento de serviço com verificação de horário e conflitos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Alerta de Conflito de Horário (Requisito 5 & TESTE 10 - Não Bloqueante) */}
          {conflictWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-800 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Aviso de Conflito de Horário</span>
                <span>{conflictWarning}</span>
              </div>
            </div>
          )}

          {/* Alerta de Horário Excepcional (Requisito 2 - Não Bloqueante) */}
          {isExceptionalHour && (
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-800 text-xs">
              <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Horário Excepcional</span>
                <span>
                  O horário solicitado está fora do expediente regular cadastrado. O agendamento será marcado com etiqueta de exceção.
                </span>
              </div>
            </div>
          )}

          {/* Seleção de Cliente e Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Cliente *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Selecione o cliente...</option>
                {clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} ({cli.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                Veículo do Cliente *
              </label>
              <select
                required
                disabled={!clientId}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {!clientId
                    ? 'Selecione primeiro o cliente...'
                    : clientVehicles.length === 0
                    ? 'Nenhum veículo cadastrado para este cliente'
                    : 'Selecione o veículo...'}
                </option>
                {clientVehicles.map((veh) => (
                  <option key={veh.id} value={veh.id}>
                    {veh.brand} {veh.model} {veh.plate ? `• Placa: ${veh.plate}` : ''} ({veh.commercial_category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seleção de Serviço */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Serviço Previsto
            </label>
            <select
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Selecione o serviço do catálogo...</option>
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} (Previsto: {srv.estimated_duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Data Prevista *
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Horário Início *
              </label>
              <input
                type="time"
                required
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Horário Término Previsto
              </label>
              <input
                type="time"
                required
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Condição do Veículo e Valores Previstos */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Condição & Precificação Prevista
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nível de Sujeira / Condição
                </label>
                <select
                  value={conditionLevel}
                  onChange={(e) => handleConditionChange(e.target.value as ConditionLevel)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="normal">Normal (+R$ 0,00)</option>
                  <option value="above_normal">Acima do normal (+R$ 10,00)</option>
                  <option value="heavy">Pesada (+R$ 20,00)</option>
                  <option value="extreme">Extrema (+R$ 40,00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Acréscimo Condição (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={surchargeAmount}
                  onChange={(e) => handleSurchargeChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Desconto Cortesia (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => handleDiscountChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Valor Cobrado Previsto Editável */}
            <div className="border-t border-slate-200/80 pt-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <label htmlFor="appointment-charged-price" className="block text-xs font-bold text-slate-800 mb-1">
                    Valor cobrado (R$) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative rounded-lg shadow-2xs">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-500">
                        R$
                      </span>
                      <input
                        id="appointment-charged-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={chargedPrice}
                        onChange={(e) => handleChargedPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-40 rounded-lg border border-blue-400 bg-white pl-9 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                      />
                    </div>
                    {isPriceCustomized && (
                      <button
                        type="button"
                        onClick={handleRestoreSuggested}
                        className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Restaurar sugerido
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Valor sugerido pelo catálogo: <strong className="text-slate-700">R$ {basePrice.toFixed(2)}</strong>
                    {isPriceCustomized && Number(chargedPrice) !== suggestedPrice && (
                      <span className="text-amber-700 font-semibold ml-1.5">• Valor editado manualmente</span>
                    )}
                  </p>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Base: R$ {basePrice.toFixed(2)}
                    {surchargeAmount > 0 && ` + Condição: R$ ${Number(surchargeAmount).toFixed(2)}`}
                    {discountAmount > 0 && ` - Desconto: R$ ${Number(discountAmount).toFixed(2)}`}
                  </div>
                </div>

                <div className="text-right sm:self-end">
                  <span className="text-slate-500 text-[11px] block">Valor Estimado Previsto:</span>
                  <span className="text-2xl font-black text-blue-700">
                    R$ {(chargedPrice === '' ? suggestedPrice : Number(chargedPrice)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observações do Agendamento
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências do cliente, detalhes específicos ou recomendações..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
