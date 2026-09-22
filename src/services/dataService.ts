import {
  Client,
  Vehicle,
  VehicleCategory,
  ServiceCatalogItem,
  ServicePrice,
  ProductCategory,
  Product,
  EquipmentCategory,
  Equipment,
  EquipmentStatus,
  FinancialTransaction,
  CapitalContribution,
  WishlistItem,
  WishlistPriority,
  WishlistStatus,
} from '../types';
import { getSupabaseClient, isDemoModeActive } from '../lib/supabase';

// Chaves de armazenamento local
const STORAGE_KEYS = {
  CLIENTS: 'garage_car_clients_v2',
  VEHICLES: 'garage_car_vehicles_v2',
  VEHICLE_CATEGORIES: 'garage_car_vehicle_categories_v2',
  SERVICES: 'garage_car_services_v2',
  SERVICE_PRICES: 'garage_car_service_prices_v2',
  PRODUCT_CATEGORIES: 'garage_car_product_categories_v2',
  PRODUCTS: 'garage_car_products_v2',
  EQUIPMENT_CATEGORIES: 'garage_car_equipment_categories_v2',
  EQUIPMENT: 'garage_car_equipment_v2',
  WISHLIST: 'garage_car_wishlist_v2',
};

// ====================================================================
// SEEDS PADRÃO DA FASE 2
// ====================================================================

export const DEFAULT_VEHICLE_CATEGORIES: VehicleCategory[] = [
  {
    id: 'vc-1',
    name: 'Carro / Compacto',
    description: 'Hatches e sedãs compactos (ex: Onix, Polo, HB20, Kwid, Gol)',
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vc-2',
    name: 'SUV / Crossover',
    description: 'Utilitários esportivos e crossovers médios (ex: Compass, Renegade, Tracker, Creta, T-Cross)',
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vc-3',
    name: 'Porte Médio / Pickup',
    description: 'Pickups médias e grandes, sedãs executivos e vans (ex: Toro, Hilux, Ranger, S10, Amarok)',
    sort_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vc-4',
    name: 'Moto',
    description: 'Motocicletas de todos os estilos e cilindradas (street, trail, scooter, custom, esportiva)',
    sort_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'pc-1', name: 'Limpeza externa', description: 'Shampoos, desengraxantes e espumas', sort_order: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-2', name: 'Limpeza interna', description: 'Limpadores multiuso (APC) e flotadores bactericidas', sort_order: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-3', name: 'Pneus', description: 'Pretinhos, selantes e abrilhantadores de borracha', sort_order: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-4', name: 'Plásticos', description: 'Restauradores, condicionadores e protetores UV', sort_order: 4, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-5', name: 'Vidros', description: 'Cristalizadores, repelentes e removedores de chuva ácida', sort_order: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-6', name: 'Proteção', description: 'Ceras híbridas, carnaúbas e selantes de pintura', sort_order: 6, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-7', name: 'Couro', description: 'Limpadores específicos e hidratantes de couro', sort_order: 7, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-8', name: 'Motocicletas', description: 'Lubrificantes de corrente e produtos para duas rodas', sort_order: 8, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-9', name: 'Finalização', description: 'Aromatizantes, cheirinhos e toques finais', sort_order: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'pc-10', name: 'Outros', description: 'Insumos pesados, desincrustantes e solventes', sort_order: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p-1', name: 'Ultra Limpador', brand: 'Magic Clean', category: 'Limpeza interna', category_id: 'pc-2', unit: 'ml', min_stock: 1000, current_stock: 5000, is_active: true, notes: 'APC concentrado para estofados e plásticos', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-2', name: 'V-Floc', brand: 'Vonixx', category: 'Limpeza externa', category_id: 'pc-1', unit: 'ml', min_stock: 1500, current_stock: 6000, is_active: true, notes: 'Shampoo com pH neutro de alta lubrificação', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-3', name: 'D-Remov', brand: 'Delux', category: 'Limpeza externa', category_id: 'pc-1', unit: 'ml', min_stock: 1000, current_stock: 3000, is_active: true, notes: 'Desengraxante alcalino para caixa de rodas e motor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-4', name: 'Sintra', brand: 'Vonixx', category: 'Limpeza interna', category_id: 'pc-2', unit: 'ml', min_stock: 1000, current_stock: 5000, is_active: true, notes: 'Limpador bactericida e fungicida', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-5', name: 'Intense', brand: 'Vonixx', category: 'Plásticos', category_id: 'pc-4', unit: 'ml', min_stock: 500, current_stock: 2000, is_active: true, notes: 'Renovador de plásticos internos com acabamento fosco natural', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-6', name: 'Reboot', brand: 'Dub', category: 'Limpeza externa', category_id: 'pc-1', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Descontaminante ferroso para rodas e pintura', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-7', name: 'Glazy', brand: 'Vonixx', category: 'Vidros', category_id: 'pc-5', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Limpa vidros com secagem rápida e anti-embaçante', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-8', name: 'Luminous Black', brand: 'Evo Auto', category: 'Pneus', category_id: 'pc-3', unit: 'ml', min_stock: 500, current_stock: 2000, is_active: true, notes: 'Pretinho com brilho molhado e hidrorrepelência', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-9', name: 'Blend Cera Líquida', brand: 'Vonixx', category: 'Proteção', category_id: 'pc-6', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Cera híbrida de sílica (SiO2) e carnaúba (até 3 meses de proteção)', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-10', name: 'Higicouro', brand: 'Vonixx', category: 'Couro', category_id: 'pc-7', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Limpador suave com pH neutro para couro automotivo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-11', name: 'Hidracouro', brand: 'Vonixx', category: 'Couro', category_id: 'pc-7', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Hidratante com proteção UV e toque acetinado seco', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-12', name: 'Aromatizante', brand: 'Bugatti', category: 'Finalização', category_id: 'pc-9', unit: 'un', min_stock: 5, current_stock: 20, is_active: true, notes: 'Fragrância spray premium de longa duração', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-13', name: 'Desengraxante H7', brand: 'H7', category: 'Limpeza externa', category_id: 'pc-1', unit: 'ml', min_stock: 2000, current_stock: 10000, is_active: true, notes: 'Desengraxante multiuso biodegradável à base de água', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-14', name: 'Lubrificante de corrente', brand: 'Mobil', category: 'Motocicletas', category_id: 'pc-8', unit: 'ml', min_stock: 400, current_stock: 1200, is_active: true, notes: 'Lubrificante sintético para correntes de alta performance', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-15', name: 'Focus', brand: 'Vonixx', category: 'Vidros', category_id: 'pc-5', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Desengordurante de vidros com acabamento cristalino', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-16', name: 'Glaco', brand: 'Soft99', category: 'Vidros', category_id: 'pc-5', unit: 'ml', min_stock: 100, current_stock: 300, is_active: true, notes: 'Cristalizador japonês repelente de chuva extrema', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-17', name: 'Good Zilla', brand: 'Dub', category: 'Plásticos', category_id: 'pc-4', unit: 'ml', min_stock: 500, current_stock: 1500, is_active: true, notes: 'Restaurador para plásticos externos ressecados', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-18', name: 'Darker', brand: 'Vintex', category: 'Pneus', category_id: 'pc-3', unit: 'ml', min_stock: 1000, current_stock: 3000, is_active: true, notes: 'Renovador de pneus de alta viscosidade', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-19', name: 'Alumax', brand: 'Vintex', category: 'Outros', category_id: 'pc-10', unit: 'ml', min_stock: 1500, current_stock: 5000, is_active: true, notes: 'Desincrustante ácido concentrado para alumínio e chassis', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'p-20', name: 'Removex', brand: 'Vintex', category: 'Outros', category_id: 'pc-10', unit: 'ml', min_stock: 1500, current_stock: 5000, is_active: true, notes: 'Desengraxante alcalino forte para chassis e motores', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const DEFAULT_EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  { id: 'ec-1', name: 'Lavagem', description: 'Lavadoras de alta pressão, canhões snow foam e baldes', sort_order: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-2', name: 'Aspiração', description: 'Aspiradores e extratores de líquidos/pó', sort_order: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-3', name: 'Aplicação', description: 'Pulverizadores manuais e de compressão', sort_order: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-4', name: 'Microfibras', description: 'Toalhas de secagem e panos especiais', sort_order: 4, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-5', name: 'Escovas', description: 'Pincéis de detalhamento e escovas de rodas/corrente', sort_order: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-6', name: 'Organização', description: 'Carrinhos auxiliares e suportes de oficina', sort_order: 6, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-7', name: 'Ferramentas', description: 'Bicos extratores e adaptadores técnicos', sort_order: 7, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-8', name: 'Segurança', description: 'EPIs e acessórios de proteção', sort_order: 8, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ec-9', name: 'Outros', description: 'Acessórios gerais e suporte audiovisual', sort_order: 9, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const DEFAULT_EQUIPMENT: Equipment[] = [
  { id: 'eq-1', name: 'Lavadora Vonder LAV 1600', brand: 'Vonder', model: 'LAV 1600 (1600 PSI)', category: 'Lavagem', category_id: 'ec-1', purchase_date: '2025-01-10', purchase_price: 649.90, funding_source: 'company_cash', status: 'active', notes: 'Lavadora principal da baia', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-2', name: 'Snow Foam Vonder', brand: 'Vonder', model: 'Canhão de Espuma Engate Rápido', category: 'Lavagem', category_id: 'ec-1', purchase_date: '2025-01-10', purchase_price: 139.90, funding_source: 'company_cash', status: 'active', notes: 'Utilizada para pré-lavagem com shampoo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-3', name: 'Aspirador WAP GTW 10', brand: 'WAP', model: 'GTW 10 (1400W Pó e Água)', category: 'Aspiração', category_id: 'ec-2', purchase_date: '2025-01-12', purchase_price: 289.00, funding_source: 'company_cash', status: 'active', notes: 'Aspiração interna e remoção de líquidos', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-4', name: 'Kit de escovas', brand: 'Detailer', model: 'Kit 5 pincéis com cerdas naturais', category: 'Escovas', category_id: 'ec-5', purchase_date: '2025-01-15', purchase_price: 49.90, funding_source: 'company_cash', status: 'active', notes: 'Limpeza de cantos, emblemas e saídas de ar', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-5', name: 'Luva de microfibra', brand: 'Detailer', model: 'Tentáculos Dupla Face', category: 'Microfibras', category_id: 'ec-4', purchase_date: '2025-01-15', purchase_price: 29.90, funding_source: 'company_cash', status: 'active', notes: 'Lavagem da lataria superior', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-6', name: 'Microfibras', brand: 'Detailer', model: 'Pack 10 unidades 40x40cm 300 GSM', category: 'Microfibras', category_id: 'ec-4', purchase_date: '2025-01-15', purchase_price: 79.90, funding_source: 'company_cash', status: 'active', notes: 'Remoção de ceras e limpeza de vidros', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-7', name: 'Toalha de secagem Kers', brand: 'Kers', model: 'Twisted Loop 60x90cm 600 GSM', category: 'Microfibras', category_id: 'ec-4', purchase_date: '2025-01-20', purchase_price: 89.90, funding_source: 'company_cash', status: 'active', notes: 'Secagem rápida sem riscos na lataria', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-8', name: 'Escova de detalhamento', brand: 'Kers', model: 'Cerdas sintéticas anti-risco', category: 'Escovas', category_id: 'ec-5', purchase_date: '2025-01-20', purchase_price: 35.00, funding_source: 'company_cash', status: 'active', notes: 'Pincel especial para painel sensível e black piano', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-9', name: 'Snow Foam Veneto', brand: 'Veneto', model: 'Canhão Profissional Bico Regulável', category: 'Lavagem', category_id: 'ec-1', purchase_date: '2025-01-22', purchase_price: 189.00, funding_source: 'company_cash', status: 'active', notes: 'Canhão secundário para aplicação de ceras líquidas', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-10', name: 'Kit de pulverizadores', brand: 'Detailer', model: '3 Pulverizadores com graduação 500ml', category: 'Aplicação', category_id: 'ec-3', purchase_date: '2025-01-22', purchase_price: 59.90, funding_source: 'company_cash', status: 'active', notes: 'Diluição de APC Sintra, desengraxante e limpa vidros', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-11', name: 'Escova para corrente', brand: 'Detailer', model: 'Escova formato em U para motos', category: 'Escovas', category_id: 'ec-5', purchase_date: '2025-01-25', purchase_price: 32.00, funding_source: 'company_cash', status: 'active', notes: 'Limpeza 360 graus de correntes de moto', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-12', name: 'Bico extrator', brand: 'Universal', model: 'Bico transparente com engate universal', category: 'Ferramentas', category_id: 'ec-7', purchase_date: '2025-01-25', purchase_price: 75.00, funding_source: 'company_cash', status: 'active', notes: 'Acoplado ao aspirador WAP para higienização de bancos', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-13', name: 'Snow Foam Kers Black Edition', brand: 'Kers', model: 'Black Edition 1000ml', category: 'Lavagem', category_id: 'ec-1', purchase_date: '2025-02-01', purchase_price: 219.00, funding_source: 'owner_contribution', status: 'active', notes: 'Aporte de investimento do proprietário', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-14', name: 'Carrinho de ferramentas Sigma Tools', brand: 'Sigma Tools', model: '3 Bandejas com rodízios reforçados', category: 'Organização', category_id: 'ec-6', purchase_date: '2025-02-05', purchase_price: 389.00, funding_source: 'company_cash', status: 'active', notes: 'Organização e transporte de insumos entre baias', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-15', name: 'Balde Detailer', brand: 'Detailer', model: '20L com Separador de Partículas (Grit Guard)', category: 'Lavagem', category_id: 'ec-1', purchase_date: '2025-02-05', purchase_price: 65.00, funding_source: 'company_cash', status: 'active', notes: 'Lavagem no método de dois baldes', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-16', name: 'Aplicadores de espuma', brand: 'Vonixx', model: 'Pack 6 aplicadores anatômicos', category: 'Aplicação', category_id: 'ec-3', purchase_date: '2025-02-10', purchase_price: 24.90, funding_source: 'company_cash', status: 'active', notes: 'Aplicação de ceras em pasta e restaurador de plásticos', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-17', name: 'Luva de microfibra Kers', brand: 'Kers', model: 'Luva ultrafina para lavagem de rodas', category: 'Microfibras', category_id: 'ec-4', purchase_date: '2025-02-10', purchase_price: 39.90, funding_source: 'company_cash', status: 'active', notes: 'Dedicada exclusivamente para rodas e caixas', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-18', name: 'Kit 5 microfibras Kers 360 GSM', brand: 'Kers', model: 'Laser Cut sem costura 40x40', category: 'Microfibras', category_id: 'ec-4', purchase_date: '2025-02-15', purchase_price: 65.00, funding_source: 'company_cash', status: 'active', notes: 'Acabamento final e lustro sem hologramas', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'eq-19', name: 'Tripé de celular', brand: 'Universal', model: 'Tripé 1,60m articulado com Ring Light', category: 'Outros', category_id: 'ec-9', purchase_date: '2025-02-18', purchase_price: 119.00, funding_source: 'owner_contribution', status: 'active', notes: 'Gravação e registro fotográfico do antes e depois', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const DEFAULT_WISHLIST: WishlistItem[] = [
  {
    id: 'w-1',
    name: 'Politriz Roto-Orbital 15mm 900W',
    category: 'Equipamento',
    estimated_price: 1350.0,
    priority: 'high',
    status: 'planned',
    notes: 'Para correção de pintura e polimento técnico sem marcas de holograma',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'w-2',
    name: 'Extratora Profissional de Estofados 1400W',
    category: 'Equipamento',
    estimated_price: 2890.0,
    priority: 'high',
    status: 'planned',
    notes: 'Higienização profunda de bancos de tecido, carpetes e forrações',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'w-3',
    name: 'Medidor de Espessura de Tinta Digital',
    category: 'Ferramenta',
    estimated_price: 850.0,
    priority: 'medium',
    status: 'planned',
    notes: 'Aferição de micrômetros de verniz antes de etapas de lixamento ou corte pesado',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'w-4',
    name: 'Vitrificador Cerâmico 9H 50ml (Kit Profissional)',
    category: 'Produto / Insumo',
    estimated_price: 420.0,
    priority: 'medium',
    status: 'planned',
    notes: 'Insumo de alto valor agregado para proteção cerâmica de pintura',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'w-5',
    name: 'Canhão de Espuma Snow Foam Pro com Regulagem',
    category: 'Acessório',
    estimated_price: 260.0,
    priority: 'low',
    status: 'purchased',
    notes: 'Adquirido para otimizar pré-lavagem com shampoo desengraxante',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const DEFAULT_SERVICES: ServiceCatalogItem[] = [
  {
    id: 's-1',
    name: 'Lavagem Convencional',
    description: 'Lavagem externa detalhada e aspiração interna completa para o dia a dia.',
    service_type: 'convencional',
    compatible_vehicle_type: 'car',
    estimated_duration_minutes: 60,
    sort_order: 1,
    is_active: true,
    included_items: [
      'Pré-lavagem com shampoo pH neutro',
      'Limpeza das rodas e caixa de rodas',
      'Secagem com toalha de microfibra',
      'Aspiração interna completa',
      'Limpeza básica de painel e console',
      'Limpeza de portas',
      'Limpeza dos vidros internos e externos',
      'Pretinho para pneus',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-2',
    name: 'Lavagem Técnica',
    description: 'Lavagem aprofundada com proteção de cera de carnaúba/sílica e condicionamento de plásticos.',
    service_type: 'tecnica',
    compatible_vehicle_type: 'car',
    estimated_duration_minutes: 90,
    sort_order: 2,
    is_active: true,
    included_items: [
      'Tudo incluído na Lavagem Convencional',
      'Aplicação de cera para proteção da pintura (até 3 meses*)',
      'Condicionamento dos plásticos internos com proteção UV',
      'Selante para pneus com maior resistência à água e poeira',
      'Descontaminação básica e detalhamento de emblemas',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-3',
    name: 'Lavagem Premium',
    description: 'Tratamento de alto padrão com revitalização de plásticos externos e cuidados completos com bancos de couro.',
    service_type: 'premium',
    compatible_vehicle_type: 'car',
    estimated_duration_minutes: 150,
    sort_order: 3,
    is_active: true,
    included_items: [
      'Tudo incluído na Lavagem Técnica',
      'Limpeza profunda de bancos de couro ou higienização leve',
      'Hidratação e condicionamento de bancos de couro (toque seco)',
      'Revitalização dos plásticos externos ressecados',
      'Aromatização especial com fragrância premium',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-4',
    name: 'Lavagem Convencional Moto',
    description: 'Limpeza dedicada para motos com remoção de sujeira e resíduos de asfalto.',
    service_type: 'convencional',
    compatible_vehicle_type: 'motorcycle',
    estimated_duration_minutes: 45,
    sort_order: 4,
    is_active: true,
    included_items: [
      'Pré-lavagem com shampoo desengraxante suave',
      'Limpeza minuciosa de rodas e raios',
      'Secagem com ar comprimido e microfibra',
      'Pretinho para pneus (banda lateral)',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-5',
    name: 'Lavagem Técnica Moto',
    description: 'Limpeza profunda da transmissão, desengraxe e lubrificação profissional da corrente.',
    service_type: 'tecnica',
    compatible_vehicle_type: 'motorcycle',
    estimated_duration_minutes: 60,
    sort_order: 5,
    is_active: true,
    included_items: [
      'Tudo incluído na Lavagem Convencional Moto',
      'Desengraxante detalhado da corrente e balança',
      'Lubrificação de corrente com produto específico de alta aderência',
      'Aplicação de cera protetora no tanque e carenagens',
      'Revitalização de plásticos e borrachas',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-6',
    name: 'Cristalização de Para-brisa',
    description: 'Aplicação de repelente de água profissional para visibilidade total sob chuva.',
    service_type: 'adicional',
    compatible_vehicle_type: 'all',
    estimated_duration_minutes: 40,
    sort_order: 6,
    is_active: true,
    included_items: [
      'Descontaminação do vidro do para-brisa',
      'Limpeza química profunda com desengordurante',
      'Aplicação do cristalizador repelente de água',
      'Lustro com microfibra especial',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-7',
    name: 'Remoção de Chuva Ácida dos Vidros',
    description: 'Eliminação de marcas minerais e manchas d’água impregnadas nos vidros.',
    service_type: 'adicional',
    compatible_vehicle_type: 'all',
    estimated_duration_minutes: 60,
    sort_order: 7,
    is_active: true,
    included_items: [
      'Limpeza inicial e isolamento de borrachas',
      'Polimento químico dos vidros afetados',
      'Remoção de depósitos de cálcio e sílica',
      'Limpeza desengordurante pós-polimento',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 's-8',
    name: 'Higienização de Bancos de Tecido',
    description: 'Higienização por extração profunda de manchas, ácaros e odores em estofados de tecido.',
    service_type: 'adicional',
    compatible_vehicle_type: 'car',
    estimated_duration_minutes: 120,
    sort_order: 8,
    is_active: true,
    included_items: [
      'Aspiração a seco dos tecidos',
      'Aplicação de produto flotador bactericida e fungicida',
      'Escovação com cerdas mecânicas apropriadas',
      'Extração por sucção com enxágue neutralizante',
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Matriz oficial de preços definida pelo negócio
export const DEFAULT_SERVICE_PRICES: ServicePrice[] = [
  // s-1: Lavagem Convencional Carros
  { id: 'sp-1', service_id: 's-1', commercial_category: 'Carro / Compacto', price: 70.00, estimated_duration_minutes: 60, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-2', service_id: 's-1', commercial_category: 'SUV / Crossover', price: 90.00, estimated_duration_minutes: 75, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-3', service_id: 's-1', commercial_category: 'Porte Médio / Pickup', price: 100.00, estimated_duration_minutes: 90, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  
  // s-2: Lavagem Técnica Carros
  { id: 'sp-4', service_id: 's-2', commercial_category: 'Carro / Compacto', price: 109.90, estimated_duration_minutes: 90, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-5', service_id: 's-2', commercial_category: 'SUV / Crossover', price: 129.90, estimated_duration_minutes: 105, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-6', service_id: 's-2', commercial_category: 'Porte Médio / Pickup', price: 139.90, estimated_duration_minutes: 120, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-3: Lavagem Premium Carros
  { id: 'sp-7', service_id: 's-3', commercial_category: 'Carro / Compacto', price: 199.90, estimated_duration_minutes: 150, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-8', service_id: 's-3', commercial_category: 'SUV / Crossover', price: 209.90, estimated_duration_minutes: 165, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-9', service_id: 's-3', commercial_category: 'Porte Médio / Pickup', price: 219.90, estimated_duration_minutes: 180, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-4: Lavagem Convencional Moto
  { id: 'sp-10', service_id: 's-4', commercial_category: 'Moto', price: 35.00, estimated_duration_minutes: 45, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-5: Lavagem Técnica Moto
  { id: 'sp-11', service_id: 's-5', commercial_category: 'Moto', price: 70.00, estimated_duration_minutes: 60, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-6: Cristalização de Para-brisa (Adicional)
  { id: 'sp-12', service_id: 's-6', commercial_category: 'Carro / Compacto', price: 60.00, estimated_duration_minutes: 40, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-13', service_id: 's-6', commercial_category: 'SUV / Crossover', price: 60.00, estimated_duration_minutes: 40, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-14', service_id: 's-6', commercial_category: 'Porte Médio / Pickup', price: 60.00, estimated_duration_minutes: 40, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-7: Remoção de Chuva Ácida dos Vidros (Adicional)
  { id: 'sp-15', service_id: 's-7', commercial_category: 'Carro / Compacto', price: 80.00, estimated_duration_minutes: 60, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-16', service_id: 's-7', commercial_category: 'SUV / Crossover', price: 90.00, estimated_duration_minutes: 60, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-17', service_id: 's-7', commercial_category: 'Porte Médio / Pickup', price: 100.00, estimated_duration_minutes: 70, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // s-8: Higienização de Bancos de Tecido (Adicional)
  { id: 'sp-18', service_id: 's-8', commercial_category: 'Carro / Compacto', price: 150.00, estimated_duration_minutes: 120, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-19', service_id: 's-8', commercial_category: 'SUV / Crossover', price: 180.00, estimated_duration_minutes: 140, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sp-20', service_id: 's-8', commercial_category: 'Porte Médio / Pickup', price: 200.00, estimated_duration_minutes: 150, valid_from: '2025-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Carlos Eduardo Silveira',
    phone: '(11) 98765-4321',
    email: 'carlos.silveira@email.com',
    notes: 'Cliente exigente com secagem e black piano. Prefere atendimento aos sábados pela manhã.',
    is_active: true,
    created_at: '2025-01-15T09:30:00Z',
    updated_at: '2025-01-15T09:30:00Z',
  },
  {
    id: 'cli-2',
    name: 'Mariana Costa Ramos',
    phone: '(11) 97123-8899',
    email: 'mariana.ramos@email.com',
    notes: 'Costuma fazer lavagem técnica mensal com foco em impermeabilização de vidros.',
    is_active: true,
    created_at: '2025-01-20T14:15:00Z',
    updated_at: '2025-01-20T14:15:00Z',
  },
  {
    id: 'cli-3',
    name: 'Rodrigo Mendonça',
    phone: '(11) 99443-1200',
    email: 'rodrigo.mendonca@email.com',
    notes: 'Proprietário de moto custom e SUV familiar.',
    is_active: true,
    created_at: '2025-02-01T11:00:00Z',
    updated_at: '2025-02-01T11:00:00Z',
  },
  {
    id: 'cli-4',
    name: 'Fernanda Lima Alencar',
    phone: '(11) 98111-2233',
    email: 'fernanda.alencar@email.com',
    notes: 'Tem cachorro pequeno, solicita sempre aspiração detalhada dos carpetes.',
    is_active: true,
    created_at: '2025-02-10T16:45:00Z',
    updated_at: '2025-02-10T16:45:00Z',
  },
];

export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    client_id: 'cli-1',
    type: 'car',
    brand: 'Volkswagen',
    model: 'Polo Highline',
    year: 2023,
    color: 'Cinza Platinum',
    plate: 'BRA2E19',
    commercial_category: 'Carro / Compacto',
    category_id: 'vc-1',
    notes: 'Pintura metálica, muito conservada. Tomar cuidado com maçanetas internas.',
    is_active: true,
    created_at: '2025-01-15T09:35:00Z',
    updated_at: '2025-01-15T09:35:00Z',
  },
  {
    id: 'veh-2',
    client_id: 'cli-2',
    type: 'car',
    brand: 'Jeep',
    model: 'Compass Limited',
    year: 2022,
    color: 'Branco Polar',
    plate: 'GHJ8B44',
    commercial_category: 'SUV / Crossover',
    category_id: 'vc-2',
    notes: 'Bancos em couro marrom claro (necessitam hidratação regular).',
    is_active: true,
    created_at: '2025-01-20T14:20:00Z',
    updated_at: '2025-01-20T14:20:00Z',
  },
  {
    id: 'veh-3',
    client_id: 'cli-3',
    type: 'car',
    brand: 'Toyota',
    model: 'Hilux SRX 4x4',
    year: 2024,
    color: 'Prata Nevasca',
    plate: 'TYT9A99',
    commercial_category: 'Porte Médio / Pickup',
    category_id: 'vc-3',
    notes: 'Usa caçamba para carregar equipamentos de trilha.',
    is_active: true,
    created_at: '2025-02-01T11:05:00Z',
    updated_at: '2025-02-01T11:05:00Z',
  },
  {
    id: 'veh-4',
    client_id: 'cli-3',
    type: 'motorcycle',
    brand: 'BMW',
    model: 'F 850 GS',
    year: 2023,
    color: 'Azul Racing',
    plate: 'BMW4K85',
    commercial_category: 'Moto',
    category_id: 'vc-4',
    notes: 'Sempre fazer limpeza e lubrificação técnica da corrente.',
    is_active: true,
    created_at: '2025-02-01T11:10:00Z',
    updated_at: '2025-02-01T11:10:00Z',
  },
  {
    id: 'veh-5',
    client_id: 'cli-4',
    type: 'car',
    brand: 'Chevrolet',
    model: 'Tracker Premier',
    year: 2021,
    color: 'Preto Ouro Negro',
    plate: '', // Placa opcional testada
    commercial_category: 'SUV / Crossover',
    category_id: 'vc-2',
    notes: 'Veículo com placa não informada pelo cliente.',
    is_active: true,
    created_at: '2025-02-10T16:50:00Z',
    updated_at: '2025-02-10T16:50:00Z',
  },
];

// ====================================================================
// STORAGE HELPERS (COM FALLBACK ROBUSTO)
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
    console.error(`Erro ao salvar no storage (${key}):`, err);
  }
}

// Inicializa dados no localStorage se vazios (apenas quando Supabase não configurado ou em modo demo)
export function initializeSeedDataIfEmpty(): void {
  if (getSupabaseClient() && !isDemoModeActive()) {
    return;
  }
  getLocal(STORAGE_KEYS.VEHICLE_CATEGORIES, DEFAULT_VEHICLE_CATEGORIES);
  getLocal(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
  getLocal(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  getLocal(STORAGE_KEYS.EQUIPMENT_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES);
  getLocal(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
  getLocal(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
  getLocal(STORAGE_KEYS.SERVICE_PRICES, DEFAULT_SERVICE_PRICES);
  getLocal(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
  getLocal(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
}

// Executa a inicialização de dados imediatamente
initializeSeedDataIfEmpty();

// ====================================================================
// SERVIÇOS DO DATA SERVICE
// ====================================================================

export const dataService = {
  // -------------------------------------------------------------
  // CLIENTES (REGRA: NUNCA USAR OU CRIAR CPF)
  // -------------------------------------------------------------
  getClients: async (): Promise<Client[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('clients')
        .select('*, vehicles(*)')
        .order('name');
      if (error) {
        console.error('Erro ao buscar clientes no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as Client[];
    }

    const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    return clients.map((c) => ({
      ...c,
      vehicles: vehicles.filter((v) => v.client_id === c.id),
    }));
  },

  getClientById: async (id: string): Promise<Client | null> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('clients')
        .select('*, vehicles(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar cliente por ID no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return data as Client | null;
    }

    const clients = await dataService.getClients();
    return clients.find((c) => c.id === id) || null;
  },

  saveClient: async (clientData: Partial<Client>): Promise<Client> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: clientData.id || crypto.randomUUID(),
        name: clientData.name || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        notes: clientData.notes || '',
        is_active: clientData.is_active !== undefined ? clientData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('clients')
        .upsert(payload)
        .select('*, vehicles(*)')
        .single();

      if (error) {
        console.error('Erro ao salvar cliente no Supabase:', error);
        throw new Error(`Falha ao salvar no Supabase: ${error.message}`);
      }
      return data as Client;
    }

    // Fallback exclusivo para modo demo/sem Supabase
    let saved: Client;
    if (clientData.id) {
      const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
      const index = clients.findIndex((c) => c.id === clientData.id);
      if (index >= 0) {
        saved = {
          ...clients[index],
          ...clientData,
          updated_at: now,
        } as Client;
        clients[index] = saved;
        setLocal(STORAGE_KEYS.CLIENTS, clients);
      } else {
        throw new Error('Cliente não encontrado.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: clientData.name || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        notes: clientData.notes || '',
        is_active: clientData.is_active !== undefined ? clientData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
      clients.unshift(saved);
      setLocal(STORAGE_KEYS.CLIENTS, clients);
    }
    return saved;
  },

  toggleClientStatus: async (id: string, is_active: boolean): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb
        .from('clients')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        throw new Error(`Erro ao atualizar status do cliente no Supabase: ${error.message}`);
      }
      return;
    }

    const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
    const index = clients.findIndex((c) => c.id === id);
    if (index >= 0) {
      clients[index].is_active = is_active;
      clients[index].updated_at = new Date().toISOString();
      setLocal(STORAGE_KEYS.CLIENTS, clients);
    }
  },

  deleteClient: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: vehicles, error: vErr } = await sb
        .from('vehicles')
        .select('id')
        .eq('client_id', id);
      if (vErr) {
        return { success: false, error: `Erro Supabase: ${vErr.message}` };
      }
      if (vehicles && vehicles.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir este cliente pois existem veículos vinculados a ele. Inative o cliente ou transfira os veículos.',
        };
      }
      const { error } = await sb.from('clients').delete().eq('id', id);
      if (error) {
        return { success: false, error: `Erro Supabase: ${error.message}` };
      }
      return { success: true };
    }

    // Fallback demo
    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    const hasVehicles = vehicles.some((v) => v.client_id === id);
    if (hasVehicles) {
      return {
        success: false,
        error: 'Não é possível excluir este cliente pois existem veículos vinculados a ele. Inative o cliente ou transfira os veículos.',
      };
    }
    const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
    const filtered = clients.filter((c) => c.id !== id);
    setLocal(STORAGE_KEYS.CLIENTS, filtered);
    return { success: true };
  },

  // -------------------------------------------------------------
  // VEÍCULOS
  // -------------------------------------------------------------
  getVehicles: async (): Promise<Vehicle[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('vehicles')
        .select('*, client:clients(*)')
        .order('brand');
      if (error) {
        console.error('Erro ao buscar veículos no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as Vehicle[];
    }

    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    const clients = getLocal<Client[]>(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
    return vehicles.map((v) => ({
      ...v,
      client: clients.find((c) => c.id === v.client_id),
    }));
  },

  getVehiclesByClientId: async (clientId: string): Promise<Vehicle[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('vehicles')
        .select('*, client:clients(*)')
        .eq('client_id', clientId)
        .order('brand');
      if (error) {
        console.error('Erro ao buscar veículos por cliente no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as Vehicle[];
    }

    const vehicles = await dataService.getVehicles();
    return vehicles.filter((v) => v.client_id === clientId);
  },

  saveVehicle: async (vehicleData: Partial<Vehicle>): Promise<Vehicle> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      if (!vehicleData.client_id) {
        throw new Error('O cliente proprietário é obrigatório.');
      }
      const payload = {
        id: vehicleData.id || crypto.randomUUID(),
        client_id: vehicleData.client_id,
        type: vehicleData.type || 'car',
        brand: vehicleData.brand || '',
        model: vehicleData.model || '',
        year: vehicleData.year,
        color: vehicleData.color || '',
        plate: vehicleData.plate || '',
        commercial_category: vehicleData.commercial_category || 'Carro / Compacto',
        category_id: vehicleData.category_id || null,
        notes: vehicleData.notes || '',
        is_active: vehicleData.is_active !== undefined ? vehicleData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('vehicles')
        .upsert(payload)
        .select('*, client:clients(*)')
        .single();

      if (error) {
        console.error('Erro ao salvar veículo no Supabase:', error);
        throw new Error(`Falha ao salvar veículo no Supabase: ${error.message}`);
      }
      return data as Vehicle;
    }

    // Fallback demo local
    let saved: Vehicle;
    if (vehicleData.id) {
      const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
      const index = vehicles.findIndex((v) => v.id === vehicleData.id);
      if (index >= 0) {
        saved = {
          ...vehicles[index],
          ...vehicleData,
          updated_at: now,
        } as Vehicle;
        vehicles[index] = saved;
        setLocal(STORAGE_KEYS.VEHICLES, vehicles);
      } else {
        throw new Error('Veículo não encontrado.');
      }
    } else {
      if (!vehicleData.client_id) {
        throw new Error('O cliente proprietário é obrigatório.');
      }
      saved = {
        id: crypto.randomUUID(),
        client_id: vehicleData.client_id,
        type: vehicleData.type || 'car',
        brand: vehicleData.brand || '',
        model: vehicleData.model || '',
        year: vehicleData.year,
        color: vehicleData.color || '',
        plate: vehicleData.plate || '',
        commercial_category: vehicleData.commercial_category || 'Carro / Compacto',
        category_id: vehicleData.category_id,
        notes: vehicleData.notes || '',
        is_active: vehicleData.is_active !== undefined ? vehicleData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
      vehicles.unshift(saved);
      setLocal(STORAGE_KEYS.VEHICLES, vehicles);
    }
    return saved;
  },

  toggleVehicleStatus: async (id: string, is_active: boolean): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb
        .from('vehicles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        throw new Error(`Erro ao atualizar status do veículo no Supabase: ${error.message}`);
      }
      return;
    }

    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    const index = vehicles.findIndex((v) => v.id === id);
    if (index >= 0) {
      vehicles[index].is_active = is_active;
      vehicles[index].updated_at = new Date().toISOString();
      setLocal(STORAGE_KEYS.VEHICLES, vehicles);
    }
  },

  deleteVehicle: async (id: string): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('vehicles').delete().eq('id', id);
      if (error) {
        throw new Error(`Erro ao excluir veículo no Supabase: ${error.message}`);
      }
      return;
    }

    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    const filtered = vehicles.filter((v) => v.id !== id);
    setLocal(STORAGE_KEYS.VEHICLES, filtered);
  },

  // -------------------------------------------------------------
  // CATEGORIAS COMERCIAIS DE VEÍCULOS
  // -------------------------------------------------------------
  getVehicleCategories: async (): Promise<VehicleCategory[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('vehicle_categories')
        .select('*')
        .order('sort_order');
      if (error) {
        console.error('Erro ao buscar categorias de veículos no Supabase:', error);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []) as VehicleCategory[];
    }
    return getLocal<VehicleCategory[]>(STORAGE_KEYS.VEHICLE_CATEGORIES, DEFAULT_VEHICLE_CATEGORIES);
  },

  saveVehicleCategory: async (catData: Partial<VehicleCategory>): Promise<VehicleCategory> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: catData.id || crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        updated_at: now,
      };
      const { data, error } = await sb
        .from('vehicle_categories')
        .upsert(payload)
        .select('*')
        .single();
      if (error) {
        throw new Error(`Erro ao salvar categoria no Supabase: ${error.message}`);
      }
      return data as VehicleCategory;
    }

    const categories = getLocal<VehicleCategory[]>(STORAGE_KEYS.VEHICLE_CATEGORIES, DEFAULT_VEHICLE_CATEGORIES);
    let saved: VehicleCategory;
    if (catData.id) {
      const index = categories.findIndex((c) => c.id === catData.id);
      if (index >= 0) {
        saved = { ...categories[index], ...catData, updated_at: now } as VehicleCategory;
        categories[index] = saved;
      } else {
        throw new Error('Categoria não encontrada.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? categories.length + 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      categories.push(saved);
    }
    setLocal(STORAGE_KEYS.VEHICLE_CATEGORIES, categories);
    return saved;
  },

  deleteVehicleCategory: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: cat } = await sb.from('vehicle_categories').select('*').eq('id', id).single();
      if (!cat) return { success: true };
      const { data: vehicles } = await sb
        .from('vehicles')
        .select('id')
        .or(`category_id.eq.${id},commercial_category.eq.${cat.name}`);
      if (vehicles && vehicles.length > 0) {
        return {
          success: false,
          error: `Não é possível excluir a categoria "${cat.name}" pois existem veículos cadastrados com ela. Inative-a se preferir.`,
        };
      }
      const { error } = await sb.from('vehicle_categories').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const categories = getLocal<VehicleCategory[]>(STORAGE_KEYS.VEHICLE_CATEGORIES, DEFAULT_VEHICLE_CATEGORIES);
    const cat = categories.find((c) => c.id === id);
    if (!cat) return { success: true };

    const vehicles = getLocal<Vehicle[]>(STORAGE_KEYS.VEHICLES, DEFAULT_VEHICLES);
    const inUse = vehicles.some((v) => v.category_id === id || v.commercial_category === cat.name);
    if (inUse) {
      return {
        success: false,
        error: `Não é possível excluir a categoria "${cat.name}" pois existem veículos cadastrados com ela. Inative-a se preferir.`,
      };
    }

    const filtered = categories.filter((c) => c.id !== id);
    setLocal(STORAGE_KEYS.VEHICLE_CATEGORIES, filtered);
    return { success: true };
  },

  // -------------------------------------------------------------
  // CATÁLOGO DE SERVIÇOS & PREÇOS POR CATEGORIA
  // -------------------------------------------------------------
  getServices: async (): Promise<ServiceCatalogItem[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: services, error: sErr } = await sb
        .from('service_catalog')
        .select('*')
        .order('sort_order');
      if (sErr) throw new Error(`Erro Supabase: ${sErr.message}`);

      const { data: prices, error: pErr } = await sb
        .from('service_prices')
        .select('*')
        .eq('is_active', true);
      if (pErr) throw new Error(`Erro Supabase: ${pErr.message}`);

      return (services || []).map((s: any) => ({
        ...s,
        prices: (prices || []).filter((p: any) => p.service_id === s.id && p.is_active),
      })) as ServiceCatalogItem[];
    }

    const services = getLocal<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    const prices = getLocal<ServicePrice[]>(STORAGE_KEYS.SERVICE_PRICES, DEFAULT_SERVICE_PRICES);

    return services.map((s) => ({
      ...s,
      prices: prices.filter((p) => p.service_id === s.id && p.is_active),
    }));
  },

  saveService: async (serviceData: Partial<ServiceCatalogItem>): Promise<ServiceCatalogItem> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: serviceData.id || crypto.randomUUID(),
        name: serviceData.name || '',
        description: serviceData.description || '',
        service_type: serviceData.service_type || 'convencional',
        compatible_vehicle_type: serviceData.compatible_vehicle_type || 'car',
        estimated_duration_minutes: serviceData.estimated_duration_minutes || 60,
        sort_order: serviceData.sort_order ?? 1,
        included_items: serviceData.included_items || [],
        is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('service_catalog')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Erro ao salvar serviço no Supabase: ${error.message}`);
      return data as ServiceCatalogItem;
    }

    const services = getLocal<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    let saved: ServiceCatalogItem;

    if (serviceData.id) {
      const index = services.findIndex((s) => s.id === serviceData.id);
      if (index >= 0) {
        saved = { ...services[index], ...serviceData, updated_at: now } as ServiceCatalogItem;
        services[index] = saved;
      } else {
        throw new Error('Serviço não encontrado.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: serviceData.name || '',
        description: serviceData.description || '',
        service_type: serviceData.service_type || 'convencional',
        compatible_vehicle_type: serviceData.compatible_vehicle_type || 'car',
        estimated_duration_minutes: serviceData.estimated_duration_minutes || 60,
        sort_order: serviceData.sort_order ?? services.length + 1,
        included_items: serviceData.included_items || [],
        is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      services.push(saved);
    }

    setLocal(STORAGE_KEYS.SERVICES, services);
    return saved;
  },

  toggleServiceStatus: async (id: string, is_active: boolean): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb
        .from('service_catalog')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return;
    }

    const services = getLocal<ServiceCatalogItem[]>(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
    const index = services.findIndex((s) => s.id === id);
    if (index >= 0) {
      services[index].is_active = is_active;
      services[index].updated_at = new Date().toISOString();
      setLocal(STORAGE_KEYS.SERVICES, services);
    }
  },

  getServicePrices: async (serviceId?: string): Promise<ServicePrice[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      let query = sb.from('service_prices').select('*');
      if (serviceId) query = query.eq('service_id', serviceId);
      const { data, error } = await query;
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return (data || []) as ServicePrice[];
    }

    const prices = getLocal<ServicePrice[]>(STORAGE_KEYS.SERVICE_PRICES, DEFAULT_SERVICE_PRICES);
    if (serviceId) {
      return prices.filter((p) => p.service_id === serviceId);
    }
    return prices;
  },

  saveServicePrice: async (priceData: Partial<ServicePrice>): Promise<ServicePrice> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      if (!priceData.service_id || !priceData.commercial_category) {
        throw new Error('Serviço e categoria comercial são obrigatórios.');
      }
      const payload = {
        id: priceData.id || crypto.randomUUID(),
        service_id: priceData.service_id,
        commercial_category: priceData.commercial_category,
        price: Number(priceData.price ?? 0),
        estimated_duration_minutes: Number(priceData.estimated_duration_minutes ?? 60),
        valid_from: priceData.valid_from || now.split('T')[0],
        valid_until: priceData.valid_until || null,
        is_active: priceData.is_active !== undefined ? priceData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('service_prices')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Erro ao salvar preço no Supabase: ${error.message}`);
      return data as ServicePrice;
    }

    const prices = getLocal<ServicePrice[]>(STORAGE_KEYS.SERVICE_PRICES, DEFAULT_SERVICE_PRICES);
    let saved: ServicePrice;

    if (priceData.id) {
      const index = prices.findIndex((p) => p.id === priceData.id);
      if (index >= 0) {
        saved = { ...prices[index], ...priceData, updated_at: now } as ServicePrice;
        prices[index] = saved;
      } else {
        throw new Error('Registro de preço não encontrado.');
      }
    } else {
      if (!priceData.service_id || !priceData.commercial_category) {
        throw new Error('Serviço e categoria comercial são obrigatórios.');
      }
      saved = {
        id: crypto.randomUUID(),
        service_id: priceData.service_id,
        commercial_category: priceData.commercial_category,
        price: Number(priceData.price ?? 0),
        estimated_duration_minutes: Number(priceData.estimated_duration_minutes ?? 60),
        valid_from: priceData.valid_from || now.split('T')[0],
        valid_until: priceData.valid_until,
        is_active: priceData.is_active !== undefined ? priceData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      prices.push(saved);
    }

    setLocal(STORAGE_KEYS.SERVICE_PRICES, prices);
    return saved;
  },

  updateServicePriceAmount: async (
    serviceId: string,
    commercialCategory: string,
    newPrice: number,
    durationMinutes?: number
  ): Promise<ServicePrice> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const { data: existing } = await sb
        .from('service_prices')
        .select('*')
        .eq('service_id', serviceId)
        .eq('commercial_category', commercialCategory)
        .eq('is_active', true)
        .maybeSingle();

      const payload = {
        id: existing ? existing.id : crypto.randomUUID(),
        service_id: serviceId,
        commercial_category: commercialCategory,
        price: newPrice,
        estimated_duration_minutes: durationMinutes ?? existing?.estimated_duration_minutes ?? 60,
        valid_from: existing?.valid_from || now.split('T')[0],
        is_active: true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('service_prices')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Erro ao atualizar preço no Supabase: ${error.message}`);
      return data as ServicePrice;
    }

    const prices = getLocal<ServicePrice[]>(STORAGE_KEYS.SERVICE_PRICES, DEFAULT_SERVICE_PRICES);
    const existingIndex = prices.findIndex(
      (p) => p.service_id === serviceId && p.commercial_category === commercialCategory && p.is_active
    );

    if (existingIndex >= 0) {
      prices[existingIndex].price = newPrice;
      if (durationMinutes !== undefined) {
        prices[existingIndex].estimated_duration_minutes = durationMinutes;
      }
      prices[existingIndex].updated_at = now;
      setLocal(STORAGE_KEYS.SERVICE_PRICES, prices);
      return prices[existingIndex];
    } else {
      const newEntry: ServicePrice = {
        id: crypto.randomUUID(),
        service_id: serviceId,
        commercial_category: commercialCategory,
        price: newPrice,
        estimated_duration_minutes: durationMinutes ?? 60,
        valid_from: now.split('T')[0],
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      prices.push(newEntry);
      setLocal(STORAGE_KEYS.SERVICE_PRICES, prices);
      return newEntry;
    }
  },

  // -------------------------------------------------------------
  // CATEGORIAS DE PRODUTOS
  // -------------------------------------------------------------
  getProductCategories: async (): Promise<ProductCategory[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: categories, error: cErr } = await sb
        .from('product_categories')
        .select('*')
        .order('sort_order');
      if (cErr) throw new Error(`Erro Supabase: ${cErr.message}`);

      const { data: products } = await sb.from('products').select('id, category_id');

      return (categories || []).map((cat: any) => ({
        ...cat,
        product_count: (products || []).filter((p: any) => p.category_id === cat.id).length,
      })) as ProductCategory[];
    }

    const categories = getLocal<ProductCategory[]>(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    return categories.map((cat) => ({
      ...cat,
      product_count: products.filter((p) => p.category_id === cat.id || p.category === cat.name).length,
    }));
  },

  saveProductCategory: async (catData: Partial<ProductCategory>): Promise<ProductCategory> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: catData.id || crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('product_categories')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Erro ao salvar categoria no Supabase: ${error.message}`);
      return data as ProductCategory;
    }

    const categories = getLocal<ProductCategory[]>(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
    let saved: ProductCategory;

    if (catData.id) {
      const index = categories.findIndex((c) => c.id === catData.id);
      if (index >= 0) {
        saved = { ...categories[index], ...catData, updated_at: now } as ProductCategory;
        categories[index] = saved;
      } else {
        throw new Error('Categoria não encontrada.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? categories.length + 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      categories.push(saved);
    }

    setLocal(STORAGE_KEYS.PRODUCT_CATEGORIES, categories);
    return saved;
  },

  deleteProductCategory: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: cat } = await sb.from('product_categories').select('*').eq('id', id).single();
      if (!cat) return { success: true };
      const { data: products } = await sb.from('products').select('id').eq('category_id', id);
      if (products && products.length > 0) {
        return {
          success: false,
          error: `Não é possível excluir a categoria "${cat.name}" pois existem produtos vinculados a ela. Remova ou transfira os produtos antes de excluir.`,
        };
      }
      const { error } = await sb.from('product_categories').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const categories = getLocal<ProductCategory[]>(STORAGE_KEYS.PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES);
    const cat = categories.find((c) => c.id === id);
    if (!cat) return { success: true };

    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const inUse = products.some((p) => p.category_id === id || p.category === cat.name);
    if (inUse) {
      return {
        success: false,
        error: `Não é possível excluir a categoria "${cat.name}" pois existem produtos vinculados a ela. Remova ou transfira os produtos antes de excluir.`,
      };
    }

    const filtered = categories.filter((c) => c.id !== id);
    setLocal(STORAGE_KEYS.PRODUCT_CATEGORIES, filtered);
    return { success: true };
  },

  // -------------------------------------------------------------
  // PRODUTOS
  // -------------------------------------------------------------
  getProducts: async (): Promise<Product[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('products')
        .select('*, category:product_categories(name)')
        .order('name');
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return (data || []).map((p: any) => ({
        ...p,
        category: p.category?.name || 'Limpeza externa',
      })) as Product[];
    }
    return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  },

  saveProduct: async (prodData: Partial<Product>): Promise<Product> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: prodData.id || crypto.randomUUID(),
        name: prodData.name || '',
        brand: prodData.brand || '',
        category_id: prodData.category_id || null,
        unit: prodData.unit || 'ml',
        min_stock: prodData.min_stock ?? 0,
        current_stock: prodData.current_stock ?? 0,
        is_active: prodData.is_active !== undefined ? prodData.is_active : true,
        notes: prodData.notes || '',
        updated_at: now,
      };

      const { data, error } = await sb
        .from('products')
        .upsert(payload)
        .select('*, category:product_categories(name)')
        .single();
      if (error) throw new Error(`Erro ao salvar produto no Supabase: ${error.message}`);
      return {
        ...data,
        category: (data as any).category?.name || prodData.category || 'Limpeza externa',
      } as Product;
    }

    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    let saved: Product;

    if (prodData.id) {
      const index = products.findIndex((p) => p.id === prodData.id);
      if (index >= 0) {
        saved = { ...products[index], ...prodData, updated_at: now } as Product;
        products[index] = saved;
      } else {
        throw new Error('Produto não encontrado.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: prodData.name || '',
        brand: prodData.brand || '',
        category: prodData.category || 'Limpeza externa',
        category_id: prodData.category_id,
        unit: prodData.unit || 'ml',
        min_stock: prodData.min_stock ?? 0,
        current_stock: prodData.current_stock ?? 0,
        is_active: prodData.is_active !== undefined ? prodData.is_active : true,
        notes: prodData.notes || '',
        created_at: now,
        updated_at: now,
      };
      products.unshift(saved);
    }

    setLocal(STORAGE_KEYS.PRODUCTS, products);
    return saved;
  },

  toggleProductStatus: async (id: string, is_active: boolean): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb
        .from('products')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return;
    }

    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const index = products.findIndex((p) => p.id === id);
    if (index >= 0) {
      products[index].is_active = is_active;
      products[index].updated_at = new Date().toISOString();
      setLocal(STORAGE_KEYS.PRODUCTS, products);
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return;
    }

    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const filtered = products.filter((p) => p.id !== id);
    setLocal(STORAGE_KEYS.PRODUCTS, filtered);
  },

  // -------------------------------------------------------------
  // CATEGORIAS DE EQUIPAMENTOS
  // -------------------------------------------------------------
  getEquipmentCategories: async (): Promise<EquipmentCategory[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: categories, error: cErr } = await sb
        .from('equipment_categories')
        .select('*')
        .order('sort_order');
      if (cErr) throw new Error(`Erro Supabase: ${cErr.message}`);

      const { data: equipment } = await sb.from('equipment').select('id, category_id');

      return (categories || []).map((cat: any) => ({
        ...cat,
        equipment_count: (equipment || []).filter((e: any) => e.category_id === cat.id).length,
      })) as EquipmentCategory[];
    }

    const categories = getLocal<EquipmentCategory[]>(STORAGE_KEYS.EQUIPMENT_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES);
    const equipment = getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
    return categories.map((cat) => ({
      ...cat,
      equipment_count: equipment.filter((e) => e.category_id === cat.id || e.category === cat.name).length,
    }));
  },

  saveEquipmentCategory: async (catData: Partial<EquipmentCategory>): Promise<EquipmentCategory> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const payload = {
        id: catData.id || crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('equipment_categories')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Erro ao salvar categoria no Supabase: ${error.message}`);
      return data as EquipmentCategory;
    }

    const categories = getLocal<EquipmentCategory[]>(STORAGE_KEYS.EQUIPMENT_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES);
    let saved: EquipmentCategory;

    if (catData.id) {
      const index = categories.findIndex((c) => c.id === catData.id);
      if (index >= 0) {
        saved = { ...categories[index], ...catData, updated_at: now } as EquipmentCategory;
        categories[index] = saved;
      } else {
        throw new Error('Categoria de equipamento não encontrada.');
      }
    } else {
      saved = {
        id: crypto.randomUUID(),
        name: catData.name || '',
        description: catData.description || '',
        sort_order: catData.sort_order ?? categories.length + 1,
        is_active: catData.is_active !== undefined ? catData.is_active : true,
        created_at: now,
        updated_at: now,
      };
      categories.push(saved);
    }

    setLocal(STORAGE_KEYS.EQUIPMENT_CATEGORIES, categories);
    return saved;
  },

  deleteEquipmentCategory: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data: cat } = await sb.from('equipment_categories').select('*').eq('id', id).single();
      if (!cat) return { success: true };
      const { data: equipment } = await sb.from('equipment').select('id').eq('category_id', id);
      if (equipment && equipment.length > 0) {
        return {
          success: false,
          error: `Não é possível excluir a categoria "${cat.name}" pois existem equipamentos vinculados a ela. Remova ou reclassifique os equipamentos primeiro.`,
        };
      }
      const { error } = await sb.from('equipment_categories').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const categories = getLocal<EquipmentCategory[]>(STORAGE_KEYS.EQUIPMENT_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES);
    const cat = categories.find((c) => c.id === id);
    if (!cat) return { success: true };

    const equipment = getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
    const inUse = equipment.some((e) => e.category_id === id || e.category === cat.name);
    if (inUse) {
      return {
        success: false,
        error: `Não é possível excluir a categoria "${cat.name}" pois existem equipamentos vinculados a ela. Remova ou reclassifique os equipamentos primeiro.`,
      };
    }

    const filtered = categories.filter((c) => c.id !== id);
    setLocal(STORAGE_KEYS.EQUIPMENT_CATEGORIES, filtered);
    return { success: true };
  },

  // -------------------------------------------------------------
  // EQUIPAMENTOS
  // -------------------------------------------------------------
  getEquipment: async (): Promise<Equipment[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('equipment')
        .select('*, category_rel:equipment_categories(name)')
        .order('name');
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return (data || []).map((e: any) => ({
        ...e,
        category: e.category_rel?.name || e.category || 'Geral',
      })) as Equipment[];
    }
    return getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
  },

  saveEquipment: async (equipData: Partial<Equipment>): Promise<Equipment> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      // 1. Verificar se é edição ou novo registro no Supabase
      let isExisting = false;
      let existingItem: any = null;

      if (equipData.id) {
        const { data: found } = await sb
          .from('equipment')
          .select('id, name, brand, model, purchase_price, purchase_date, funding_source, category, category_id, status, notes')
          .eq('id', equipData.id)
          .maybeSingle();

        if (found) {
          isExisting = true;
          existingItem = found;
        }
      }

      if (isExisting && existingItem) {
        // Edição: Preservar estritamente campos financeiros históricos (purchase_price, purchase_date, funding_source)
        const payload = {
          name: equipData.name ?? existingItem.name,
          brand: equipData.brand ?? existingItem.brand,
          model: equipData.model ?? existingItem.model,
          category: equipData.category ?? existingItem.category,
          category_id: equipData.category_id ?? existingItem.category_id,
          // Campos financeiros imutáveis
          purchase_date: existingItem.purchase_date,
          purchase_price: existingItem.purchase_price,
          funding_source: existingItem.funding_source,
          status: equipData.status ?? existingItem.status,
          notes: equipData.notes ?? existingItem.notes,
          updated_at: now,
        };

        const { data, error } = await sb
          .from('equipment')
          .update(payload)
          .eq('id', equipData.id)
          .select('*, category_rel:equipment_categories(name)')
          .single();

        if (error) throw new Error(`Erro ao atualizar equipamento no Supabase: ${error.message}`);
        return {
          ...data,
          category: (data as any).category_rel?.name || data.category || equipData.category || 'Geral',
        } as Equipment;
      }

      // Novo equipamento
      const targetId = equipData.id || crypto.randomUUID();
      const price = Number(equipData.purchase_price ?? 0);
      const purchaseDate = equipData.purchase_date || now.split('T')[0];
      const fundingSource = equipData.funding_source || 'company_cash';

      const payload = {
        id: targetId,
        name: equipData.name || '',
        brand: equipData.brand || '',
        model: equipData.model || '',
        category: equipData.category || 'Geral',
        category_id: equipData.category_id || null,
        purchase_date: purchaseDate,
        purchase_price: price,
        funding_source: fundingSource,
        status: equipData.status || 'active',
        notes: equipData.notes || '',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await sb
        .from('equipment')
        .insert(payload)
        .select('*, category_rel:equipment_categories(name)')
        .single();

      if (error) throw new Error(`Erro ao salvar novo equipamento no Supabase: ${error.message}`);

      // Integração financeira automática na criação se houver valor > 0
      if (price > 0) {
        try {
          const { operationService } = await import('./operationService');
          if (fundingSource === 'company_cash') {
            // Verificar duplicidade
            const { data: existingTrx } = await sb
              .from('financial_transactions')
              .select('id')
              .ilike('description', `%ID Equipamento: ${targetId}%`)
              .maybeSingle();

            if (!existingTrx) {
              await operationService.createFinancialExpense({
                category: 'Equipamentos / Imobilizado',
                description: `Aquisição de Equipamento - ${payload.name}${payload.brand ? ` (${payload.brand})` : ''}`,
                amount: price,
                transaction_date: purchaseDate,
                payment_method: 'other',
                notes: `ID Equipamento: ${targetId}`,
              });
            }
          } else if (fundingSource === 'owner_contribution') {
            // Verificar duplicidade
            const { data: existingContrib } = await sb
              .from('capital_contributions')
              .select('id')
              .ilike('description', `%ID Equipamento: ${targetId}%`)
              .maybeSingle();

            if (!existingContrib) {
              await operationService.createCapitalContribution({
                contribution_type: 'owner_paid_purchase',
                description: `Aquisição de Equipamento pelo proprietário - ${payload.name}${payload.brand ? ` (${payload.brand})` : ''} (ID Equipamento: ${targetId})`,
                amount: price,
                contribution_date: purchaseDate,
                payment_method: 'Aporte Equipamento',
              });
            }
          }
        } catch (finErr) {
          console.error('Alerta na integração financeira de equipamento (Supabase):', finErr);
        }
      }

      return {
        ...data,
        category: (data as any).category_rel?.name || data.category || equipData.category || 'Geral',
      } as Equipment;
    }

    // Armazenamento Local / Fallback Demo
    const equipment = getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
    let saved: Equipment;

    if (equipData.id) {
      const index = equipment.findIndex((e) => e.id === equipData.id);
      if (index >= 0) {
        const existing = equipment[index];
        // Preserva campos financeiros originais para evitar divergências
        saved = {
          ...existing,
          name: equipData.name ?? existing.name,
          brand: equipData.brand ?? existing.brand,
          model: equipData.model ?? existing.model,
          category: equipData.category ?? existing.category,
          category_id: equipData.category_id ?? existing.category_id,
          status: equipData.status ?? existing.status,
          notes: equipData.notes ?? existing.notes,
          updated_at: now,
        };
        equipment[index] = saved;
        setLocal(STORAGE_KEYS.EQUIPMENT, equipment);
        return saved;
      }
    }

    // Criação de novo equipamento local
    const targetId = equipData.id || crypto.randomUUID();
    const price = Number(equipData.purchase_price ?? 0);
    const purchaseDate = equipData.purchase_date || now.split('T')[0];
    const fundingSource = equipData.funding_source || 'company_cash';

    saved = {
      id: targetId,
      name: equipData.name || '',
      brand: equipData.brand || '',
      model: equipData.model || '',
      category: equipData.category || 'Geral',
      category_id: equipData.category_id,
      purchase_date: purchaseDate,
      purchase_price: price,
      funding_source: fundingSource,
      status: equipData.status || 'active',
      notes: equipData.notes || '',
      created_at: now,
      updated_at: now,
    };
    equipment.unshift(saved);
    setLocal(STORAGE_KEYS.EQUIPMENT, equipment);

    // Integração financeira na criação
    if (price > 0) {
      try {
        const { operationService, OPERATION_STORAGE_KEYS } = await import('./operationService');
        if (fundingSource === 'company_cash') {
          const trxs = getLocal<FinancialTransaction[]>(OPERATION_STORAGE_KEYS.FINANCIAL_TRANSACTIONS, []);
          const exists = trxs.some((t) => t.description?.includes(`ID Equipamento: ${targetId}`));
          if (!exists) {
            await operationService.createFinancialExpense({
              category: 'Equipamentos / Imobilizado',
              description: `Aquisição de Equipamento - ${saved.name}${saved.brand ? ` (${saved.brand})` : ''}`,
              amount: price,
              transaction_date: purchaseDate,
              payment_method: 'other',
              notes: `ID Equipamento: ${targetId}`,
            });
          }
        } else if (fundingSource === 'owner_contribution') {
          const contribs = getLocal<CapitalContribution[]>(OPERATION_STORAGE_KEYS.CAPITAL_CONTRIBUTIONS, []);
          const exists = contribs.some((c) => c.description?.includes(`ID Equipamento: ${targetId}`));
          if (!exists) {
            await operationService.createCapitalContribution({
              contribution_type: 'owner_paid_purchase',
              description: `Aquisição de Equipamento pelo proprietário - ${saved.name}${saved.brand ? ` (${saved.brand})` : ''} (ID Equipamento: ${targetId})`,
              amount: price,
              contribution_date: purchaseDate,
              payment_method: 'Aporte Equipamento',
            });
          }
        }
      } catch (finErr) {
        console.error('Alerta na integração financeira local do equipamento:', finErr);
      }
    }

    return saved;
  },

  updateEquipmentStatus: async (id: string, status: EquipmentStatus): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb
        .from('equipment')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return;
    }

    const equipment = getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
    const index = equipment.findIndex((e) => e.id === id);
    if (index >= 0) {
      equipment[index].status = status;
      equipment[index].updated_at = new Date().toISOString();
      setLocal(STORAGE_KEYS.EQUIPMENT, equipment);
    }
  },

  deleteEquipment: async (id: string): Promise<void> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('equipment').delete().eq('id', id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      return;
    }

    const equipment = getLocal<Equipment[]>(STORAGE_KEYS.EQUIPMENT, DEFAULT_EQUIPMENT);
    const filtered = equipment.filter((e) => e.id !== id);
    setLocal(STORAGE_KEYS.EQUIPMENT, filtered);
  },

  // -------------------------------------------------------------
  // LISTA DE DESEJOS / AQUISIÇÕES (PLANEJAMENTO)
  // -------------------------------------------------------------
  getWishlist: async (): Promise<WishlistItem[]> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Erro ao carregar wishlist do Supabase:', error.message);
        throw new Error(`Erro Supabase: ${error.message}`);
      }
      return (data || []).map((item: any) => ({
        ...item,
        estimated_price: Number(item.estimated_price || 0),
      })) as WishlistItem[];
    }
    return getLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, DEFAULT_WISHLIST);
  },

  saveWishlistItem: async (itemData: Partial<WishlistItem>): Promise<WishlistItem> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    const price = Number(itemData.estimated_price || 0);
    const cleanItem = {
      name: itemData.name?.trim() || 'Sem nome',
      category: itemData.category?.trim() || 'Geral',
      estimated_price: price >= 0 ? price : 0,
      priority: itemData.priority || 'medium',
      status: itemData.status || 'planned',
      notes: itemData.notes?.trim() || '',
      updated_at: now,
    };

    if (sb && !isDemoModeActive()) {
      if (itemData.id) {
        const { data, error } = await sb
          .from('wishlist')
          .update(cleanItem)
          .eq('id', itemData.id)
          .select()
          .single();
        if (error) throw new Error(`Erro ao atualizar item da wishlist: ${error.message}`);
        return {
          ...data,
          estimated_price: Number(data.estimated_price || 0),
        } as WishlistItem;
      } else {
        const payload = {
          ...cleanItem,
          created_at: now,
        };
        const { data, error } = await sb
          .from('wishlist')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Erro ao cadastrar item na wishlist: ${error.message}`);
        return {
          ...data,
          estimated_price: Number(data.estimated_price || 0),
        } as WishlistItem;
      }
    }

    // Fallback local/demo
    const currentList = getLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, DEFAULT_WISHLIST);
    if (itemData.id) {
      const updated = currentList.map((i) =>
        i.id === itemData.id
          ? ({ ...i, ...cleanItem, id: i.id } as WishlistItem)
          : i
      );
      setLocal(STORAGE_KEYS.WISHLIST, updated);
      return updated.find((i) => i.id === itemData.id)!;
    } else {
      const newItem: WishlistItem = {
        id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...cleanItem,
        created_at: now,
      };
      const updated = [newItem, ...currentList];
      setLocal(STORAGE_KEYS.WISHLIST, updated);
      return newItem;
    }
  },

  updateWishlistStatus: async (
    id: string,
    status: WishlistStatus
  ): Promise<WishlistItem> => {
    const now = new Date().toISOString();
    const sb = getSupabaseClient();

    if (sb && !isDemoModeActive()) {
      const { data, error } = await sb
        .from('wishlist')
        .update({ status, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao atualizar status do item: ${error.message}`);
      return {
        ...data,
        estimated_price: Number(data.estimated_price || 0),
      } as WishlistItem;
    }

    const currentList = getLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, DEFAULT_WISHLIST);
    const updated = currentList.map((i) =>
      i.id === id ? { ...i, status, updated_at: now } : i
    );
    setLocal(STORAGE_KEYS.WISHLIST, updated);
    const found = updated.find((i) => i.id === id);
    if (!found) throw new Error('Item não encontrado na wishlist');
    return found;
  },

  deleteWishlistItem: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const sb = getSupabaseClient();
    if (sb && !isDemoModeActive()) {
      const { error } = await sb.from('wishlist').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const currentList = getLocal<WishlistItem[]>(STORAGE_KEYS.WISHLIST, DEFAULT_WISHLIST);
    const filtered = currentList.filter((i) => i.id !== id);
    setLocal(STORAGE_KEYS.WISHLIST, filtered);
    return { success: true };
  },

  // -------------------------------------------------------------
  // CONTADORES DO DASHBOARD (FASE 2)
  // -------------------------------------------------------------
  getDashboardCounts: async () => {
    const clients = await dataService.getClients();
    const vehicles = await dataService.getVehicles();
    const services = await dataService.getServices();
    const products = await dataService.getProducts();
    const equipment = await dataService.getEquipment();

    const { operationService } = await import('./operationService');
    const appointments = await operationService.getAppointments();
    const executed = await operationService.getExecutedServices();

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter((a) => a.scheduled_date === todayStr);

    return {
      activeClients: clients.filter((c) => c.is_active).length,
      totalClients: clients.length,
      activeVehicles: vehicles.filter((v) => v.is_active).length,
      totalVehicles: vehicles.length,
      activeServices: services.filter((s) => s.is_active).length,
      totalServices: services.length,
      activeProducts: products.filter((p) => p.is_active).length,
      totalProducts: products.length,
      activeEquipment: equipment.filter((e) => e.status === 'active').length,
      totalEquipment: equipment.length,
      equipmentByFunding: {
        company_cash: equipment.filter((e) => e.funding_source === 'company_cash').length,
        owner_contribution: equipment.filter((e) => e.funding_source === 'owner_contribution').length,
      },
      // Fase 3 - Operação
      todayAppointmentsCount: todayAppointments.length,
      inProgressServicesCount: executed.filter((e) => e.status === 'in_progress').length,
      completedServicesCount: executed.filter((e) => e.status === 'completed').length,
      pendingPaymentsCount: executed.filter((e) => e.payment_status === 'pending').length,
    };
  },

  // -------------------------------------------------------------
  // FASE 3: OPERAÇÃO (DELEGADO AO OPERATION SERVICE)
  // -------------------------------------------------------------
  get operation() {
    return import('./operationService').then((m) => m.operationService);
  },
};



