import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Calendar,
  DollarSign,
  AlertTriangle,
  Building,
  User,
  RefreshCw,
  X,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Droplets,
  Layers,
  History,
  FileText,
  Info,
  Hash,
  ClipboardCheck,
} from 'lucide-react';
import { Product, ProductBatch, FundingSource, StockMovement, CreateBatchPurchasePayload, FinancialTransaction, CapitalContribution } from '../../types';
import { operationService } from '../../services/operationService';
import { dataService } from '../../services/dataService';

export interface BatchConsistencyItem {
  batch_id: string;
  batch_code: string;
  product_name: string;
  purchase_date: string;
  total_cost: number;
  funding_source: FundingSource;
  financial_record_found: boolean;
  financial_detail: string;
  situation: 'Consistente' | 'Pendente de Regularização' | 'Estornado / Sem Vínculo';
}

export const ProductBatchesView: React.FC = () => {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Auditoria e Diagnóstico de Consistência
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<BatchConsistencyItem[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'depleted'>('all');
  const [fundingSourceFilter, setFundingSourceFilter] = useState<'all' | FundingSource>('all');

  // Modais
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatch | null>(null);
  const [batchMovements, setBatchMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form de Nova Compra / Lote
  const initialFormState = {
    product_id: '',
    batch_code: '',
    purchase_date: new Date().toISOString().split('T')[0],
    initial_quantity: '',
    total_cost: '',
    supplier: '',
    funding_source: 'company_cash' as FundingSource,
    notes: '',
  };
  const [form, setForm] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBatches, allProducts] = await Promise.all([
        operationService.getProductBatches(undefined, 'desc'),
        dataService.getProducts(),
      ]);
      setBatches(allBatches);
      setProducts(allProducts);
    } catch (err) {
      console.error('Erro ao carregar lotes de produtos:', err);
      setFeedback({ type: 'error', text: 'Não foi possível carregar os lotes de produtos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Produto selecionado no formulário para exibição de métricas e conversões
  const selectedProductInForm = useMemo(() => {
    return products.find((p) => p.id === form.product_id);
  }, [products, form.product_id]);

  // Cálculo automático do custo unitário no formulário
  const calculatedUnitCost = useMemo(() => {
    const qty = parseFloat(form.initial_quantity);
    const cost = parseFloat(form.total_cost);
    if (!isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0) {
      return (cost / qty).toFixed(4);
    }
    return null;
  }, [form.initial_quantity, form.total_cost]);

  // Lista de lotes filtrada
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // 1. Filtro de busca textual
      const term = searchTerm.toLowerCase();
      const prodName = b.product?.name?.toLowerCase() || '';
      const prodBrand = b.product?.brand?.toLowerCase() || '';
      const batchCode = (b.batch_code || '').toLowerCase();
      const supplier = (b.supplier || '').toLowerCase();

      const matchesSearch =
        !term ||
        prodName.includes(term) ||
        prodBrand.includes(term) ||
        batchCode.includes(term) ||
        supplier.includes(term);

      // 2. Filtro por produto específico
      const matchesProduct = selectedProductFilter === 'all' || b.product_id === selectedProductFilter;

      // 3. Filtro por status
      const isAvailable = Number(b.current_quantity) > 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && isAvailable) ||
        (statusFilter === 'depleted' && !isAvailable);

      // 4. Filtro por fonte de recurso
      const matchesFunding =
        fundingSourceFilter === 'all' || b.funding_source === fundingSourceFilter;

      return matchesSearch && matchesProduct && matchesStatus && matchesFunding;
    });
  }, [batches, searchTerm, selectedProductFilter, statusFilter, fundingSourceFilter]);

  // Métricas do Topo
  const metrics = useMemo(() => {
    const totalCount = batches.length;
    const availableCount = batches.filter((b) => Number(b.current_quantity) > 0).length;
    const depletedCount = batches.filter((b) => Number(b.current_quantity) <= 0).length;
    const totalInvested = batches.reduce((sum, b) => sum + Number(b.total_cost || 0), 0);

    return { totalCount, availableCount, depletedCount, totalInvested };
  }, [batches]);

  // Submissão do formulário de Nova Compra
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id) {
      setFeedback({ type: 'error', text: 'Selecione um produto para registrar a compra.' });
      return;
    }
    const qty = parseFloat(form.initial_quantity);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: 'error', text: 'Informe uma quantidade comprada válida (maior que zero).' });
      return;
    }
    const cost = parseFloat(form.total_cost);
    if (isNaN(cost) || cost < 0) {
      setFeedback({ type: 'error', text: 'Informe um custo total válido (maior ou igual a zero).' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateBatchPurchasePayload = {
        product_id: form.product_id,
        batch_code: form.batch_code.trim() || undefined,
        purchase_date: form.purchase_date,
        initial_quantity: qty,
        total_cost: cost,
        supplier: form.supplier.trim() || undefined,
        funding_source: form.funding_source,
        notes: form.notes.trim() || undefined,
      };

      await operationService.registerProductPurchase(payload);

      setFeedback({
        type: 'success',
        text: `Compra registrada com sucesso! Custo unitário calculado: R$ ${(cost / qty).toFixed(4)} / ${selectedProductInForm?.unit || 'un'}.`,
      });

      setIsNewPurchaseModalOpen(false);
      setForm(initialFormState);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao salvar compra/lote:', err);
      setFeedback({ type: 'error', text: err?.message || 'Erro ao registrar compra.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de detalhes
  const handleOpenDetail = async (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setIsDetailModalOpen(true);
    setLoadingMovements(true);
    try {
      const movements = await operationService.getBatchStockMovements(batch.id);
      setBatchMovements(movements);
    } catch (err) {
      console.error('Erro ao carregar movimentações do lote:', err);
      setBatchMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  // Cancelamento de Lote (Estorno)
  const handleDeleteBatch = async (batch: ProductBatch) => {
    const isConsumed = Number(batch.current_quantity) !== Number(batch.initial_quantity);
    if (isConsumed) {
      alert(
        'Exclusão bloqueada: este lote já possui consumo registrado em atendimentos. Para manter a integridade fiscal e rastreabilidade, lotes com consumo não podem ser apagados.'
      );
      return;
    }

    const confirmMsg = `Deseja realmente estornar a compra do lote "${batch.batch_code || 'Lote'}"?\n\nEsta ação removerá o lote e abaterá ${batch.initial_quantity} ${batch.product?.unit || 'un'} do estoque disponível do produto "${batch.product?.name}".`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const result = await operationService.deleteProductBatch(batch.id);
      setFeedback({ type: 'success', text: result.message || 'Lote cancelado com sucesso.' });
      setIsDetailModalOpen(false);
      setSelectedBatch(null);
      await loadData();
    } catch (err: any) {
      console.error('Erro ao cancelar lote:', err);
      setFeedback({ type: 'error', text: err?.message || 'Erro ao cancelar lote.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Auditoria e Diagnóstico de Consistência (Somente Leitura)
  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const [allBatches, allTrxs, allContribs] = await Promise.all([
        operationService.getProductBatches(undefined, 'desc'),
        operationService.getFinancialTransactions({ includeReversed: true }),
        operationService.getCapitalContributions(),
      ]);

      const auditList: BatchConsistencyItem[] = allBatches.map((b) => {
        const prodName = b.product?.name || 'Produto Não Identificado';
        const batchCode = b.batch_code || 'S/ Código';
        const cost = Number(b.total_cost || 0);

        if (b.funding_source === 'company_cash') {
          // Procurar despesa em financial_transactions correspondente
          const matchingTrx = allTrxs.find((t) => {
            if (t.type !== 'expense') return false;
            // Checar código do lote na descrição
            const descMatches = t.description?.toLowerCase().includes(batchCode.toLowerCase());
            // Checar valor aproximado (margem de 1 centavo)
            const amtMatches = Math.abs(Number(t.amount) - cost) < 0.02;
            return descMatches || (amtMatches && t.category === 'Insumos / Estoque');
          });

          if (matchingTrx) {
            return {
              batch_id: b.id,
              batch_code: batchCode,
              product_name: prodName,
              purchase_date: b.purchase_date || '-',
              total_cost: cost,
              funding_source: 'company_cash',
              financial_record_found: true,
              financial_detail: `Despesa #${matchingTrx.id.slice(0, 8)} (${matchingTrx.category} - R$ ${Number(matchingTrx.amount).toFixed(2)})${matchingTrx.is_reversed ? ' [ESTORNADA]' : ''}`,
              situation: matchingTrx.is_reversed ? 'Estornado / Sem Vínculo' : 'Consistente',
            };
          } else {
            return {
              batch_id: b.id,
              batch_code: batchCode,
              product_name: prodName,
              purchase_date: b.purchase_date || '-',
              total_cost: cost,
              funding_source: 'company_cash',
              financial_record_found: false,
              financial_detail: 'Nenhuma despesa correspondente encontrada no Financeiro',
              situation: 'Pendente de Regularização',
            };
          }
        } else {
          // funding_source === 'owner_contribution'
          // Procurar aporte em capital_contributions correspondente por batch_id ou código do lote
          const matchingContrib = allContribs.find((c) => {
            if (c.batch_id && c.batch_id === b.id) return true;
            const descMatches = c.description?.toLowerCase().includes(batchCode.toLowerCase());
            const amtMatches = Math.abs(Number(c.amount) - cost) < 0.02;
            return descMatches || (amtMatches && c.contribution_type === 'owner_paid_purchase');
          });

          if (matchingContrib) {
            return {
              batch_id: b.id,
              batch_code: batchCode,
              product_name: prodName,
              purchase_date: b.purchase_date || '-',
              total_cost: cost,
              funding_source: 'owner_contribution',
              financial_record_found: true,
              financial_detail: `Aporte #${matchingContrib.id.slice(0, 8)} (R$ ${Number(matchingContrib.amount).toFixed(2)})${matchingContrib.is_reversed ? ' [ESTORNADO]' : ''}`,
              situation: matchingContrib.is_reversed ? 'Estornado / Sem Vínculo' : 'Consistente',
            };
          } else {
            return {
              batch_id: b.id,
              batch_code: batchCode,
              product_name: prodName,
              purchase_date: b.purchase_date || '-',
              total_cost: cost,
              funding_source: 'owner_contribution',
              financial_record_found: false,
              financial_detail: 'Nenhum aporte correspondente encontrado em Aportes do Proprietário',
              situation: 'Pendente de Regularização',
            };
          }
        }
      });

      setAuditResults(auditList);
    } catch (err: any) {
      console.error('Erro ao auditar consistência:', err);
      setFeedback({ type: 'error', text: 'Falha ao executar diagnóstico de consistência.' });
    } finally {
      setAuditLoading(false);
    }
  };

  // Produtos ativos para o select
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.is_active);
  }, [products]);

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm font-medium shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="rounded-lg p-1 hover:bg-black/5 text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Package className="h-7 w-7 text-blue-600" />
            Compras e Lotes (FIFO)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestão de entradas de compras, rastreabilidade por lote, controle de custos e baixas FIFO.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAuditModal}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 text-sm font-semibold text-amber-900 shadow-xs hover:bg-amber-100 transition-colors"
            title="Verificar consistência entre compras, financeiro e aportes"
          >
            <ClipboardCheck className="h-4 w-4 text-amber-700" />
            <span>Diagnóstico de Consistência</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-60"
            title="Atualizar listagem"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setForm(initialFormState);
              setIsNewPurchaseModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Compra / Novo Lote</span>
          </button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Total de Lotes
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalCount}</span>
            <span className="text-xs text-slate-500">registrados</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Lotes Disponíveis
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{metrics.availableCount}</span>
            <span className="text-xs text-slate-500">com saldo &gt; 0</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Lotes Esgotados
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-500">{metrics.depletedCount}</span>
            <span className="text-xs text-slate-500">saldo zerado</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Investimento Total
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              R$ {metrics.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Busca Textual */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto, marca, lote..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por Produto */}
          <div>
            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos os Produtos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Situação */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas as Situações</option>
              <option value="available">Disponíveis (Saldo &gt; 0)</option>
              <option value="depleted">Esgotados (Saldo zerado/negativo)</option>
            </select>
          </div>

          {/* Filtro por Fonte de Recurso */}
          <div>
            <select
              value={fundingSourceFilter}
              onChange={(e) => setFundingSourceFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas as Fontes de Recurso</option>
              <option value="company_cash">Caixa da Empresa</option>
              <option value="owner_contribution">Aporte do Proprietário</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Lotes */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Produto / Marca</th>
                <th className="px-4 py-3.5">Código Lote</th>
                <th className="px-4 py-3.5">Data Compra</th>
                <th className="px-4 py-3.5 text-right">Qtd. Inicial</th>
                <th className="px-4 py-3.5 text-right">Saldo Atual</th>
                <th className="px-4 py-3.5 text-right">Custo Total</th>
                <th className="px-4 py-3.5 text-right">Custo Unitário</th>
                <th className="px-4 py-3.5">Fonte / Fornecedor</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                    <span>Carregando lotes de compras...</span>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">Nenhum lote encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || selectedProductFilter !== 'all' || statusFilter !== 'all'
                        ? 'Tente ajustar os filtros acima para visualizar mais resultados.'
                        : 'Clique em "Nova Compra / Novo Lote" para cadastrar a primeira entrada.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const unit = batch.product?.unit || 'ml';
                  const isDepleted = Number(batch.current_quantity) <= 0;
                  const isNegative = Number(batch.current_quantity) < 0;
                  const percentLeft = Math.max(
                    0,
                    Math.min(100, Math.round((Number(batch.current_quantity) / Number(batch.initial_quantity)) * 100))
                  );

                  // Data formatada
                  const formattedDate = batch.purchase_date
                    ? new Date(batch.purchase_date + 'T12:00:00Z').toLocaleDateString('pt-BR')
                    : '-';

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Produto & Marca */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {batch.product?.name || 'Produto não identificado'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{batch.product?.brand || 'Sem marca'}</span>
                          {batch.product?.unit === 'ml' && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.2 text-[10px] text-blue-700">
                              <Droplets className="h-2.5 w-2.5" /> ml
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Código do Lote */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 bg-slate-100 rounded-md px-2 py-0.5 border border-slate-200">
                          <Hash className="h-3 w-3 text-slate-400" />
                          {batch.batch_code || 'S/ CÓDIGO'}
                        </span>
                      </td>

                      {/* Data da Compra */}
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Quantidade Inicial */}
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                        {Number(batch.initial_quantity).toLocaleString('pt-BR')} {unit}
                      </td>

                      {/* Saldo Atual com Barra de Progresso */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-bold ${
                              isNegative
                                ? 'text-rose-600'
                                : isDepleted
                                ? 'text-slate-400'
                                : 'text-emerald-700'
                            }`}
                          >
                            {Number(batch.current_quantity).toLocaleString('pt-BR')} {unit}
                          </span>
                          {!isNegative && !isDepleted && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <span>{percentLeft}%</span>
                              <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${percentLeft}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {isNegative && (
                            <span className="text-[10px] font-semibold text-rose-600">
                              Consumo excedente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Custo Total */}
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                        R$ {Number(batch.total_cost).toFixed(2)}
                      </td>

                      {/* Custo Unitário */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          R$ {Number(batch.unit_cost).toFixed(4)} /{unit}
                        </span>
                      </td>

                      {/* Fonte e Fornecedor */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          {batch.funding_source === 'company_cash' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                              <Building className="h-3 w-3" /> Caixa Empresa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-800">
                              <User className="h-3 w-3" /> Aporte Proprietário
                            </span>
                          )}
                        </div>
                        {batch.supplier && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]" title={batch.supplier}>
                            {batch.supplier}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {isNegative ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" /> Negativo
                          </span>
                        ) : isDepleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            <XCircle className="h-3 w-3 text-slate-400" /> Esgotado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Disponível
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(batch)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                          title="Ver detalhes do lote"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA COMPRA / NOVO LOTE */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Registrar Nova Compra / Lote</h2>
                  <p className="text-xs text-slate-500">
                    Cadastre a entrada de produtos com rastreabilidade FIFO e cálculo de custo unitário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              {/* Seleção do Produto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Produto <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione o produto cadastrado...</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand}) - Unidade: {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Informação de conversão para líquidos (ml) */}
              {selectedProductInForm && selectedProductInForm.unit === 'ml' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <span>Produto líquido controlado internamente em mililitros (ml)</span>
                  </div>
                  <p className="text-blue-700 leading-relaxed">
                    Registre a quantidade em <strong>ml</strong>. Atalhos rápidos para preenchimento:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: '500 ml', value: '500' },
                      { label: '1 Litro (1.000 ml)', value: '1000' },
                      { label: '1,5 Litro (1.500 ml)', value: '1500' },
                      { label: '3 Litros (3.000 ml)', value: '3000' },
                      { label: '5 Litros (5.000 ml)', value: '5000' },
                    ].map((chip) => (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setForm({ ...form, initial_quantity: chip.value })}
                        className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100/80 transition-colors"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid: Código do Lote & Data da Compra */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Código do Lote <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.batch_code}
                    onChange={(e) => setForm({ ...form, batch_code: e.target.value })}
                    placeholder="Ex: LOTE-2026-001 ou código do fabricante"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Deixe em branco para gerar código automático por data.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Data da Compra <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Grid: Quantidade & Custo Total */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quantidade Comprada ({selectedProductInForm?.unit || 'un'}) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={form.initial_quantity}
                    onChange={(e) => setForm({ ...form, initial_quantity: e.target.value })}
                    placeholder={selectedProductInForm?.unit === 'ml' ? 'Ex: 3000 (para 3 Litros)' : 'Ex: 1'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Custo Total da Compra (R$) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.total_cost}
                    onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
                    placeholder="Ex: 48.00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Box de Custo Unitário Calculado Automaticamente */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Custo Unitário Calculado
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Fórmula: Custo Total ÷ Quantidade Comprada
                  </span>
                </div>
                <div className="text-right">
                  {calculatedUnitCost ? (
                    <span className="font-mono text-base font-bold text-blue-700 bg-blue-100/70 px-3 py-1 rounded-lg">
                      R$ {calculatedUnitCost} /{selectedProductInForm?.unit || 'un'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Preencha quantidade e custo</span>
                  )}
                </div>
              </div>

              {/* Grid: Fornecedor e Fonte do Recurso */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fornecedor <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Ex: Vonixx Oficial, Loja do Profissional..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fonte do Recurso <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={form.funding_source}
                    onChange={(e) => setForm({ ...form, funding_source: e.target.value as FundingSource })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="company_cash">Caixa da Empresa (Receita Operacional)</option>
                    <option value="owner_contribution">Aporte do Proprietário (Capital Próprio)</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Observações <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Desconto de 10% aplicado por pagamento à vista..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Salvando lote...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Salvar Compra / Lote</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO LOTE & RASTREABILIDADE */}
      {isDetailModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Rastreabilidade & Histórico
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Lote: {selectedBatch.batch_code || 'S/ CÓDIGO'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Produto:</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedBatch.product?.name || 'Produto'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Marca / Fabricante:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBatch.product?.brand || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data da Compra:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBatch.purchase_date
                      ? new Date(selectedBatch.purchase_date + 'T12:00:00Z').toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fonte do Recurso:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBatch.funding_source === 'company_cash'
                      ? 'Caixa da Empresa'
                      : 'Aporte do Proprietário'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Fornecedor:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBatch.supplier || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Custo Unitário:</span>
                  <span className="font-mono font-bold text-blue-700">
                    R$ {Number(selectedBatch.unit_cost).toFixed(4)} /{selectedBatch.product?.unit || 'un'}
                  </span>
                </div>
              </div>

              {/* Saldo e Consumo */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Saldo e Consumo do Lote</span>
                  <span className="text-slate-900">
                    {Number(selectedBatch.current_quantity).toLocaleString('pt-BR')} de{' '}
                    {Number(selectedBatch.initial_quantity).toLocaleString('pt-BR')} {selectedBatch.product?.unit || 'un'}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      Number(selectedBatch.current_quantity) <= 0
                        ? 'bg-slate-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (Number(selectedBatch.current_quantity) / Number(selectedBatch.initial_quantity)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Custo Total do Lote: R$ {Number(selectedBatch.total_cost).toFixed(2)}</span>
                  <span>
                    Consumido:{' '}
                    {(
                      Number(selectedBatch.initial_quantity) - Number(selectedBatch.current_quantity)
                    ).toLocaleString('pt-BR')}{' '}
                    {selectedBatch.product?.unit || 'un'}
                  </span>
                </div>
              </div>

              {/* Observações */}
              {selectedBatch.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Observações da Compra
                  </span>
                  <p className="text-slate-600">{selectedBatch.notes}</p>
                </div>
              )}

              {/* Histórico de Movimentações */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="h-4 w-4 text-blue-600" />
                  Movimentações Registradas deste Lote
                </span>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  {loadingMovements ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <RefreshCw className="mx-auto h-4 w-4 animate-spin text-blue-600 mb-1" />
                      Carregando movimentações...
                    </div>
                  ) : batchMovements.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhuma movimentação registrada para este lote.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {batchMovements.map((mov) => (
                        <div key={mov.id} className="p-3 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {mov.reason || 'Movimentação'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(mov.created_at).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-semibold ${
                                mov.movement_type === 'purchase' || mov.movement_type === 'positive_adjustment'
                                  ? 'text-emerald-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {mov.movement_type === 'purchase' ? '+' : '-'}
                              {Math.abs(Number(mov.quantity)).toLocaleString('pt-BR')}{' '}
                              {selectedBatch.product?.unit || 'un'}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Estoque: {mov.previous_stock} → {mov.new_stock}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Proteção contra exclusão física / Estorno */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                {Number(selectedBatch.current_quantity) !== Number(selectedBatch.initial_quantity) ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Lote protegido: já possui consumo registrado em atendimentos.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteBatch(selectedBatch)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Estornar Compra (Não Utilizada)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoria e Diagnóstico de Consistência (Somente Leitura) */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Diagnóstico de Consistência: Lotes vs. Financeiro
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verificação de integridade entre product_batches, financial_transactions e capital_contributions (Somente Leitura).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {auditLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mb-3" />
                  <p className="font-semibold text-slate-700">Auditando lotes e registros financeiros...</p>
                  <p className="text-xs text-slate-400 mt-1">Cruzando dados de compras, despesas operacionais e aportes.</p>
                </div>
              ) : auditResults.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">Nenhum lote registrado para auditar.</p>
                </div>
              ) : (
                <>
                  {/* Resumo do Diagnóstico */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Total de Lotes Auditados</span>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{auditResults.length}</div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50">
                      <span className="text-xs font-semibold text-emerald-700 uppercase">Lotes Consistentes</span>
                      <div className="text-2xl font-bold text-emerald-800 mt-1">
                        {auditResults.filter((r) => r.situation === 'Consistente').length}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50">
                      <span className="text-xs font-semibold text-amber-700 uppercase">Pendentes de Regularização</span>
                      <div className="text-2xl font-bold text-amber-800 mt-1">
                        {auditResults.filter((r) => r.situation === 'Pendente de Regularização').length}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Diagnóstico */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase">
                          <tr>
                            <th className="px-3 py-2.5">Lote</th>
                            <th className="px-3 py-2.5">Produto</th>
                            <th className="px-3 py-2.5">Data</th>
                            <th className="px-3 py-2.5 text-right">Custo</th>
                            <th className="px-3 py-2.5">Origem</th>
                            <th className="px-3 py-2.5">Registro Financeiro Encontrado?</th>
                            <th className="px-3 py-2.5 text-center">Situação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {auditResults.map((item) => {
                            const isOk = item.situation === 'Consistente';
                            const isPending = item.situation === 'Pendente de Regularização';

                            return (
                              <tr key={item.batch_id} className={isPending ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-800">
                                  {item.batch_code}
                                </td>
                                <td className="px-3 py-2.5 font-medium text-slate-900">
                                  {item.product_name}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                                  {item.purchase_date}
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                                  R$ {item.total_cost.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {item.funding_source === 'company_cash' ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                      <Building className="h-3 w-3" /> Caixa Empresa
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                                      <User className="h-3 w-3" /> Aporte Proprietário
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {item.financial_record_found ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                    )}
                                    <span className={item.financial_record_found ? 'text-emerald-800' : 'text-rose-700 font-medium'}>
                                      {item.financial_detail}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                      isOk
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isPending
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {item.situation}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
              <div className="text-xs text-slate-500">
                Nenhum dado foi alterado. Esta ferramenta realiza somente consulta analítica.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAuditModal}
                  disabled={auditLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                  <span>Reexecutar Diagnóstico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
