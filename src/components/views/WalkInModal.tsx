import React, { useState, useEffect } from 'react';
import { X, Play, Car, User, Sparkles, Tag, DollarSign, Clock, CalendarDays } from 'lucide-react';
import {
  Client,
  Vehicle,
  ServiceCatalogItem,
  ServicePrice,
  ConditionLevel,
  ExecutedService,
  SystemSettings,
} from '../../types';
import { dataService } from '../../services/dataService';
import { operationService } from '../../services/operationService';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (service: ExecutedService) => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>('normal');
  const [surchargeAmount, setSurchargeAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [chargedPrice, setChargedPrice] = useState<number | ''>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Registro de início: Agora vs Manual
  const [startMode, setStartMode] = useState<'now' | 'manual'>('now');
  const [manualStartDateTime, setManualStartDateTime] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStartMode('now');
      setConditionLevel('normal');
      setSurchargeAmount(0);
      setDiscountAmount(0);
      setChargedPrice('');
      setIsPriceCustomized(false);
      setNotes('');
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setManualStartDateTime(localIso);
    }
  }, [isOpen]);

  const loadData = async () => {
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
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const clientVehicles = vehicles.filter((v) => v.client_id === clientId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedService = services.find((s) => s.id === serviceId);

  // Auto-seleciona veículo caso único
  useEffect(() => {
    if (clientVehicles.length === 1 && !vehicleId) {
      setVehicleId(clientVehicles[0].id);
    } else if (clientVehicles.length > 0 && !clientVehicles.some((v) => v.id === vehicleId)) {
      setVehicleId('');
    }
  }, [clientId, clientVehicles]);

  // Busca preço base do catálogo de preços por categoria comercial do veículo
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

  // Recalcula e sugere o preço sempre que serviço ou veículo mudar se o operador não tiver editado manualmente
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

  const handleStartService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Selecione o cliente.');
      return;
    }
    if (!selectedVehicle) {
      alert('Selecione o veículo.');
      return;
    }
    if (!selectedService) {
      alert('Selecione o serviço.');
      return;
    }

    const finalPriceNum = chargedPrice === '' ? 0 : Number(chargedPrice);
    if (isNaN(finalPriceNum) || finalPriceNum < 0) {
      alert('Informe um valor cobrado válido (número maior ou igual a zero).');
      return;
    }

    if (startMode === 'manual' && !manualStartDateTime) {
      alert('Informe a data e hora de início do atendimento.');
      return;
    }

    const startedAt =
      startMode === 'manual' && manualStartDateTime
        ? new Date(manualStartDateTime).toISOString()
        : new Date().toISOString();

    setIsLoading(true);
    try {
      const newService = await operationService.startWalkInService({
        client: selectedClient,
        vehicle: selectedVehicle,
        service: selectedService,
        basePrice: basePrice,
        finalPrice: finalPriceNum,
        conditionLevel: conditionLevel,
        surchargeAmount: Number(surchargeAmount || 0),
        discountAmount: Number(discountAmount || 0),
        notes: notes.trim(),
        startedAt: startedAt,
      });

      onSuccess(newService);
      onClose();
    } catch (err) {
      console.error('Erro ao iniciar atendimento:', err);
      alert('Não foi possível iniciar o atendimento.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600">
              <Play className="h-5 w-5 fill-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Iniciar Atendimento (Walk-in)</h3>
              <p className="text-xs text-slate-500">
                Início imediato sem agendamento prévio com contagem de tempo
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
        <form onSubmit={handleStartService} className="p-6 space-y-5">
          {/* Seleção de Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Cliente *
            </label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} ({cli.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Veículo */}
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
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
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
                  {veh.brand} {veh.model} {veh.plate ? `• ${veh.plate}` : ''} ({veh.commercial_category})
                </option>
              ))}
            </select>
          </div>

          {/* Seleção do Serviço */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Serviço a Executar *
            </label>
            <select
              required
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Selecione o serviço...</option>
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} (Previsto: {srv.estimated_duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Precificação e Condição */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Condição & Valores Iniciais
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nível de Sujeira
                </label>
                <select
                  value={conditionLevel}
                  onChange={(e) => handleConditionChange(e.target.value as ConditionLevel)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="normal">Normal (+R$ 0,00)</option>
                  <option value="above_normal">Acima do normal (+R$ 10,00)</option>
                  <option value="heavy">Pesada (+R$ 20,00)</option>
                  <option value="extreme">Extrema (+R$ 40,00)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Acréscimo Sujeira (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={surchargeAmount}
                  onChange={(e) => handleSurchargeChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Valor Cobrado Editável */}
            <div className="border-t border-slate-200/80 pt-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label htmlFor="walkin-charged-price" className="block text-xs font-bold text-slate-800 mb-1">
                    Valor cobrado (R$) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative rounded-lg shadow-2xs">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-500">
                        R$
                      </span>
                      <input
                        id="walkin-charged-price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={chargedPrice}
                        onChange={(e) => handleChargedPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-40 rounded-lg border border-emerald-400 bg-white pl-9 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                      />
                    </div>
                    {isPriceCustomized && (
                      <button
                        type="button"
                        onClick={handleRestoreSuggested}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-medium"
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
                    Base ({selectedVehicle?.commercial_category || 'Categoria'}): R$ {basePrice.toFixed(2)}
                    {surchargeAmount > 0 && ` + Sujeira: R$ ${Number(surchargeAmount).toFixed(2)}`}
                    {discountAmount > 0 && ` - Desconto: R$ ${Number(discountAmount).toFixed(2)}`}
                  </div>
                </div>

                <div className="text-right sm:self-end">
                  <span className="text-slate-500 text-[11px] block">Valor Inicial Previsto:</span>
                  <span className="text-2xl font-black text-emerald-700">
                    R$ {(chargedPrice === '' ? 0 : Number(chargedPrice)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Registro do Horário de Início */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Horário de Início Real</span>
              <span className="text-[11px] text-slate-500">Permite registrar início imediato ou retroativo</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartMode('now')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  startMode === 'now'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="h-4 w-4 text-emerald-600" />
                Iniciar agora
              </button>

              <button
                type="button"
                onClick={() => setStartMode('manual')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  startMode === 'manual'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CalendarDays className="h-4 w-4 text-emerald-600" />
                Informar manualmente
              </button>
            </div>

            {startMode === 'manual' && (
              <div className="pt-1">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Data e Horário Real do Início *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={manualStartDateTime}
                  onChange={(e) => setManualStartDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observações Iniciais
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Veículo chegou com muita poeira nas caixas de rodas..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Actions */}
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
              disabled={isLoading || !clientId || !vehicleId || !serviceId}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              {isLoading ? 'Iniciando...' : 'Iniciar Atendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
