/**
 * Garage Car - Módulo de Operação (FASE 3)
 * Agenda, Execução de Serviços, FIFO de Lotes, Estoque Negativo, Snapshots e Pagamentos.
 *
 * Regras estritas:
 * - Snapshots imutáveis de valores, categorias, cliente e custos
 * - FIFO por data de compra de lotes (mais antigo primeiro)
 * - Suporte a múltiplos lotes no mesmo serviço
 * - Seleção manual de lote quando desejado
 * - Estoque insuficiente NUNCA bloqueia a finalização (gera saldo negativo e alerta)
 * - Conflito de horários alerta, mas não bloqueia
 * - Horário fora do padrão de funcionamento alerta, mas não bloqueia
 * - Walk-in permitido sem agendamento prévio
 * - Concluído NÃO significa automaticamente Pago
 * - Cancelamento seguro sem exclusão física
 */

import {
  Appointment,
  AppointmentStatus,
  ExecutedService,
  ExecutedServiceProductItem,
  ProductBatch,
  CreateBatchPurchasePayload,
  StockMovement,
  PaymentStatus,
  PaymentMethod,
  ConditionLevel,
  CommercialCategory,
  SystemSettings,
  FifoBatchAllocation,
  ProductConsumptionInput,
  ServiceDefaultProductItem,
  Client,
  Vehicle,
  ServiceCatalogItem,
  Product,
  FinancialTransaction,
  FinancialTransactionType,
  FinancialTransactionFilters,
  CreateFinancialExpensePayload,
  CreateFinancialRevenuePayload,
  CapitalContribution,
  CapitalContributionType,
  CreateCapitalContributionPayload,
  FinancialSummary,
} from '../types';
import { getSupabaseClient, isDemoModeActive } from '../lib/supabase';
import { DEFAULT_PRODUCTS } from './dataService';

// Chaves de armazenamento local da Fase 3
export const OPERATION_STORAGE_KEYS = {
  APPOINTMENTS: 'garage_car_appointments_v3',
  EXECUTED_SERVICES: 'garage_car_executed_services_v3',
  EXECUTED_SERVICE_PRODUCTS: 'garage_car_executed_service_products_v3',
  PRODUCT_BATCHES: 'garage_car_product_batches_v3',
  STOCK_MOVEMENTS: 'garage_car_stock_movements_v3',
  SYSTEM_SETTINGS: 'garage_car_system_settings_v3',
  FINANCIAL_TRANSACTIONS: 'garage_car_financial_transactions_v3',
  CAPITAL_CONTRIBUTIONS: 'garage_car_capital_contributions_v3',
};

// ====================================================================
// 1. SEEDS DE CONFIGURAÇÕES DO SISTEMA (HORÁRIOS E ACRÉSCIMOS)
// ====================================================================

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  company_name: 'Garage Car',
  business_hours: {
    monday: { open: '08:00', close: '18:00', isOpen: true },
    tuesday: { open: '08:00', close: '18:00', isOpen: true },
    wednesday: { open: '08:00', close: '18:00', isOpen: true },
    thursday: { open: '08:00', close: '18:00', isOpen: true },
    friday: { open: '08:00', close: '18:00', isOpen: true },
    saturday: { open: '08:00', close: '13:00', isOpen: true },
    sunday: { open: '08:00', close: '12:00', isOpen: false },
  },
  condition_surcharges: {
    normal: 0.0,
    above_normal: 10.0,
    heavy: 20.0,
    extreme: 40.0,
  },
};

// ====================================================================
// 2. SEEDS DE LOTES DE PRODUTOS (INCLUINDO CENÁRIO DE TESTE FIFO)
// ====================================================================

export const DEFAULT_PRODUCT_BATCHES: ProductBatch[] = [
  // V-Floc (p-2): 2 lotes para teste direto de FIFO (Requisito TESTE 5)
  // Lote A: mais antigo, saldo 100ml, R$ 0,018/ml
  {
    id: 'batch-vf-a',
    product_id: 'p-2',
    batch_code: 'LOTE-VF-A',
    purchase_date: '2025-01-10',
    initial_quantity: 500,
    current_quantity: 100,
    total_cost: 9.0,
    unit_cost: 0.018,
    supplier: 'Distribuidor Estética SP',
    funding_source: 'company_cash',
    notes: 'Lote A mais antigo para teste FIFO',
    created_at: '2025-01-10T10:00:00Z',
  },
  // Lote B: mais recente, saldo 3000ml, R$ 0,016/ml
  {
    id: 'batch-vf-b',
    product_id: 'p-2',
    batch_code: 'LOTE-VF-B',
    purchase_date: '2025-02-01',
    initial_quantity: 3000,
    current_quantity: 3000,
    total_cost: 48.0,
    unit_cost: 0.016,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Lote B mais novo para teste FIFO',
    created_at: '2025-02-01T10:00:00Z',
  },

  // Ultra Limpador (p-1): R$ 0,012/ml (R$ 60 por 5L)
  {
    id: 'batch-ultra-1',
    product_id: 'p-1',
    batch_code: 'LOTE-ULTRA-01',
    purchase_date: '2025-01-05',
    initial_quantity: 5000,
    current_quantity: 5000,
    total_cost: 60.0,
    unit_cost: 0.012,
    supplier: 'Distribuidor Químico',
    funding_source: 'company_cash',
    notes: 'Galão APC concentrado',
    created_at: '2025-01-05T10:00:00Z',
  },

  // D-Remov (p-3): R$ 0,015/ml (R$ 45 por 3L)
  {
    id: 'batch-dremov-1',
    product_id: 'p-3',
    batch_code: 'LOTE-DREMOV-01',
    purchase_date: '2025-01-08',
    initial_quantity: 3000,
    current_quantity: 3000,
    total_cost: 45.0,
    unit_cost: 0.015,
    supplier: 'Delux Distribuição',
    funding_source: 'company_cash',
    notes: 'Desengraxante alcalino',
    created_at: '2025-01-08T10:00:00Z',
  },

  // Glazy (p-7): R$ 0,024/ml (R$ 36 por 1.5L)
  {
    id: 'batch-glazy-1',
    product_id: 'p-7',
    batch_code: 'LOTE-GLAZY-01',
    purchase_date: '2025-01-15',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 36.0,
    unit_cost: 0.024,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Limpa Vidros cristalino',
    created_at: '2025-01-15T10:00:00Z',
  },

  // Darker (p-18): R$ 0,020/ml (R$ 60 por 3L)
  {
    id: 'batch-darker-1',
    product_id: 'p-18',
    batch_code: 'LOTE-DARKER-01',
    purchase_date: '2025-01-15',
    initial_quantity: 3000,
    current_quantity: 3000,
    total_cost: 60.0,
    unit_cost: 0.02,
    supplier: 'Vintex Oficial',
    funding_source: 'company_cash',
    notes: 'Pretinho para pneus',
    created_at: '2025-01-15T10:00:00Z',
  },

  // Aromatizante (p-12): R$ 4,50 / un
  {
    id: 'batch-aroma-1',
    product_id: 'p-12',
    batch_code: 'LOTE-AROMA-01',
    purchase_date: '2025-01-18',
    initial_quantity: 20,
    current_quantity: 20,
    total_cost: 90.0,
    unit_cost: 4.5,
    supplier: 'Bugatti Aromas',
    funding_source: 'company_cash',
    notes: 'Fragrâncias spray premium',
    created_at: '2025-01-18T10:00:00Z',
  },

  // Sintra (p-4): R$ 0,015/ml
  {
    id: 'batch-sintra-1',
    product_id: 'p-4',
    batch_code: 'LOTE-SINTRA-01',
    purchase_date: '2025-01-12',
    initial_quantity: 5000,
    current_quantity: 5000,
    total_cost: 75.0,
    unit_cost: 0.015,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Bactericida flotador',
    created_at: '2025-01-12T10:00:00Z',
  },

  // Intense (p-5): R$ 0,025/ml
  {
    id: 'batch-intense-1',
    product_id: 'p-5',
    batch_code: 'LOTE-INT-01',
    purchase_date: '2025-01-14',
    initial_quantity: 2000,
    current_quantity: 2000,
    total_cost: 50.0,
    unit_cost: 0.025,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Renovador de plásticos',
    created_at: '2025-01-14T10:00:00Z',
  },

  // Reboot (p-6): R$ 0,040/ml
  {
    id: 'batch-reboot-1',
    product_id: 'p-6',
    batch_code: 'LOTE-RB-01',
    purchase_date: '2025-01-20',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 60.0,
    unit_cost: 0.04,
    supplier: 'Dub Oficial',
    funding_source: 'company_cash',
    notes: 'Descontaminante ferroso',
    created_at: '2025-01-20T10:00:00Z',
  },

  // Blend Cera Líquida (p-9): R$ 0,050/ml
  {
    id: 'batch-blend-1',
    product_id: 'p-9',
    batch_code: 'LOTE-BL-01',
    purchase_date: '2025-01-22',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 75.0,
    unit_cost: 0.05,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Cera de sílica e carnaúba',
    created_at: '2025-01-22T10:00:00Z',
  },

  // Luminous Black (p-8): R$ 0,030/ml
  {
    id: 'batch-luminous-1',
    product_id: 'p-8',
    batch_code: 'LOTE-LB-01',
    purchase_date: '2025-01-25',
    initial_quantity: 2000,
    current_quantity: 2000,
    total_cost: 60.0,
    unit_cost: 0.03,
    supplier: 'Evo Auto',
    funding_source: 'company_cash',
    notes: 'Pretinho com brilho molhado',
    created_at: '2025-01-25T10:00:00Z',
  },

  // Higicouro (p-10): R$ 0,030/ml
  {
    id: 'batch-higi-1',
    product_id: 'p-10',
    batch_code: 'LOTE-HC-01',
    purchase_date: '2025-01-28',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 45.0,
    unit_cost: 0.03,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Limpeza suave couro',
    created_at: '2025-01-28T10:00:00Z',
  },

  // Hidracouro (p-11): R$ 0,0366/ml
  {
    id: 'batch-hidra-1',
    product_id: 'p-11',
    batch_code: 'LOTE-HDC-01',
    purchase_date: '2025-01-28',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 55.0,
    unit_cost: 0.0366,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Hidratante couro fosco',
    created_at: '2025-01-28T10:00:00Z',
  },

  // Lubrificante de corrente (p-14): R$ 0,040/ml
  {
    id: 'batch-lub-1',
    product_id: 'p-14',
    batch_code: 'LOTE-LUB-01',
    purchase_date: '2025-02-01',
    initial_quantity: 1200,
    current_quantity: 1200,
    total_cost: 48.0,
    unit_cost: 0.04,
    supplier: 'Mobil Distribuição',
    funding_source: 'company_cash',
    notes: 'Lubrificante sintético corrente moto',
    created_at: '2025-02-01T10:00:00Z',
  },

  // Focus (p-15): R$ 0,030/ml
  {
    id: 'batch-focus-1',
    product_id: 'p-15',
    batch_code: 'LOTE-FCS-01',
    purchase_date: '2025-02-05',
    initial_quantity: 1500,
    current_quantity: 1500,
    total_cost: 45.0,
    unit_cost: 0.03,
    supplier: 'Vonixx Oficial',
    funding_source: 'company_cash',
    notes: 'Desengordurante de vidros',
    created_at: '2025-02-05T10:00:00Z',
  },

  // Glaco (p-16): R$ 0,300/ml
  {
    id: 'batch-glaco-1',
    product_id: 'p-16',
    batch_code: 'LOTE-GLC-01',
    purchase_date: '2025-02-05',
    initial_quantity: 300,
    current_quantity: 300,
    total_cost: 90.0,
    unit_cost: 0.3,
    supplier: 'Soft99 Brasil',
    funding_source: 'company_cash',
    notes: 'Repelente japonês',
    created_at: '2025-02-05T10:00:00Z',
  },
];

// ====================================================================
// 3. SEEDS DE CONSUMO PADRÃO POR SERVIÇO (REQUISITO 11)
// ====================================================================

export const DEFAULT_SERVICE_CONSUMPTION_RECIPES: Record<string, ServiceDefaultProductItem[]> = {
  // s-1: Lavagem Convencional
  // Ultra: 50 ml, V-Floc: 10 ml, D-Remov: 10 ml, Glazy: 5 ml, Darker: 10 ml, Aromatizante: 1 un
  's-1': [
    { product_id: 'p-1', product_name: 'Ultra Limpador', suggested_quantity: 50, unit: 'ml' },
    { product_id: 'p-2', product_name: 'V-Floc', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-3', product_name: 'D-Remov', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-7', product_name: 'Glazy', suggested_quantity: 5, unit: 'ml' },
    { product_id: 'p-18', product_name: 'Darker', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-12', product_name: 'Aromatizante', suggested_quantity: 1, unit: 'un' },
  ],

  // s-2: Lavagem Técnica
  's-2': [
    { product_id: 'p-2', product_name: 'V-Floc', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-3', product_name: 'D-Remov', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-4', product_name: 'Sintra', suggested_quantity: 25, unit: 'ml' },
    { product_id: 'p-5', product_name: 'Intense', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-7', product_name: 'Glazy', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-18', product_name: 'Darker', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-6', product_name: 'Reboot', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-9', product_name: 'Blend Cera Líquida', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-12', product_name: 'Aromatizante', suggested_quantity: 1, unit: 'un' },
  ],

  // s-3: Lavagem Premium
  's-3': [
    { product_id: 'p-2', product_name: 'V-Floc', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-3', product_name: 'D-Remov', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-4', product_name: 'Sintra', suggested_quantity: 40, unit: 'ml' },
    { product_id: 'p-5', product_name: 'Intense', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-7', product_name: 'Glazy', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-8', product_name: 'Luminous Black', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-6', product_name: 'Reboot', suggested_quantity: 40, unit: 'ml' },
    { product_id: 'p-9', product_name: 'Blend Cera Líquida', suggested_quantity: 30, unit: 'ml' },
    { product_id: 'p-10', product_name: 'Higicouro', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-11', product_name: 'Hidracouro', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-12', product_name: 'Aromatizante', suggested_quantity: 1, unit: 'un' },
  ],

  // s-4: Lavagem Convencional Moto
  's-4': [
    { product_id: 'p-2', product_name: 'V-Floc', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-3', product_name: 'D-Remov', suggested_quantity: 10, unit: 'ml' },
    { product_id: 'p-18', product_name: 'Darker', suggested_quantity: 5, unit: 'ml' },
    { product_id: 'p-14', product_name: 'Lubrificante de corrente', suggested_quantity: 15, unit: 'ml' },
  ],

  // s-5: Lavagem Técnica Moto
  's-5': [
    { product_id: 'p-2', product_name: 'V-Floc', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-3', product_name: 'D-Remov', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-6', product_name: 'Reboot', suggested_quantity: 20, unit: 'ml' },
    { product_id: 'p-9', product_name: 'Blend Cera Líquida', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-14', product_name: 'Lubrificante de corrente', suggested_quantity: 25, unit: 'ml' },
  ],

  // s-6: Cristalização de Para-brisa
  's-6': [
    { product_id: 'p-16', product_name: 'Glaco', suggested_quantity: 15, unit: 'ml' },
    { product_id: 'p-15', product_name: 'Focus', suggested_quantity: 15, unit: 'ml' },
  ],

  // s-7: Remoção de Chuva Ácida
  's-7': [
    { product_id: 'p-15', product_name: 'Focus', suggested_quantity: 30, unit: 'ml' },
    { product_id: 'p-7', product_name: 'Glazy', suggested_quantity: 10, unit: 'ml' },
  ],

  // s-8: Higienização de Bancos
  's-8': [
    { product_id: 'p-4', product_name: 'Sintra', suggested_quantity: 80, unit: 'ml' },
    { product_id: 'p-1', product_name: 'Ultra Limpador', suggested_quantity: 80, unit: 'ml' },
  ],
};

// ====================================================================
// 4. SEEDS INICIAIS DE AGENDAMENTOS E SERVIÇOS EXECUTADOS
// ====================================================================

const getTodayDateStr = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const DEFAULT_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    client_id: 'cli-4',
    vehicle_id: 'veh-5',
    service_catalog_id: 's-1',
    scheduled_date: getTodayDateStr(),
    scheduled_start: '09:00',
    scheduled_end: '10:00',
    estimated_duration_minutes: 60,
    estimated_price: 90.0,
    condition_level: 'normal',
    surcharge_amount: 0,
    discount_amount: 0,
    status: 'scheduled',
    is_exceptional_hours: false,
    notes: 'Cliente prefere aromatizante suave.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'apt-2',
    client_id: 'cli-2',
    vehicle_id: 'veh-2',
    service_catalog_id: 's-2',
    scheduled_date: getTodayDateStr(),
    scheduled_start: '14:00',
    scheduled_end: '15:45',
    estimated_duration_minutes: 105,
    estimated_price: 129.9,
    condition_level: 'above_normal',
    surcharge_amount: 10.0,
    discount_amount: 0,
    status: 'scheduled',
    is_exceptional_hours: false,
    notes: 'Veículo voltou de viagem de sítio.',
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_EXECUTED_SERVICES: ExecutedService[] = [
  {
    id: 'exec-demo-1',
    client_id: 'cli-1',
    vehicle_id: 'veh-1',
    service_catalog_id: 's-1',
    status: 'completed',
    client_name_snap: 'Carlos Eduardo Mendes',
    vehicle_model_snap: 'Chevrolet Onix Plus',
    vehicle_plate_snap: 'BRA2E19',
    vehicle_category_snap: 'Carro / Compacto',
    service_name_snap: 'Lavagem Convencional',
    base_price_snap: 70.0,
    condition_level: 'normal',
    surcharge_amount: 0.0,
    discount_amount: 0.0,
    final_price: 70.0,
    started_at: '2025-02-15T09:00:00Z',
    finished_at: '2025-02-15T11:00:00Z',
    actual_duration_minutes: 120,
    revenue_per_hour: 35.0, // R$ 70 / 2h = R$ 35/h
    is_rework: false,
    total_products_cost: 5.48,
    simple_gross_margin: 64.52,
    simple_gross_margin_percent: 92.17,
    payment_status: 'paid',
    payment_method: 'pix',
    paid_at: '2025-02-15T11:05:00Z',
    notes: 'Primeiro atendimento do dia concluído com excelência.',
    created_at: '2025-02-15T09:00:00Z',
    updated_at: '2025-02-15T11:05:00Z',
    used_products: [
      {
        id: 'used-p-1',
        executed_service_id: 'exec-demo-1',
        product_id: 'p-1',
        batch_id: 'batch-ultra-1',
        product_name_snap: 'Ultra Limpador',
        batch_code_snap: 'LOTE-ULTRA-01',
        quantity_used: 50,
        unit: 'ml',
        unit_cost_snap: 0.012,
        total_cost_snap: 0.6,
        created_at: '2025-02-15T11:00:00Z',
      },
      {
        id: 'used-p-2',
        executed_service_id: 'exec-demo-1',
        product_id: 'p-2',
        batch_id: 'batch-vf-a',
        product_name_snap: 'V-Floc',
        batch_code_snap: 'LOTE-VF-A',
        quantity_used: 10,
        unit: 'ml',
        unit_cost_snap: 0.018,
        total_cost_snap: 0.18,
        created_at: '2025-02-15T11:00:00Z',
      },
      {
        id: 'used-p-3',
        executed_service_id: 'exec-demo-1',
        product_id: 'p-12',
        batch_id: 'batch-aroma-1',
        product_name_snap: 'Aromatizante',
        batch_code_snap: 'LOTE-AROMA-01',
        quantity_used: 1,
        unit: 'un',
        unit_cost_snap: 4.5,
        total_cost_snap: 4.5,
        created_at: '2025-02-15T11:00:00Z',
      },
    ],
  },
];

// ====================================================================
// STORAGE HELPERS INTERNOS
// ====================================================================

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao gravar storage (${key}):`, err);
  }
}

/**
 * Utilitário contábil estrito para valores monetários:
 * Garante arredondamento de 2 casas decimais com precisão segura contra dízimas de ponto flutuante.
 */
export const roundMoney = (val: number | string | null | undefined): number => {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Inicializa dados operacionais da Fase 3
export function initializeOperationSeedData(): void {
  if (getSupabaseClient() && !isDemoModeActive()) {
    return;
  }
  getLocal(OPERATION_STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SYSTEM_SETTINGS);
  getLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);
  getLocal(OPERATION_STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);
  getLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, DEFAULT_EXECUTED_SERVICES);
  getLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
  getLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICE_PRODUCTS, []);
  getLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, []);
  getLocal(OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS, []);
}

initializeOperationSeedData();

// ====================================================================
// SERVIÇOS OPERACIONAIS (OPERATION SERVICE)
// ====================================================================

export const operationService = {
  // -------------------------------------------------------------
  // CONFIGURAÇÕES DO SISTEMA (HORÁRIOS & PREÇOS DE CONDIÇÃO)
  // -------------------------------------------------------------
  getSystemSettings: async (): Promise<SystemSettings> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      try {
        const { data, error } = await sb.from('system_settings').select('*');
        if (!error && data && data.length > 0) {
          const bh = data.find((d: any) => d.setting_key === 'business_hours');
          const cs = data.find((d: any) => d.setting_key === 'condition_surcharges');
          const cp = data.find((d: any) => d.setting_key === 'company_profile');
          return {
            company_name: cp?.setting_value?.name || DEFAULT_SYSTEM_SETTINGS.company_name,
            business_hours: bh?.setting_value || DEFAULT_SYSTEM_SETTINGS.business_hours,
            condition_surcharges: cs?.setting_value || DEFAULT_SYSTEM_SETTINGS.condition_surcharges,
          };
        }
      } catch (err) {
        console.warn('Falha ao ler configurações do Supabase, usando fallback:', err);
      }
    }
    return getLocal<SystemSettings>(OPERATION_STORAGE_KEYS.SYSTEM_SETTINGS, DEFAULT_SYSTEM_SETTINGS);
  },

  saveSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const current = await operationService.getSystemSettings();
    const updated: SystemSettings = {
      ...current,
      ...settings,
    };
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const now = new Date().toISOString();
      if (settings.business_hours) {
        await sb.from('system_settings').upsert({
          setting_key: 'business_hours',
          setting_value: updated.business_hours,
          updated_at: now,
        }, { onConflict: 'setting_key' });
      }
      if (settings.condition_surcharges) {
        await sb.from('system_settings').upsert({
          setting_key: 'condition_surcharges',
          setting_value: updated.condition_surcharges,
          updated_at: now,
        }, { onConflict: 'setting_key' });
      }
      if (settings.company_name) {
        await sb.from('system_settings').upsert({
          setting_key: 'company_profile',
          setting_value: { name: updated.company_name },
          updated_at: now,
        }, { onConflict: 'setting_key' });
      }
      return updated;
    }
    setLocal(OPERATION_STORAGE_KEYS.SYSTEM_SETTINGS, updated);
    return updated;
  },

  isExceptionalHour: async (dateStr: string, startTime: string, endTime: string): Promise<boolean> => {
    try {
      const settings = await operationService.getSystemSettings();
      // Dia da semana: 0=domingo, 1=segunda, etc.
      const dateObj = new Date(`${dateStr}T12:00:00`);
      const dayIndex = dateObj.getDay();
      const dayMap: (keyof SystemSettings['business_hours'])[] = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const dayKey = dayMap[dayIndex];
      const dayConfig = settings.business_hours[dayKey];

      if (!dayConfig || !dayConfig.isOpen) {
        return true; // Fechado no dia = horário excepcional
      }

      // Converte HH:MM para minutos
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      const startMin = toMin(startTime);
      const endMin = toMin(endTime);
      const openMin = toMin(dayConfig.open);
      const closeMin = toMin(dayConfig.close);

      return startMin < openMin || endMin > closeMin;
    } catch {
      return false;
    }
  },

  // -------------------------------------------------------------
  // LOTES DE PRODUTOS & CONTROLE FIFO
  // -------------------------------------------------------------
  getProductBatches: async (productId?: string, orderByDate: 'asc' | 'desc' = 'desc'): Promise<ProductBatch[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb
        .from('product_batches')
        .select('*, product:products(*)')
        .order('purchase_date', { ascending: orderByDate === 'asc' })
        .order('created_at', { ascending: orderByDate === 'asc' });
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar lotes no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as ProductBatch[];
    }

    const batches = getLocal<ProductBatch[]>(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);
    const localProducts = getLocal<Product[]>('garage_car_products_v2', []);

    const enrichedBatches = batches.map((b) => {
      if (!b.product && localProducts.length > 0) {
        const p = localProducts.find((lp) => lp.id === b.product_id);
        return { ...b, product: p };
      }
      return b;
    });

    let filtered = productId ? enrichedBatches.filter((b) => b.product_id === productId) : enrichedBatches;

    return filtered.sort((a, b) => {
      const cmp = (a.purchase_date || '').localeCompare(b.purchase_date || '');
      return orderByDate === 'asc' ? cmp : -cmp;
    });
  },

  /**
   * Registro Transacionado de Compra / Novo Lote
   * 1. Valida quantidade (>0) e custo (>=0)
   * 2. Calcula custo unitário: total_cost / initial_quantity (com 4 casas decimais)
   * 3. Registra em product_batches
   * 4. Registra movimentação de compra em stock_movements
   * 5. Incrementa o estoque consolidado em products.current_stock
   */
  registerProductPurchase: async (payload: CreateBatchPurchasePayload): Promise<ProductBatch> => {
    const now = new Date().toISOString();
    const quantity = Number(payload.initial_quantity);
    const totalCost = Number(payload.total_cost);

    if (!payload.product_id) {
      throw new Error('O produto é obrigatório.');
    }
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('A quantidade comprada deve ser maior que zero.');
    }
    if (isNaN(totalCost) || totalCost < 0) {
      throw new Error('O custo total não pode ser negativo.');
    }

    const unitCost = Math.round((totalCost / quantity) * 10000) / 10000;
    const batchCode = payload.batch_code?.trim()
      ? payload.batch_code.trim()
      : `LOTE-${(payload.purchase_date || now.split('T')[0]).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      // 1. Tentar executar a RPC transacionada no Supabase
      let rpcBatchId: string | null = null;
      try {
        const { data: rpcRes, error: rpcErr } = await sb.rpc('register_product_purchase', {
          p_product_id: payload.product_id,
          p_batch_code: batchCode,
          p_purchase_date: payload.purchase_date,
          p_quantity: quantity,
          p_total_cost: totalCost,
          p_supplier: payload.supplier?.trim() || '',
          p_funding_source: payload.funding_source || 'company_cash',
          p_notes: payload.notes?.trim() || '',
        });

        if (!rpcErr && rpcRes && rpcRes.batch_id) {
          rpcBatchId = rpcRes.batch_id;
        } else if (rpcErr) {
          console.warn('RPC register_product_purchase falhou ou não existe, executando fluxo direto autenticado:', rpcErr);
        }
      } catch (err) {
        console.warn('Exceção ao chamar RPC register_product_purchase, executando fallback direto:', err);
      }

      // 2. Se a RPC não foi executada ou não existe, realizar as operações com cliente autenticado
      if (!rpcBatchId) {
        // Valida produto ativo
        const { data: prod, error: prodErr } = await sb
          .from('products')
          .select('*')
          .eq('id', payload.product_id)
          .single();

        if (prodErr || !prod) {
          throw new Error('Produto selecionado não encontrado no banco de dados.');
        }
        if (!prod.is_active) {
          throw new Error(`O produto "${prod.name}" está inativo para novas compras.`);
        }

        const prevStock = Number(prod.current_stock || 0);
        const newStock = prevStock + quantity;

        // Inserir lote
        const { data: insertedBatch, error: batchErr } = await sb
          .from('product_batches')
          .insert({
            product_id: payload.product_id,
            batch_code: batchCode,
            purchase_date: payload.purchase_date,
            initial_quantity: quantity,
            current_quantity: quantity,
            total_cost: totalCost,
            unit_cost: unitCost,
            supplier: payload.supplier?.trim() || '',
            funding_source: payload.funding_source || 'company_cash',
            notes: payload.notes?.trim() || '',
          })
          .select('*, product:products(*)')
          .single();

        if (batchErr || !insertedBatch) {
          throw new Error(`Erro ao cadastrar lote no Supabase: ${batchErr?.message || 'Falha desconhecida'}`);
        }

        rpcBatchId = insertedBatch.id;

        // Atualizar estoque consolidado do produto
        await sb
          .from('products')
          .update({
            current_stock: newStock,
            updated_at: now,
          })
          .eq('id', payload.product_id);

        // Inserir movimentação em stock_movements
        await sb.from('stock_movements').insert({
          product_id: payload.product_id,
          batch_id: insertedBatch.id,
          movement_type: 'purchase',
          quantity: quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Entrada por compra - Lote ${batchCode}`,
          created_at: now,
        });
      }

      // 3. Buscar lote atualizado com relacionamento do produto
      const { data: freshBatch, error: fetchErr } = await sb
        .from('product_batches')
        .select('*, product:products(*)')
        .eq('id', rpcBatchId)
        .single();

      if (fetchErr || !freshBatch) {
        throw new Error('Compra registrada, mas houve falha ao carregar o lote atualizado.');
      }

      // 4. Integração Financeira Automática
      if (payload.funding_source === 'company_cash') {
        try {
          await operationService.createFinancialExpense({
            category: 'Insumos / Estoque',
            description: `Compra Lote ${batchCode} - ${freshBatch.product?.name || 'Insumo'}`,
            amount: totalCost,
            transaction_date: payload.purchase_date,
            payment_method: 'other',
          });
        } catch (finErr: any) {
          console.error('Erro na integração financeira da compra company_cash:', finErr);
          throw new Error(
            `Compra com recursos da empresa (company_cash) falhou ao registrar a saída financeira no caixa: ${finErr?.message || 'Erro desconhecido'}`
          );
        }
      } else if (payload.funding_source === 'owner_contribution') {
        try {
          await operationService.createCapitalContribution({
            contribution_type: 'owner_paid_purchase',
            description: `Compra Lote ${batchCode} pelo proprietário - ${freshBatch.product?.name || 'Insumo'}`,
            amount: totalCost,
            contribution_date: payload.purchase_date,
            batch_id: freshBatch.id,
          });
        } catch (contribErr: any) {
          console.error('Erro no registro de aporte do proprietário (owner_contribution):', contribErr);
          throw new Error(
            `Compra por aporte do proprietário falhou ao registrar em aportes: ${contribErr?.message || 'Erro desconhecido'}`
          );
        }
      }

      return freshBatch as ProductBatch;
    }

    // Fallback Local (Demo / Offline)
    const localProducts = getLocal<Product[]>('garage_car_products_v2', []);
    const productIdx = localProducts.findIndex((p) => p.id === payload.product_id);
    if (productIdx < 0) {
      throw new Error('Produto selecionado não encontrado.');
    }
    const targetProduct = localProducts[productIdx];
    if (!targetProduct.is_active) {
      throw new Error(`O produto "${targetProduct.name}" está inativo.`);
    }

    const prevStock = Number(targetProduct.current_stock || 0);
    const newStock = prevStock + quantity;
    targetProduct.current_stock = newStock;
    targetProduct.updated_at = now;
    localProducts[productIdx] = targetProduct;
    setLocal('garage_car_products_v2', localProducts);

    const newBatch: ProductBatch = {
      id: crypto.randomUUID(),
      product_id: payload.product_id,
      batch_code: batchCode,
      purchase_date: payload.purchase_date,
      initial_quantity: quantity,
      current_quantity: quantity,
      total_cost: totalCost,
      unit_cost: unitCost,
      supplier: payload.supplier?.trim() || '',
      funding_source: payload.funding_source || 'company_cash',
      notes: payload.notes?.trim() || '',
      created_at: now,
      product: targetProduct,
    };

    const batches = getLocal<ProductBatch[]>(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);
    batches.unshift(newBatch);
    setLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, batches);

    const movements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    movements.unshift({
      id: crypto.randomUUID(),
      product_id: payload.product_id,
      batch_id: newBatch.id,
      movement_type: 'purchase',
      quantity: quantity,
      previous_stock: prevStock,
      new_stock: newStock,
      reason: `Entrada por compra - Lote ${batchCode}`,
      created_at: now,
    });
    setLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, movements);

    // Integração Financeira Local
    if (payload.funding_source === 'company_cash') {
      try {
        await operationService.createFinancialExpense({
          category: 'Insumos / Estoque',
          description: `Compra Lote ${batchCode} - ${targetProduct.name}`,
          amount: totalCost,
          transaction_date: payload.purchase_date,
          payment_method: 'other',
        });
      } catch (finErr: any) {
        console.error('Erro na integração financeira local da compra company_cash:', finErr);
        throw new Error(
          `Compra com recursos da empresa (company_cash) falhou ao registrar a saída financeira no caixa: ${finErr?.message || 'Erro desconhecido'}`
        );
      }
    } else if (payload.funding_source === 'owner_contribution') {
      try {
        await operationService.createCapitalContribution({
          contribution_type: 'owner_paid_purchase',
          description: `Compra Lote ${batchCode} pelo proprietário - ${targetProduct.name}`,
          amount: totalCost,
          contribution_date: payload.purchase_date,
          batch_id: newBatch.id,
        });
      } catch (contribErr) {
        console.warn('Alerta: falha na integração financeira local do lote:', contribErr);
      }
    }

    return newBatch;
  },

  /**
   * Cancelamento / Estorno de Compra de Lote
   * Requisito 4: Não permitir exclusão física de lotes que já tenham movimentações operacionais ou consumo.
   * Se o lote nunca foi utilizado (current_quantity === initial_quantity e sem consumos em serviços),
   * permite cancelamento seguro com estorno do estoque consolidado.
   */
  deleteProductBatch: async (batchId: string): Promise<{ success: boolean; message: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      // 1. Obter dados do lote
      const { data: batch, error: batchErr } = await sb
        .from('product_batches')
        .select('*, product:products(*)')
        .eq('id', batchId)
        .single();

      if (batchErr || !batch) {
        throw new Error('Lote não encontrado.');
      }

      // 2. Verificar se o lote já teve consumo
      if (Number(batch.current_quantity) !== Number(batch.initial_quantity)) {
        throw new Error(
          'Exclusão bloqueada: este lote já possui consumo ou alteração de saldo. O histórico deve ser preservado para integridade contábil e operacional.'
        );
      }

      // 3. Verificar vínculos em executed_service_products
      const { data: usages } = await sb
        .from('executed_service_products')
        .select('id')
        .eq('batch_id', batchId)
        .limit(1);

      if (usages && usages.length > 0) {
        throw new Error(
          'Exclusão bloqueada: este lote foi utilizado em atendimentos finalizados. O histórico não pode ser apagado.'
        );
      }

      // 4. Verificar movimentações operacionais (além da compra original)
      const { data: movements } = await sb
        .from('stock_movements')
        .select('id, movement_type')
        .eq('batch_id', batchId);

      const nonPurchaseMovements = (movements || []).filter((m) => m.movement_type !== 'purchase');
      if (nonPurchaseMovements.length > 0) {
        throw new Error(
          'Exclusão bloqueada: existem movimentações operacionais registradas para este lote.'
        );
      }

      // 5. Estornar movimentações de compra
      await sb.from('stock_movements').delete().eq('batch_id', batchId);

      // 6. Excluir lote
      const { error: delErr } = await sb.from('product_batches').delete().eq('id', batchId);
      if (delErr) {
        throw new Error(`Erro ao excluir lote: ${delErr.message}`);
      }

      // 7. Atualizar estoque consolidado do produto subtraindo a quantidade estornada
      const { data: prod } = await sb
        .from('products')
        .select('current_stock')
        .eq('id', batch.product_id)
        .single();

      if (prod) {
        const revertedStock = Math.max(0, Number(prod.current_stock || 0) - Number(batch.initial_quantity));
        await sb
          .from('products')
          .update({
            current_stock: revertedStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', batch.product_id);
      }

      return { success: true, message: 'Lote cancelado e estoque estornado com sucesso.' };
    }

    // Fallback Local
    const batches = getLocal<ProductBatch[]>(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);
    const batchIdx = batches.findIndex((b) => b.id === batchId);
    if (batchIdx < 0) {
      throw new Error('Lote não encontrado.');
    }
    const batch = batches[batchIdx];

    if (Number(batch.current_quantity) !== Number(batch.initial_quantity)) {
      throw new Error(
        'Exclusão bloqueada: este lote já possui consumo ou alteração de saldo. O histórico não pode ser apagado.'
      );
    }

    const localProducts = getLocal<Product[]>('garage_car_products_v2', []);
    const pIdx = localProducts.findIndex((p) => p.id === batch.product_id);
    if (pIdx >= 0) {
      localProducts[pIdx].current_stock = Math.max(0, Number(localProducts[pIdx].current_stock || 0) - Number(batch.initial_quantity));
      setLocal('garage_car_products_v2', localProducts);
    }

    batches.splice(batchIdx, 1);
    setLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, batches);

    const movements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    const filteredMovements = movements.filter((m) => m.batch_id !== batchId);
    setLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, filteredMovements);

    return { success: true, message: 'Lote cancelado e estoque estornado com sucesso.' };
  },

  /**
   * Buscar movimentações de estoque vinculadas a um lote
   */
  getBatchStockMovements: async (batchId: string): Promise<StockMovement[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('stock_movements')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as StockMovement[];
    }

    const movements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    return movements.filter((m) => m.batch_id === batchId);
  },

  /**
   * Buscar todas as movimentações de estoque (ou de um produto específico)
   */
  getProductStockMovements: async (productId?: string): Promise<StockMovement[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb
        .from('stock_movements')
        .select('*, product:products(*), batch:product_batches(*)')
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar movimentações de estoque no Supabase:', error);
        throw new Error(error.message);
      }
      return (data || []) as StockMovement[];
    }

    const movements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    const localProducts = getLocal<Product[]>('garage_car_products_v2', DEFAULT_PRODUCTS);
    const localBatches = getLocal<ProductBatch[]>(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);

    const enriched = movements.map((m) => {
      const prod = m.product || localProducts.find((p) => p.id === m.product_id);
      const batch = m.batch || (m.batch_id ? localBatches.find((b) => b.id === m.batch_id) : undefined);
      return { ...m, product: prod, batch };
    });

    if (productId) {
      return enriched.filter((m) => m.product_id === productId);
    }
    return enriched;
  },

  /**
   * Ajuste Manual de Estoque (Positivo ou Negativo)
   * 1. Exige quantidade > 0 e motivo obrigatório preenchido.
   * 2. Se especificado batchId, ajusta o saldo do lote (current_quantity).
   * 3. Atualiza o saldo consolidado do produto (products.current_stock).
   * 4. Registra movimentação em stock_movements com movement_type, previous_stock e new_stock.
   * 5. Opera diretamente no Supabase quando conectado, com fallback local.
   */
  adjustProductStock: async (params: {
    productId: string;
    batchId?: string;
    type: 'positive_adjustment' | 'negative_adjustment';
    quantity: number;
    reason: string;
  }): Promise<StockMovement> => {
    const qty = Number(params.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('A quantidade deve ser um número positivo maior que zero.');
    }
    const cleanReason = params.reason?.trim();
    if (!cleanReason || cleanReason.length < 3) {
      throw new Error('O motivo do ajuste é obrigatório (mínimo 3 caracteres).');
    }

    const now = new Date().toISOString();
    const isPositive = params.type === 'positive_adjustment';
    const delta = isPositive ? qty : -qty;

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      // 1. Obter produto atual
      const { data: prodData, error: pErr } = await sb
        .from('products')
        .select('*')
        .eq('id', params.productId)
        .single();
      if (pErr || !prodData) {
        throw new Error('Produto não encontrado no Supabase.');
      }

      const prevProdStock = Number(prodData.current_stock || 0);
      const newProdStock = prevProdStock + delta;

      // 2. Se houver lote selecionado, atualizar lote
      let targetBatch: any = null;
      if (params.batchId) {
        const { data: bData, error: bErr } = await sb
          .from('product_batches')
          .select('*')
          .eq('id', params.batchId)
          .single();
        if (bErr || !bData) {
          throw new Error('Lote selecionado não encontrado no Supabase.');
        }
        targetBatch = bData;
        const newBatchQty = Number(targetBatch.current_quantity || 0) + delta;

        const { error: updBatchErr } = await sb
          .from('product_batches')
          .update({ current_quantity: newBatchQty })
          .eq('id', params.batchId);
        if (updBatchErr) {
          throw new Error(`Erro ao atualizar lote: ${updBatchErr.message}`);
        }
      }

      // 3. Atualizar produto consolidado
      const { error: updProdErr } = await sb
        .from('products')
        .update({ current_stock: newProdStock, updated_at: now })
        .eq('id', params.productId);
      if (updProdErr) {
        throw new Error(`Erro ao atualizar estoque do produto: ${updProdErr.message}`);
      }

      // 4. Inserir movimentação em stock_movements
      const movementPayload = {
        product_id: params.productId,
        batch_id: params.batchId || null,
        movement_type: params.type,
        quantity: delta,
        previous_stock: prevProdStock,
        new_stock: newProdStock,
        reason: cleanReason,
        created_at: now,
      };

      const { data: movData, error: movErr } = await sb
        .from('stock_movements')
        .insert(movementPayload)
        .select('*, product:products(*), batch:product_batches(*)')
        .single();

      if (movErr) {
        throw new Error(`Erro ao registrar movimentação no Supabase: ${movErr.message}`);
      }

      return movData as StockMovement;
    }

    // Fallback local
    const localProducts = getLocal<Product[]>('garage_car_products_v2', DEFAULT_PRODUCTS);
    const prodIdx = localProducts.findIndex((p) => p.id === params.productId);
    if (prodIdx < 0) {
      throw new Error('Produto não encontrado.');
    }
    const targetProd = localProducts[prodIdx];
    const prevProdStock = Number(targetProd.current_stock || 0);
    const newProdStock = prevProdStock + delta;
    targetProd.current_stock = newProdStock;
    targetProd.updated_at = now;
    localProducts[prodIdx] = targetProd;
    setLocal('garage_car_products_v2', localProducts);

    const localBatches = getLocal<ProductBatch[]>(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, DEFAULT_PRODUCT_BATCHES);
    let targetBatch: ProductBatch | undefined;
    if (params.batchId) {
      const bIdx = localBatches.findIndex((b) => b.id === params.batchId);
      if (bIdx >= 0) {
        targetBatch = localBatches[bIdx];
        targetBatch.current_quantity = Number(targetBatch.current_quantity || 0) + delta;
        localBatches[bIdx] = targetBatch;
        setLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, localBatches);
      }
    }

    const localMovements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    const newMovement: StockMovement = {
      id: crypto.randomUUID(),
      product_id: params.productId,
      batch_id: params.batchId,
      movement_type: params.type,
      quantity: delta,
      previous_stock: prevProdStock,
      new_stock: newProdStock,
      reason: cleanReason,
      created_at: now,
      product: targetProd,
      batch: targetBatch,
    };
    localMovements.unshift(newMovement);
    setLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, localMovements);

    return newMovement;
  },

  /**
   * Cálculo FIFO rigoroso (First In, First Out)
   * Consome primeiro o lote com data de compra mais antiga.
   * Se a quantidade exigida ultrapassar o saldo do lote mais antigo,
   * divide entre lotes subsequentes.
   * 
   * Requisito 6 (Estoque Negativo):
   * Não criar artificialmente estoque negativo quando NÃO existe nenhum lote.
   * Se não existir nenhum lote para o produto, retorna array vazio (sinalizando ausência de lote).
   * Se existir pelo menos um lote, permite saldo negativo no último lote cadastrado.
   */
  calculateFifoAllocation: async (
    productId: string,
    quantityNeeded: number
  ): Promise<FifoBatchAllocation[]> => {
    const allBatches = await operationService.getProductBatches(productId, 'asc');

    // Ordenação FIFO estrita: purchase_date ASC, created_at ASC
    const sorted = [...allBatches].sort((a, b) => {
      const dateComp = (a.purchase_date || '').localeCompare(b.purchase_date || '');
      if (dateComp !== 0) return dateComp;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Requisito 6: Se não existir nenhum lote cadastrado, NÃO cria lote artificial nem alocação virtual.
    if (sorted.length === 0) {
      return [];
    }

    const allocations: FifoBatchAllocation[] = [];
    let remaining = Number(quantityNeeded);

    // Primeiro passo: consome lotes com saldo positivo
    for (const batch of sorted) {
      if (remaining <= 0) break;
      if (batch.current_quantity > 0) {
        const take = Math.min(batch.current_quantity, remaining);
        allocations.push({
          batch_id: batch.id,
          batch_code: batch.batch_code,
          quantity_used: take,
          unit_cost: batch.unit_cost,
          total_cost: Math.round(take * batch.unit_cost * 100) / 100,
          available_before: batch.current_quantity,
          stock_after: batch.current_quantity - take,
          is_negative: false,
          purchase_date: batch.purchase_date,
        });
        remaining -= take;
      }
    }

    // Segundo passo: se ainda sobrar consumo (estoque ultrapassa saldo disponível dos lotes),
    // consome do último lote existente, permitindo saldo negativo (Requisitos 6, 14 e 18)
    if (remaining > 0) {
      const targetBatch = sorted[sorted.length - 1];
      if (targetBatch) {
        const existing = allocations.find((a) => a.batch_id === targetBatch.id);
        if (existing) {
          existing.quantity_used += remaining;
          existing.total_cost = Math.round(existing.quantity_used * existing.unit_cost * 100) / 100;
          existing.stock_after -= remaining;
          existing.is_negative = existing.stock_after < 0;
        } else {
          allocations.push({
            batch_id: targetBatch.id,
            batch_code: targetBatch.batch_code,
            quantity_used: remaining,
            unit_cost: targetBatch.unit_cost,
            total_cost: Math.round(remaining * targetBatch.unit_cost * 100) / 100,
            available_before: targetBatch.current_quantity,
            stock_after: targetBatch.current_quantity - remaining,
            is_negative: true,
            purchase_date: targetBatch.purchase_date,
          });
        }
      }
    }

    return allocations;
  },

  getDefaultServiceProducts: (serviceId: string): ServiceDefaultProductItem[] => {
    return DEFAULT_SERVICE_CONSUMPTION_RECIPES[serviceId] || [];
  },

  // -------------------------------------------------------------
  // AGENDA & AGENDAMENTOS (/agenda)
  // -------------------------------------------------------------
  getAppointments: async (filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
    search?: string;
  }): Promise<Appointment[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb
        .from('appointments')
        .select('*, client:clients(*), vehicle:vehicles(*), service:service_catalog(*)');
      if (filters?.date) {
        query = query.eq('scheduled_date', filters.date);
      }
      if (filters?.startDate && filters?.endDate) {
        query = query.gte('scheduled_date', filters.startDate).lte('scheduled_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      query = query.order('scheduled_date', { ascending: true }).order('scheduled_start', { ascending: true });
      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar agendamentos no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as Appointment[];
    }

    let list = getLocal<Appointment[]>(OPERATION_STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);

    if (filters?.date) {
      list = list.filter((a) => a.scheduled_date === filters.date);
    }
    if (filters?.startDate && filters?.endDate) {
      list = list.filter(
        (a) => a.scheduled_date >= filters.startDate! && a.scheduled_date <= filters.endDate!
      );
    }
    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    // Ordena por data e horário de início
    return list.sort((a, b) => {
      const d = a.scheduled_date.localeCompare(b.scheduled_date);
      if (d !== 0) return d;
      return a.scheduled_start.localeCompare(b.scheduled_start);
    });
  },

  getAppointmentById: async (id: string): Promise<Appointment | undefined> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('appointments')
        .select('*, client:clients(*), vehicle:vehicles(*), service:service_catalog(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar agendamento no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || undefined) as Appointment | undefined;
    }

    const list = getLocal<Appointment[]>(OPERATION_STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);
    return list.find((a) => a.id === id);
  },

  /**
   * Detector de conflito de horários (Requisito 5)
   * Detecta se o intervalo solicitado se sobrepõe a outro agendamento ativo no mesmo dia.
   * Não bloqueia obrigatoriamente.
   */
  checkAppointmentConflict: async (
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<{ hasConflict: boolean; conflictingAppointments: Appointment[] }> => {
    const list = await operationService.getAppointments({ date });

    const toMin = (t: string) => {
      const [h, m] = (t || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const targetStart = toMin(startTime);
    const targetEnd = toMin(endTime);

    const conflicting = list.filter((a) => {
      if (a.id === excludeId) return false;
      if (a.scheduled_date !== date) return false;
      if (a.status === 'cancelled' || a.status === 'no_show') return false;

      const aStart = toMin(a.scheduled_start);
      const aEnd = toMin(a.scheduled_end);

      // Interval overlap condition: (StartA < EndB) and (EndA > StartB)
      return targetStart < aEnd && targetEnd > aStart;
    });

    return {
      hasConflict: conflicting.length > 0,
      conflictingAppointments: conflicting,
    };
  },

  saveAppointment: async (appointmentData: Partial<Appointment>): Promise<Appointment> => {
    const now = new Date().toISOString();

    const isExceptional = await operationService.isExceptionalHour(
      appointmentData.scheduled_date || now.split('T')[0],
      appointmentData.scheduled_start || '09:00',
      appointmentData.scheduled_end || '10:00'
    );

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const payload = {
        id: appointmentData.id || crypto.randomUUID(),
        client_id: appointmentData.client_id || '',
        vehicle_id: appointmentData.vehicle_id || '',
        service_catalog_id: appointmentData.service_catalog_id || null,
        scheduled_date: appointmentData.scheduled_date || now.split('T')[0],
        scheduled_start: appointmentData.scheduled_start || '09:00',
        scheduled_end: appointmentData.scheduled_end || '10:00',
        estimated_duration_minutes: appointmentData.estimated_duration_minutes ?? 60,
        estimated_price: Number(appointmentData.estimated_price ?? 0),
        condition_level: appointmentData.condition_level || 'normal',
        surcharge_amount: Number(appointmentData.surcharge_amount ?? 0),
        discount_amount: Number(appointmentData.discount_amount ?? 0),
        status: appointmentData.status || 'scheduled',
        is_exceptional_hours: isExceptional,
        notes: appointmentData.notes || '',
        cancellation_reason: appointmentData.cancellation_reason || '',
        updated_at: now,
      };

      const { data, error } = await sb
        .from('appointments')
        .upsert(payload)
        .select('*, client:clients(*), vehicle:vehicles(*), service:service_catalog(*)')
        .single();
      if (error) {
        console.error('Erro ao salvar agendamento no Supabase:', error);
        throw new Error(`Erro ao salvar agendamento no Supabase: ${error.message}`);
      }
      return data as Appointment;
    }

    const list = getLocal<Appointment[]>(OPERATION_STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);
    let saved: Appointment;

    if (appointmentData.id) {
      const idx = list.findIndex((a) => a.id === appointmentData.id);
      if (idx >= 0) {
        saved = {
          ...list[idx],
          ...appointmentData,
          is_exceptional_hours: isExceptional,
          updated_at: now,
        } as Appointment;
        list[idx] = saved;
      } else {
        throw new Error('Agendamento não encontrado.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        client_id: appointmentData.client_id || '',
        vehicle_id: appointmentData.vehicle_id || '',
        service_catalog_id: appointmentData.service_catalog_id,
        scheduled_date: appointmentData.scheduled_date || now.split('T')[0],
        scheduled_start: appointmentData.scheduled_start || '09:00',
        scheduled_end: appointmentData.scheduled_end || '10:00',
        estimated_duration_minutes: appointmentData.estimated_duration_minutes ?? 60,
        estimated_price: appointmentData.estimated_price ?? 0,
        condition_level: appointmentData.condition_level || 'normal',
        surcharge_amount: appointmentData.surcharge_amount ?? 0,
        discount_amount: appointmentData.discount_amount ?? 0,
        status: appointmentData.status || 'scheduled',
        is_exceptional_hours: isExceptional,
        notes: appointmentData.notes || '',
        created_at: now,
        updated_at: now,
      };
      list.push(saved);
    }

    setLocal(OPERATION_STORAGE_KEYS.APPOINTMENTS, list);
    return saved;
  },

  updateAppointmentStatus: async (
    id: string,
    newStatus: AppointmentStatus,
    reason?: string
  ): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const payload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (reason) {
        payload.cancellation_reason = reason;
      }
      const { error } = await sb.from('appointments').update(payload).eq('id', id);
      if (error) {
        console.error('Erro ao atualizar status do agendamento no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return;
    }

    const list = getLocal<Appointment[]>(OPERATION_STORAGE_KEYS.APPOINTMENTS, DEFAULT_APPOINTMENTS);
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) {
      list[idx].status = newStatus;
      if (reason) {
        list[idx].cancellation_reason = reason;
      }
      list[idx].updated_at = new Date().toISOString();
      setLocal(OPERATION_STORAGE_KEYS.APPOINTMENTS, list);
    }
  },

  // -------------------------------------------------------------
  // EXECUÇÃO DE SERVIÇOS (/servicos/realizados)
  // -------------------------------------------------------------
  getExecutedServices: async (filters?: {
    period?: 'today' | 'week' | 'month' | 'all';
    startDate?: string;
    endDate?: string;
    clientId?: string;
    vehicleId?: string;
    serviceId?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<ExecutedService[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb
        .from('executed_services')
        .select('*, client:clients(*), vehicle:vehicles(*), service:service_catalog(*), used_products:executed_service_products(*)');

      if (filters?.clientId) query = query.eq('client_id', filters.clientId);
      if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
      if (filters?.serviceId) query = query.eq('service_catalog_id', filters.serviceId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar serviços executados no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      let result = (data || []) as ExecutedService[];

      if (filters?.startDate && filters?.endDate) {
        result = result.filter((s) => {
          const dateStr = (s.started_at || s.created_at).split('T')[0];
          return dateStr >= filters.startDate! && dateStr <= filters.endDate!;
        });
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(
          (s) =>
            (s.client_name_snap && s.client_name_snap.toLowerCase().includes(q)) ||
            (s.vehicle_model_snap && s.vehicle_model_snap.toLowerCase().includes(q)) ||
            (s.vehicle_plate_snap && s.vehicle_plate_snap.toLowerCase().includes(q)) ||
            (s.service_name_snap && s.service_name_snap.toLowerCase().includes(q))
        );
      }

      return result;
    }

    let list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );

    if (filters?.clientId) {
      list = list.filter((s) => s.client_id === filters.clientId);
    }
    if (filters?.vehicleId) {
      list = list.filter((s) => s.vehicle_id === filters.vehicleId);
    }
    if (filters?.serviceId) {
      list = list.filter((s) => s.service_catalog_id === filters.serviceId);
    }
    if (filters?.status) {
      list = list.filter((s) => (s.status || 'completed') === filters.status);
    }
    if (filters?.paymentStatus) {
      list = list.filter((s) => s.payment_status === filters.paymentStatus);
    }

    if (filters?.startDate && filters?.endDate) {
      list = list.filter((s) => {
        const dateStr = (s.started_at || s.created_at).split('T')[0];
        return dateStr >= filters.startDate! && dateStr <= filters.endDate!;
      });
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.client_name_snap.toLowerCase().includes(q) ||
          s.vehicle_model_snap.toLowerCase().includes(q) ||
          (s.vehicle_plate_snap && s.vehicle_plate_snap.toLowerCase().includes(q)) ||
          s.service_name_snap.toLowerCase().includes(q)
      );
    }

    // Mais recentes primeiro
    return list.sort((a, b) => {
      const da = a.started_at || a.created_at;
      const db = b.started_at || b.created_at;
      return db.localeCompare(da);
    });
  },

  getExecutedServiceById: async (id: string): Promise<ExecutedService | undefined> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('executed_services')
        .select('*, client:clients(*), vehicle:vehicles(*), service:service_catalog(*), used_products:executed_service_products(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar serviço executado no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || undefined) as ExecutedService | undefined;
    }

    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );
    return list.find((s) => s.id === id);
  },

  /**
   * Início de Serviço Walk-in (sem agendamento prévio - Requisito 6)
   */
  startWalkInService: async (params: {
    client: Client;
    vehicle: Vehicle;
    service: ServiceCatalogItem;
    basePrice: number;
    finalPrice?: number;
    conditionLevel?: ConditionLevel;
    surchargeAmount?: number;
    discountAmount?: number;
    notes?: string;
    startedAt?: string;
  }): Promise<ExecutedService> => {
    const now = new Date().toISOString();
    const actualStart = params.startedAt || now;
    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );

    const surcharge = Number(params.surchargeAmount || 0);
    const discount = Number(params.discountAmount || 0);
    const calculatedPrice = Math.max(0, params.basePrice + surcharge - discount);
    const finalPrice =
      params.finalPrice !== undefined && params.finalPrice !== null
        ? Math.max(0, Number(params.finalPrice))
        : calculatedPrice;

    const newService: ExecutedService = {
      id: crypto.randomUUID(),
      client_id: params.client.id,
      vehicle_id: params.vehicle.id,
      service_catalog_id: params.service.id,
      status: 'in_progress',

      // Snapshots imutáveis preservados
      client_name_snap: params.client.name,
      vehicle_model_snap: `${params.vehicle.brand} ${params.vehicle.model}`,
      vehicle_plate_snap: params.vehicle.plate || '',
      vehicle_category_snap: params.vehicle.commercial_category,
      service_name_snap: params.service.name,
      base_price_snap: params.basePrice,

      condition_level: params.conditionLevel || 'normal',
      surcharge_amount: surcharge,
      discount_amount: discount,
      final_price: finalPrice,

      started_at: actualStart,
      is_rework: false,
      payment_status: 'pending',

      notes: params.notes || '',
      created_at: now,
      updated_at: now,
      used_products: [],
    };

    list.unshift(newService);
    setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('executed_services').insert({
        id: newService.id,
        client_id: newService.client_id,
        vehicle_id: newService.vehicle_id,
        service_catalog_id: newService.service_catalog_id,
        status: 'in_progress',
        client_name_snap: newService.client_name_snap,
        vehicle_model_snap: newService.vehicle_model_snap,
        vehicle_plate_snap: newService.vehicle_plate_snap,
        vehicle_category_snap: newService.vehicle_category_snap,
        service_name_snap: newService.service_name_snap,
        base_price_snap: newService.base_price_snap,
        condition_level: newService.condition_level,
        surcharge_amount: newService.surcharge_amount,
        discount_amount: newService.discount_amount,
        final_price: newService.final_price,
        started_at: newService.started_at,
        is_rework: false,
        payment_status: 'pending',
        notes: newService.notes,
        created_at: newService.created_at,
        updated_at: newService.updated_at,
      });
      if (error) {
        console.error('Erro ao iniciar atendimento no Supabase:', error);
      }
    }

    return newService;
  },

  /**
   * Início de Atendimento a partir de Agendamento (Requisito 8)
   */
  startServiceFromAppointment: async (
    appointment: Appointment,
    client: Client,
    vehicle: Vehicle,
    service: ServiceCatalogItem,
    basePrice: number,
    startedAt?: string,
    customFinalPrice?: number
  ): Promise<ExecutedService> => {
    const now = new Date().toISOString();
    const actualStart = startedAt || now;
    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );

    const surcharge = Number(appointment.surcharge_amount || 0);
    const discount = Number(appointment.discount_amount || 0);
    const calculatedPrice = Math.max(0, Number(basePrice) + surcharge - discount);
    const finalPrice =
      customFinalPrice !== undefined && customFinalPrice !== null
        ? Math.max(0, Number(customFinalPrice))
        : appointment.estimated_price !== undefined &&
          appointment.estimated_price !== null &&
          appointment.estimated_price > 0
        ? Math.max(0, Number(appointment.estimated_price))
        : calculatedPrice;

    const newService: ExecutedService = {
      id: crypto.randomUUID(),
      appointment_id: appointment.id,
      client_id: client.id,
      vehicle_id: vehicle.id,
      service_catalog_id: service.id,
      status: 'in_progress',

      client_name_snap: client.name,
      vehicle_model_snap: `${vehicle.brand} ${vehicle.model}`,
      vehicle_plate_snap: vehicle.plate || '',
      vehicle_category_snap: vehicle.commercial_category,
      service_name_snap: service.name,
      base_price_snap: Number(basePrice),

      condition_level: appointment.condition_level || 'normal',
      surcharge_amount: surcharge,
      discount_amount: discount,
      final_price: finalPrice,

      planned_start: `${appointment.scheduled_date}T${appointment.scheduled_start}:00Z`,
      planned_end: `${appointment.scheduled_date}T${appointment.scheduled_end}:00Z`,
      started_at: actualStart,

      is_rework: false,
      payment_status: 'pending',

      notes: appointment.notes || '',
      created_at: now,
      updated_at: now,
      used_products: [],
    };

    list.unshift(newService);
    setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);

    // Atualiza status do agendamento para 'in_progress'
    await operationService.updateAppointmentStatus(appointment.id, 'in_progress');

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('executed_services').insert({
        id: newService.id,
        appointment_id: newService.appointment_id,
        client_id: newService.client_id,
        vehicle_id: newService.vehicle_id,
        service_catalog_id: newService.service_catalog_id,
        status: 'in_progress',
        client_name_snap: newService.client_name_snap,
        vehicle_model_snap: newService.vehicle_model_snap,
        vehicle_plate_snap: newService.vehicle_plate_snap,
        vehicle_category_snap: newService.vehicle_category_snap,
        service_name_snap: newService.service_name_snap,
        base_price_snap: newService.base_price_snap,
        condition_level: newService.condition_level,
        surcharge_amount: newService.surcharge_amount,
        discount_amount: newService.discount_amount,
        final_price: newService.final_price,
        planned_start: newService.planned_start,
        planned_end: newService.planned_end,
        started_at: newService.started_at,
        is_rework: false,
        payment_status: 'pending',
        notes: newService.notes,
        created_at: newService.created_at,
        updated_at: newService.updated_at,
      });
      if (error) {
        console.error('Erro ao iniciar atendimento agendado no Supabase:', error);
      }
    }

    return newService;
  },

  /**
   * Finalização de Serviço (Requisitos 9, 10, 11, 12, 14, 15, 16, 17, 24, 30, 31, 32, 37)
   * Operação atômica que:
   * 1. Registra término real e calcula duração real
   * 2. Calcula produtividade (R$/hora)
   * 3. Executa baixa de lotes em FIFO (suporte a múltiplos lotes e estoque negativo)
   * 4. Gera movimentações de estoque (service_consumption)
   * 5. Armazena snapshot de custo unitário e total dos produtos
   * 6. Calcula custo total dos produtos e margem bruta simples
   * 7. Registra status de pagamento (Pendente ou Pago)
   */
  finalizeService: async (
    serviceId: string,
    payload: {
      finishedAt?: string;
      conditionLevel: ConditionLevel;
      conditionNotes?: string;
      surchargeAmount: number;
      discountAmount: number;
      finalPrice: number;
      usedProducts: ProductConsumptionInput[];
      paymentStatus: PaymentStatus;
      paymentMethod?: PaymentMethod;
      paidAt?: string;
      isRework: boolean;
      reworkNotes?: string;
      notes?: string;
    }
  ): Promise<ExecutedService> => {
    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );
    const serviceIdx = list.findIndex((s) => s.id === serviceId);
    let currentService = serviceIdx >= 0 ? list[serviceIdx] : null;

    const sb = getSupabaseClient();
    const isRemote = Boolean(sb && !isDemoModeActive());

    // Se conectado ao Supabase, verifica se o serviço existe remotamente ou no cache
    if (isRemote && !currentService) {
      const remoteService = await operationService.getExecutedServiceById(serviceId);
      if (remoteService) {
        currentService = remoteService;
      }
    }

    if (!currentService) {
      throw new Error('Serviço não encontrado para finalização.');
    }

    const now = new Date().toISOString();
    const finishTime = payload.finishedAt || now;
    const startTime = currentService.started_at || currentService.created_at;

    // Validação dos horários: finished_at não pode ser anterior a started_at
    const startMs = new Date(startTime).getTime();
    const finishMs = new Date(finishTime).getTime();
    if (finishMs < startMs) {
      throw new Error('O horário de término não pode ser anterior ao horário de início do atendimento.');
    }

    // Cálculo da duração real
    const diffMinutes = Math.max(1, Math.round((finishMs - startMs) / 60000));
    const durationHours = diffMinutes / 60;

    // Cálculo de produtividade: Receita por hora (Requisito 30)
    const revenuePerHour =
      durationHours > 0 ? Math.round((payload.finalPrice / durationHours) * 100) / 100 : payload.finalPrice;

    // -------------------------------------------------------------
    // FLUXO REMOTO TRANSACIONAL NO SUPABASE (Via RPC complete_service_transactional)
    // -------------------------------------------------------------
    if (isRemote && sb) {
      // 1. Calcular alocação FIFO ou manual de lotes usando os dados reais de lotes
      const productsUsedPayload: {
        product_id: string;
        batch_id: string | null;
        batch_code_snap: string;
        product_name_snap: string;
        quantity_used: number;
        unit_cost_snap: number;
        total_cost_snap: number;
        unit: string;
      }[] = [];

      for (const prodInput of payload.usedProducts) {
        if (prodInput.quantity <= 0) continue;

        let allocations: FifoBatchAllocation[] = [];

        // Seleção manual de lote (Requisito 13) vs FIFO automático (Requisito 12)
        if (prodInput.manual_batch_id) {
          const allBatches = await operationService.getProductBatches(prodInput.product_id);
          const batch = allBatches.find((b) => b.id === prodInput.manual_batch_id);
          if (batch) {
            allocations = [
              {
                batch_id: batch.id,
                batch_code: batch.batch_code,
                quantity_used: prodInput.quantity,
                unit_cost: batch.unit_cost,
                total_cost: Math.round(prodInput.quantity * batch.unit_cost * 100) / 100,
                available_before: batch.current_quantity,
                stock_after: batch.current_quantity - prodInput.quantity,
                is_negative: batch.current_quantity - prodInput.quantity < 0,
                purchase_date: batch.purchase_date,
              },
            ];
          }
        }

        if (allocations.length === 0) {
          allocations = await operationService.calculateFifoAllocation(
            prodInput.product_id,
            prodInput.quantity
          );
        }

        for (const alloc of allocations) {
          productsUsedPayload.push({
            product_id: prodInput.product_id,
            batch_id: alloc.batch_id === 'virtual-batch' ? null : alloc.batch_id,
            batch_code_snap: alloc.batch_code,
            product_name_snap: prodInput.product_name,
            quantity_used: alloc.quantity_used,
            unit_cost_snap: alloc.unit_cost,
            total_cost_snap: alloc.total_cost,
            unit: prodInput.unit,
          });
        }
      }

      // 2. Garantir que o serviço base exista no Supabase antes da chamada da RPC
      const { data: existingService } = await sb
        .from('executed_services')
        .select('id')
        .eq('id', serviceId)
        .maybeSingle();

      if (!existingService) {
        const { error: insErr } = await sb.from('executed_services').insert({
          id: currentService.id,
          appointment_id: currentService.appointment_id || null,
          client_id: currentService.client_id,
          vehicle_id: currentService.vehicle_id,
          service_catalog_id: currentService.service_catalog_id || null,
          status: 'in_progress',
          client_name_snap: currentService.client_name_snap,
          vehicle_model_snap: currentService.vehicle_model_snap,
          vehicle_plate_snap: currentService.vehicle_plate_snap,
          vehicle_category_snap: currentService.vehicle_category_snap,
          service_name_snap: currentService.service_name_snap,
          base_price_snap: currentService.base_price_snap,
          condition_level: currentService.condition_level || 'normal',
          surcharge_amount: currentService.surcharge_amount || 0,
          discount_amount: currentService.discount_amount || 0,
          final_price: payload.finalPrice !== undefined ? payload.finalPrice : (currentService.final_price || 0),
          started_at: currentService.started_at || currentService.created_at,
          is_rework: currentService.is_rework || false,
          payment_status: currentService.payment_status || 'pending',
          notes: currentService.notes || '',
          created_at: currentService.created_at || now,
          updated_at: now,
        });
        if (insErr) {
          console.error('Erro ao sincronizar registro base no Supabase:', insErr);
          throw new Error(`Erro ao preparar serviço no Supabase: ${insErr.message}`);
        }
      }

      // 3. Execução transacional atômica da RPC no Supabase
      const { error: rpcError } = await sb.rpc('complete_service_transactional', {
        p_service_id: serviceId,
        p_finished_at: finishTime,
        p_payment_status: payload.paymentStatus,
        p_payment_method: payload.paymentStatus === 'paid' ? payload.paymentMethod : null,
        p_products_used: productsUsedPayload,
        p_condition_level: payload.conditionLevel,
        p_condition_notes: payload.conditionNotes || '',
        p_surcharge_amount: payload.surchargeAmount,
        p_discount_amount: payload.discountAmount,
        p_final_price: payload.finalPrice,
        p_is_rework: payload.isRework,
        p_rework_notes: payload.reworkNotes || '',
        p_notes: payload.notes || '',
        p_paid_at: payload.paymentStatus === 'paid' ? (payload.paidAt || finishTime) : null,
      });

      if (rpcError) {
        console.error('Erro na RPC complete_service_transactional:', rpcError);
        throw new Error(`Erro na transação de finalização no Supabase: ${rpcError.message}`);
      }

      // 4. Obter o serviço atualizado diretamente do Supabase com os produtos e snapshots persistidos
      const freshRemoteService = await operationService.getExecutedServiceById(serviceId);
      if (freshRemoteService) {
        if (serviceIdx >= 0) {
          list[serviceIdx] = freshRemoteService;
        } else {
          list.unshift(freshRemoteService);
        }
        setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);
        return freshRemoteService;
      }
    }

    // -------------------------------------------------------------
    // FALLBACK LOCAL / DEMO MODE (Preservado integralmente)
    // -------------------------------------------------------------
    const allBatches = getLocal<ProductBatch[]>(
      OPERATION_STORAGE_KEYS.PRODUCT_BATCHES,
      DEFAULT_PRODUCT_BATCHES
    );
    const allStockMovements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);
    const executedProductsList: ExecutedServiceProductItem[] = [];
    let totalProductsCost = 0;

    for (const prodInput of payload.usedProducts) {
      if (prodInput.quantity <= 0) continue;

      let allocations: FifoBatchAllocation[] = [];

      if (prodInput.manual_batch_id) {
        const batch = allBatches.find((b) => b.id === prodInput.manual_batch_id);
        if (batch) {
          allocations = [
            {
              batch_id: batch.id,
              batch_code: batch.batch_code,
              quantity_used: prodInput.quantity,
              unit_cost: batch.unit_cost,
              total_cost: Math.round(prodInput.quantity * batch.unit_cost * 100) / 100,
              available_before: batch.current_quantity,
              stock_after: batch.current_quantity - prodInput.quantity,
              is_negative: batch.current_quantity - prodInput.quantity < 0,
              purchase_date: batch.purchase_date,
            },
          ];
        }
      }

      if (allocations.length === 0) {
        allocations = await operationService.calculateFifoAllocation(
          prodInput.product_id,
          prodInput.quantity
        );
      }

      for (const alloc of allocations) {
        totalProductsCost += alloc.total_cost;

        executedProductsList.push({
          id: crypto.randomUUID(),
          executed_service_id: currentService.id,
          product_id: prodInput.product_id,
          batch_id: alloc.batch_id,
          product_name_snap: prodInput.product_name,
          batch_code_snap: alloc.batch_code,
          quantity_used: alloc.quantity_used,
          unit: prodInput.unit,
          unit_cost_snap: alloc.unit_cost,
          total_cost_snap: alloc.total_cost,
          created_at: finishTime,
        });

        const bIdx = allBatches.findIndex((b) => b.id === alloc.batch_id);
        if (bIdx >= 0) {
          allBatches[bIdx].current_quantity = alloc.stock_after;
        }

        allStockMovements.push({
          id: crypto.randomUUID(),
          product_id: prodInput.product_id,
          batch_id: alloc.batch_id,
          movement_type: 'service_consumption',
          quantity: -alloc.quantity_used,
          previous_stock: alloc.available_before,
          new_stock: alloc.stock_after,
          reason: `Consumo no serviço #${currentService.id.slice(0, 8)} (${currentService.service_name_snap})`,
          executed_service_id: currentService.id,
          created_at: finishTime,
        });
      }
    }

    setLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, allBatches);
    setLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, allStockMovements);

    totalProductsCost = Math.round(totalProductsCost * 100) / 100;
    const simpleMargin = Math.round((payload.finalPrice - totalProductsCost) * 100) / 100;
    const marginPercent =
      payload.finalPrice > 0
        ? Math.round(((payload.finalPrice - totalProductsCost) / payload.finalPrice) * 10000) / 100
        : 0;

    const updatedService: ExecutedService = {
      ...currentService,
      status: 'completed',
      finished_at: finishTime,
      actual_duration_minutes: diffMinutes,
      revenue_per_hour: revenuePerHour,

      condition_level: payload.conditionLevel,
      condition_notes: payload.conditionNotes || '',
      surcharge_amount: payload.surchargeAmount,
      discount_amount: payload.discountAmount,
      final_price: payload.finalPrice,

      total_products_cost: totalProductsCost,
      simple_gross_margin: simpleMargin,
      simple_gross_margin_percent: marginPercent,

      payment_status: payload.paymentStatus,
      payment_method: payload.paymentStatus === 'paid' ? payload.paymentMethod : undefined,
      paid_at: payload.paymentStatus === 'paid' ? (payload.paidAt || finishTime) : undefined,

      is_rework: payload.isRework,
      rework_notes: payload.reworkNotes || '',
      notes: payload.notes ?? currentService.notes,

      updated_at: now,
      used_products: executedProductsList,
    };

    if (serviceIdx >= 0) {
      list[serviceIdx] = updatedService;
    } else {
      list.unshift(updatedService);
    }
    setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);

    // Se o serviço foi concluído como pago no fallback local, registra a receita financeira localmente
    if (payload.paymentStatus === 'paid') {
      const localTrxs = getLocal<FinancialTransaction[]>(
        OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
        []
      );
      const exists = localTrxs.some(
        (t) => t.executed_service_id === updatedService.id && !t.is_reversed
      );
      if (!exists) {
        localTrxs.unshift({
          id: crypto.randomUUID(),
          type: 'revenue',
          category: 'Serviço Realizado',
          description: `Receita: ${updatedService.service_name_snap} - ${updatedService.vehicle_model_snap}`,
          amount: roundMoney(updatedService.final_price),
          transaction_date: (updatedService.paid_at || now).split('T')[0],
          payment_method: updatedService.payment_method || 'other',
          executed_service_id: updatedService.id,
          is_reversed: false,
          created_at: now,
        });
        setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, localTrxs);
      }
    }

    if (currentService.appointment_id) {
      await operationService.updateAppointmentStatus(currentService.appointment_id, 'completed');
    }

    return updatedService;
  },

  /**
   * Registrar Pagamento para serviço concluído com status 'pending' (Requisito 26)
   */
  registerPayment: async (
    serviceId: string,
    paymentMethod: PaymentMethod,
    paidAt?: string
  ): Promise<ExecutedService> => {
    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );
    const idx = list.findIndex((s) => s.id === serviceId);
    if (idx < 0) {
      throw new Error('Serviço não encontrado.');
    }

    const now = new Date().toISOString();
    list[idx] = {
      ...list[idx],
      payment_status: 'paid',
      payment_method: paymentMethod,
      paid_at: paidAt || now,
      updated_at: now,
    };

    setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error: updErr } = await sb
        .from('executed_services')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          paid_at: paidAt || now,
          updated_at: now,
        })
        .eq('id', serviceId);

      if (updErr) {
        console.error('Erro ao registrar pagamento no Supabase:', updErr);
        throw new Error(`Erro ao registrar pagamento no Supabase: ${updErr.message}`);
      }

      // Inserir financial_transactions se não existir
      const { data: existingTrx } = await sb
        .from('financial_transactions')
        .select('id')
        .eq('executed_service_id', serviceId)
        .eq('is_reversed', false)
        .maybeSingle();

      if (!existingTrx) {
        const s = list[idx];
        await sb.from('financial_transactions').insert({
          type: 'revenue',
          category: 'Serviço Realizado',
          description: `Receita: ${s.service_name_snap} - ${s.vehicle_model_snap}`,
          amount: roundMoney(s.final_price),
          transaction_date: (paidAt ? new Date(paidAt) : new Date()).toISOString().split('T')[0],
          payment_method: paymentMethod || 'other',
          executed_service_id: serviceId,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
        }
      }
    } else {
      // Inserir financial_transactions no fallback local (demo)
      const localTrxs = getLocal<FinancialTransaction[]>(
        OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
        []
      );
      const exists = localTrxs.some(
        (t) => t.executed_service_id === serviceId && !t.is_reversed
      );
      if (!exists) {
        const s = list[idx];
        localTrxs.unshift({
          id: crypto.randomUUID(),
          type: 'revenue',
          category: 'Serviço Realizado',
          description: `Receita: ${s.service_name_snap} - ${s.vehicle_model_snap}`,
          amount: roundMoney(s.final_price),
          transaction_date: (paidAt ? new Date(paidAt) : new Date()).toISOString().split('T')[0],
          payment_method: paymentMethod || 'other',
          executed_service_id: serviceId,
          is_reversed: false,
          created_at: now,
        });
        setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, localTrxs);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
        }
      }
    }

    return list[idx];
  },

  /**
   * Cancelamento Seguro (Requisito 27)
   * Preserva histórico sem exclusão física.
   * Se já houve movimentação de estoque, reverte as quantidades com segurança.
   * Estorna receitas vinculadas em financial_transactions.
   */
  cancelExecutedService: async (serviceId: string, reason: string): Promise<ExecutedService> => {
    const list = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      DEFAULT_EXECUTED_SERVICES
    );
    const idx = list.findIndex((s) => s.id === serviceId);
    if (idx < 0) {
      throw new Error('Serviço não encontrado.');
    }

    const now = new Date().toISOString();
    const service = list[idx];

    // Reverte movimentações de produtos se houverem
    if (service.used_products && service.used_products.length > 0) {
      const allBatches = getLocal<ProductBatch[]>(
        OPERATION_STORAGE_KEYS.PRODUCT_BATCHES,
        DEFAULT_PRODUCT_BATCHES
      );
      const allStockMovements = getLocal<StockMovement[]>(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, []);

      for (const item of service.used_products) {
        const bIdx = allBatches.findIndex((b) => b.id === item.batch_id);
        if (bIdx >= 0) {
          const prev = allBatches[bIdx].current_quantity;
          allBatches[bIdx].current_quantity += item.quantity_used;

          allStockMovements.push({
            id: crypto.randomUUID(),
            product_id: item.product_id,
            batch_id: item.batch_id,
            movement_type: 'positive_adjustment',
            quantity: item.quantity_used,
            previous_stock: prev,
            new_stock: prev + item.quantity_used,
            reason: `Estorno por cancelamento do serviço #${service.id.slice(0, 8)} (${reason})`,
            executed_service_id: service.id,
            created_at: now,
          });
        }
      }

      setLocal(OPERATION_STORAGE_KEYS.PRODUCT_BATCHES, allBatches);
      setLocal(OPERATION_STORAGE_KEYS.STOCK_MOVEMENTS, allStockMovements);
    }

    list[idx] = {
      ...service,
      status: 'cancelled',
      payment_status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: now,
      updated_at: now,
    };

    setLocal(OPERATION_STORAGE_KEYS.EXECUTED_SERVICES, list);

    // Estornar movimentação financeira vinculada no Supabase ou LocalStorage
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      try {
        await sb
          .from('executed_services')
          .update({
            status: 'cancelled',
            payment_status: 'cancelled',
            cancellation_reason: reason,
            cancelled_at: now,
            updated_at: now,
          })
          .eq('id', serviceId);

        const { data: linkedTrxs } = await sb
          .from('financial_transactions')
          .select('id')
          .eq('executed_service_id', serviceId)
          .eq('is_reversed', false);

        if (linkedTrxs && linkedTrxs.length > 0) {
          for (const trx of linkedTrxs) {
            await operationService.reverseFinancialTransaction(
              trx.id,
              `Estorno automático por cancelamento do serviço #${serviceId.slice(0, 8)} (${reason})`
            );
          }
        }
      } catch (err) {
        console.warn('Alerta: falha ao sincronizar cancelamento no Supabase:', err);
      }
    } else {
      // LocalStorage reversal
      const localTrxs = getLocal<FinancialTransaction[]>(
        OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
        []
      );
      let changed = false;
      for (let i = 0; i < localTrxs.length; i++) {
        if (localTrxs[i].executed_service_id === serviceId && !localTrxs[i].is_reversed) {
          localTrxs[i] = {
            ...localTrxs[i],
            is_reversed: true,
            reversal_reason: `Estorno automático por cancelamento do serviço #${serviceId.slice(0, 8)} (${reason})`,
          };
          changed = true;
        }
      }
      if (changed) {
        setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, localTrxs);
      }
    }

    return list[idx];
  },

  // ====================================================================
  // MÓDULO FINANCEIRO (FINANCIAL TRANSACTIONS & CAPITAL CONTRIBUTIONS)
  // ====================================================================

  /**
   * Consulta movimentações financeiras com filtros opcionais
   */
  getFinancialTransactions: async (
    filters?: FinancialTransactionFilters
  ): Promise<FinancialTransaction[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb
        .from('financial_transactions')
        .select('*, executed_service:executed_services(*)')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters?.executedServiceId) {
        query = query.eq('executed_service_id', filters.executedServiceId);
      }
      if (filters?.includeReversed === false) {
        query = query.eq('is_reversed', false);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar financial_transactions no Supabase:', error);
        throw new Error(`Erro ao buscar transações financeiras: ${error.message}`);
      }

      return (data || []).map((t: any) => ({
        ...t,
        amount: roundMoney(t.amount),
        is_reversed: Boolean(t.is_reversed),
      }));
    }

    // Fallback Local (Demo / Offline)
    let list = getLocal<FinancialTransaction[]>(
      OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
      []
    );

    if (filters?.type) {
      list = list.filter((t) => t.type === filters.type);
    }
    if (filters?.category) {
      list = list.filter((t) => t.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.startDate) {
      list = list.filter((t) => t.transaction_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((t) => t.transaction_date <= filters.endDate!);
    }
    if (filters?.paymentMethod) {
      list = list.filter((t) => t.payment_method === filters.paymentMethod);
    }
    if (filters?.executedServiceId) {
      list = list.filter((t) => t.executed_service_id === filters.executedServiceId);
    }
    if (filters?.includeReversed === false) {
      list = list.filter((t) => !t.is_reversed);
    }

    const services = getLocal<ExecutedService[]>(
      OPERATION_STORAGE_KEYS.EXECUTED_SERVICES,
      []
    );
    const servicesMap = new Map(services.map((s) => [s.id, s]));

    return list.map((t) => ({
      ...t,
      amount: roundMoney(t.amount),
      is_reversed: Boolean(t.is_reversed),
      executed_service:
        t.executed_service ||
        (t.executed_service_id ? servicesMap.get(t.executed_service_id) : undefined),
    }));
  },

  /**
   * Registra uma despesa financeira (saída operacional ou compra de insumos)
   */
  createFinancialExpense: async (
    payload: CreateFinancialExpensePayload
  ): Promise<FinancialTransaction> => {
    if (!payload.category?.trim()) {
      throw new Error('Categoria da despesa é obrigatória.');
    }
    if (!payload.description?.trim()) {
      throw new Error('Descrição da despesa é obrigatória.');
    }
    const amount = roundMoney(payload.amount);
    if (amount <= 0) {
      throw new Error('O valor da despesa deve ser maior que zero.');
    }
    const date = payload.transaction_date || new Date().toISOString().split('T')[0];
    const fullDescription = payload.notes?.trim()
      ? `${payload.description.trim()} (${payload.notes.trim()})`
      : payload.description.trim();

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('financial_transactions')
        .insert({
          type: 'expense',
          category: payload.category.trim(),
          description: fullDescription,
          amount: amount,
          transaction_date: date,
          payment_method: payload.payment_method || 'other',
          is_reversed: false,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao criar despesa no Supabase:', error);
        throw new Error(`Erro ao registrar despesa: ${error?.message || 'Falha ao salvar'}`);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
      }

      return {
        ...data,
        amount: roundMoney(data.amount),
        is_reversed: Boolean(data.is_reversed),
      };
    }

    // Fallback Local (Demo / Offline)
    const now = new Date().toISOString();
    const newExpense: FinancialTransaction = {
      id: crypto.randomUUID(),
      type: 'expense',
      category: payload.category.trim(),
      description: fullDescription,
      amount: amount,
      transaction_date: date,
      payment_method: payload.payment_method || 'other',
      is_reversed: false,
      created_at: now,
    };

    const list = getLocal<FinancialTransaction[]>(
      OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
      []
    );
    list.unshift(newExpense);
    setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
    }

    return newExpense;
  },

  /**
   * Registra uma receita financeira (entrada operacional)
   */
  createFinancialRevenue: async (
    payload: CreateFinancialRevenuePayload
  ): Promise<FinancialTransaction> => {
    if (!payload.category?.trim()) {
      throw new Error('Categoria da receita é obrigatória.');
    }
    if (!payload.description?.trim()) {
      throw new Error('Descrição da receita é obrigatória.');
    }
    const amount = roundMoney(payload.amount);
    if (amount <= 0) {
      throw new Error('O valor da receita deve ser maior que zero.');
    }
    const date = payload.transaction_date || new Date().toISOString().split('T')[0];

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('financial_transactions')
        .insert({
          type: 'revenue',
          category: payload.category.trim(),
          description: payload.description.trim(),
          amount: amount,
          transaction_date: date,
          payment_method: payload.payment_method || 'other',
          executed_service_id: payload.executed_service_id || null,
          is_reversed: false,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Erro ao criar receita no Supabase:', error);
        throw new Error(`Erro ao registrar receita: ${error?.message || 'Falha ao salvar'}`);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
      }

      return {
        ...data,
        amount: roundMoney(data.amount),
        is_reversed: Boolean(data.is_reversed),
      };
    }

    // Fallback Local (Demo / Offline)
    const now = new Date().toISOString();
    const newRevenue: FinancialTransaction = {
      id: crypto.randomUUID(),
      type: 'revenue',
      category: payload.category.trim(),
      description: payload.description.trim(),
      amount: amount,
      transaction_date: date,
      payment_method: payload.payment_method || 'other',
      executed_service_id: payload.executed_service_id,
      is_reversed: false,
      created_at: now,
    };

    const list = getLocal<FinancialTransaction[]>(
      OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
      []
    );
    list.unshift(newRevenue);
    setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
    }

    return newRevenue;
  },

  /**
   * Estorno seguro de movimentação financeira (Requisito 28: Preserva histórico sem DELETE)
   */
  reverseFinancialTransaction: async (
    id: string,
    reason: string
  ): Promise<FinancialTransaction> => {
    if (!reason?.trim()) {
      throw new Error('Motivo do estorno é obrigatório.');
    }

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: existing, error: fetchErr } = await sb
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        throw new Error('Transação financeira não encontrada.');
      }
      if (existing.is_reversed) {
        throw new Error('Esta transação já se encontra estornada.');
      }

      const { data: updated, error: updErr } = await sb
        .from('financial_transactions')
        .update({
          is_reversed: true,
          reversal_reason: reason.trim(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updErr || !updated) {
        console.error('Erro ao estornar transação no Supabase:', updErr);
        throw new Error(`Erro ao estornar transação: ${updErr?.message || 'Falha ao atualizar'}`);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
      }

      return {
        ...updated,
        amount: roundMoney(updated.amount),
        is_reversed: true,
      };
    }

    // Fallback Local (Demo / Offline)
    const list = getLocal<FinancialTransaction[]>(
      OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
      []
    );
    const idx = list.findIndex((t) => t.id === id);
    if (idx < 0) {
      throw new Error('Transação financeira não encontrada.');
    }
    if (list[idx].is_reversed) {
      throw new Error('Esta transação já se encontra estornada.');
    }

    list[idx] = {
      ...list[idx],
      is_reversed: true,
      reversal_reason: reason.trim(),
    };
    setLocal(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('garage_car_financial_updated'));
    }

    return list[idx];
  },

  /**
   * Consulta aportes do proprietário (capital_contributions)
   * Suporta Supabase como fonte primária com fallback resiliente offline/local.
   */
  getCapitalContributions: async (): Promise<CapitalContribution[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      try {
        const { data, error } = await sb
          .from('capital_contributions')
          .select('*, batch:product_batches(*, product:products(*))')
          .order('contribution_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((c: any) => ({
            ...c,
            amount: roundMoney(c.amount),
            is_reversed: Boolean(c.is_reversed || c.description?.startsWith('[ESTORNADO]')),
            reversal_reason: c.reversal_reason || '',
          }));
        }

        // Fallback da query com relacionamento mais simples se houver erro no join aninhado
        const { data: simpleData, error: simpleErr } = await sb
          .from('capital_contributions')
          .select('*, batch:product_batches(*)')
          .order('contribution_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (simpleErr) {
          console.error('Erro ao buscar capital_contributions no Supabase:', simpleErr);
          throw new Error(`Erro ao buscar aportes: ${simpleErr.message}`);
        }

        // Enriquecer produtos se necessário
        const localProds = getLocal<Product[]>('garage_car_products_v2', []);
        return (simpleData || []).map((c: any) => {
          let enrichedBatch = c.batch;
          if (enrichedBatch && !enrichedBatch.product && enrichedBatch.product_id) {
            const foundProd = localProds.find((p) => p.id === enrichedBatch.product_id);
            if (foundProd) {
              enrichedBatch = { ...enrichedBatch, product: foundProd };
            }
          }
          return {
            ...c,
            batch: enrichedBatch,
            amount: roundMoney(c.amount),
            is_reversed: Boolean(c.is_reversed || c.description?.startsWith('[ESTORNADO]')),
            reversal_reason: c.reversal_reason || '',
          };
        });
      } catch (err: any) {
        console.warn('Alerta ao consultar Supabase, utilizando fallback local para aportes:', err);
      }
    }

    // Fallback Local (Demo / Offline)
    const list = getLocal<CapitalContribution[]>(
      OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS,
      []
    );
    const localBatches = getLocal<ProductBatch[]>(
      OPERATION_STORAGE_KEYS.PRODUCT_BATCHES,
      DEFAULT_PRODUCT_BATCHES
    );
    const localProducts = getLocal<Product[]>('garage_car_products_v2', []);

    return list.map((c) => {
      let linkedBatch = c.batch;
      if (!linkedBatch && c.batch_id) {
        const found = localBatches.find((b) => b.id === c.batch_id);
        if (found) {
          const foundProd = localProducts.find((p) => p.id === found.product_id);
          linkedBatch = {
            ...found,
            product: foundProd || found.product,
          };
        }
      }
      return {
        ...c,
        batch: linkedBatch,
        amount: roundMoney(c.amount),
        is_reversed: Boolean(c.is_reversed || c.description?.startsWith('[ESTORNADO]')),
        reversal_reason: c.reversal_reason || '',
      };
    });
  },

  /**
   * Registra um aporte do proprietário (direct_cash ou owner_paid_purchase)
   */
  createCapitalContribution: async (
    payload: CreateCapitalContributionPayload
  ): Promise<CapitalContribution> => {
    if (!payload.contribution_type) {
      throw new Error('Tipo de aporte é obrigatório.');
    }
    if (!['direct_cash', 'owner_paid_purchase'].includes(payload.contribution_type)) {
      throw new Error('Tipo de aporte inválido.');
    }
    if (!payload.description?.trim()) {
      throw new Error('Descrição do aporte é obrigatória.');
    }
    const amount = roundMoney(payload.amount);
    if (amount <= 0) {
      throw new Error('O valor do aporte deve ser maior que zero.');
    }
    const date = payload.contribution_date || new Date().toISOString().split('T')[0];

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const insertPayload: any = {
        contribution_type: payload.contribution_type,
        description: payload.description.trim(),
        amount: amount,
        contribution_date: date,
        batch_id: payload.batch_id || null,
      };

      const { data, error } = await sb
        .from('capital_contributions')
        .insert(insertPayload)
        .select('*, batch:product_batches(*, product:products(*))')
        .single();

      if (error || !data) {
        // Tenta insert simples se houver falha de select com join
        const { data: simpleData, error: simpleError } = await sb
          .from('capital_contributions')
          .insert(insertPayload)
          .select()
          .single();

        if (simpleError || !simpleData) {
          console.error('Erro ao inserir aporte no Supabase:', simpleError || error);
          throw new Error(`Erro ao registrar aporte: ${simpleError?.message || error?.message || 'Falha ao salvar'}`);
        }

        return {
          ...simpleData,
          amount: roundMoney(simpleData.amount),
          is_reversed: false,
        };
      }

      return {
        ...data,
        amount: roundMoney(data.amount),
        is_reversed: false,
      };
    }

    // Fallback Local (Demo / Offline)
    const now = new Date().toISOString();
    const newContribution: CapitalContribution = {
      id: crypto.randomUUID(),
      contribution_type: payload.contribution_type,
      description: payload.description.trim(),
      amount: amount,
      contribution_date: date,
      batch_id: payload.batch_id,
      payment_method: payload.payment_method,
      is_reversed: false,
      created_at: now,
    };

    if (payload.batch_id) {
      const localBatches = getLocal<ProductBatch[]>(
        OPERATION_STORAGE_KEYS.PRODUCT_BATCHES,
        DEFAULT_PRODUCT_BATCHES
      );
      const found = localBatches.find((b) => b.id === payload.batch_id);
      if (found) {
        const localProducts = getLocal<Product[]>('garage_car_products_v2', []);
        const foundProd = localProducts.find((p) => p.id === found.product_id);
        newContribution.batch = {
          ...found,
          product: foundProd || found.product,
        };
      }
    }

    const list = getLocal<CapitalContribution[]>(
      OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS,
      []
    );
    list.unshift(newContribution);
    setLocal(OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS, list);
    return newContribution;
  },

  /**
   * Estorno / Cancelamento auditado de aporte de capital (Sem exclusão física)
   * Preserva integridade contábil e histórico sem deletar registros do banco.
   */
  reverseCapitalContribution: async (
    id: string,
    reason: string
  ): Promise<CapitalContribution> => {
    if (!reason?.trim()) {
      throw new Error('Motivo do cancelamento/estorno é obrigatório.');
    }

    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: existing, error: fetchErr } = await sb
        .from('capital_contributions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        throw new Error('Aporte de capital não encontrado.');
      }
      if (existing.is_reversed || existing.description?.startsWith('[ESTORNADO]')) {
        throw new Error('Este aporte já se encontra cancelado/estornado.');
      }

      let updatedData: any = null;
      try {
        const { data: updated, error: updErr } = await sb
          .from('capital_contributions')
          .update({
            is_reversed: true,
            reversal_reason: reason.trim(),
          })
          .eq('id', id)
          .select('*, batch:product_batches(*, product:products(*))')
          .single();

        if (!updErr && updated) {
          updatedData = updated;
        }
      } catch {
        // Tabela remota pode não possuir as colunas is_reversed ainda
      }

      if (!updatedData) {
        const cleanOldDesc = existing.description.replace(/^\[ESTORNADO\]\s*/, '');
        const newDescription = `[ESTORNADO] ${cleanOldDesc} (Motivo: ${reason.trim()})`;

        const { data: fallbackUpdated, error: fbErr } = await sb
          .from('capital_contributions')
          .update({
            description: newDescription,
          })
          .eq('id', id)
          .select('*, batch:product_batches(*)')
          .single();

        if (fbErr || !fallbackUpdated) {
          throw new Error(`Erro ao estornar aporte no Supabase: ${fbErr?.message || 'Falha ao atualizar'}`);
        }
        updatedData = {
          ...fallbackUpdated,
          is_reversed: true,
          reversal_reason: reason.trim(),
        };
      }

      return {
        ...updatedData,
        amount: roundMoney(updatedData.amount),
        is_reversed: true,
        reversal_reason: reason.trim(),
      };
    }

    // Fallback Local (Demo / Offline)
    const list = getLocal<CapitalContribution[]>(
      OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS,
      []
    );
    const idx = list.findIndex((c) => c.id === id);
    if (idx < 0) {
      throw new Error('Aporte de capital não encontrado.');
    }
    if (list[idx].is_reversed || list[idx].description?.startsWith('[ESTORNADO]')) {
      throw new Error('Este aporte já se encontra cancelado/estornado.');
    }

    const cleanDesc = list[idx].description.replace(/^\[ESTORNADO\]\s*/, '');
    list[idx] = {
      ...list[idx],
      is_reversed: true,
      reversal_reason: reason.trim(),
      description: `[ESTORNADO] ${cleanDesc}`,
    };

    setLocal(OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS, list);
    return list[idx];
  },

  /**
   * Resumo Financeiro Centralizado e Auditado:
   * Calcula saldo atual de caixa, receitas, despesas, resultado operacional e aportes com precisão decimal.
   */
  getFinancialSummary: async (): Promise<FinancialSummary> => {
    const trxs = await operationService.getFinancialTransactions({ includeReversed: false });
    const contributions = await operationService.getCapitalContributions();

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const t of trxs) {
      if (t.is_reversed) continue;
      const amt = roundMoney(t.amount);
      if (t.type === 'revenue') {
        totalRevenue = roundMoney(totalRevenue + amt);
      } else if (t.type === 'expense') {
        totalExpenses = roundMoney(totalExpenses + amt);
      }
    }

    let totalDirectCashContributions = 0;
    let totalOwnerPaidPurchases = 0;

    for (const c of contributions) {
      if (c.is_reversed || c.description?.startsWith('[ESTORNADO]')) continue;
      const amt = roundMoney(c.amount);
      if (c.contribution_type === 'direct_cash') {
        totalDirectCashContributions = roundMoney(totalDirectCashContributions + amt);
      } else if (c.contribution_type === 'owner_paid_purchase') {
        totalOwnerPaidPurchases = roundMoney(totalOwnerPaidPurchases + amt);
      }
    }

    const totalCapitalContributions = roundMoney(
      totalDirectCashContributions + totalOwnerPaidPurchases
    );

    // Resultado operacional = Receitas operacionais - Despesas operacionais
    const operatingProfit = roundMoney(totalRevenue - totalExpenses);

    // Saldo de caixa = Receitas - Despesas + Aportes em dinheiro direto no caixa
    // Nota contábil: compras pagas diretamente pelo proprietário (owner_paid_purchase)
    // não movimentam o caixa da Garage Car (sem saída e sem entrada em dinheiro).
    const currentCashBalance = roundMoney(
      totalRevenue - totalExpenses + totalDirectCashContributions
    );

    return {
      currentCashBalance,
      totalRevenue,
      totalExpenses,
      operatingProfit,
      totalCapitalContributions,
      totalDirectCashContributions,
      totalOwnerPaidPurchases,
    };
  },
};
