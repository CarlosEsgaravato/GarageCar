import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  RefreshCw,
  X,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Droplets,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Product, ProductBatch, StockMovement, StockMovementType } from '../../types';
import { dataService } from '../../services/dataService';
import { operationService } from '../../services/operationService';

export const ProductStockView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'low' | 'negative'>('all');

  // Lotes expandidos por produto (tabela expansível)
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Modais
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'positive_adjustment' | 'negative_adjustment'>('positive_adjustment');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustBatchId, setAdjustBatchId] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Modal de Histórico de Movimentações
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');

  // Toast Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [allProducts, allBatches, allMovements] = await Promise.all([
        dataService.getProducts(),
        operationService.getProductBatches(undefined, 'desc'),
        operationService.getProductStockMovements(),
      ]);

      // Filtrar apenas produtos ativos por padrão, ou carregar todos para controle
      setProducts(allProducts);
      setBatches(allBatches);
      setMovements(allMovements);
    } catch (err: any) {
      console.error('Erro ao carregar dados de estoque:', err);
      showFeedback('error', err.message || 'Erro ao carregar estoque do Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Mapa de lotes por produto
  const batchesByProduct = useMemo(() => {
    const map: Record<string, ProductBatch[]> = {};
    batches.forEach((b) => {
      if (!map[b.product_id]) map[b.product_id] = [];
      map[b.product_id].push(b);
    });
    return map;
  }, [batches]);

  // Mapa de valor total e contagem de lotes por produto
  const productStockStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalEstimatedValue: number;
        activeBatchesCount: number;
        depletedBatchesCount: number;
        availableInBatches: number;
      }
    > = {};

    products.forEach((p) => {
      const prodBatches = batchesByProduct[p.id] || [];
      let totalValue = 0;
      let activeCount = 0;
      let depletedCount = 0;
      let availableQty = 0;

      prodBatches.forEach((b) => {
        const qty = Number(b.current_quantity || 0);
        const cost = Number(b.unit_cost || 0);
        if (qty > 0) {
          activeCount += 1;
          availableQty += qty;
          totalValue += qty * cost;
        } else {
          depletedCount += 1;
        }
      });

      stats[p.id] = {
        totalEstimatedValue: totalValue,
        activeBatchesCount: activeCount,
        depletedBatchesCount: depletedCount,
        availableInBatches: availableQty,
      };
    });

    return stats;
  }, [products, batchesByProduct]);

  // Métricas gerais (KPIs)
  const generalStats = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active);
    let totalStockValue = 0;
    let lowStockCount = 0;
    let negativeStockCount = 0;

    activeProducts.forEach((p) => {
      const stock = Number(p.current_stock || 0);
      const minStock = Number(p.min_stock || 0);
      const pStats = productStockStats[p.id];

      if (pStats) {
        totalStockValue += pStats.totalEstimatedValue;
      }

      if (stock < 0) {
        negativeStockCount += 1;
      } else if (stock <= minStock) {
        lowStockCount += 1;
      }
    });

    return {
      totalActiveProducts: activeProducts.length,
      totalStockValue,
      lowStockCount,
      negativeStockCount,
    };
  }, [products, productStockStats]);

  // Toggle expansão de lotes
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Filtragem de produtos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Exibir ativos por padrão
      if (!p.is_active) return false;

      // Busca
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }

      // Categoria
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) {
        return false;
      }

      // Status
      const stock = Number(p.current_stock || 0);
      const min = Number(p.min_stock || 0);

      if (statusFilter === 'negative') {
        return stock < 0;
      }
      if (statusFilter === 'low') {
        return stock >= 0 && stock <= min;
      }
      if (statusFilter === 'normal') {
        return stock > min;
      }

      return true;
    });
  }, [products, searchTerm, selectedCategoryFilter, statusFilter]);

  // Formatação de quantidade por unidade
  const formatQuantity = (qty: number | undefined, unit: string) => {
    const num = Number(qty || 0);
    const formattedNum = num.toLocaleString('pt-BR', {
      minimumFractionDigits: unit === 'ml' || unit === 'g' ? 0 : 2,
      maximumFractionDigits: 2,
    });

    // Se unidade for 'ml' e quantidade for grande, exibe litros como referência
    if (unit === 'ml' && Math.abs(num) >= 1000) {
      const liters = (num / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
      return `${formattedNum} ml (${liters} L)`;
    }

    return `${formattedNum} ${unit}`;
  };

  // Formatação de moeda
  const formatCurrency = (val: number | undefined) => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Abrir Modal de Ajuste
  const handleOpenAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustType('positive_adjustment');
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustBatchId('');
    setIsAdjustModalOpen(true);
  };

  // Submeter Ajuste Manual
  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const qty = parseFloat(adjustQuantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      showFeedback('error', 'Informe uma quantidade válida maior que zero.');
      return;
    }

    const cleanReason = adjustReason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      showFeedback('error', 'O motivo do ajuste é obrigatório (mínimo 3 caracteres).');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await operationService.adjustProductStock({
        productId: adjustingProduct.id,
        batchId: adjustBatchId || undefined,
        type: adjustType,
        quantity: qty,
        reason: cleanReason,
      });

      showFeedback(
        'success',
        `Ajuste ${adjustType === 'positive_adjustment' ? 'positivo' : 'negativo'} registrado com sucesso!`
      );
      setIsAdjustModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao realizar ajuste:', err);
      showFeedback('error', err.message || 'Erro ao registrar ajuste de estoque.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Abrir Modal de Histórico
  const handleOpenHistoryModal = (product: Product) => {
    setHistoryProduct(product);
    setHistoryTypeFilter('all');
    setIsHistoryModalOpen(true);
  };

  // Movimentações filtradas para o modal de histórico
  const filteredProductMovements = useMemo(() => {
    if (!historyProduct) return [];
    return movements.filter((m) => {
      if (m.product_id !== historyProduct.id) return false;
      if (historyTypeFilter !== 'all' && m.movement_type !== historyTypeFilter) return false;
      return true;
    });
  }, [movements, historyProduct, historyTypeFilter]);

  // Labels de tipo de movimentação
  const getMovementTypeBadge = (type: StockMovementType) => {
    switch (type) {
      case 'purchase':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ArrowDownRight className="h-3 w-3" /> Entrada por Compra
          </span>
        );
      case 'service_consumption':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ArrowUpRight className="h-3 w-3" /> Consumo em Serviço
          </span>
        );
      case 'positive_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3 w-3" /> Ajuste Positivo (+)
          </span>
        );
      case 'negative_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <TrendingDown className="h-3 w-3" /> Ajuste Negativo (-)
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{type}</span>;
    }
  };

  // Preview de novo estoque no modal de ajuste
  const previewNewStock = useMemo(() => {
    if (!adjustingProduct) return 0;
    const current = Number(adjustingProduct.current_stock || 0);
    const qty = parseFloat(adjustQuantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) return current;
    return adjustType === 'positive_adjustment' ? current + qty : current - qty;
  }, [adjustingProduct, adjustQuantity, adjustType]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            feedback.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-rose-500/50 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header com Ações e KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Controle de Estoque
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              Supabase Real
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Visualização consolidada de produtos ativos, saldo por lotes, histórico de movimentações e ajustes manuais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-stock"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium border border-slate-300 shadow-xs transition-all disabled:opacity-50"
            title="Atualizar dados do Supabase"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Produtos Ativos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Produtos Ativos
            </span>
            <div className="text-2xl font-bold text-slate-100 mt-1">
              {generalStats.totalActiveProducts}
            </div>
            <span className="text-xs text-slate-500">Cadastrados no catálogo</span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Valor Total Estimado em Estoque */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Valor em Estoque
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(generalStats.totalStockValue)}
            </div>
            <span className="text-xs text-slate-500">Calculado via lotes ativos</span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Estoque Baixo */}
        <div
          className={`bg-slate-900/80 border rounded-xl p-4.5 flex items-center justify-between shadow-sm transition-colors ${
            generalStats.lowStockCount > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Estoque Baixo
            </span>
            <div
              className={`text-2xl font-bold mt-1 ${
                generalStats.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {generalStats.lowStockCount}
            </div>
            <span className="text-xs text-slate-500">Abaixo do estoque mínimo</span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              generalStats.lowStockCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Estoque Negativo */}
        <div
          className={`bg-slate-900/80 border rounded-xl p-4.5 flex items-center justify-between shadow-sm transition-colors ${
            generalStats.negativeStockCount > 0
              ? 'border-rose-500/50 bg-rose-950/15'
              : 'border-slate-800'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Estoque Negativo
            </span>
            <div
              className={`text-2xl font-bold mt-1 ${
                generalStats.negativeStockCount > 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {generalStats.negativeStockCount}
            </div>
            <span className="text-xs text-slate-500">
              {generalStats.negativeStockCount > 0
                ? 'Consumo sem lote prévio'
                : 'Nenhum saldo negativo'}
            </span>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              generalStats.negativeStockCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="input-search-stock"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, marca..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filtro por Categoria */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 hidden lg:inline">Categoria:</span>
            <select
              id="select-category-stock"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status do Estoque */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 hidden lg:inline">Situação:</span>
            <select
              id="select-status-stock"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as situações</option>
              <option value="normal">Estoque Normal</option>
              <option value="low">Estoque Baixo ⚠️</option>
              <option value="negative">Estoque Negativo 🚨</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Principal de Produtos e Estoque Consolidado */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm">Carregando dados de estoque do Supabase...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Package className="h-10 w-10 mx-auto text-slate-600" />
            <h3 className="text-base font-semibold text-slate-200">Nenhum produto encontrado</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Nenhum produto ativo atende aos filtros de pesquisa selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Produto / Categoria</th>
                  <th className="py-3.5 px-4 text-center">Unidade</th>
                  <th className="py-3.5 px-4 text-right">Estoque Mínimo</th>
                  <th className="py-3.5 px-4 text-right">Estoque Consolidado</th>
                  <th className="py-3.5 px-4 text-center">Situação</th>
                  <th className="py-3.5 px-4 text-right">Valor Estimado</th>
                  <th className="py-3.5 px-4 text-center">Lotes</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredProducts.map((prod) => {
                  const stock = Number(prod.current_stock || 0);
                  const min = Number(prod.min_stock || 0);
                  const isNegative = stock < 0;
                  const isLow = !isNegative && stock <= min;
                  const prodBatches = batchesByProduct[prod.id] || [];
                  const isExpanded = !!expandedProductIds[prod.id];
                  const pStats = productStockStats[prod.id] || {
                    totalEstimatedValue: 0,
                    activeBatchesCount: 0,
                    depletedBatchesCount: 0,
                    availableInBatches: 0,
                  };

                  return (
                    <React.Fragment key={prod.id}>
                      <tr
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isNegative
                            ? 'bg-rose-950/10'
                            : isLow
                            ? 'bg-amber-950/5'
                            : isExpanded
                            ? 'bg-slate-800/30'
                            : ''
                        }`}
                      >
                        {/* Produto e Categoria */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => toggleExpand(prod.id)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title={isExpanded ? 'Recolher lotes' : 'Expandir lotes'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-blue-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-2">
                                <span>{prod.name}</span>
                                {prod.brand && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {prod.brand}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {prod.category || 'Sem categoria'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Unidade */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {prod.unit}
                          </span>
                        </td>

                        {/* Estoque Mínimo */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                          {formatQuantity(prod.min_stock, prod.unit)}
                        </td>

                        {/* Estoque Consolidado Atual */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className={`font-mono font-bold text-base ${
                              isNegative
                                ? 'text-rose-400'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {formatQuantity(prod.current_stock, prod.unit)}
                          </div>
                          {isNegative && (
                            <span className="text-[11px] font-semibold text-rose-400 block">
                              Saldo Negativo
                            </span>
                          )}
                        </td>

                        {/* Situação Visual */}
                        <td className="py-3.5 px-4 text-center">
                          {isNegative ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="h-3.5 w-3.5" /> Negativo
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="h-3.5 w-3.5" /> Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Regular
                            </span>
                          )}
                        </td>

                        {/* Valor Total Estimado */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(pStats.totalEstimatedValue)}
                        </td>

                        {/* Resumo de Lotes */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleExpand(prod.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          >
                            <Layers className="h-3.5 w-3.5 text-blue-400" />
                            <span>
                              {pStats.activeBatchesCount} ativo{pStats.activeBatchesCount !== 1 ? 's' : ''}
                            </span>
                            {pStats.depletedBatchesCount > 0 && (
                              <span className="text-slate-500">
                                ({pStats.depletedBatchesCount} esgot.)
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-adjust-${prod.id}`}
                              onClick={() => handleOpenAdjustModal(prod)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
                              title="Ajuste manual de estoque (+ ou -)"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Ajustar</span>
                            </button>

                            <button
                              id={`btn-history-${prod.id}`}
                              onClick={() => handleOpenHistoryModal(prod)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700 transition-colors"
                              title="Ver histórico de movimentações"
                            >
                              <History className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Painel Expansível de Lotes do Produto */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60 border-b border-slate-800">
                          <td colSpan={8} className="p-4 pl-12">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-blue-400" />
                                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                    Lotes Registrados para {prod.name}
                                  </h4>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">
                                  Consumo automático gerenciado por FIFO (data de compra)
                                </span>
                              </div>

                              {prodBatches.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500">
                                  Nenhum lote cadastrado para este produto ainda. Cadastre compras no menu Compras / Lotes.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="py-2 px-3">Código do Lote</th>
                                        <th className="py-2 px-3">Data Compra</th>
                                        <th className="py-2 px-3">Fornecedor</th>
                                        <th className="py-2 px-3 text-right">Qtd. Inicial</th>
                                        <th className="py-2 px-3 text-right">Qtd. Disponível</th>
                                        <th className="py-2 px-3 text-right">Custo Unitário</th>
                                        <th className="py-2 px-3 text-right">Saldo em Valor</th>
                                        <th className="py-2 px-3 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40">
                                      {prodBatches.map((batch) => {
                                        const bCurrent = Number(batch.current_quantity || 0);
                                        const bInitial = Number(batch.initial_quantity || 0);
                                        const bUnitCost = Number(batch.unit_cost || 0);
                                        const bTotalRemaining = Math.max(0, bCurrent) * bUnitCost;
                                        const isDepleted = bCurrent <= 0;

                                        return (
                                          <tr
                                            key={batch.id}
                                            className={
                                              isDepleted
                                                ? 'opacity-60 bg-slate-900/40'
                                                : 'hover:bg-slate-800/30'
                                            }
                                          >
                                            <td className="py-2 px-3 font-mono font-medium text-slate-200">
                                              {batch.batch_code || 'S/C'}
                                            </td>
                                            <td className="py-2 px-3 text-slate-400">
                                              {batch.purchase_date
                                                ? new Date(
                                                    batch.purchase_date + 'T00:00:00'
                                                  ).toLocaleDateString('pt-BR')
                                                : '--'}
                                            </td>
                                            <td className="py-2 px-3 text-slate-300">
                                              {batch.supplier || '--'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                                              {formatQuantity(bInitial, prod.unit)}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold">
                                              <span
                                                className={
                                                  isDepleted ? 'text-slate-500' : 'text-emerald-400'
                                                }
                                              >
                                                {formatQuantity(bCurrent, prod.unit)}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-slate-300">
                                              {formatCurrency(bUnitCost)} / {prod.unit}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-400">
                                              {formatCurrency(bTotalRemaining)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              {isDepleted ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                  Esgotado
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                  Ativo
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: AJUSTE MANUAL DE ESTOQUE */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Ajuste Manual de Estoque</h3>
                  <p className="text-xs text-slate-400">
                    {adjustingProduct.name} ({adjustingProduct.brand || 'Sem marca'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Tipo de Ajuste <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('positive_adjustment')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      adjustType === 'positive_adjustment'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Ajuste Positivo (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('negative_adjustment')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      adjustType === 'negative_adjustment'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 ring-2 ring-amber-500/30'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4 text-amber-400" />
                    <span>Ajuste Negativo (-)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {adjustType === 'positive_adjustment'
                    ? 'Use para sobras físicas, devoluções, contagem superior no inventário.'
                    : 'Use para perdas, avarias, consumo interno, quebras ou correções de inventário.'}
                </p>
              </div>

              {/* Lote Vinculado (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Vincular a Lote Específico (Opcional)
                </label>
                <select
                  id="select-adjust-batch"
                  value={adjustBatchId}
                  onChange={(e) => setAdjustBatchId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ajustar apenas saldo consolidado geral</option>
                  {(batchesByProduct[adjustingProduct.id] || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      Lote {b.batch_code || 'S/C'} ({formatQuantity(b.current_quantity, adjustingProduct.unit)} disponíveis) - {formatCurrency(b.unit_cost)}/{adjustingProduct.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Quantidade a Ajustar ({adjustingProduct.unit}) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-adjust-quantity"
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="Ex: 150"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-16 py-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400">
                    {adjustingProduct.unit}
                  </span>
                </div>
              </div>

              {/* Motivo Obrigatório */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Motivo / Justificativa <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Obrigatório p/ auditoria</span>
                </div>
                <textarea
                  id="textarea-adjust-reason"
                  rows={2}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Correção após contagem física semanal de inventário..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Caixa de Simulação de Impacto */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Simulação de Impacto no Estoque
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Estoque Atual:</span>
                  <span className="text-slate-200 font-bold">
                    {formatQuantity(adjustingProduct.current_stock, adjustingProduct.unit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Variação:</span>
                  <span
                    className={`font-bold ${
                      adjustType === 'positive_adjustment' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {adjustType === 'positive_adjustment' ? '+' : '-'}
                    {adjustQuantity ? `${adjustQuantity} ${adjustingProduct.unit}` : `0 ${adjustingProduct.unit}`}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">Novo Estoque Resultante:</span>
                  <span
                    className={`font-bold text-sm ${
                      previewNewStock < 0
                        ? 'text-rose-400'
                        : previewNewStock <= (adjustingProduct.min_stock || 0)
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {formatQuantity(previewNewStock, adjustingProduct.unit)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-adjust"
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAdjust ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Salvando no Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirmar Ajuste</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HISTÓRICO DE MOVIMENTAÇÕES (IMUTÁVEL / AUDITORIA) */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Histórico de Movimentações (stock_movements)
                  </h3>
                  <p className="text-xs text-slate-400">
                    {historyProduct.name} · Estoque Atual:{' '}
                    <span className="font-mono font-bold text-slate-200">
                      {formatQuantity(historyProduct.current_stock, historyProduct.unit)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subheader / Filtro e Aviso de Imutabilidade */}
            <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Registros imutáveis para conformidade. Não é permitida exclusão histórica.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-400">Tipo:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="purchase">Entradas por Compra</option>
                  <option value="service_consumption">Consumo em Serviço</option>
                  <option value="positive_adjustment">Ajuste Positivo (+)</option>
                  <option value="negative_adjustment">Ajuste Negativo (-)</option>
                </select>
              </div>
            </div>

            {/* Tabela de Movimentações */}
            <div className="overflow-y-auto p-6 flex-1">
              {filteredProductMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-slate-600" />
                  <p className="text-sm">Nenhuma movimentação registrada para este filtro.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProductMovements.map((mov) => {
                    const isPositive = Number(mov.quantity) > 0;

                    return (
                      <div
                        key={mov.id}
                        className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 hover:border-slate-700/80 transition-all space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getMovementTypeBadge(mov.movement_type)}
                            {mov.batch?.batch_code && (
                              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Lote: {mov.batch.batch_code}
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(mov.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-500 font-semibold">Motivo: </span>
                            {mov.reason}
                          </p>

                          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                            <span className="text-slate-400">
                              {formatQuantity(mov.previous_stock, historyProduct.unit)} →{' '}
                              <span className="text-slate-200 font-bold">
                                {formatQuantity(mov.new_stock, historyProduct.unit)}
                              </span>
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isPositive
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {formatQuantity(mov.quantity, historyProduct.unit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
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
