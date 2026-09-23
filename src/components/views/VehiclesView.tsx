import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Tag,
  Settings,
  User,
  Info,
} from 'lucide-react';
import { Vehicle, VehicleCategory, Client } from '../../types';
import { dataService } from '../../services/dataService';

interface VehiclesViewProps {
  initialClientId?: string;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ initialClientId }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>(initialClientId || 'all');

  // Modais
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form de Veículo
  const [vehicleForm, setVehicleForm] = useState({
    client_id: initialClientId || '',
    type: 'car' as 'car' | 'motorcycle',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    plate: '',
    commercial_category: 'Carro / Compacto',
    category_id: '',
    notes: '',
    is_active: true,
  });

  // Form de Categoria
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 1,
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, cData, catData] = await Promise.all([
        dataService.getVehicles(),
        dataService.getClients(),
        dataService.getVehicleCategories(),
      ]);
      setVehicles(vData);
      setClients(cData);
      setCategories(catData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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

  // Abrir Modal de Veículo (Criar)
  const handleOpenCreateVehicle = () => {
    setEditingVehicle(null);
    const defaultCat = categories.find((c) => c.is_active)?.name || 'Carro / Compacto';
    const defaultCatObj = categories.find((c) => c.name === defaultCat);
    setVehicleForm({
      client_id: selectedClientFilter !== 'all' ? selectedClientFilter : (clients[0]?.id || ''),
      type: 'car',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      plate: '',
      commercial_category: defaultCat,
      category_id: defaultCatObj?.id || '',
      notes: '',
      is_active: true,
    });
    setIsVehicleModalOpen(true);
  };

  // Abrir Modal de Veículo (Editar)
  const handleOpenEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleForm({
      client_id: v.client_id,
      type: v.type,
      brand: v.brand,
      model: v.model,
      year: v.year || new Date().getFullYear(),
      color: v.color || '',
      plate: v.plate || '',
      commercial_category: v.commercial_category,
      category_id: v.category_id || '',
      notes: v.notes || '',
      is_active: v.is_active,
    });
    setIsVehicleModalOpen(true);
  };

  // Salvar Veículo
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.client_id) {
      showFeedback('error', 'Selecione o cliente proprietário do veículo.');
      return;
    }
    if (!vehicleForm.brand.trim() || !vehicleForm.model.trim()) {
      showFeedback('error', 'Marca e modelo do veículo são obrigatórios.');
      return;
    }

    try {
      if (editingVehicle) {
        await dataService.saveVehicle({
          id: editingVehicle.id,
          ...vehicleForm,
        });
        showFeedback('success', 'Veículo atualizado com sucesso!');
      } else {
        await dataService.saveVehicle({
          ...vehicleForm,
        });
        showFeedback('success', 'Veículo cadastrado com sucesso!');
      }
      setIsVehicleModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar veículo.';
      showFeedback('error', msg);
    }
  };

  // Alterar Status do Veículo
  const handleToggleVehicleStatus = async (v: Vehicle) => {
    try {
      const newStatus = !v.is_active;
      await dataService.toggleVehicleStatus(v.id, newStatus);
      showFeedback('success', `Veículo ${newStatus ? 'ativado' : 'inativado'} com sucesso!`);
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao alterar status do veículo.');
    }
  };

  // Excluir Veículo
  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!window.confirm(`Deseja realmente excluir o veículo ${v.brand} ${v.model}?`)) {
      return;
    }
    try {
      await dataService.deleteVehicle(v.id);
      showFeedback('success', 'Veículo excluído com sucesso.');
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao excluir veículo.');
    }
  };

  // Abrir Modal de Categorias
  const handleOpenCategoriesModal = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      sort_order: categories.length + 1,
      is_active: true,
    });
    setIsCategoriesModalOpen(true);
  };

  // Salvar Categoria Comercial
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showFeedback('error', 'O nome da categoria é obrigatório.');
      return;
    }

    try {
      if (editingCategory) {
        await dataService.saveVehicleCategory({
          id: editingCategory.id,
          ...categoryForm,
        });
        showFeedback('success', 'Categoria atualizada com sucesso!');
      } else {
        await dataService.saveVehicleCategory({
          ...categoryForm,
        });
        showFeedback('success', 'Categoria criada com sucesso!');
      }
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sort_order: categories.length + 2, is_active: true });
      const updatedCats = await dataService.getVehicleCategories();
      setCategories(updatedCats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria.';
      showFeedback('error', msg);
    }
  };

  // Excluir Categoria Comercial
  const handleDeleteCategory = async (cat: VehicleCategory) => {
    if (!window.confirm(`Deseja excluir a categoria "${cat.name}"?`)) return;

    const result = await dataService.deleteVehicleCategory(cat.id);
    if (!result.success) {
      showFeedback('error', result.error || 'Não foi possível excluir a categoria.');
    } else {
      showFeedback('success', 'Categoria excluída com sucesso.');
      const updatedCats = await dataService.getVehicleCategories();
      setCategories(updatedCats);
    }
  };

  // Lista filtrada de veículos
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const clientName = v.client?.name || '';
      const matchesSearch =
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.plate && v.plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || v.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || v.commercial_category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && v.is_active) ||
        (statusFilter === 'inactive' && !v.is_active);
      const matchesClient = selectedClientFilter === 'all' || v.client_id === selectedClientFilter;

      return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesClient;
    });
  }, [vehicles, searchTerm, typeFilter, categoryFilter, statusFilter, selectedClientFilter]);

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Veículos</h1>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {vehicles.length} registrados
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Cadastro de carros e motos associados a clientes com categorização comercial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCategoriesModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
          >
            <Tag className="h-4 w-4 text-blue-600" />
            Categorias Comerciais ({categories.length})
          </button>

          <button
            onClick={handleOpenCreateVehicle}
            id="btn-new-vehicle"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Veículo
          </button>
        </div>
      </div>

      {/* Card Informativo de Regras: Placa Opcional e Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-blue-900">Placa Opcional:</span> A placa do veículo é
            estritamente opcional. Veículos 0km ou sem identificação veicular podem ser cadastrados sem placa.
          </div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3 flex items-start gap-2.5">
          <Tag className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-purple-900">Categorias Comerciais:</span> O preço dos
            serviços de lavagem técnica, convencional e premium é indexado automaticamente pela categoria do veículo.
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar marca, modelo, placa ou cliente..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Filtro por Cliente */}
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                Cliente: {c.name}
              </option>
            ))}
          </select>

          {/* Filtro por Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'car' | 'motorcycle')}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="car">Carros</option>
            <option value="motorcycle">Motos</option>
          </select>

          {/* Filtro por Categoria Comercial */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Filtro por Status */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Veículos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-sm">Carregando lista de veículos...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhum veículo encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Nenhum veículo corresponde aos filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Veículo (Marca / Modelo)</th>
                  <th className="py-3.5 px-4">Cliente Proprietário</th>
                  <th className="py-3.5 px-4">Categoria Comercial</th>
                  <th className="py-3.5 px-4">Placa</th>
                  <th className="py-3.5 px-4">Ano / Cor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVehicles.map((vehicle) => {
                  return (
                    <tr key={vehicle.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold ${
                              vehicle.type === 'motorcycle'
                                ? 'bg-amber-950/60 border-amber-800/40 text-amber-400'
                                : 'bg-blue-950/60 border-blue-800/40 text-blue-400'
                            }`}
                          >
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>
                                {vehicle.brand} {vehicle.model}
                              </span>
                              {vehicle.type === 'motorcycle' && (
                                <span className="rounded-sm bg-amber-900/40 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300 border border-amber-800/40">
                                  Moto
                                </span>
                              )}
                            </div>
                            {vehicle.notes && (
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {vehicle.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{vehicle.client?.name || 'Cliente não identificado'}</span>
                        </div>
                        {vehicle.client?.phone && (
                          <span className="text-[11px] text-slate-500 ml-5 block">
                            {vehicle.client.phone}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 text-xs font-medium text-purple-300">
                          <Tag className="h-3 w-3 text-purple-400" />
                          {vehicle.commercial_category}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {vehicle.plate ? (
                          <span className="rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1 font-mono text-xs font-bold text-slate-200 shadow-xs">
                            {vehicle.plate}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            (Sem placa cadastrada)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-400">
                        <span>{vehicle.year || '-'}</span>
                        {vehicle.color && <span> • {vehicle.color}</span>}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            vehicle.is_active
                              ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                              : 'bg-rose-950/60 border border-rose-800/80 text-rose-400'
                          }`}
                        >
                          {vehicle.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditVehicle(vehicle)}
                            title="Editar veículo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleVehicleStatus(vehicle)}
                            title={vehicle.is_active ? 'Inativar veículo' : 'Ativar veículo'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              vehicle.is_active
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                          >
                            {vehicle.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
                            title="Excluir veículo"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Veículo */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Vincule o veículo ao cliente e selecione sua categoria comercial.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="mt-5 space-y-4">
              {/* Cliente Proprietário */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Cliente Proprietário *
                </label>
                <select
                  required
                  value={vehicleForm.client_id}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, client_id: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Veículo */}
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    vehicleForm.type === 'car'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicle_type"
                    checked={vehicleForm.type === 'car'}
                    onChange={() =>
                      setVehicleForm({
                        ...vehicleForm,
                        type: 'car',
                        commercial_category: 'Carro / Compacto',
                      })
                    }
                    className="sr-only"
                  />
                  <Car className="h-4 w-4" />
                  <span className="text-xs">Carro</span>
                </label>

                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    vehicleForm.type === 'motorcycle'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicle_type"
                    checked={vehicleForm.type === 'motorcycle'}
                    onChange={() =>
                      setVehicleForm({
                        ...vehicleForm,
                        type: 'motorcycle',
                        commercial_category: 'Moto',
                      })
                    }
                    className="sr-only"
                  />
                  <Car className="h-4 w-4" />
                  <span className="text-xs">Moto</span>
                </label>
              </div>

              {/* Marca e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    placeholder="Ex: Honda, Toyota, BMW"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    placeholder="Ex: Civic Touring, Hilux, F 850 GS"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Categoria Comercial e Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria Comercial *
                  </label>
                  <select
                    required
                    value={vehicleForm.commercial_category}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const catObj = categories.find((c) => c.name === selectedName);
                      setVehicleForm({
                        ...vehicleForm,
                        commercial_category: selectedName,
                        category_id: catObj?.id || '',
                      });
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {categories
                      .filter((c) => c.is_active)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Placa</span>
                    <span className="text-[10px] text-blue-400 font-normal normal-case">
                      (Opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.plate}
                    onChange={(e) =>
                      setVehicleForm({
                        ...vehicleForm,
                        plate: e.target.value.toUpperCase().trim(),
                      })
                    }
                    placeholder="Ex: ABC1D23"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Ano e Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Ano de Fabricação / Modelo
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2035"
                    value={vehicleForm.year}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value) || 2024 })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Cor do Veículo
                  </label>
                  <input
                    type="text"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    placeholder="Ex: Preto Perolizado, Branco Polar"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observações Especiais
                </label>
                <textarea
                  rows={2}
                  value={vehicleForm.notes}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                  placeholder="Ex: Cuidado com detalhes em black piano. Possui proteção cerâmica prévia."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.is_active}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-300">
                    Veículo ativo para agendamentos
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
                >
                  {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Categorias Comerciais de Veículos */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Categorias Comerciais de Veículos
                  </h2>
                  <p className="text-xs text-slate-400">
                    Define as classes de veículos que determinam os preços dos pacotes de serviço.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoriesModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário de Categoria */}
            <form onSubmit={handleSaveCategory} className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                {editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Ex: Caminhonete Grande / Van"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Descrição Breve
                  </label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    placeholder="Ex: Picapes full-size e vans de passageiros"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, is_active: e.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded-sm border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-slate-300">Ativa para uso comercial</span>
                </label>
                <div className="flex items-center gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', description: '', sort_order: categories.length + 1, is_active: true });
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-sm"
                  >
                    {editingCategory ? 'Salvar Categoria' : 'Adicionar Categoria'}
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de Categorias Existentes */}
            <div className="mt-5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categorias Atuais ({categories.length})
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const vehiclesWithCat = vehicles.filter(
                    (v) => v.commercial_category === cat.name || v.category_id === cat.id
                  );
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{cat.name}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                              cat.is_active
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {cat.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({vehiclesWithCat.length} veículos vinculados)
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryForm({
                              name: cat.name,
                              description: cat.description || '',
                              sort_order: cat.sort_order,
                              is_active: cat.is_active,
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800"
                          title="Editar categoria"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end mt-6">
              <button
                onClick={() => setIsCategoriesModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
