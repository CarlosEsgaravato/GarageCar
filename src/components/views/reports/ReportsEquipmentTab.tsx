import React, { useState, useMemo } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Wallet,
  Landmark,
  Search,
  Download,
  Tag,
  Calendar,
  Layers,
} from 'lucide-react';
import { ReportsRawData, DateRange, reportsService } from '../../../services/reportsService';
import { roundMoney } from '../../../services/operationService';

interface ReportsEquipmentTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

export const ReportsEquipmentTab: React.FC<ReportsEquipmentTabProps> = ({ data }) => {
  const { equipment } = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'retired'>('all');

  // Cálculos consolidados de Equipamentos
  const stats = useMemo(() => {
    let activeCount = 0;
    let maintenanceCount = 0;
    let retiredCount = 0;

    let totalAcquired = 0;
    let companyCashTotal = 0;
    let ownerContributionTotal = 0;

    for (const eq of equipment) {
      if (eq.status === 'active') activeCount++;
      else if (eq.status === 'maintenance') maintenanceCount++;
      else if (eq.status === 'retired') retiredCount++;

      const price = Number(eq.purchase_price || 0);
      totalAcquired = roundMoney(totalAcquired + price);

      if (eq.funding_source === 'company_cash') {
        companyCashTotal = roundMoney(companyCashTotal + price);
      } else {
        ownerContributionTotal = roundMoney(ownerContributionTotal + price);
      }
    }

    return {
      activeCount,
      maintenanceCount,
      retiredCount,
      totalCount: equipment.length,
      totalAcquired,
      companyCashTotal,
      ownerContributionTotal,
    };
  }, [equipment]);

  // Lista filtrada
  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (statusFilter !== 'all' && eq.status !== statusFilter) return false;

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        eq.name.toLowerCase().includes(q) ||
        (eq.brand && eq.brand.toLowerCase().includes(q)) ||
        (eq.model && eq.model.toLowerCase().includes(q)) ||
        (eq.category && eq.category.toLowerCase().includes(q))
      );
    });
  }, [equipment, statusFilter, searchTerm]);

  // Exportar CSV
  const handleExportCsv = () => {
    const headers = [
      'Equipamento',
      'Marca / Modelo',
      'Categoria',
      'Data de Compra',
      'Valor de Aquisição (R$)',
      'Origem do Recurso',
      'Status Patrimonial',
    ];

    const rows = filteredEquipment.map((eq) => [
      eq.name,
      `${eq.brand || ''} ${eq.model || ''}`.trim() || '-',
      eq.category || '-',
      reportsService.formatDateBR(eq.purchase_date),
      (eq.purchase_price || 0).toFixed(2),
      eq.funding_source === 'company_cash' ? 'Caixa da Garage Car' : 'Aporte do Proprietário',
      eq.status === 'active'
        ? 'Ativo'
        : eq.status === 'maintenance'
        ? 'Em Manutenção'
        : 'Baixado',
    ]);

    reportsService.exportToCsv('relatorio_equipamentos_patrimonio', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards Principais de Equipamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Ativo Imobilizado */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Patrimônio Imobilizado
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {reportsService.formatCurrency(stats.totalAcquired)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats.totalCount} itens cadastrados no patrimônio
          </p>
        </div>

        {/* Equipamentos Ativos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Equipamentos Ativos
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {stats.activeCount}
            </span>
            <span className="text-xs text-slate-400">operacionais</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Prontos para uso nos serviços da oficina
          </p>
        </div>

        {/* Em Manutenção */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Em Manutenção
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {stats.maintenanceCount}
            </span>
            <span className="text-xs text-slate-400">em reparo</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Temporariamente indisponíveis
          </p>
        </div>

        {/* Baixados / Descartados */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Baixados / Descartados
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {stats.retiredCount}
            </span>
            <span className="text-xs text-slate-400">inativos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Equipamentos fora de operação
          </p>
        </div>
      </div>

      {/* Origem do Recurso: Caixa da Garage Car vs Investimento do Proprietário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Adquiridos com Caixa da Empresa */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  Pago com Caixa da Oficina
                </h4>
                <span className="text-[11px] text-slate-400">
                  Saída operacional do caixa da Garage Car
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 flex items-baseline justify-between border-t border-slate-800">
            <span className="text-xs text-slate-400">Total investido:</span>
            <span className="text-xl font-bold font-mono text-blue-400">
              {reportsService.formatCurrency(stats.companyCashTotal)}
            </span>
          </div>
        </div>

        {/* Adquiridos pelo Proprietário (Patrimônio) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/20 border border-purple-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  Adquirido pelo Proprietário
                </h4>
                <span className="text-[11px] text-purple-300">
                  Investimento patrimonial pessoal (não é despesa operacional)
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 flex items-baseline justify-between border-t border-slate-800">
            <span className="text-xs text-slate-400">Total aportado:</span>
            <span className="text-xl font-bold font-mono text-purple-300">
              {reportsService.formatCurrency(stats.ownerContributionTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Equipamentos */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Inventário de Máquinas e Equipamentos
            </h3>
            <p className="text-xs text-slate-400">
              Lista patrimonial completa com status e valor de aquisição
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Status */}
            <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/80 p-0.5 text-xs font-medium text-slate-400">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 font-bold text-white shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-slate-700 font-bold text-emerald-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter('maintenance')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'maintenance'
                    ? 'bg-slate-700 font-bold text-amber-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Manutenção
              </button>
              <button
                onClick={() => setStatusFilter('retired')}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  statusFilter === 'retired'
                    ? 'bg-slate-700 font-bold text-rose-400 shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                Baixados
              </button>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            {/* Exportar CSV */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Exportar equipamentos para CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Equipamento</th>
                <th className="py-2.5 px-3">Marca / Modelo</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Data de Compra</th>
                <th className="py-2.5 px-3">Origem do Recurso</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Valor de Aquisição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {eq.name}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {`${eq.brand || ''} ${eq.model || ''}`.trim() || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {eq.category || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {reportsService.formatDateBR(eq.purchase_date)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          eq.funding_source === 'company_cash'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        }`}
                      >
                        {eq.funding_source === 'company_cash' ? 'Caixa Oficina' : 'Proprietário'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          eq.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : eq.status === 'maintenance'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {eq.status === 'active'
                          ? 'Ativo'
                          : eq.status === 'maintenance'
                          ? 'Manutenção'
                          : 'Baixado'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-200">
                      {reportsService.formatCurrency(eq.purchase_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
