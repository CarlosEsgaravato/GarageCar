import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Tag,
  Info,
  Layers,
  Sparkles,
  Droplets,
} from 'lucide-react';
import { Product, ProductCategory } from '../../types';
import { dataService } from '../../services/dataService';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form de Produto
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    category_id: '',
    unit: 'ml',
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
      const [pData, cData] = await Promise.all([
        dataService.getProducts(),
        dataService.getProductCategories(),
      ]);
      setProducts(pData);
      setCategories(cData);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
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

  // Abrir Modal de Produto (Novo)
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      brand: '',
      category_id: categories.find((c) => c.is_active)?.id || '',
      unit: 'ml',
      notes: '',
      is_active: true,
    });
    setIsProductModalOpen(true);
  };

  // Abrir Modal de Produto (Editar)
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      brand: p.brand || '',
      category_id: p.category_id || '',
      unit: p.unit || 'ml',
      notes: p.notes || '',
      is_active: p.is_active,
    });
    setIsProductModalOpen(true);
  };

  // Salvar Produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showFeedback('error', 'O nome do produto é obrigatório.');
      return;
    }

    try {
      if (editingProduct) {
        await dataService.saveProduct({
          id: editingProduct.id,
          ...productForm,
        });
        showFeedback('success', 'Produto atualizado com sucesso!');
      } else {
        await dataService.saveProduct({
          ...productForm,
        });
        showFeedback('success', 'Produto cadastrado com sucesso!');
      }
      setIsProductModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar produto.';
      showFeedback('error', msg);
    }
  };

  // Alternar Status do Produto
  const handleToggleProductStatus = async (p: Product) => {
    try {
      const newStatus = !p.is_active;
      await dataService.toggleProductStatus(p.id, newStatus);
      showFeedback('success', `Produto ${newStatus ? 'ativado' : 'inativado'} com sucesso!`);
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao alterar status do produto.');
    }
  };

  // Excluir Produto
  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Deseja realmente excluir o produto "${p.name}"?`)) return;
    try {
      await dataService.deleteProduct(p.id);
      showFeedback('success', 'Produto excluído com sucesso.');
      await loadData();
    } catch {
      showFeedback('error', 'Erro ao excluir produto.');
    }
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
        await dataService.saveProductCategory({
          id: editingCategory.id,
          ...categoryForm,
        });
        showFeedback('success', 'Categoria atualizada com sucesso!');
      } else {
        await dataService.saveProductCategory({
          ...categoryForm,
        });
        showFeedback('success', 'Categoria criada com sucesso!');
      }
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sort_order: categories.length + 2, is_active: true });
      const updatedCats = await dataService.getProductCategories();
      setCategories(updatedCats);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria.';
      showFeedback('error', msg);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    if (!window.confirm(`Deseja excluir a categoria "${cat.name}"?`)) return;
    const result = await dataService.deleteProductCategory(cat.id);
    if (!result.success) {
      showFeedback('error', result.error || 'Não foi possível excluir a categoria.');
    } else {
      showFeedback('success', 'Categoria excluída com sucesso.');
      const updatedCats = await dataService.getProductCategories();
      setCategories(updatedCats);
      await loadData();
    }
  };

  // Filtragem
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (p.name || '').toLowerCase().includes(term) ||
        (p.brand ? p.brand.toLowerCase().includes(term) : false) ||
        (p.category ? p.category.toLowerCase().includes(term) : false);

      const matchesCategory =
        selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategoryFilter, statusFilter]);

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
            <h1 className="text-2xl font-bold tracking-tight text-white">Produtos e Insumos</h1>
            <span className="rounded-full bg-blue-900/40 border border-blue-700/50 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              {products.length} cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Catálogo de produtos químicos, ceras, shampoos e itens de acabamento da Garage Car.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCategoriesModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Tag className="h-4 w-4 text-purple-400" />
            Categorias de Produtos ({categories.length})
          </button>

          <button
            onClick={handleOpenCreateProduct}
            id="btn-new-product"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Banner Informativo de Fase 2 */}
      <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-blue-300">Fase 2: Catálogo de Produtos e Insumos</p>
          <p className="text-slate-400">
            Nesta fase realizamos o cadastro e a padronização dos insumos utilizados na estética. A gestão
            de estoque físico, entradas de lotes, datas de validade e valoração FIFO serão implementadas
            na <strong>Fase 4 (Estoque e Financeiro)</strong>.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, marca ou categoria..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Categoria Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
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

      {/* Tabela de Produtos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-sm">Carregando catálogo de produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhum produto encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm
                ? 'Nenhum resultado corresponde à pesquisa.'
                : 'Cadastre seu primeiro produto para iniciar o controle de insumos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Marca</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Unidade de Medida</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((product) => {
                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
                            <Droplets className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{product.name}</div>
                            {product.notes && (
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {product.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <span className="rounded-md bg-slate-800 px-2 py-1 font-semibold text-slate-200 border border-slate-700/60">
                          {product.brand || 'Não especificada'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 text-xs font-medium text-purple-300">
                          <Tag className="h-3 w-3 text-purple-400" />
                          {product.category || 'Sem Categoria'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs font-mono text-slate-300">
                        <span className="rounded bg-slate-950 px-2 py-0.5 border border-slate-800">
                          {product.unit}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            product.is_active
                              ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                              : 'bg-rose-950/60 border border-rose-800/80 text-rose-400'
                          }`}
                        >
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            title="Editar produto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleProductStatus(product)}
                            title={product.is_active ? 'Inativar produto' : 'Ativar produto'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.is_active
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                          >
                            {product.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            title="Excluir produto"
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

      {/* Modal de Cadastro / Edição de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cadastre produtos químicos e insumos de acabamento.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              {/* Nome do Produto */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome Comercial do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: V-Floc Shampoo Super Concentrado"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Marca e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marca / Fabricante *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="Ex: Vonixx, Soft99, Dub"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria *
                  </label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories
                      .filter((c) => c.is_active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Unidade de Medida */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Unidade de Medida
                </label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ml">ml (Mililitros - recomendado para químicos líquidos)</option>
                  <option value="l">l (Litros)</option>
                  <option value="un">un (Unidades / Frascos)</option>
                  <option value="g">g (Gramas - para ceras e pastas)</option>
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Instruções de Diluição e Uso
                </label>
                <textarea
                  rows={2}
                  value={productForm.notes}
                  onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                  placeholder="Ex: Diluição recomendada: 1:400 em Snow Foam. pH neutro seguro para ceras."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-300">
                    Produto ativo para utilização
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Categorias de Produtos */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Categorias de Produtos</h2>
                  <p className="text-xs text-slate-400">
                    Organize os insumos e químicos em categorias padronizadas.
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
                    placeholder="Ex: Descontaminação & Clay Bar"
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
                    placeholder="Ex: Produtos para remoção de partículas ferrosas"
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
                  const linkedProducts = products.filter((p) => p.category_id === cat.id);
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
                            ({linkedProducts.length} produtos cadastrados)
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
