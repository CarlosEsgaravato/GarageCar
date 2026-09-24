import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Car,
  User,
  Sparkles,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';
import {
  ExecutedService,
  Product,
  ProductBatch,
  ConditionLevel,
  PaymentStatus,
  PaymentMethod,
  ProductConsumptionInput,
  FifoBatchAllocation,
  SystemSettings,
} from '../../types';
import { dataService } from '../../services/dataService';
import { operationService } from '../../services/operationService';

interface FinalizeServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ExecutedService;
  onSuccess: (finalizedService: ExecutedService) => void;
}

export const FinalizeServiceModal: React.FC<FinalizeServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess,
}) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBatches, setAllBatches] = useState<ProductBatch[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // Form State
  const [finishedAtStr, setFinishedAtStr] = useState<string>('');
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>(
    service.condition_level || 'normal'
  );
  const [conditionNotes, setConditionNotes] = useState<string>(service.condition_notes || '');
  const [surchargeAmount, setSurchargeAmount] = useState<number>(service.surcharge_amount || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(service.discount_amount || 0);

  // Preço base/sugerido do catálogo preservado em base_price_snap
  const basePrice = service.base_price_snap || 0;

  // Valor cobrado editável pelo operador (sugestão inicial = final_price existente ou base + acréscimo - desconto)
  const [chargedPrice, setChargedPrice] = useState<number | ''>(() => {
    if (service.final_price !== undefined && service.final_price !== null && service.final_price > 0) {
      return service.final_price;
    }
    return Math.max(0, (service.base_price_snap || 0) + (service.surcharge_amount || 0) - (service.discount_amount || 0));
  });

  const [isPriceCustomized, setIsPriceCustomized] = useState<boolean>(() => {
    const calc = Math.max(0, (service.base_price_snap || 0) + (service.surcharge_amount || 0) - (service.discount_amount || 0));
    return (
      service.final_price !== undefined &&
      service.final_price !== null &&
      service.final_price > 0 &&
      Math.abs(service.final_price - calc) > 0.001
    );
  });

  // Consumo de Produtos
  const [consumedProducts, setConsumedProducts] = useState<ProductConsumptionInput[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');

  // Pagamento
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paidAtStr, setPaidAtStr] = useState<string>('');

  // Retrabalho
  const [isRework, setIsRework] = useState<boolean>(service.is_rework || false);
  const [reworkNotes, setReworkNotes] = useState<string>(service.rework_notes || '');
  const [notes, setNotes] = useState<string>(service.notes || '');

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Inicialização ao abrir
  useEffect(() => {
    if (isOpen) {
      setConditionLevel(service.condition_level || 'normal');
      setConditionNotes(service.condition_notes || '');
      setSurchargeAmount(service.surcharge_amount || 0);
      setDiscountAmount(service.discount_amount || 0);
      setIsRework(service.is_rework || false);
      setReworkNotes(service.rework_notes || '');
      setNotes(service.notes || '');

      const base = service.base_price_snap || 0;
      const initialPrice =
        service.final_price !== undefined && service.final_price !== null && service.final_price > 0
          ? service.final_price
          : Math.max(0, base + (service.surcharge_amount || 0) - (service.discount_amount || 0));
      setChargedPrice(initialPrice);

      const calc = Math.max(0, base + (service.surcharge_amount || 0) - (service.discount_amount || 0));
      setIsPriceCustomized(
        service.final_price !== undefined &&
        service.final_price !== null &&
        service.final_price > 0 &&
        Math.abs(service.final_price - calc) > 0.001
      );

      loadDependenciesAndRecipe();
    }
  }, [isOpen, service]);

  const loadDependenciesAndRecipe = async () => {
    try {
      const [prods, batches, settings] = await Promise.all([
        dataService.getProducts(),
        operationService.getProductBatches(),
        operationService.getSystemSettings(),
      ]);

      setAllProducts(prods);
      setAllBatches(batches);
      setSystemSettings(settings);

      // Data e hora de término padrão: agora local formatado para datetime-local
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFinishedAtStr(localIso);
      setPaidAtStr(localIso);

      // Carrega receita padrão para o serviço se ainda não houver produtos
      const defaultRecipe = service.service_catalog_id
        ? operationService.getDefaultServiceProducts(service.service_catalog_id)
        : [];

      const initialInputs: ProductConsumptionInput[] = [];

      for (const item of defaultRecipe) {
        const prod = prods.find((p) => p.id === item.product_id);
        const unit = prod ? prod.unit : item.unit;
        const allocs = await operationService.calculateFifoAllocation(
          item.product_id,
          item.suggested_quantity
        );
        initialInputs.push({
          product_id: item.product_id,
          product_name: prod ? prod.name : item.product_name,
          unit: unit,
          quantity: item.suggested_quantity,
          allocations: allocs,
        });
      }

      setConsumedProducts(initialInputs);
    } catch (err) {
      console.error('Erro ao inicializar finalização:', err);
    }
  };

  // Recalcula horário e duração
  const calculateDurationMinutes = (): number => {
    try {
      const startMs = new Date(service.started_at || service.created_at).getTime();
      const finishMs = finishedAtStr ? new Date(finishedAtStr).getTime() : Date.now();
      return Math.max(1, Math.round((finishMs - startMs) / 60000));
    } catch {
      return 60;
    }
  };

  const durationMinutes = calculateDurationMinutes();
  const durationHours = durationMinutes / 60;
  const hoursDisplay = Math.floor(durationMinutes / 60);
  const minutesDisplay = durationMinutes % 60;

  // Sugestão automática calculada a partir do catálogo + acréscimo - desconto
  const suggestedPrice = Math.max(
    0,
    basePrice + Number(surchargeAmount || 0) - Number(discountAmount || 0)
  );

  // Valor final efetivo a ser cobrado
  const effectiveFinalPrice = chargedPrice === '' ? 0 : Math.max(0, Number(chargedPrice));

  // Recalcula acréscimo quando o nível de condição muda
  const handleConditionChange = (newLevel: ConditionLevel) => {
    setConditionLevel(newLevel);
    if (systemSettings) {
      const suggestedSurcharge = systemSettings.condition_surcharges[newLevel] || 0;
      setSurchargeAmount(suggestedSurcharge);
      if (!isPriceCustomized) {
        setChargedPrice(Math.max(0, basePrice + suggestedSurcharge - Number(discountAmount || 0)));
      }
    }
  };

  const handleSurchargeChange = (newSurcharge: number) => {
    setSurchargeAmount(newSurcharge);
    if (!isPriceCustomized) {
      setChargedPrice(Math.max(0, basePrice + newSurcharge - Number(discountAmount || 0)));
    }
  };

  const handleDiscountChange = (newDiscount: number) => {
    setDiscountAmount(newDiscount);
    if (!isPriceCustomized) {
      setChargedPrice(Math.max(0, basePrice + Number(surchargeAmount || 0) - newDiscount));
    }
  };

  const handleChargedPriceChange = (val: number | '') => {
    setIsPriceCustomized(true);
    setChargedPrice(val);
  };

  const handleRestoreSuggested = () => {
    setIsPriceCustomized(false);
    setChargedPrice(suggestedPrice);
  };

  // Produtividade: R$/hora
  const revenuePerHour =
    durationHours > 0 ? Math.round((effectiveFinalPrice / durationHours) * 100) / 100 : effectiveFinalPrice;

  // Atualiza quantidade de um produto consumido e recalcula FIFO
  const handleQuantityChange = async (index: number, newQty: number) => {
    const updated = [...consumedProducts];
    const target = updated[index];
    target.quantity = Number(newQty);

    if (target.manual_batch_id) {
      const batch = allBatches.find((b) => b.id === target.manual_batch_id);
      if (batch) {
        target.allocations = [
          {
            batch_id: batch.id,
            batch_code: batch.batch_code,
            quantity_used: target.quantity,
            unit_cost: batch.unit_cost,
            total_cost: Math.round(target.quantity * batch.unit_cost * 100) / 100,
            available_before: batch.current_quantity,
            stock_after: batch.current_quantity - target.quantity,
            is_negative: batch.current_quantity - target.quantity < 0,
            purchase_date: batch.purchase_date,
          },
        ];
      }
    } else {
      target.allocations = await operationService.calculateFifoAllocation(
        target.product_id,
        target.quantity
      );
    }

    setConsumedProducts(updated);
  };

  // Alterna para lote manual ou volta para FIFO automático
  const handleToggleManualBatch = async (index: number, batchId: string) => {
    const updated = [...consumedProducts];
    const target = updated[index];

    if (batchId === 'fifo') {
      target.manual_batch_id = undefined;
      target.allocations = await operationService.calculateFifoAllocation(
        target.product_id,
        target.quantity
      );
    } else {
      target.manual_batch_id = batchId;
      const batch = allBatches.find((b) => b.id === batchId);
      if (batch) {
        target.allocations = [
          {
            batch_id: batch.id,
            batch_code: batch.batch_code,
            quantity_used: target.quantity,
            unit_cost: batch.unit_cost,
            total_cost: Math.round(target.quantity * batch.unit_cost * 100) / 100,
            available_before: batch.current_quantity,
            stock_after: batch.current_quantity - target.quantity,
            is_negative: batch.current_quantity - target.quantity < 0,
            purchase_date: batch.purchase_date,
          },
        ];
      }
    }

    setConsumedProducts(updated);
  };

  // Adiciona novo produto não previsto na receita
  const handleAddProduct = async () => {
    if (!selectedAddProductId) return;
    const prod = allProducts.find((p) => p.id === selectedAddProductId);
    if (!prod) return;

    const initialQty = prod.unit === 'ml' ? 10 : 1;
    const allocs = await operationService.calculateFifoAllocation(prod.id, initialQty);

    setConsumedProducts((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        quantity: initialQty,
        allocations: allocs,
      },
    ]);

    setSelectedAddProductId('');
  };

  const handleRemoveProduct = (index: number) => {
    setConsumedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Custo total dos produtos e Margem Bruta
  const totalProductsCost = consumedProducts.reduce((sum, item) => {
    const itemTotal = (item.allocations || []).reduce((acc, a) => acc + a.total_cost, 0);
    return sum + itemTotal;
  }, 0);

  const simpleGrossMargin = Math.round((effectiveFinalPrice - totalProductsCost) * 100) / 100;
  const simpleGrossMarginPercent =
    effectiveFinalPrice > 0
      ? Math.round(((effectiveFinalPrice - totalProductsCost) / effectiveFinalPrice) * 10000) / 100
      : 0;

  // Verifica se algum produto terá estoque negativo (Requisito 14 e TESTE 4)
  const hasNegativeStockWarning = consumedProducts.some((p) =>
    (p.allocations || []).some((a) => a.is_negative)
  );

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRework && !reworkNotes.trim()) {
      alert('Por favor, informe a justificativa do retrabalho.');
      return;
    }

    const finalPriceNum = chargedPrice === '' ? 0 : Number(chargedPrice);
    if (isNaN(finalPriceNum) || finalPriceNum < 0) {
      alert('Por favor, informe um valor cobrado válido (número maior ou igual a zero).');
      return;
    }

    // Requisito 6: Bloquear consumo se não existir nenhum lote cadastrado para o produto
    const productMissingBatch = consumedProducts.find((p) => {
      const pBatches = allBatches.filter((b) => b.product_id === p.product_id);
      return pBatches.length === 0;
    });

    if (productMissingBatch) {
      alert(
        `O produto "${productMissingBatch.product_name}" não possui nenhum lote cadastrado. É obrigatório registrar uma compra em Compras / Lotes antes de realizar o consumo.`
      );
      return;
    }

    const startMs = new Date(service.started_at || service.created_at).getTime();
    const finishMs = finishedAtStr ? new Date(finishedAtStr).getTime() : Date.now();

    if (finishMs < startMs) {
      alert('O horário de término não pode ser anterior ao horário de início do atendimento.');
      return;
    }

    setIsLoading(true);
    try {
      const finalized = await operationService.finalizeService(service.id, {
        finishedAt: finishedAtStr ? new Date(finishedAtStr).toISOString() : new Date().toISOString(),
        conditionLevel: conditionLevel,
        conditionNotes: conditionNotes.trim(),
        surchargeAmount: Number(surchargeAmount || 0),
        discountAmount: Number(discountAmount || 0),
        finalPrice: finalPriceNum,
        usedProducts: consumedProducts,
        paymentStatus: paymentStatus,
        paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
        paidAt: paymentStatus === 'paid' ? new Date(paidAtStr).toISOString() : undefined,
        isRework: isRework,
        reworkNotes: reworkNotes.trim(),
        notes: notes.trim(),
      });

      onSuccess(finalized);
      onClose();
    } catch (err: any) {
      console.error('Erro ao finalizar serviço:', err);
      alert(err?.message || 'Ocorreu um erro ao finalizar o serviço.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Finalizar Serviço</h3>
              <p className="text-xs text-slate-500">
                Fechamento de duração real, baixa FIFO de insumos, margem e pagamento
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
        <form onSubmit={handleFinalize} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Card Resumo Snapshots do Atendimento */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Cliente</span>
                <strong className="text-slate-800 text-sm">{service.client_name_snap}</strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Veículo / Placa</span>
                <strong className="text-slate-800 text-sm">
                  {service.vehicle_model_snap} {service.vehicle_plate_snap ? `• ${service.vehicle_plate_snap}` : ''}
                </strong>
                <span className="text-[10px] text-blue-600 block">{service.vehicle_category_snap}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Serviço</span>
                <strong className="text-slate-800 text-sm">{service.service_name_snap}</strong>
                <span className="text-[10px] text-slate-500 block">Base: R$ {basePrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Início Real</span>
                <strong className="text-slate-800 text-sm">
                  {new Date(service.started_at || service.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
            </div>
          </div>

          {/* Horário de Término Real e Duração */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600" />
              Término Real & Produtividade
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horário de Término Real *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={finishedAtStr}
                  onChange={(e) => setFinishedAtStr(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-hidden ${
                    finishedAtStr && new Date(finishedAtStr).getTime() < new Date(service.started_at || service.created_at).getTime()
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:border-rose-600'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                />
                {finishedAtStr && new Date(finishedAtStr).getTime() < new Date(service.started_at || service.created_at).getTime() && (
                  <span className="text-[11px] text-rose-600 font-medium block mt-1">
                    Término não pode ser anterior ao início ({new Date(service.started_at || service.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).
                  </span>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <span className="text-[11px] text-slate-500 block font-medium">Duração Real</span>
                <span className="text-base font-bold text-slate-800">
                  {hoursDisplay}h {String(minutesDisplay).padStart(2, '0')}m
                </span>
                <span className="text-[10px] text-slate-400 block">({durationMinutes} min)</span>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                <span className="text-[11px] text-blue-700 block font-medium flex items-center justify-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Receita / Hora
                </span>
                <span className="text-base font-bold text-blue-900">
                  R$ {revenuePerHour.toFixed(2)} / h
                </span>
                <span className="text-[10px] text-blue-600 block">Produtividade real</span>
              </div>
            </div>
          </div>

          {/* Condição do Veículo, Acréscimo e Preço Final */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Condição & Ajuste de Preço
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condição / Sujeira
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Acréscimo Sujeira (R$)
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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

            {/* Totalizador Financeiro e Campo de Valor Cobrado Editável */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 pt-3 gap-3 text-xs">
              <div>
                <label htmlFor="finalize-charged-price" className="block text-xs font-bold text-slate-800 mb-1">
                  Valor cobrado (R$) *
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative rounded-lg shadow-2xs">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-500">
                      R$
                    </span>
                    <input
                      id="finalize-charged-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
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
                  {surchargeAmount > 0 && ` + Acréscimo: R$ ${Number(surchargeAmount).toFixed(2)}`}
                  {discountAmount > 0 && ` - Desconto: R$ ${Number(discountAmount).toFixed(2)}`}
                </div>
              </div>

              <div className="text-right sm:self-end">
                <span className="text-[11px] text-slate-500 block">Preço Final do Serviço:</span>
                <span className="text-2xl font-black text-slate-900">
                  R$ {effectiveFinalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Consumo de Produtos (Baixa FIFO de Lotes) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Consumo Real de Produtos & Baixa FIFO
                </span>
                <p className="text-[11px] text-slate-500">
                  Baixa automática no lote mais antigo com suporte a divisão de lotes e saldo negativo.
                </p>
              </div>
            </div>

            {/* Alerta de Estoque Negativo (Requisito 14 / TESTE 4) */}
            {hasNegativeStockWarning && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Aviso: Consumo Excede Saldo em Estoque</strong>
                  <span>
                    A quantidade consumida em um ou mais produtos deixará o saldo negativo. O sistema permite finalizar o serviço normalmente e gerará alerta no controle de estoque.
                  </span>
                </div>
              </div>
            )}

            {/* Lista de Insumos */}
            <div className="space-y-3">
              {consumedProducts.map((item, idx) => {
                const productBatches = allBatches.filter((b) => b.product_id === item.product_id);
                const itemTotalCost = (item.allocations || []).reduce(
                  (sum, a) => sum + a.total_cost,
                  0
                );

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{item.product_name}</span>
                        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 font-mono">
                          {item.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-500">Qtd usada:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-right font-semibold focus:border-blue-500 focus:outline-hidden"
                          />
                          <span className="text-[11px] text-slate-500">{item.unit}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                          title="Remover produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Detalhes de Alocação FIFO ou Lote Manual */}
                    <div className="border-t border-slate-200/80 pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {/* Seletor de modo manual ou FIFO */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Modo Lote:</span>
                        <select
                          value={item.manual_batch_id || 'fifo'}
                          onChange={(e) => handleToggleManualBatch(idx, e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-hidden"
                        >
                          <option value="fifo">Automático (FIFO por data)</option>
                          {productBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              Manual: {b.batch_code} (Saldo: {b.current_quantity} {item.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Exibição da divisão de lotes */}
                      <div className="flex flex-wrap items-center gap-2 text-slate-600">
                        {(item.allocations || []).map((alloc, aIdx) => (
                          <span
                            key={aIdx}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] ${
                              alloc.is_negative
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            <strong>{alloc.batch_code || 'LOTE'}:</strong> {alloc.quantity_used} {item.unit} @ R$ {alloc.unit_cost.toFixed(4)}
                            {alloc.is_negative && ' (Estoque negativo)'}
                          </span>
                        ))}
                      </div>

                      {/* Custo total do insumo */}
                      <div className="font-semibold text-slate-700">
                        Custo: R$ {itemTotalCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Adicionar Produto Extra */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <select
                value={selectedAddProductId}
                onChange={(e) => setSelectedAddProductId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Adicionar outro produto utilizado no serviço...</option>
                {allProducts
                  .filter((p) => !consumedProducts.some((cp) => cp.product_id === p.id))
                  .map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.unit})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedAddProductId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Insumo
              </button>
            </div>

            {/* Margem Bruta Simples (Requisito 31) */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-emerald-800 block">
                  Margem Bruta Simples do Atendimento
                </span>
                <span className="text-slate-600">
                  Preço Final (R$ {effectiveFinalPrice.toFixed(2)}) - Custo Insumos (R$ {totalProductsCost.toFixed(2)})
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-emerald-900 block">
                  R$ {simpleGrossMargin.toFixed(2)}
                </span>
                <span className="text-[11px] font-medium text-emerald-700">
                  Margem: {simpleGrossMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Pagamento (Requisitos 24, 25, 26 / TESTE 3) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Controle de Pagamento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Situação do Pagamento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentStatus === 'paid'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Pago no ato
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pending')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentStatus === 'pending'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    Pendente (Faturar)
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {paymentStatus === 'paid'
                    ? 'Recebimento confirmado no momento da entrega.'
                    : 'Serviço concluído, aguardando pagamento posterior.'}
                </span>
              </div>

              {paymentStatus === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Forma de Pagamento Recebida *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Retrabalho / Garantia (Requisito 28) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-rework"
                checked={isRework}
                onChange={(e) => setIsRework(e.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is-rework" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                Marcar este atendimento como Retrabalho / Retorno de Garantia
              </label>
            </div>

            {isRework && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Motivo e Justificativa do Retrabalho *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reworkNotes}
                  onChange={(e) => setReworkNotes(e.target.value)}
                  placeholder="Ex: Correção de manchas no vidro ou reaplicação localizada sem custo..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Finais do Serviço
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentários sobre a entrega, satisfação ou recomendações..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isLoading ? 'Concluindo...' : 'Concluir Serviço e Baixar Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
