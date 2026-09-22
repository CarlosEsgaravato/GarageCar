import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Car,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Client, Vehicle } from '../../types';
import { dataService } from '../../services/dataService';

interface ClientsViewProps {
  onNavigateToVehicles?: (clientId?: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onNavigateToVehicles }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    is_active: true,
  });

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await dataService.getClients();
      setClients(data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      notes: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      notes: client.notes || '',
      is_active: client.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showFeedback('error', 'Nome e telefone são campos obrigatórios.');
      return;
    }

    try {
      if (editingClient) {
        await dataService.saveClient({
          id: editingClient.id,
          ...formData,
        });
        showFeedback('success', 'Cliente atualizado com sucesso!');
      } else {
        await dataService.saveClient({
          ...formData,
        });
        showFeedback('success', 'Cliente cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      await loadClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cliente.';
      showFeedback('error', msg);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      const newStatus = !client.is_active;
      await dataService.toggleClientStatus(client.id, newStatus);
      showFeedback('success', `Cliente ${newStatus ? 'ativado' : 'inativado'} com sucesso!`);
      await loadClients();
      if (selectedClientDetails && selectedClientDetails.id === client.id) {
        setSelectedClientDetails((prev) => (prev ? { ...prev, is_active: newStatus } : null));
      }
    } catch {
      showFeedback('error', 'Erro ao alterar status do cliente.');
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Deseja realmente excluir o cliente "${client.name}"?`)) {
      return;
    }

    const result = await dataService.deleteClient(client.id);
    if (!result.success) {
      showFeedback('error', result.error || 'Não foi possível excluir o cliente.');
    } else {
      showFeedback('success', 'Cliente excluído com sucesso.');
      if (selectedClientDetails?.id === client.id) {
        setSelectedClientDetails(null);
      }
      await loadClients();
    }
  };

  // Filtragem de clientes por busca e status
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.is_active) ||
        (statusFilter === 'inactive' && !c.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Feedback */}
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

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Clientes</h1>
            <span className="rounded-full bg-blue-900/40 border border-blue-700/50 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              {clients.length} cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestão simplificada de clientes da estética automotiva (sem exigência de CPF).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          id="btn-new-client"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Cadastrar Cliente
        </button>
      </div>

      {/* Regra de Negócio: Ausência de CPF */}
      <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 p-3.5 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-blue-300">Regra Operacional Garage Car:</p>
          <p className="text-slate-400">
            O sistema <strong>não solicita nem armazena CPF</strong> de clientes. A identificação é
            feita pelo nome, telefone de contato e vínculo com os veículos atendidos.
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
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({clients.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos ({clients.filter((c) => c.is_active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inativos ({clients.filter((c) => !c.is_active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-sm">Carregando lista de clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">Nenhum cliente encontrado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm
                ? 'Nenhum resultado corresponde aos critérios de pesquisa.'
                : 'Você ainda não possui clientes cadastrados nesta visualização.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-xs font-semibold text-blue-400 hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nome do Cliente</th>
                  <th className="py-3.5 px-4">Contato (Telefone / E-mail)</th>
                  <th className="py-3.5 px-4">Veículos Cadastrados</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => {
                  const clientVehicles = client.vehicles || [];
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedClientDetails(client)}
                    >
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 font-bold text-xs">
                            {client.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                              {client.name}
                            </div>
                            {client.notes && (
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {client.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{client.phone}</span>
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Mail className="h-3.5 w-3.5 text-slate-500" />
                              <span className="truncate max-w-[180px]">{client.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {clientVehicles.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              Nenhum veículo
                            </span>
                          ) : (
                            clientVehicles.map((v) => (
                              <span
                                key={v.id}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300 border border-slate-700/60"
                              >
                                <Car className="h-3 w-3 text-blue-400" />
                                <span>{v.model}</span>
                                {v.plate && (
                                  <span className="text-[10px] font-mono text-slate-400 ml-0.5">
                                    ({v.plate})
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            client.is_active
                              ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400'
                              : 'bg-rose-950/60 border border-rose-800/80 text-rose-400'
                          }`}
                        >
                          {client.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedClientDetails(client)}
                            title="Ver detalhes"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            title="Editar cliente"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(client)}
                            title={client.is_active ? 'Inativar cliente' : 'Ativar cliente'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              client.is_active
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                          >
                            {client.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            title="Excluir cliente"
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

      {/* Modal de Cadastro / Edição de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Preencha os dados do cliente (sem necessidade de CPF).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: carlos@email.com"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observações e Preferências
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Prefere atendimento aos sábados. Cuidado extra com partes em black piano."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-300">
                    Cliente ativo no sistema
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
                >
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Detalhes do Cliente */}
      {selectedClientDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-base shadow-md shadow-blue-600/30">
                  {selectedClientDetails.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedClientDetails.name}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        selectedClientDetails.is_active
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                      }`}
                    >
                      {selectedClientDetails.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cadastrado em {new Date(selectedClientDetails.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientDetails(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Contatos */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    Telefone / WhatsApp
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-200 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    <span>{selectedClientDetails.phone}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    E-mail
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-200 text-sm font-medium truncate">
                    <Mail className="h-3.5 w-3.5 text-blue-400" />
                    <span className="truncate">
                      {selectedClientDetails.email || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedClientDetails.notes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                    Observações e Recomendações
                  </h4>
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed">
                    {selectedClientDetails.notes}
                  </div>
                </div>
              )}

              {/* Veículos Vinculados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-blue-400" />
                    Veículos Vinculados ({selectedClientDetails.vehicles?.length || 0})
                  </h4>
                  {onNavigateToVehicles && (
                    <button
                      onClick={() => {
                        setSelectedClientDetails(null);
                        onNavigateToVehicles(selectedClientDetails.id);
                      }}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Cadastrar Veículo para este Cliente
                    </button>
                  )}
                </div>

                {(!selectedClientDetails.vehicles || selectedClientDetails.vehicles.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                    Nenhum veículo registrado para este cliente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedClientDetails.vehicles.map((v: Vehicle) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/30">
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-white">
                              {v.brand} {v.model}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{v.commercial_category}</span>
                              {v.color && <span>• {v.color}</span>}
                              {v.year && <span>• {v.year}</span>}
                            </div>
                          </div>
                        </div>
                        <div>
                          {v.plate ? (
                            <span className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-xs font-semibold text-slate-200">
                              {v.plate}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Sem placa
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aviso de Próxima Fase: Histórico de Serviços */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 flex items-center gap-3">
                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-400">
                  O histórico completo de serviços executados e atendimentos será visualizável aqui
                  a partir da <strong>Fase 3 (Agenda e Execução)</strong>.
                </p>
              </div>

              {/* Ações do Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleOpenEdit(selectedClientDetails);
                    setSelectedClientDetails(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar Dados
                </button>

                <button
                  onClick={() => setSelectedClientDetails(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
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
