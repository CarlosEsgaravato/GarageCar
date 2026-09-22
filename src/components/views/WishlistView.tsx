import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookmarkPlus,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  AlertTriangle,
  Clock,
  DollarSign,
  Info,
  Package,
  Wrench,
  ArrowUpDown,
  Check,
  X,
  RefreshCw,
  Tag,
  FileText,
  ShoppingBag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { WishlistItem, WishlistPriority, WishlistStatus } from '../../types';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface WishlistViewProps {
  onNavigateToEquipment?: () => void;
  onNavigateToBatches?: () => void;
}

type SortOption = 'priority_pending' | 'value_desc' | 'value_asc' | 'name_asc' | 'date_desc';

const PRIORITY_ORDER: Record<WishlistPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const STATUS_ORDER: Record<WishlistStatus, number> = {
  planned: 1,
  purchased: 2,
  cancelled: 3,
};

const COMMON_CATEGORIES = [
  'Equipamento',
  'Produto / Insumo',
  'Ferramenta',
  'Acessório',
  'Melhoria da Oficina',
  'Outros',
];

export const WishlistView: React.FC<WishlistViewProps> = ({
  onNavigateToEquipment,
  onNavigateToBatches,
}) => {
  const { isDemoMode, isConfigured } = useAuth();

  // Estados de dados
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Estados de filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WishlistStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | WishlistPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('priority_pending');

  // Estados do modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Equipamento',
    estimated_price: '',
    priority: 'medium' as WishlistPriority,
    status: 'planned' as WishlistStatus,
    notes: '',
  });

  // Modal informativo para guiar a compra real (sem duplicar ou disparar transação oculta)
  const [acquisitionGuideItem, setAcquisitionGuideItem] = useState<WishlistItem | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage((current) => (current?.text === text ? null : current));
    }, 5000);
  };

  // Carregar dados reais do Supabase (com fallback)
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await dataService.getWishlist();
      setItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de desejos';
      showFeedback('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lista dinâmica de categorias detectadas nos itens
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    COMMON_CATEGORIES.forEach((c) => cats.add(c));
    items.forEach((item) => {
      if (item.category?.trim()) cats.add(item.category.trim());
    });
    return Array.from(cats);
  }, [items]);

  // Indicadores Reais
  const stats = useMemo(() => {
    const plannedItems = items.filter((i) => i.status === 'planned');
    const highPriorityCount = plannedItems.filter((i) => i.priority === 'high').length;
    const pendingTotalValue = plannedItems.reduce(
      (sum, i) => sum + Number(i.estimated_price || 0),
      0
    );
    const purchasedCount = items.filter((i) => i.status === 'purchased').length;
    const cancelledCount = items.filter((i) => i.status === 'cancelled').length;

    return {
      pendingCount: plannedItems.length,
      highPriorityCount,
      pendingTotalValue,
      purchasedCount,
      cancelledCount,
      totalCount: items.length,
    };
  }, [items]);

  // Filtros e ordenação
  const filteredAndSortedItems = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();

    return items
      .filter((item) => {
        const matchesSearch =
          !lowerSearch ||
          item.name.toLowerCase().includes(lowerSearch) ||
          item.category.toLowerCase().includes(lowerSearch) ||
          (item.notes && item.notes.toLowerCase().includes(lowerSearch));

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
        const matchesCategory =
          categoryFilter === 'all' ||
          item.category.toLowerCase() === categoryFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        if (sortOption === 'priority_pending') {
          // 1. Status: planned (1) primeiro, depois purchased (2), depois cancelled (3)
          const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (statusDiff !== 0) return statusDiff;

          // 2. Prioridade: high (3) > medium (2) > low (1)
          const prioDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (prioDiff !== 0) return prioDiff;

          // 3. Mais recente
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        if (sortOption === 'value_desc') {
          return Number(b.estimated_price || 0) - Number(a.estimated_price || 0);
        }

        if (sortOption === 'value_asc') {
          return Number(a.estimated_price || 0) - Number(b.estimated_price || 0);
        }

        if (sortOption === 'name_asc') {
          return a.name.localeCompare(b.name, 'pt-BR');
        }

        if (sortOption === 'date_desc') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }

        return 0;
      });
  }, [items, searchTerm, statusFilter, priorityFilter, categoryFilter, sortOption]);

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Equipamento',
      estimated_price: '',
      priority: 'medium',
      status: 'planned',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEditModal = (item: WishlistItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category || 'Geral',
      estimated_price: item.estimated_price ? String(item.estimated_price) : '',
      priority: item.priority,
      status: item.status,
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  // Salvar item (criação ou edição)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showFeedback('error', 'Informe o nome do item desejado.');
      return;
    }

    const price = itemForm.estimated_price ? parseFloat(itemForm.estimated_price) : 0;
    if (isNaN(price) || price < 0) {
      showFeedback('error', 'O valor estimado não pode ser negativo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<WishlistItem> = {
        name: itemForm.name.trim(),
        category: itemForm.category.trim() || 'Geral',
        estimated_price: price,
        priority: itemForm.priority,
        status: itemForm.status,
        notes: itemForm.notes.trim(),
      };

      if (editingItem) {
        payload.id = editingItem.id;
        await dataService.saveWishlistItem(payload);
        showFeedback('success', `Item "${payload.name}" atualizado com sucesso!`);
      } else {
        await dataService.saveWishlistItem(payload);
        showFeedback('success', `Item "${payload.name}" adicionado à lista de desejos!`);
      }

      setIsModalOpen(false);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar item na wishlist.';
      showFeedback('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Alterar status diretamente (sem exclusão física e sem movimentação financeira automática)
  const handleUpdateStatus = async (item: WishlistItem, newStatus: WishlistStatus) => {
    try {
      await dataService.updateWishlistStatus(item.id, newStatus);
      const statusLabels: Record<WishlistStatus, string> = {
        planned: 'planejado/pendente',
        purchased: 'adquirido',
        cancelled: 'cancelado/descartado',
      };
      showFeedback('success', `Status de "${item.name}" alterado para ${statusLabels[newStatus]}.`);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
      showFeedback('error', msg);
    }
  };

  // Formatação monetária
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Formatação de data amigável sem timezone offset drift
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : feedbackMessage.type === 'info'
              ? 'bg-blue-950/40 border-blue-800/80 text-blue-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : feedbackMessage.type === 'info' ? (
              <Info className="h-5 w-5 text-blue-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/30">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Lista de Desejos / Aquisições
              </h1>
              <p className="text-xs text-slate-400">
                Planejamento estratégico de compras e investimentos futuros da Garage Car
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-refresh-wishlist"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
            title="Recarregar dados"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            id="btn-novo-desejo"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Banner de Regra de Negócio: Somente Planejamento */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-100">
            Regra Contábil & Planejamento Independente
          </p>
          <p className="text-slate-400 leading-relaxed">
            A lista de desejos serve estritamente para planejamento e priorização. Marcar um item como{' '}
            <strong className="text-emerald-400">Adquirido</strong> registra apenas o estado na wishlist e{' '}
            <span className="text-amber-300 font-medium">
              nunca movimenta automaticamente o Financeiro, Caixa, Estoque ou Equipamentos
            </span>
            . As compras reais devem ser efetuadas pelos módulos oficiais para registrar a origem do recurso e movimentações de lote.
          </p>
        </div>
      </div>

      {/* Indicadores do Topo (Dados Reais) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Itens Pendentes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Itens Pendentes</span>
            <span className="rounded-lg bg-blue-950/60 p-2 text-blue-400 border border-blue-800/40">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.pendingCount}</div>
          <p className="mt-1 text-[11px] text-slate-400">
            Itens aguardando decisão ou recurso
          </p>
        </div>

        {/* Alta Prioridade */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Alta Prioridade</span>
            <span className="rounded-lg bg-rose-950/60 p-2 text-rose-400 border border-rose-800/40">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{stats.highPriorityCount}</div>
          <p className="mt-1 text-[11px] text-slate-400">
            Pendências urgentes para a oficina
          </p>
        </div>

        {/* Valor Estimado Pendente (Sem cancelados) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Valor Estimado Pendente</span>
            <span className="rounded-lg bg-emerald-950/60 p-2 text-emerald-400 border border-emerald-800/40">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatCurrency(stats.pendingTotalValue)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Soma dos itens planejados (exclui cancelados)
          </p>
        </div>

        {/* Itens Adquiridos */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Itens Adquiridos</span>
            <span className="rounded-lg bg-purple-950/60 p-2 text-purple-400 border border-purple-800/40">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-300">{stats.purchasedCount}</div>
          <p className="mt-1 text-[11px] text-slate-400">
            Desejos realizados no histórico ({stats.cancelledCount} cancelados)
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Pesquisa */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="input-search-wishlist"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, categoria ou notas..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Status */}
          <div>
            <select
              id="select-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todos os Status ({items.length})</option>
              <option value="planned">Planejados / Pendentes ({stats.pendingCount})</option>
              <option value="purchased">Adquiridos ({stats.purchasedCount})</option>
              <option value="cancelled">Cancelados / Descartados ({stats.cancelledCount})</option>
            </select>
          </div>

          {/* Filtro de Prioridade */}
          <div>
            <select
              id="select-filter-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="high">Alta Prioridade</option>
              <option value="medium">Média Prioridade</option>
              <option value="low">Baixa Prioridade</option>
            </select>
          </div>

          {/* Filtro de Categoria */}
          <div>
            <select
              id="select-filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todas as Categorias</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha secundária de ordenação e limpeza de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium">Ordenar por:</span>
            <select
              id="select-sort-wishlist"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="priority_pending">Prioridade & Pendentes (Padrão)</option>
              <option value="value_desc">Maior Valor Estimado</option>
              <option value="value_asc">Menor Valor Estimado</option>
              <option value="name_asc">Nome (A - Z)</option>
              <option value="date_desc">Mais Recentes</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Itens da Wishlist */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-slate-800 bg-slate-900/50">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-300">Carregando lista de desejos...</p>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/50">
          <BookmarkPlus className="h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-200">Nenhum item encontrado</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Tente ajustar ou limpar os filtros de pesquisa para visualizar mais itens.'
              : 'Sua lista de desejos está vazia. Comece planejando as próximas aquisições da oficina.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Primeiro Item</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Item & Observação</th>
                  <th className="px-4 py-3.5 font-semibold">Categoria</th>
                  <th className="px-4 py-3.5 font-semibold">Prioridade</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Valor Estimado</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Data Cadastro</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAndSortedItems.map((item) => {
                  const isPlanned = item.status === 'planned';
                  const isPurchased = item.status === 'purchased';
                  const isCancelled = item.status === 'cancelled';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isCancelled ? 'opacity-60 bg-slate-950/30' : isPurchased ? 'bg-purple-950/10' : ''
                      }`}
                    >
                      {/* Item & Observação */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-100 text-sm">{item.name}</div>
                        {item.notes ? (
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {item.notes}
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Sem observações</span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-700/50">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {item.category || 'Geral'}
                        </span>
                      </td>

                      {/* Prioridade */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.priority === 'high' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-950/60 px-2 py-0.5 text-[11px] font-bold text-rose-400 border border-rose-800/50">
                            <AlertTriangle className="h-3 w-3" />
                            Alta
                          </span>
                        ) : item.priority === 'medium' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/60 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-800/50">
                            Média
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/70 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/50">
                            Baixa
                          </span>
                        )}
                      </td>

                      {/* Valor Estimado */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-medium">
                        <span
                          className={
                            isCancelled
                              ? 'text-slate-500 line-through'
                              : isPurchased
                              ? 'text-purple-300'
                              : 'text-emerald-400'
                          }
                        >
                          {formatCurrency(item.estimated_price)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isPlanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-medium text-blue-300 border border-blue-800/50">
                            <Clock className="h-3 w-3" />
                            Planejado
                          </span>
                        ) : isPurchased ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-950/60 px-2.5 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-800/50">
                            <Check className="h-3 w-3" />
                            Adquirido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700">
                            <X className="h-3 w-3" />
                            Cancelado
                          </span>
                        )}
                      </td>

                      {/* Data Cadastro */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {formatDate(item.created_at)}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Transições de Status */}
                          {isPlanned && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(item, 'purchased')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 text-[11px] font-medium transition-colors"
                                title="Marcar como adquirido (não debita caixa nem estoque)"
                              >
                                <Check className="h-3 w-3" />
                                <span>Adquirido</span>
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(item, 'cancelled')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
                                title="Descartar ou cancelar desejo"
                              >
                                <X className="h-3 w-3" />
                                <span>Descartar</span>
                              </button>
                            </>
                          )}

                          {isPurchased && (
                            <>
                              <button
                                onClick={() => setAcquisitionGuideItem(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 text-[11px] font-medium transition-colors"
                                title="Orientação para cadastrar a entrada real em Estoque ou Equipamentos"
                              >
                                <ShoppingBag className="h-3 w-3" />
                                <span>Lançar Entrada</span>
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(item, 'planned')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                                title="Reverter para Planejado"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reabrir</span>
                              </button>
                            </>
                          )}

                          {isCancelled && (
                            <button
                              onClick={() => handleUpdateStatus(item, 'planned')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 border border-blue-800/50 text-[11px] font-medium transition-colors"
                              title="Reativar como planejado"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reativar</span>
                            </button>
                          )}

                          {/* Botão de Edição */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Editar item"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">
                  {editingItem ? 'Editar Item da Wishlist' : 'Novo Item na Lista de Desejos'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Nome do Item */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do Item / Equipamento / Insumo *
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Ex: Politriz Roto-Orbital 15mm, Extratora WAP, Coating 9H..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Categoria & Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria
                  </label>
                  <input
                    type="text"
                    list="categories-list"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    placeholder="Selecione ou digite..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="categories-list">
                    {availableCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={itemForm.priority}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, priority: e.target.value as WishlistPriority })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="high">Alta Prioridade</option>
                    <option value="medium">Média Prioridade</option>
                    <option value="low">Baixa Prioridade</option>
                  </select>
                </div>
              </div>

              {/* Valor Estimado & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.estimated_price}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, estimated_price: e.target.value })
                    }
                    placeholder="0,00"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={itemForm.status}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, status: e.target.value as WishlistStatus })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="planned">Planejado / Pendente</option>
                    <option value="purchased">Adquirido</option>
                    <option value="cancelled">Cancelado / Descartado</option>
                  </select>
                </div>
              </div>

              {/* Motivo / Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Motivo / Justificativa / Observações
                </label>
                <textarea
                  rows={3}
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="Justificativa técnica, link de referência, fornecedor sugerido ou ganho de produtividade..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  O cadastro e edição na Wishlist não geram despesas ou alterações em caixa. Trata-se puramente de planejamento estratégico.
                </span>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Adicionar à Wishlist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GUIA DE AQUISIÇÃO REAL (Garante integridade contábil e encaminhamento correto) */}
      {acquisitionGuideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-purple-800/60 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Registrar Aquisição Real</h3>
              </div>
              <button
                onClick={() => setAcquisitionGuideItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">
                Você marcou <strong className="text-white">{acquisitionGuideItem.name}</strong> como{' '}
                <span className="text-purple-300 font-semibold">Adquirido</span> na Wishlist.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Para manter a integridade fiscal, contábil e de estoque da Garage Car (definindo se foi pago via{' '}
                <strong className="text-slate-200">Caixa da Empresa</strong> ou{' '}
                <strong className="text-slate-200">Aporte do Proprietário</strong>), direcione a entrada para o módulo correspondente:
              </p>

              <div className="space-y-2 pt-2">
                {onNavigateToEquipment && (
                  <button
                    onClick={() => {
                      setAcquisitionGuideItem(null);
                      onNavigateToEquipment();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/60 hover:bg-slate-800/60 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-orange-950/50 border border-orange-800/40 text-orange-400">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-blue-300">
                          É um Equipamento / Ferramenta
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Cadastrar no Patrimônio (Politriz, Extratora, etc.)
                        </div>
                      </div>
                    </div>
                    <span className="text-blue-400 font-bold text-xs">Ir &rarr;</span>
                  </button>
                )}

                {onNavigateToBatches && (
                  <button
                    onClick={() => {
                      setAcquisitionGuideItem(null);
                      onNavigateToBatches();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/60 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-emerald-300">
                          É um Produto / Insumo de Estoque
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Dar entrada via Compras e Lotes (FIFO)
                        </div>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-xs">Ir &rarr;</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAcquisitionGuideItem(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
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
