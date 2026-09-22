import React, { useState } from 'react';
import {
  X,
  Car,
  User,
  Sparkles,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  CreditCard,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ExecutedService, PaymentMethod } from '../../types';
import { operationService } from '../../services/operationService';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ExecutedService;
  onUpdate: (updatedService: ExecutedService) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  isOpen,
  onClose,
  service,
  onUpdate,
}) => {
  const [isRegisteringPayment, setIsRegisteringPayment] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const hours = Math.floor((service.actual_duration_minutes || 0) / 60);
  const mins = (service.actual_duration_minutes || 0) % 60;

  const handleRegisterPayment = async () => {
    setIsLoading(true);
    try {
      const updated = await operationService.registerPayment(service.id, paymentMethod);
      onUpdate(updated);
      setIsRegisteringPayment(false);
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      alert('Não foi possível registrar o pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelService = async () => {
    if (!cancellationReason.trim()) {
      alert('Por favor, informe a justificativa do cancelamento.');
      return;
    }

    if (!confirm('Deseja realmente cancelar este atendimento? O histórico será preservado e as baixas de estoque serão estornadas.')) {
      return;
    }

    setIsLoading(true);
    try {
      const updated = await operationService.cancelExecutedService(service.id, cancellationReason.trim());
      onUpdate(updated);
      setIsCancelling(false);
    } catch (err) {
      console.error('Erro ao cancelar serviço:', err);
      alert('Não foi possível cancelar o serviço.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Atendimento #{service.id.slice(0, 8)}
                </h3>
                {service.status === 'completed' && (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Concluído
                  </span>
                )}
                {service.status === 'in_progress' && (
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Em Andamento
                  </span>
                )}
                {service.status === 'cancelled' && (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                    Cancelado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Snapshots imutáveis de valores, produtos consumidos e produtividade
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {/* Snapshots do Cliente, Veículo e Serviço */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
              Snapshots Gravados no Momento da Execução
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 text-[11px] block">Cliente</span>
                <strong className="text-slate-800 text-sm block">{service.client_name_snap}</strong>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Veículo / Placa</span>
                <strong className="text-slate-800 text-sm block">{service.vehicle_model_snap}</strong>
                <span className="text-slate-500">
                  {service.vehicle_plate_snap || 'Sem placa'} •{' '}
                  <span className="text-blue-700 font-semibold">{service.vehicle_category_snap}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Serviço Realizado</span>
                <strong className="text-slate-800 text-sm block">{service.service_name_snap}</strong>
                <span className="text-slate-500">
                  Preço Base: R$ {(service.base_price_snap || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Valor Cobrado Final</span>
                <strong className="text-slate-900 text-base font-bold block">
                  R$ {(service.final_price || 0).toFixed(2)}
                </strong>
                <span className="text-slate-500">
                  {service.surcharge_amount > 0 && `+R$ ${service.surcharge_amount.toFixed(2)} acréscimo `}
                  {service.discount_amount > 0 && `-R$ ${service.discount_amount.toFixed(2)} desc.`}
                </span>
              </div>
            </div>
          </div>

          {/* Horários e Produtividade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
              <span className="text-slate-500 text-[11px] font-medium block flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Início e Término Real
              </span>
              <div className="text-slate-800 font-semibold">
                {service.started_at
                  ? new Date(service.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
                {' às '}
                {service.finished_at
                  ? new Date(service.finished_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Em andamento'}
              </div>
              <span className="text-[10px] text-slate-400">
                {service.started_at ? new Date(service.started_at).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
              <span className="text-slate-500 text-[11px] font-medium block">Duração Real</span>
              <div className="text-slate-800 text-sm font-bold">
                {hours}h {String(mins).padStart(2, '0')}m
              </div>
              <span className="text-[10px] text-slate-400">
                Total: {service.actual_duration_minutes || 0} minutos
              </span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-1">
              <span className="text-blue-700 text-[11px] font-medium block flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Receita por Hora
              </span>
              <div className="text-blue-900 text-sm font-bold">
                R$ {(service.revenue_per_hour || 0).toFixed(2)} / h
              </div>
              <span className="text-[10px] text-blue-600">Produtividade operacional</span>
            </div>
          </div>

          {/* Produtos Consumidos e Baixa FIFO */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Package className="h-4 w-4 text-emerald-600" />
              Insumos Consumidos & Lotes FIFO (Snapshots Imutáveis)
            </span>

            {(!service.used_products || service.used_products.length === 0) ? (
              <p className="text-slate-400 text-xs italic py-2">
                Nenhum produto registrado para este atendimento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                      <th className="pb-2">Produto</th>
                      <th className="pb-2">Lote Gravado</th>
                      <th className="pb-2 text-right">Qtd Consumida</th>
                      <th className="pb-2 text-right">Custo Unitário</th>
                      <th className="pb-2 text-right">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {service.used_products.map((item) => (
                      <tr key={item.id} className="text-xs text-slate-700">
                        <td className="py-2 font-medium">{item.product_name_snap}</td>
                        <td className="py-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700">
                            {item.batch_code_snap || 'LOTE'}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {item.quantity_used} {item.unit || 'ml'}
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          R$ {item.unit_cost_snap.toFixed(4)}
                        </td>
                        <td className="py-2 text-right font-semibold text-slate-800">
                          R$ {item.total_cost_snap.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 font-bold text-slate-800">
                      <td colSpan={4} className="pt-2 text-right">
                        Custo Total dos Insumos:
                      </td>
                      <td className="pt-2 text-right text-emerald-700">
                        R$ {(service.total_products_cost || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Margem Bruta Simples */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-900 block">
                  Margem Bruta Simples (Preço - Custo dos Insumos)
                </span>
                <span className="text-[10px] text-emerald-700">
                  R$ {(service.final_price || 0).toFixed(2)} - R$ {(service.total_products_cost || 0).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-900 block">
                  R$ {(service.simple_gross_margin || 0).toFixed(2)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {(service.simple_gross_margin_percent || 0).toFixed(1)}% do valor
                </span>
              </div>
            </div>
          </div>

          {/* Controle de Pagamento */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Status Financeiro do Serviço
              </span>

              {service.payment_status === 'paid' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Pago via {service.payment_method?.toUpperCase()}
                </span>
              ) : service.payment_status === 'pending' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Pagamento Pendente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                  Cancelado
                </span>
              )}
            </div>

            {service.payment_status === 'paid' && (
              <div className="text-xs text-slate-600">
                Pagamento registrado em:{' '}
                <strong>
                  {service.paid_at ? new Date(service.paid_at).toLocaleString('pt-BR') : 'Data da conclusão'}
                </strong>{' '}
                • Método: <strong>{service.payment_method?.toUpperCase()}</strong>
              </div>
            )}

            {/* Ação rápida para dar baixa em pagamento pendente (Requisito 26 / TESTE 3) */}
            {service.payment_status === 'pending' && !isRegisteringPayment && (
              <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="text-amber-900">
                  <strong>Aguardando recebimento:</strong> R$ {(service.final_price || 0).toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisteringPayment(true)}
                  className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Registrar Pagamento Agora
                </button>
              </div>
            )}

            {isRegisteringPayment && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                <span className="font-semibold text-slate-700 block">
                  Registrar Recebimento de R$ {(service.final_price || 0).toFixed(2)}
                </span>
                <div className="flex items-center gap-3">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro em Espécie</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="other">Outro</option>
                  </select>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleRegisterPayment}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    {isLoading ? 'Salvando...' : 'Confirmar Recebimento'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRegisteringPayment(false)}
                    className="rounded-xl px-3 py-2 text-xs text-slate-600 hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Retrabalho ou Cancelamento se houver */}
          {service.is_rework && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 space-y-1">
              <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-blue-600" />
                Atendimento de Retrabalho / Retorno de Garantia
              </span>
              <p className="text-blue-800">{service.rework_notes || 'Sem observações adicionais.'}</p>
            </div>
          )}

          {service.status === 'cancelled' && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1">
              <span className="font-bold text-rose-900 block flex items-center gap-1.5">
                <Ban className="h-4 w-4 text-rose-600" />
                Atendimento Cancelado
              </span>
              <p className="text-rose-800">
                <strong>Motivo:</strong> {service.cancellation_reason || 'Não informado.'}
              </p>
              <span className="text-[10px] text-rose-600 block">
                Cancelado em:{' '}
                {service.cancelled_at
                  ? new Date(service.cancelled_at).toLocaleString('pt-BR')
                  : 'Registrado'}
              </span>
            </div>
          )}

          {/* Cancelamento Seguro (Requisito 27) */}
          {service.status !== 'cancelled' && !isCancelling && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCancelling(true)}
                className="text-slate-400 hover:text-rose-600 text-xs transition-colors flex items-center gap-1"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancelar este atendimento
              </button>
            </div>
          )}

          {isCancelling && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-3">
              <span className="font-bold text-rose-900 block">
                Confirmar Cancelamento do Atendimento
              </span>
              <p className="text-[11px] text-slate-600">
                O registro será mantido para fins de auditoria histórica, e as baixas de estoque efetuadas serão estornadas automaticamente.
              </p>
              <textarea
                rows={2}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Informe a justificativa do cancelamento..."
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-800"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelling(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isLoading || !cancellationReason.trim()}
                  onClick={handleCancelService}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Processando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};
