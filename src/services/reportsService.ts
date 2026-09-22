import {
  FinancialTransaction,
  CapitalContribution,
  ExecutedService,
  ExecutedServiceProductItem,
  Product,
  ProductBatch,
  StockMovement,
  Client,
  Vehicle,
  Equipment,
  ServiceCatalogItem,
  FinancialSummary,
} from '../types';
import { operationService, roundMoney } from './operationService';
import { dataService } from './dataService';

export type ReportsPeriod = 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string;
}

export interface ReportsRawData {
  transactions: FinancialTransaction[];
  contributions: CapitalContribution[];
  executedServices: ExecutedService[];
  stockMovements: StockMovement[];
  products: Product[];
  batches: ProductBatch[];
  clients: Client[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  servicesCatalog: ServiceCatalogItem[];
  financialSummary: FinancialSummary;
}

export const reportsService = {
  /**
   * Calcula o intervalo de datas idêntico à regra do Dashboard
   */
  getPeriodDateRange: (
    period: ReportsPeriod,
    customStartDate?: string,
    customEndDate?: string
  ): DateRange => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'today') {
      const todayStr = toYMD(now);
      return { start: todayStr, end: todayStr, label: 'Hoje' };
    }

    if (period === 'this_week') {
      const day = now.getDay();
      const diffStart = now.getDate() - day;
      const startDate = new Date(now.getFullYear(), now.getMonth(), diffStart);
      const endDate = new Date(now.getFullYear(), now.getMonth(), diffStart + 6);
      return { start: toYMD(startDate), end: toYMD(endDate), label: 'Esta Semana' };
    }

    if (period === 'this_month') {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return {
        start: toYMD(startDate),
        end: toYMD(endDate),
        label: `${monthNames[now.getMonth()]} de ${now.getFullYear()}`
      };
    }

    if (period === 'last_month') {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return {
        start: toYMD(startDate),
        end: toYMD(endDate),
        label: `${monthNames[startDate.getMonth()]} de ${startDate.getFullYear()}`
      };
    }

    // Custom
    const start = customStartDate || '1970-01-01';
    const end = customEndDate || '2099-12-31';
    return {
      start,
      end,
      label: `Personalizado (${start} a ${end})`
    };
  },

  /**
   * Carrega todos os dados dos módulos existentes no Supabase em paralelo
   */
  fetchAllReportsData: async (): Promise<ReportsRawData> => {
    const [
      transactions,
      contributions,
      executedServices,
      stockMovements,
      products,
      batches,
      clients,
      vehicles,
      equipment,
      servicesCatalog,
      financialSummary,
    ] = await Promise.all([
      operationService.getFinancialTransactions({ includeReversed: false }),
      operationService.getCapitalContributions(),
      operationService.getExecutedServices(),
      operationService.getProductStockMovements(),
      dataService.getProducts(),
      operationService.getProductBatches(undefined, 'desc'),
      dataService.getClients(),
      dataService.getVehicles(),
      dataService.getEquipment(),
      dataService.getServices(),
      operationService.getFinancialSummary(),
    ]);

    return {
      transactions,
      contributions,
      executedServices,
      stockMovements,
      products,
      batches,
      clients,
      vehicles,
      equipment,
      servicesCatalog,
      financialSummary,
    };
  },

  /**
   * Formatação monetária em padrão BRL
   */
  formatCurrency: (value: number | string | null | undefined): string => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  },

  /**
   * Formatação de data em padrão brasileiro (DD/MM/YYYY)
   */
  formatDateBR: (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  },

  /**
   * Exporta matriz de dados para arquivo CSV no navegador
   */
  exportToCsv: (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCell).join(';'),
      ...rows.map((row) => row.map(escapeCell).join(';')),
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
