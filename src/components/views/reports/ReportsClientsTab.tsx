import React, { useState, useMemo } from 'react';
import {
  Users,
  Car,
  UserPlus,
  Repeat,
  DollarSign,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { ReportsRawData, DateRange, reportsService } from '../../../services/reportsService';
import { roundMoney } from '../../../services/operationService';

interface ReportsClientsTabProps {
  data: ReportsRawData;
  dateRange: DateRange;
}

interface ClientReportRow {
  clientId: string;
  clientName: string;
  vehiclesSummary: string;
  periodServicesCount: number;
  totalServicesCount: number;
  lastServiceDate: string;
  periodTotalPaid: number;
  ticketMedio: number;
}

export const ReportsClientsTab: React.FC<ReportsClientsTabProps> = ({ data, dateRange }) => {
  const { clients, vehicles, executedServices } = data;
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Serviços concluídos e válidos (nunca cancelados)
  const allValidServices = useMemo(() => {
    return executedServices.filter((s) => s.status !== 'cancelled');
  }, [executedServices]);

  const periodServices = useMemo(() => {
    return allValidServices.filter((s) => {
      const sDate = (s.started_at || s.created_at).split('T')[0];
      return sDate >= dateRange.start && sDate <= dateRange.end;
    });
  }, [allValidServices, dateRange]);

  // 2. Indicadores Principais
  const stats = useMemo(() => {
    // Clientes atendidos no período
    const clientIdsInPeriod = new Set<string>();
    const vehicleIdsInPeriod = new Set<string>();

    for (const s of periodServices) {
      if (s.client_id) clientIdsInPeriod.add(s.client_id);
      if (s.vehicle_id) vehicleIdsInPeriod.add(s.vehicle_id);
    }

    // Novos clientes cadastrados no período
    const newClients = clients.filter((c) => {
      const cDate = c.created_at.split('T')[0];
      return cDate >= dateRange.start && cDate <= dateRange.end;
    });

    // Clientes recorrentes: mais de 1 atendimento concluído (histórico ou no período)
    const clientServiceCountMap = new Map<string, number>();
    for (const s of allValidServices) {
      if (s.client_id) {
        clientServiceCountMap.set(
          s.client_id,
          (clientServiceCountMap.get(s.client_id) || 0) + 1
        );
      }
    }

    let recurringCount = 0;
    for (const cId of clientIdsInPeriod) {
      if ((clientServiceCountMap.get(cId) || 0) > 1) {
        recurringCount++;
      }
    }

    // Média de serviços por cliente atendido no período
    const clientsServedCount = clientIdsInPeriod.size;
    const avgServicesPerClient =
      clientsServedCount > 0 ? (periodServices.length / clientsServedCount).toFixed(1) : '0';

    // Total pago por clientes no período
    const totalPaidInPeriod = roundMoney(
      periodServices
        .filter((s) => s.payment_status === 'paid')
        .reduce((acc, s) => acc + roundMoney(s.final_price || 0), 0)
    );

    const overallClientTicket =
      clientsServedCount > 0 ? roundMoney(totalPaidInPeriod / clientsServedCount) : 0;

    return {
      clientsServedCount,
      vehiclesServedCount: vehicleIdsInPeriod.size,
      newClientsCount: newClients.length,
      recurringCount,
      avgServicesPerClient,
      totalPaidInPeriod,
      overallClientTicket,
    };
  }, [clients, periodServices, allValidServices, dateRange]);

  // 3. Tabela Consolidada de Clientes Atendidos
  const clientRows = useMemo<ClientReportRow[]>(() => {
    // Mapear veículos por cliente
    const vehiclesByClient = new Map<string, string[]>();
    for (const v of vehicles) {
      const list = vehiclesByClient.get(v.client_id) || [];
      const desc = v.plate ? `${v.model} (${v.plate})` : v.model;
      list.push(desc);
      vehiclesByClient.set(v.client_id, list);
    }

    // Mapear serviços por cliente
    const clientPeriodServices = new Map<string, typeof periodServices>();
    const clientAllServices = new Map<string, typeof allValidServices>();

    for (const s of periodServices) {
      const list = clientPeriodServices.get(s.client_id) || [];
      list.push(s);
      clientPeriodServices.set(s.client_id, list);
    }

    for (const s of allValidServices) {
      const list = clientAllServices.get(s.client_id) || [];
      list.push(s);
      clientAllServices.set(s.client_id, list);
    }

    // Gerar linhas
    const rows: ClientReportRow[] = [];

    // Considera clientes que tiveram serviço no período ou todos os clientes com serviço
    const activeClientIds = Array.from(clientPeriodServices.keys());

    for (const cId of activeClientIds) {
      const client = clients.find((c) => c.id === cId);
      const cServicesPeriod = clientPeriodServices.get(cId) || [];
      const cServicesAll = clientAllServices.get(cId) || [];

      // Nome do cliente
      const name = client?.name || cServicesPeriod[0]?.client_name_snap || 'Cliente';

      // Veículos
      const vList = vehiclesByClient.get(cId) || [];
      const vehiclesSummary = vList.length > 0 ? vList.join(', ') : '-';

      // Último atendimento
      const sortedByDate = [...cServicesAll].sort((a, b) => {
        const da = a.started_at || a.created_at;
        const db = b.started_at || b.created_at;
        return db.localeCompare(da);
      });
      const lastDate = sortedByDate[0]
        ? (sortedByDate[0].started_at || sortedByDate[0].created_at).split('T')[0]
        : '-';

      // Total pago no período
      const paidServices = cServicesPeriod.filter((s) => s.payment_status === 'paid');
      const periodTotalPaid = roundMoney(
        paidServices.reduce((acc, s) => acc + roundMoney(s.final_price || 0), 0)
      );

      // Ticket médio
      const ticketMedio =
        paidServices.length > 0 ? roundMoney(periodTotalPaid / paidServices.length) : 0;

      rows.push({
        clientId: cId,
        clientName: name,
        vehiclesSummary,
        periodServicesCount: cServicesPeriod.length,
        totalServicesCount: cServicesAll.length,
        lastServiceDate: lastDate,
        periodTotalPaid,
        ticketMedio,
      });
    }

    return rows.sort((a, b) => b.periodTotalPaid - a.periodTotalPaid);
  }, [clients, vehicles, periodServices, allValidServices]);

  // Filtragem da tabela por busca
  const filteredRows = useMemo(() => {
    if (!searchTerm) return clientRows;
    const q = searchTerm.toLowerCase();
    return clientRows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.vehiclesSummary.toLowerCase().includes(q)
    );
  }, [clientRows, searchTerm]);

  // Exportar CSV
  const handleExportCsv = () => {
    const headers = [
      'Cliente',
      'Veículos',
      'Serviços no Período',
      'Histórico Total Serviços',
      'Último Atendimento',
      'Total Pago no Período (R$)',
      'Ticket Médio (R$)',
    ];

    const rows = filteredRows.map((r) => [
      r.clientName,
      r.vehiclesSummary,
      r.periodServicesCount,
      r.totalServicesCount,
      reportsService.formatDateBR(r.lastServiceDate),
      r.periodTotalPaid.toFixed(2),
      r.ticketMedio.toFixed(2),
    ]);

    reportsService.exportToCsv('relatorio_clientes_veiculos', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards Principais de Clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clientes Atendidos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Clientes Atendidos
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {stats.clientsServedCount}
            </span>
            <span className="text-xs text-slate-400">clientes únicos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats.vehiclesServedCount} veículos atendidos no período
          </p>
        </div>

        {/* Novos Clientes Cadastrados */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Novos Clientes
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {stats.newClientsCount}
            </span>
            <span className="text-xs text-slate-400">cadastros</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Cadastrados no intervalo do período
          </p>
        </div>

        {/* Clientes Recorrentes */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Clientes Recorrentes
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-300">
              {stats.recurringCount}
            </span>
            <span className="text-xs text-slate-400">com fidelidade</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Mais de 1 serviço no histórico da oficina
          </p>
        </div>

        {/* Média de Serviços por Cliente */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Média por Cliente
            </span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-teal-400">
              {stats.avgServicesPerClient}
            </span>
            <span className="text-xs text-slate-400">serviços/cliente</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Ticket médio: {reportsService.formatCurrency(stats.overallClientTicket)}
          </p>
        </div>
      </div>

      {/* Tabela de Histórico de Atendimentos por Cliente / Veículo */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Histórico de Atendimentos por Cliente
            </h3>
            <p className="text-xs text-slate-400">
              Relação dos clientes atendidos no período com veículos, frequência e valor pago
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar cliente ou veículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              title="Exportar clientes para CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Veículo(s) Vinculado(s)</th>
                <th className="py-2.5 px-3 text-center">Serviços no Período</th>
                <th className="py-2.5 px-3 text-center">Total Histórico</th>
                <th className="py-2.5 px-3 text-center">Último Atendimento</th>
                <th className="py-2.5 px-3 text-right">Total Pago (Período)</th>
                <th className="py-2.5 px-3 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                    Nenhum cliente com atendimentos registrados no período selecionado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.clientId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {r.clientName}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 truncate max-w-[200px]">
                      {r.vehiclesSummary}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-indigo-300">
                      {r.periodServicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      {r.totalServicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {reportsService.formatDateBR(r.lastServiceDate)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                      {reportsService.formatCurrency(r.periodTotalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-teal-400">
                      {reportsService.formatCurrency(r.ticketMedio)}
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
