/**
 * Garage Car - Sistema Administrativo Web
 * Tipos e Estruturas de Dados do Sistema
 * Regras estritas:
 * - UUID como identificador
 * - NUMERIC para valores monetários e quantitativos (nunca float)
 * - NUNCA criar CPF
 */

export type UUID = string;

// ==========================================
// 1. CLIENTES & VEÍCULOS
// ==========================================

export interface Client {
  id: UUID;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Veículos vinculados
  vehicles?: Vehicle[];
}

export type VehicleType = 'car' | 'motorcycle';

export interface VehicleCategory {
  id: UUID;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CommercialCategory =
  | 'Carro / Compacto'
  | 'SUV / Crossover'
  | 'Porte Médio / Pickup'
  | 'Moto'
  | string;

export interface Vehicle {
  id: UUID;
  client_id: UUID;
  type: VehicleType;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  plate?: string; // Opcional conforme especificação
  commercial_category: CommercialCategory;
  category_id?: UUID;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Propriedades expandidas em queries
  client?: Client;
}

// ==========================================
// 2. SERVIÇOS E CATÁLOGO
// ==========================================

export type ServiceType = 'convencional' | 'tecnica' | 'premium' | 'adicional';
export type CompatibleVehicleType = 'car' | 'motorcycle' | 'all';

export interface ServicePrice {
  id: UUID;
  service_id: UUID;
  commercial_category: string;
  price: number; // NUMERIC(10,2)
  estimated_duration_minutes: number;
  valid_from: string; // YYYY-MM-DD
  valid_until?: string; // YYYY-MM-DD opcional
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: UUID;
  name: string;
  description: string;
  service_type: ServiceType;
  compatible_vehicle_type: CompatibleVehicleType;
  vehicle_type?: VehicleType; // Compatibilidade retroativa
  commercial_category?: string; // Compatibilidade retroativa
  base_price?: number; // Compatibilidade retroativa
  estimated_duration_minutes: number;
  sort_order: number;
  included_items: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Preços por categoria associados
  prices?: ServicePrice[];
}

export type ConditionLevel = 'normal' | 'above_normal' | 'heavy' | 'extreme';

export interface ConditionSurcharge {
  level: ConditionLevel;
  label: string;
  suggested_amount: number; // NUMERIC(10,2)
  is_manual?: boolean;
}

// ==========================================
// 3. PRODUTOS, LOTES E ESTOQUE
// ==========================================

export type ProductUnit = 'ml' | 'un' | 'g' | 'l';

export interface ProductCategory {
  id: UUID;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Product {
  id: UUID;
  name: string;
  brand: string;
  category: string;
  category_id?: UUID;
  unit: ProductUnit; // Líquidos utilizam 'ml' internamente (ex: 3L = 3000ml)
  min_stock?: number;
  current_stock?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type FundingSource = 'company_cash' | 'owner_contribution';

export interface ProductBatch {
  id: UUID;
  product_id: UUID;
  batch_code?: string;
  purchase_date: string;
  initial_quantity: number; // NUMERIC(12,4)
  current_quantity: number; // NUMERIC(12,4)
  total_cost: number; // NUMERIC(10,2)
  unit_cost: number; // NUMERIC(12,4) - Calculado: total_cost / initial_quantity
  supplier: string;
  funding_source: FundingSource;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface CreateBatchPurchasePayload {
  product_id: UUID;
  batch_code?: string;
  purchase_date: string;
  initial_quantity: number;
  total_cost: number;
  supplier?: string;
  funding_source: FundingSource;
  notes?: string;
}

export type StockMovementType =
  | 'purchase'
  | 'service_consumption'
  | 'positive_adjustment'
  | 'negative_adjustment';

export interface StockMovement {
  id: UUID;
  product_id: UUID;
  batch_id?: UUID;
  movement_type: StockMovementType;
  quantity: number; // Positivo para entrada/ajuste+, negativo para consumo/ajuste-
  previous_stock: number;
  new_stock: number;
  reason: string; // Obrigatório para ajustes manuais
  executed_service_id?: UUID;
  created_at: string;
  created_by?: UUID;
  product?: Product;
  batch?: ProductBatch;
}

// ==========================================
// 4. AGENDA & SERVIÇOS EXECUTADOS
// ==========================================

export type AppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: UUID;
  client_id: UUID;
  vehicle_id: UUID;
  service_catalog_id?: UUID;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_start: string; // HH:MM
  scheduled_end: string; // HH:MM
  estimated_duration_minutes?: number;
  estimated_price?: number;
  condition_level?: ConditionLevel;
  surcharge_amount?: number;
  discount_amount?: number;
  status: AppointmentStatus;
  is_exceptional_hours: boolean;
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at?: string;
  client?: Client;
  vehicle?: Vehicle;
  service?: ServiceCatalogItem;
}

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'pix' | 'debit' | 'credit' | 'other';

export interface ExecutedServiceProductItem {
  id: UUID;
  executed_service_id: UUID;
  product_id: UUID;
  batch_id: UUID;
  product_name_snap: string;
  batch_code_snap?: string;
  quantity_used: number; // NUMERIC(12,4)
  unit?: string;
  unit_cost_snap: number; // NUMERIC(12,4)
  total_cost_snap: number; // NUMERIC(10,2)
  created_at: string;
}

export interface FifoBatchAllocation {
  batch_id: UUID;
  batch_code?: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  available_before: number;
  stock_after: number;
  is_negative: boolean;
  purchase_date?: string;
}

export interface ServiceDefaultProductItem {
  product_id: UUID;
  product_name: string;
  suggested_quantity: number;
  unit: ProductUnit;
}

export interface ProductConsumptionInput {
  product_id: UUID;
  product_name: string;
  unit: ProductUnit;
  quantity: number;
  manual_batch_id?: UUID;
  allocations?: FifoBatchAllocation[];
}

export interface ExecutedService {
  id: UUID;
  appointment_id?: UUID;
  client_id: UUID;
  vehicle_id: UUID;
  service_catalog_id?: UUID;
  
  // Status da Execução: 'in_progress' | 'completed' | 'cancelled'
  status?: 'in_progress' | 'completed' | 'cancelled';

  // Snapshots históricos imutáveis
  client_name_snap: string;
  vehicle_model_snap: string;
  vehicle_plate_snap?: string;
  vehicle_category_snap: CommercialCategory;
  service_name_snap: string;
  base_price_snap: number; // NUMERIC(10,2)
  
  // Condição e Valores
  condition_level: ConditionLevel;
  condition_notes?: string;
  surcharge_amount: number; // NUMERIC(10,2)
  discount_amount: number; // NUMERIC(10,2)
  final_price: number; // NUMERIC(10,2)
  
  // Horários e Produtividade
  planned_start?: string;
  planned_end?: string;
  started_at?: string;
  finished_at?: string;
  actual_duration_minutes?: number;
  revenue_per_hour?: number; // final_price / (actual_duration_minutes / 60)
  
  // Retrabalho
  is_rework: boolean;
  rework_notes?: string;
  
  // Custos e Margem
  total_products_cost?: number; // NUMERIC(10,2)
  simple_gross_margin?: number; // NUMERIC(10,2) final_price - total_products_cost
  simple_gross_margin_percent?: number; // ((final_price - total_products_cost) / final_price) * 100

  // Pagamento
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  paid_at?: string;
  
  // Cancelamento
  cancellation_reason?: string;
  cancelled_at?: string;

  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relações
  used_products?: ExecutedServiceProductItem[];
  client?: Client;
  vehicle?: Vehicle;
}

// ==========================================
// 5. FINANCEIRO, APORTES & EQUIPAMENTOS
// ==========================================

export type FinancialTransactionType = 'revenue' | 'expense';

export interface FinancialTransaction {
  id: UUID;
  type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number; // NUMERIC(10,2)
  transaction_date: string;
  payment_method: PaymentMethod;
  executed_service_id?: UUID;
  is_reversed: boolean;
  reversal_reason?: string;
  created_at: string;
  executed_service?: ExecutedService;
}

export interface FinancialTransactionFilters {
  type?: FinancialTransactionType;
  startDate?: string;
  endDate?: string;
  category?: string;
  paymentMethod?: PaymentMethod;
  includeReversed?: boolean;
  executedServiceId?: UUID;
}

export interface CreateFinancialExpensePayload {
  category: string;
  description: string;
  amount: number;
  transaction_date?: string;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface CreateFinancialRevenuePayload {
  category: string;
  description: string;
  amount: number;
  transaction_date?: string;
  payment_method?: PaymentMethod;
  executed_service_id?: UUID;
}

export type CapitalContributionType = 'direct_cash' | 'owner_paid_purchase';

export interface CapitalContribution {
  id: UUID;
  contribution_type: CapitalContributionType;
  description: string;
  amount: number; // NUMERIC(10,2)
  contribution_date: string;
  batch_id?: UUID;
  batch?: ProductBatch;
  payment_method?: string;
  is_reversed?: boolean;
  reversal_reason?: string;
  created_at: string;
}

export interface CreateCapitalContributionPayload {
  contribution_type: CapitalContributionType;
  description: string;
  amount: number;
  contribution_date?: string;
  batch_id?: UUID;
  payment_method?: string;
}

export interface FinancialSummary {
  currentCashBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  operatingProfit: number;
  totalCapitalContributions: number;
  totalDirectCashContributions: number;
  totalOwnerPaidPurchases: number;
}

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';
export type EquipmentFundingSource = 'company_cash' | 'owner_contribution';

export interface EquipmentCategory {
  id: UUID;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  equipment_count?: number;
}

export interface Equipment {
  id: UUID;
  name: string;
  brand?: string;
  model?: string;
  category: string;
  category_id?: UUID;
  purchase_date?: string;
  purchase_price?: number;
  funding_source: EquipmentFundingSource; // 'company_cash' (Caixa da Garage Car) | 'owner_contribution' (Investimento do proprietário)
  status: EquipmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'planned' | 'purchased' | 'cancelled';

export interface WishlistItem {
  id: UUID;
  name: string;
  category: string;
  estimated_price: number;
  priority: WishlistPriority;
  status: WishlistStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// 6. AUDITORIA & SISTEMA
// ==========================================

export interface AuditLog {
  id: UUID;
  user_id?: UUID;
  user_email?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ADJUSTMENT' | 'STATUS_CHANGE';
  entity: string;
  entity_id?: string;
  old_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  created_at: string;
}

export interface SystemSettings {
  company_name: string;
  business_hours: {
    monday?: { open: string; close: string; isOpen: boolean };
    tuesday?: { open: string; close: string; isOpen: boolean };
    wednesday?: { open: string; close: string; isOpen: boolean };
    thursday?: { open: string; close: string; isOpen: boolean };
    friday?: { open: string; close: string; isOpen: boolean };
    saturday?: { open: string; close: string; isOpen: boolean };
    sunday?: { open: string; close: string; isOpen: boolean };
  };
  condition_surcharges: Record<ConditionLevel, number>;
}
