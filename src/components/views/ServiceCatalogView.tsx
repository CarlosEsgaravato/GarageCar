import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Car,
  Check,
  Shield,
  Plus,
  AlertCircle,
  Clock,
  Coins,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  FileText,
  Calendar,
} from 'lucide-react';
import { ServiceCatalogItem, ServicePrice, VehicleCategory } from '../../types';
import { dataService } from '../../services/dataService';

export const ServiceCatalogView: React.FC = () => {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'matrix' | 'surcharges'>('catalog');

  // Modais
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingPriceData, setEditingPriceData] = useState<{
    service: ServiceCatalogItem;
    category: string;
    currentPrice?: ServicePrice;
  } | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form de Serviço
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    service_type: 'convencional' as 'convencional' | 'tecnica' | 'premium' | 'adicional',
    compatible_vehicle_type: 'all' as 'all' | 'car' | 'motorcycle',
    estimated_duration_minutes: 60,
    sort_order: 1,
    is_active: true,
    included_items: [] as string[],
  });
  const [newItemText, setNewItemText] = useState('');

  // Form de Preço
  const [priceForm, setPriceForm] = useState({
    price: 0,
    estimated_duration_minutes: 60,
    valid_from: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, cData, pData] = await Promise.all([
        dataService.getServices(),
        dataService.getVehicleCategories(),
        dataService.getServicePrices(),
      ]);
      setServices(sData);
      setCategories(cData);
      setPrices(pData);
    } catch (err) {
      console.error('Erro ao carregar catálogo de serviços:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Abrir Modal de Serviço (Novo)
  const handleOpenCreateService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      service_type: 'convencional',
      compatible_vehicle_type: 'all',
      estimated_duration_minutes: 60,
      sort_order: services.length + 1,
      is_active: true,
      included_items: [
        'Lavagem com shampoo automotivo pH neutro',
        'Limpeza detalhada das rodas e caixas de rodas',
        'Aspiração interna completa',
      ],
    });
    setNewItemText('');
    setIsServiceModalOpen(true);
  };

  // Abrir Modal de Serviço (Editar)
  const handleOpenEditService = (s: ServiceCatalogItem) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      description: s.description || '',
      service_type: s.service_type,
      compatible_vehicle_type: s.compatible_vehicle_type,
      estimated_duration_minutes: s.estimated_duration_minutes,
      sort_order: s.sort_order,
      is_active: s.is_active,
      included_items: s.included_items || [],
    });
    setNewItemText('');
    setIsServiceModalOpen(true);
  };

  const handleAddIncludedItem = () => {
    if (!newItemText.trim()) return;
    setServiceForm({
      ...serviceForm,
      included_items: [...serviceForm.included_items, newItemText.trim()],
    });
    setNewItemText('');
  };

  const handleRemoveIncludedItem = (index: number) => {
    const updated = [...serviceForm.included_items];
    updated.splice(index, 1);
    setServiceForm({ ...serviceForm, included_items: updated });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      showFeedback('error', 'O nome do serviço é obrigatório.');
      return;
    }

    try {
      if (editingService) {
        await dataService.saveService({
          id: editingService.id,
          ...serviceForm,
        });
        showFeedback('success', 'Serviço atualizado com sucesso!');
      } else {
        await dataService.saveService({
          ...serviceForm,
        });
        showFeedback('success', 'Novo serviço cadastrado no catálogo!');
      }
      setIsServiceModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar serviço.';
      showFeedback('error', msg);
    }
  };

  const handleToggleServiceStatus = async (s: ServiceCatalogItem) => {
    try {
      const newStatus = !s.is_active;
      await dataService.toggleServiceStatus(s.id, newStatus);
      showFeedback('success', `Serviço ${newStatus ? 'ativado' : 'inativado'} com sucesso!`);
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao alterar status do serviço.');
    }
  };

  // Preço por Categoria
  const handleOpenPriceModal = (service: ServiceCatalogItem, categoryName: string) => {
    const currentPrice = prices.find(
      (p) => p.service_id === service.id && p.commercial_category === categoryName && p.is_active
    );
    setEditingPriceData({
      service,
      category: categoryName,
      currentPrice,
    });
    setPriceForm({
      price: currentPrice ? currentPrice.price : 0,
      estimated_duration_minutes: currentPrice
        ? currentPrice.estimated_duration_minutes
        : service.estimated_duration_minutes,
      valid_from: new Date().toISOString().split('T')[0],
    });
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceData) return;
    if (priceForm.price < 0) {
      showFeedback('error', 'O preço não pode ser negativo.');
      return;
    }

    try {
      await dataService.saveServicePrice({
        service_id: editingPriceData.service.id,
        commercial_category: editingPriceData.category,
        price: Number(priceForm.price),
        estimated_duration_minutes: Number(priceForm.estimated_duration_minutes),
        valid_from: priceForm.valid_from,
        is_active: true,
      });
      showFeedback('success', 'Preço atualizado com sucesso na matriz!');
      setIsPriceModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar preço.';
      showFeedback('error', msg);
    }
  };

  // Organizar serviços por tipo
  const groupedServices = useMemo(() => {
    const mainServices = services.filter((s) => s.service_type !== 'adicional');
    const additionalServices = services.filter((s) => s.service_type === 'adicional');
    return { mainServices, additionalServices };
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Mensagem de Feedback */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Catálogo de Serviços</h1>
            <span className="rounded-full bg-blue-900/40 border border-blue-700/50 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              {services.length} serviços cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestão dos pacotes de lavagem, adicionais estéticos e matriz de preços por categoria de veículo.
          </p>
        </div>

        <button
          onClick={handleOpenCreateService}
          id="btn-new-service"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Serviço
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Catálogo & Pacotes Detalhados
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="h-4 w-4" />
          Matriz Oficial de Preços por Categoria
        </button>
        <button
          onClick={() => setActiveTab('surcharges')}
          className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'surcharges'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          Regras de Acréscimo por Condição
        </button>
      </div>

      {/* TAB 1: CATÁLOGO & PACOTES */}
      {activeTab === 'catalog' && (
        <div className="space-y-8">
          {/* Seção 1: Pacotes Principais de Lavagem */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Pacotes Principais de Lavagem</h2>
                <p className="text-xs text-slate-400">
                  Lavagens com preços indexados à categoria comercial do veículo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedServices.mainServices.map((service) => {
                const servicePrices = prices.filter((p) => p.service_id === service.id && p.is_active);
                return (
                  <div
                    key={service.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            service.service_type === 'premium'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                              : service.service_type === 'tecnica'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {service.service_type}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              service.is_active
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {service.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>

                      {/* Título & Duração */}
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 mb-3">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        <span>Estimativa: {service.estimated_duration_minutes} min</span>
                      </div>

                      {service.description && (
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                          {service.description}
                        </p>
                      )}

                      {/* Tabela de Preços por Categoria no Card */}
                      <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80 mb-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                          Valores por Categoria:
                        </span>
                        <div className="space-y-1.5">
                          {categories.map((cat) => {
                            const p = servicePrices.find((sp) => sp.commercial_category === cat.name);
                            return (
                              <div
                                key={cat.id}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <span className="text-slate-400">{cat.name}:</span>
                                {p ? (
                                  <span className="font-bold text-white font-mono">
                                    R$ {p.price.toFixed(2).replace('.', ',')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">
                                    Sob consulta
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Itens Inclusos */}
                      <div>
                        <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                          O que está incluso no pacote:
                        </span>
                        <ul className="space-y-1.5">
                          {service.included_items.map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-300 leading-tight"
                            >
                              <Check className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleServiceStatus(service)}
                        className={`text-xs font-semibold ${
                          service.is_active
                            ? 'text-slate-400 hover:text-rose-400'
                            : 'text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        {service.is_active ? 'Inativar' : 'Ativar'}
                      </button>

                      <button
                        onClick={() => handleOpenEditService(service)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar Serviço
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Serviços Adicionais e Especializados */}
          <div className="pt-4 border-t border-slate-800">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Serviços Adicionais Especializados</h2>
              <p className="text-xs text-slate-400">
                Procedimentos pontuais que podem ser contratados individualmente ou adicionados aos pacotes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupedServices.additionalServices.map((service) => {
                const servicePrices = prices.filter((p) => p.service_id === service.id && p.is_active);
                const firstPrice = servicePrices[0]?.price;

                return (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-md bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 text-xs font-bold uppercase text-amber-300">
                          Adicional
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-400" />
                          {service.estimated_duration_minutes} min
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-base mb-1">{service.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        {service.description}
                      </p>

                      <div className="mb-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Itens do Procedimento:
                        </span>
                        <ul className="space-y-1">
                          {service.included_items.map((item, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-300 flex items-start gap-1.5"
                            >
                              <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Preço Base</span>
                        <span className="text-base font-bold text-white font-mono">
                          {firstPrice !== undefined
                            ? `R$ ${firstPrice.toFixed(2).replace('.', ',')}`
                            : 'Sob Consulta'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenEditService(service)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ OFICIAL DE PREÇOS */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 p-4 flex items-start gap-3">
            <Coins className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-blue-300">
                Matriz de Preços Vigente — Clique em qualquer valor para editar
              </p>
              <p className="text-slate-400">
                Cada serviço possui valores e tempos de execução ajustados por porte veicular. Ao alterar
                um valor, um novo registro histórico é gerado preservando a integridade de agendamentos anteriores.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-4 w-72">Serviço</th>
                    <th className="py-4 px-4">Tipo</th>
                    {categories.map((cat) => (
                      <th key={cat.id} className="py-4 px-4 text-center">
                        <span className="block text-white font-bold">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 lowercase font-normal">
                          (Preço / Duração)
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {services.map((service) => {
                    return (
                      <tr key={service.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>
                            <span>{service.name}</span>
                            <span className="block text-[11px] text-slate-400 font-normal">
                              Padrão: {service.estimated_duration_minutes} min
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                              service.service_type === 'premium'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                : service.service_type === 'tecnica'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                : service.service_type === 'convencional'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            }`}
                          >
                            {service.service_type}
                          </span>
                        </td>

                        {categories.map((cat) => {
                          const priceRecord = prices.find(
                            (p) =>
                              p.service_id === service.id &&
                              p.commercial_category === cat.name &&
                              p.is_active
                          );

                          return (
                            <td key={cat.id} className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleOpenPriceModal(service, cat.name)}
                                className="inline-flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500 hover:bg-blue-950/30 transition-all group w-28"
                                title="Clique para editar valor e duração"
                              >
                                {priceRecord ? (
                                  <>
                                    <span className="font-bold text-white font-mono text-sm group-hover:text-blue-400">
                                      R$ {priceRecord.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {priceRecord.estimated_duration_minutes} min
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400 italic group-hover:text-blue-400">
                                    + Definir
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGRAS DE ACRÉSCIMO POR CONDIÇÃO DO VEÍCULO */}
      {activeTab === 'surcharges' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-bold text-white mb-2">
              Política de Acréscimo por Condição Inicial do Veículo
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Na Garage Car, o preço base de qualquer pacote contempla veículos em estado padrão de uso.
              Caso o veículo apresente barro denso, contaminação severa, pelos intensos ou lama de estrada,
              o acréscimo proporcional é aplicado sobre o valor base do serviço.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Nível 1 • Normal
                </span>
                <div className="text-2xl font-black text-white mb-2">0%</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Poeira comum de cidade, sujeira leve e uso urbano regular. Nenhum valor adicional é aplicado.
                </p>
              </div>

              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">
                  Nível 2 • Acima do Normal
                </span>
                <div className="text-2xl font-black text-white mb-2">+15% a +25%</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Presença moderada de areia, pelos de pet ou poeira acumulada de várias semanas.
                </p>
              </div>

              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Nível 3 • Sujeira Pesada
                </span>
                <div className="text-2xl font-black text-white mb-2">+30% a +50%</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Camada de barro, terra seca em caixas de rodas, bancos manchados com resíduos ou uso rural intenso.
                </p>
              </div>

              <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-1">
                  Nível 4 • Extrema
                </span>
                <div className="text-2xl font-black text-white mb-2">Sob Avaliação</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Veículo alagado, manchas de tinta, piche espalhado ou contaminação química industrial severa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição de Serviço */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço no Catálogo'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina dados gerais, compatibilidade e a lista de itens inclusos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-5 space-y-4">
              {/* Nome do Serviço */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="Ex: Lavagem Técnica Detalhada"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição Comercial
                </label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Ex: Lavagem com proteção hidrofóbica com durabilidade de até 3 meses."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Tipo e Compatibilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tipo de Serviço
                  </label>
                  <select
                    value={serviceForm.service_type}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        service_type: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="convencional">Convencional</option>
                    <option value="tecnica">Técnica</option>
                    <option value="premium">Premium</option>
                    <option value="adicional">Adicional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Veículos Compatíveis
                  </label>
                  <select
                    value={serviceForm.compatible_vehicle_type}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        compatible_vehicle_type: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos (Carros e Motos)</option>
                    <option value="car">Exclusivo para Carros</option>
                    <option value="motorcycle">Exclusivo para Motos</option>
                  </select>
                </div>
              </div>

              {/* Duração Estimada */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duração Estimada Padrão (Minutos)
                </label>
                <input
                  type="number"
                  min="10"
                  max="480"
                  value={serviceForm.estimated_duration_minutes}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      estimated_duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Gerenciador de Itens Inclusos */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Itens Inclusos no Pacote ({serviceForm.included_items.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIncludedItem();
                      }
                    }}
                    placeholder="Adicionar novo item incluso..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddIncludedItem}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {serviceForm.included_items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300"
                    >
                      <span className="truncate mr-2">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncludedItem(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.is_active}
                    onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-300">
                    Serviço ativo para agendamento
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
                >
                  {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Atualização de Preço por Categoria */}
      {isPriceModalOpen && editingPriceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Editar Preço do Serviço</h2>
                <p className="text-xs text-slate-400">
                  {editingPriceData.service.name} • Categoria: {editingPriceData.category}
                </p>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Preço Vigente (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duração Estimada para Esta Categoria (Minutos)
                </label>
                <input
                  type="number"
                  min="10"
                  max="480"
                  required
                  value={priceForm.estimated_duration_minutes}
                  onChange={(e) =>
                    setPriceForm({
                      ...priceForm,
                      estimated_duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Data de Início de Vigência
                </label>
                <input
                  type="date"
                  required
                  value={priceForm.valid_from}
                  onChange={(e) => setPriceForm({ ...priceForm, valid_from: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20"
                >
                  Confirmar Novo Preço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
