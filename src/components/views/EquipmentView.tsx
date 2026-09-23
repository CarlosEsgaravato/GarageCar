import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Tag,
  Info,
  DollarSign,
  Briefcase,
  ShieldCheck,
  RotateCw,
  Clock,
  Archive,
  Trash2,
} from 'lucide-react';
import { Equipment, EquipmentCategory, EquipmentStatus } from '../../types';
import { dataService } from '../../services/dataService';

export const EquipmentView: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fundingFilter, setFundingFilter] = useState<string>('all');

  // Modais
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form de Equipamento
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    brand: '',
    model: '',
    category_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    funding_source: 'company_cash' as 'company_cash' | 'owner_contribution',
    status: 'active' as EquipmentStatus,
    notes: '',
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
      const [eData, cData] = await Promise.all([
        dataService.getEquipment(),
        dataService.getEquipmentCategories(),
      ]);
      setEquipmentList(eData);
      setCategories(cData);
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err);
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

  // Formatação segura de data YYYY-MM-DD sem deslocamento de fuso horário
  const formatAcquisitionDate = (dateStr?: string): string => {
    if (!dateStr) return 'Data não informada';
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return cleanDate;
  };

  // Abrir Modal de Equipamento (Criar) - Padrão: Primeira Categoria Ativa
  const handleOpenCreateEquipment = () => {
    setEditingEquipment(null);
    const firstActiveCategory = categories.find((c) => c.is_active);
    setEquipmentForm({
      name: '',
      brand: '',
      model: '',
      category_id: firstActiveCategory ? firstActiveCategory.id : (categories[0]?.id || ''),
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 0,
      funding_source: 'company_cash',
      status: 'active',
      notes: '',
    });
    setIsEquipmentModalOpen(true);
  };

  // Abrir Modal de Equipamento (Editar)
  const handleOpenEditEquipment = (item: Equipment) => {
    setEditingEquipment(item);
    setEquipmentForm({
      name: item.name,
      brand: item.brand || '',
      model: item.model || '',
      category_id: item.category_id || '',
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      purchase_price: item.purchase_price || 0,
      funding_source: item.funding_source || 'company_cash',
      status: item.status,
      notes: item.notes || '',
    });
    setIsEquipmentModalOpen(true);
  };

  // Salvar Equipamento
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForm.name.trim()) {
      showFeedback('error', 'O nome do equipamento é obrigatório.');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === equipmentForm.category_id);
    const categoryName = selectedCategory ? selectedCategory.name : 'Geral';

    try {
      if (editingEquipment) {
        // Edição: Preserva campos financeiros históricos (somente leitura)
        await dataService.saveEquipment({
          id: editingEquipment.id,
          name: equipmentForm.name.trim(),
          brand: equipmentForm.brand.trim(),
          model: equipmentForm.model.trim(),
          category_id: equipmentForm.category_id,
          category: categoryName,
          status: equipmentForm.status,
          notes: equipmentForm.notes.trim(),
          purchase_price: editingEquipment.purchase_price,
          purchase_date: editingEquipment.purchase_date,
          funding_source: editingEquipment.funding_source,
        });
        showFeedback('success', 'Equipamento atualizado com sucesso!');
      } else {
        // Criação: Dispara integração financeira automática
        await dataService.saveEquipment({
          name: equipmentForm.name.trim(),
          brand: equipmentForm.brand.trim(),
          model: equipmentForm.model.trim(),
          category_id: equipmentForm.category_id,
          category: categoryName,
          purchase_date: equipmentForm.purchase_date,
          purchase_price: Number(equipmentForm.purchase_price || 0),
          funding_source: equipmentForm.funding_source,
          status: equipmentForm.status,
          notes: equipmentForm.notes.trim(),
        });
        showFeedback('success', 'Equipamento cadastrado com sucesso!');
      }
      setIsEquipmentModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar equipamento.';
      showFeedback('error', msg);
    }
  };

  // Mudar Status do Equipamento
  const handleChangeStatus = async (item: Equipment, newStatus: EquipmentStatus) => {
    try {
      await dataService.updateEquipmentStatus(item.id, newStatus);
      showFeedback('success', `Status alterado para "${newStatus}".`);
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao alterar status.');
    }
  };

  // Baixa do Equipamento (Preserva histórico sem exclusão física)
  const handleRetireEquipment = async (item: Equipment) => {
    if (
      !window.confirm(
        `Deseja dar baixa no equipamento "${item.name}"? O status será alterado para "Baixado" e seu histórico financeiro e operacional continuará integralmente preservado.`
      )
    ) {
      return;
    }
    await handleChangeStatus(item, 'retired');
  };

  // Reativação explícita de Equipamento Baixado
  const handleReactivateEquipment = async (item: Equipment) => {
    if (
      !window.confirm(
        `Deseja reativar o equipamento "${item.name}" para a operação ativa?`
      )
    ) {
      return;
    }
    await handleChangeStatus(item, 'active');
  };

  // Gestão de Categorias
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showFeedback('error', 'O nome da categoria é obrigatório.');
      return;
    }

    try {
      if (editingCategory) {
        await dataService.saveEquipmentCategory({
          id: editingCategory.id,
          ...categoryForm,
        });
        showFeedback('success', 'Categoria atualizada com sucesso!');
      } else {
        await dataService.saveEquipmentCategory({
          ...categoryForm,
        });
        showFeedback('success', 'Categoria cadastrada com sucesso!');
      }
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sort_order: categories.length + 2, is_active: true });
      const updatedCats = await dataService.getEquipmentCategories();
      setCategories(updatedCats);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria.';
      showFeedback('error', msg);
    }
  };

  const handleDeleteCategory = async (cat: EquipmentCategory) => {
    if (!window.confirm(`Deseja excluir a categoria "${cat.name}"?`)) return;
    const result = await dataService.deleteEquipmentCategory(cat.id);
    if (!result.success) {
      showFeedback('error', result.error || 'Não foi possível excluir a categoria.');
    } else {
      showFeedback('success', 'Categoria excluída com sucesso.');
      const updatedCats = await dataService.getEquipmentCategories();
      setCategories(updatedCats);
      await loadData();
    }
  };

  // Métricas
  const stats = useMemo(() => {
    const total = equipmentList.length;
    const active = equipmentList.filter((e) => e.status === 'active').length;
    const maintenance = equipmentList.filter((e) => e.status === 'maintenance').length;
    const ownerInvested = equipmentList
      .filter((e) => e.funding_source === 'owner_contribution')
      .reduce((acc, curr) => acc + (curr.purchase_price || 0), 0);
    const companyInvested = equipmentList
      .filter((e) => e.funding_source === 'company_cash')
      .reduce((acc, curr) => acc + (curr.purchase_price || 0), 0);

    return { total, active, maintenance, ownerInvested, companyInvested };
  }, [equipmentList]);

  // Filtragem
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      const categoryName =
        typeof item.category === 'string'
          ? item.category
          : (item.category as any)?.name || '';

      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (categoryName && categoryName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategoryFilter === 'all' ||
        item.category_id === selectedCategoryFilter ||
        (categoryName.toLowerCase() ===
          (categories.find((c) => c.id === selectedCategoryFilter)?.name || '').toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const matchesFunding =
        fundingFilter === 'all' || item.funding_source === fundingFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesFunding;
    });
  }, [equipmentList, searchTerm, selectedCategoryFilter, categories, statusFilter, fundingFilter]);

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Equipamentos e Ferramentas</h1>
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {equipmentList.length} cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Controle de máquinas, lavadoras de alta pressão, extratoras e ferramentas operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCategoriesModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
          >
            <Tag className="h-4 w-4 text-purple-600" />
            Categorias ({categories.length})
          </button>

          <button
            onClick={handleOpenCreateEquipment}
            id="btn-new-equipment"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Equipamento
          </button>
        </div>
      </div>

      {/* Métricas e Regra de Negócio: Origem do Recurso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-300">Total em Operação</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.active} ativos</div>
          <span className="text-xs text-slate-400 mt-1 block">
            {stats.maintenance} em manutenção técnica
          </span>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-purple-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-purple-200">
              Investimento do Proprietário
            </span>
            <Briefcase className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            R$ {stats.ownerInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-purple-300 mt-1 block">
            Aporte pessoal • Não consome caixa operacional
          </span>
        </div>

        <div className="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-blue-200">
              Caixa da Garage Car
            </span>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            R$ {stats.companyInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-blue-300 mt-1 block">
            Adquirido com recursos da empresa
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
            <Info className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Regra de Contabilização</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Equipamentos adquiridos pelo proprietário geram patrimônio sem subtrair do caixa ou lucro operacional da empresa.
          </p>
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
            placeholder="Buscar nome, modelo, marca ou categoria..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Categoria */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Origem do Recurso */}
          <select
            value={fundingFilter}
            onChange={(e) => setFundingFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todas as Origens</option>
            <option value="company_cash">Caixa da Garage Car</option>
            <option value="owner_contribution">Investimento do Proprietário</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="maintenance">Em Manutenção</option>
            <option value="retired">Baixado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Equipamentos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-sm">Carregando equipamentos...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhum equipamento encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Nenhum item corresponde aos critérios de pesquisa e filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Equipamento (Marca / Modelo)</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Origem do Recurso</th>
                  <th className="py-3.5 px-4">Valor & Data de Aquisição</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEquipment.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
                            <Wrench className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{item.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{item.brand || 'Sem marca'}</span>
                              {item.model && <span>• Mod: {item.model}</span>}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 text-xs font-medium text-purple-300">
                          <Tag className="h-3 w-3 text-purple-400" />
                          {typeof item.category === 'string'
                            ? item.category
                            : (item.category as any)?.name || 'Sem Categoria'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {item.funding_source === 'owner_contribution' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-900/40 border border-purple-700/60 px-2.5 py-1 text-xs font-semibold text-purple-300">
                            <Briefcase className="h-3.5 w-3.5 text-purple-400" />
                            Investimento Proprietário
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-900/40 border border-blue-700/60 px-2.5 py-1 text-xs font-semibold text-blue-300">
                            <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                            Caixa Garage Car
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="font-mono font-bold text-white">
                          R${' '}
                          {(item.purchase_price || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {formatAcquisitionDate(item.purchase_date)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'active'
                              ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                              : item.status === 'maintenance'
                              ? 'bg-amber-950/60 border border-amber-800/80 text-amber-400'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}
                        >
                          {item.status === 'active'
                            ? 'Ativo'
                            : item.status === 'maintenance'
                            ? 'Em Manutenção'
                            : 'Baixado'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Alternar Status rápido: active <-> maintenance */}
                          {item.status !== 'retired' ? (
                            <button
                              onClick={() =>
                                handleChangeStatus(
                                  item,
                                  item.status === 'active' ? 'maintenance' : 'active'
                                )
                              }
                              title={
                                item.status === 'active'
                                  ? 'Colocar em manutenção técnica'
                                  : 'Marcar como ativo na operação'
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            >
                              <RotateCw className="h-4 w-4" />
                            </button>
                          ) : (
                            /* Reativação explícita para equipamento baixado */
                            <button
                              onClick={() => handleReactivateEquipment(item)}
                              title="Reativar equipamento na operação"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                            >
                              <RotateCw className="h-4 w-4 text-emerald-400" />
                            </button>
                          )}

                          {/* Editar Equipamento */}
                          <button
                            onClick={() => handleOpenEditEquipment(item)}
                            title="Editar equipamento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Baixa / Desativação sem exclusão física (Preserva histórico) */}
                          {item.status !== 'retired' && (
                            <button
                              onClick={() => handleRetireEquipment(item)}
                              title="Dar baixa no equipamento (Preserva histórico)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
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

      {/* Modal de Cadastro / Edição de Equipamento */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defina dados técnicos, origem financeira e status do equipamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="mt-5 space-y-4">
              {/* Aviso quando em edição de equipamento */}
              {editingEquipment && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Dados financeiros de aquisição (origem, valor e data) são bloqueados para edição direta a fim de preservar a consistência e integridade do histórico financeiro.
                  </span>
                </div>
              )}

              {/* Nome do Equipamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do Equipamento / Ferramenta *
                </label>
                <input
                  type="text"
                  required
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  placeholder="Ex: Lavadora de Alta Pressão Profissional"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Marca e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marca / Fabricante
                  </label>
                  <input
                    type="text"
                    value={equipmentForm.brand}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, brand: e.target.value })}
                    placeholder="Ex: Kärcher, IPC Soteco, Rupes"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Modelo Técnico
                  </label>
                  <input
                    type="text"
                    value={equipmentForm.model}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                    placeholder="Ex: HD 585 Prof S, Lavor Pro"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Categoria e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria *
                  </label>
                  <select
                    required
                    value={equipmentForm.category_id}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, category_id: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a categoria...</option>
                    {categories
                      .filter((c) => c.is_active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status Operacional
                  </label>
                  <select
                    value={equipmentForm.status}
                    onChange={(e) =>
                      setEquipmentForm({
                        ...equipmentForm,
                        status: e.target.value as EquipmentStatus,
                      })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">Ativo (Em Operação)</option>
                    <option value="maintenance">Em Manutenção Técnica</option>
                    <option value="retired">Baixado / Desativado</option>
                  </select>
                </div>
              </div>

              {/* Origem do Recurso (Crucial Business Rule) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Origem do Recurso Financeiro *</span>
                  {editingEquipment && (
                    <span className="text-[11px] text-amber-400 font-normal lowercase">
                      (bloqueado na edição)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                      editingEquipment ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                    } ${
                      equipmentForm.funding_source === 'company_cash'
                        ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="funding_source"
                      disabled={!!editingEquipment}
                      checked={equipmentForm.funding_source === 'company_cash'}
                      onChange={() =>
                        setEquipmentForm({ ...equipmentForm, funding_source: 'company_cash' })
                      }
                      className="sr-only"
                    />
                    <DollarSign className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Caixa da Garage Car</div>
                      <div className="text-[10px] text-slate-400">
                        Custeado pela receita da empresa
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                      editingEquipment ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                    } ${
                      equipmentForm.funding_source === 'owner_contribution'
                        ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="funding_source"
                      disabled={!!editingEquipment}
                      checked={equipmentForm.funding_source === 'owner_contribution'}
                      onChange={() =>
                        setEquipmentForm({
                          ...equipmentForm,
                          funding_source: 'owner_contribution',
                        })
                      }
                      className="sr-only"
                    />
                    <Briefcase className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Investimento Proprietário</div>
                      <div className="text-[10px] text-slate-400">
                        Aporte pessoal (não debita do caixa)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Valor de Compra e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Valor de Aquisição (R$)</span>
                    {editingEquipment && (
                      <span className="text-[11px] text-amber-400 font-normal lowercase">
                        (somente leitura)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!!editingEquipment}
                    readOnly={!!editingEquipment}
                    value={equipmentForm.purchase_price}
                    onChange={(e) =>
                      setEquipmentForm({
                        ...equipmentForm,
                        purchase_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0,00"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono focus:outline-none ${
                      editingEquipment
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Data de Aquisição</span>
                    {editingEquipment && (
                      <span className="text-[11px] text-amber-400 font-normal lowercase">
                        (somente leitura)
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    disabled={!!editingEquipment}
                    readOnly={!!editingEquipment}
                    value={equipmentForm.purchase_date}
                    onChange={(e) =>
                      setEquipmentForm({ ...equipmentForm, purchase_date: e.target.value })
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${
                      editingEquipment
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observações de Manutenção ou Garantia
                </label>
                <textarea
                  rows={2}
                  value={equipmentForm.notes}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })}
                  placeholder="Ex: Revisão periódica recomendada a cada 6 meses. Troca de óleo da bomba realizada em Jan/2025."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEquipmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
                >
                  {editingEquipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Categorias de Equipamentos */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Categorias de Equipamentos</h2>
                  <p className="text-xs text-slate-400">
                    Classificação patrimonial do maquinário e ferramentas.
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

            {/* Form de Categoria */}
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
                    placeholder="Ex: Canhões de Espuma & Snow Foam"
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
                    placeholder="Ex: Pulverizadores de shampoo e aplicadores de espuma"
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
                  <span className="text-xs text-slate-300">Ativa para uso</span>
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

            {/* Lista de Categorias */}
            <div className="mt-5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categorias Cadastradas ({categories.length})
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => {
                  const linkedEquipment = equipmentList.filter((e) => e.category_id === cat.id);
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
                            ({linkedEquipment.length} equipamentos cadastrados)
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
