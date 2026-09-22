-- ====================================================================
-- GARAGE CAR - SISTEMA DE GESTÃO AUTOMOTIVA
-- MIGRATION 02: FASE 2 — CADASTROS BÁSICOS, CATEGORIAS, PRECIFICAÇÃO E PRODUTOS
-- ====================================================================

-- 1. CATEGORIAS COMERCIAIS DE VEÍCULOS (Configuráveis)
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CATEGORIAS DE EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS public.equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ACRÉSCIMOS DE CONDIÇÃO
CREATE TABLE IF NOT EXISTS public.condition_surcharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_level VARCHAR(30) UNIQUE NOT NULL CHECK (
        condition_level IN ('normal', 'above_normal', 'heavy', 'extreme')
    ),
    label VARCHAR(50) NOT NULL,
    suggested_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VEÍCULOS (Categoria comercial selecionável, placa opcional)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('car', 'motorcycle')),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50) DEFAULT '',
    plate VARCHAR(20) DEFAULT '',
    commercial_category VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CATÁLOGO DE SERVIÇOS
CREATE TABLE IF NOT EXISTS public.service_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    service_type VARCHAR(30) NOT NULL CHECK (service_type IN ('convencional', 'tecnica', 'premium', 'adicional')),
    compatible_vehicle_type VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (compatible_vehicle_type IN ('car', 'motorcycle', 'all')),
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
    sort_order INTEGER NOT NULL DEFAULT 0,
    included_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PREÇOS DOS SERVIÇOS POR CATEGORIA DE VEÍCULO
CREATE TABLE IF NOT EXISTS public.service_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
    commercial_category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_service_category_validity UNIQUE (service_id, commercial_category, valid_from)
);

-- 8. PRODUTOS (ml para líquidos internamente)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'Geral',
    category_id UUID REFERENCES public.product_categories(id) ON DELETE RESTRICT,
    unit VARCHAR(20) NOT NULL DEFAULT 'ml',
    min_stock NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    current_stock NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) DEFAULT '',
    model VARCHAR(100) DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT 'Geral',
    category_id UUID REFERENCES public.equipment_categories(id) ON DELETE RESTRICT,
    purchase_date DATE,
    purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    funding_source VARCHAR(40) NOT NULL DEFAULT 'company_cash' CHECK (
        funding_source IN ('company_cash', 'owner_contribution')
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'maintenance', 'retired')
    ),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. LOTES DE PRODUTOS (Rastreabilidade e Custo Histórico FIFO)
CREATE TABLE IF NOT EXISTS public.product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_code VARCHAR(100) DEFAULT '',
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_quantity NUMERIC(12, 4) NOT NULL CHECK (initial_quantity > 0),
    current_quantity NUMERIC(12, 4) NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL CHECK (total_cost >= 0),
    unit_cost NUMERIC(12, 4) NOT NULL CHECK (unit_cost >= 0),
    supplier VARCHAR(255) DEFAULT '',
    funding_source VARCHAR(30) NOT NULL CHECK (
        funding_source IN ('company_cash', 'owner_contribution')
    ),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.product_batches(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL CHECK (
        movement_type IN ('purchase', 'service_consumption', 'positive_adjustment', 'negative_adjustment')
    ),
    quantity NUMERIC(12, 4) NOT NULL,
    previous_stock NUMERIC(12, 4) NOT NULL,
    new_stock NUMERIC(12, 4) NOT NULL,
    reason TEXT NOT NULL,
    executed_service_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. FOREIGN KEY ADICIONAL EM APORTES DE CAPITAL (se tabela existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'capital_contributions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_capital_contributions_batch' AND table_name = 'capital_contributions'
        ) THEN
            ALTER TABLE public.capital_contributions
            ADD CONSTRAINT fk_capital_contributions_batch
            FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ====================================================================
-- 13. SEGURANÇA: ROW LEVEL SECURITY (RLS) - FASE 2
-- ====================================================================

ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_surcharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'vehicle_categories', 'product_categories', 'equipment_categories',
        'condition_surcharges', 'vehicles', 'service_catalog', 'service_prices',
        'products', 'equipment', 'product_batches', 'stock_movements'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ====================================================================
-- 14. SEEDS DE CADASTROS DA FASE 2 (IDEMPOTENTES)
-- ====================================================================

-- 14.1 Categorias Comerciais de Veículos
INSERT INTO public.vehicle_categories (name, description, sort_order) VALUES
    ('Carro / Compacto', 'Hatches, sedãs compactos e modelos leves (ex: Onix, Polo, Strada antiga)', 1),
    ('SUV / Crossover', 'Utilitários esportivos e crossovers médios (ex: Compass, Renegade, Tracker, Creta)', 2),
    ('Porte Médio / Pickup', 'Pickups médias e grandes, SUVs de grande porte (ex: Toro, Hilux, Ranger, S10)', 3),
    ('Moto', 'Motocicletas de todos os estilos e cilindradas (street, trail, custom, esportivas)', 4)
ON CONFLICT (name) DO NOTHING;

-- 14.2 Categorias de Produtos
INSERT INTO public.product_categories (name, description, sort_order) VALUES
    ('Limpeza externa', 'Shampoos, desengraxantes e removedores de sujeira da lataria e rodas', 1),
    ('Limpeza interna', 'Limpadores multiuso (APC) e bactericidas para estofados e carpetes', 2),
    ('Pneus', 'Pretinhos, selantes e abrilhantadores de borracha', 3),
    ('Plásticos', 'Restauradores, condicionadores e protetores UV de plásticos internos e externos', 4),
    ('Vidros', 'Limpadores desengordurantes, cristalizadores e removedores de chuva ácida', 5),
    ('Proteção', 'Ceras líquidas e em pasta, selantes de pintura e cerâmicos', 6),
    ('Couro', 'Limpadores específicos e hidratantes com toque seco para couro', 7),
    ('Motocicletas', 'Lubrificantes de corrente e produtos específicos para bikes/motos', 8),
    ('Finalização', 'Aromatizantes, cheirinhos e toques finais pós-entrega', 9),
    ('Outros', 'Insumos gerais e desengordurantes ácidos/alcalinos pesados', 10)
ON CONFLICT (name) DO NOTHING;

-- 14.3 Categorias de Equipamentos
INSERT INTO public.equipment_categories (name, description, sort_order) VALUES
    ('Lavagem', 'Máquinas de alta pressão, canhões de espuma (snow foam) e baldes', 1),
    ('Aspiração', 'Aspiradores de pó e água, sopradores e bicos especiais', 2),
    ('Aplicação', 'Pulverizadores manuais e de compressão prévia', 3),
    ('Microfibras', 'Toalhas de secagem, luvas de lavagem e panos especiais', 4),
    ('Escovas', 'Pincéis de detalhamento, escovas de rodas, caixas e correntes', 5),
    ('Organização', 'Carrinhos de ferramentas, suportes e organizadores', 6),
    ('Ferramentas', 'Extratores, mangueiras e adaptadores técnicos', 7),
    ('Segurança', 'EPIs e acessórios de proteção para operação química', 8),
    ('Outros', 'Acessórios diversos para fotografia e suporte operacional', 9)
ON CONFLICT (name) DO NOTHING;

-- 14.4 Acréscimos de Condição
INSERT INTO public.condition_surcharges (condition_level, label, suggested_amount) VALUES 
    ('normal', 'Normal', 0.00),
    ('above_normal', 'Acima do normal', 10.00),
    ('heavy', 'Pesada', 20.00),
    ('extreme', 'Extrema', 0.00)
ON CONFLICT (condition_level) DO NOTHING;

-- 14.5 Catálogo Oficial de Serviços e Matriz de Preços
DO $$
DECLARE
    v_s_conv UUID;
    v_s_tec UUID;
    v_s_prem UUID;
    v_s_vidro UUID;
    v_s_chuva UUID;
    v_s_banco UUID;
BEGIN
    -- Lavagem Convencional
    SELECT id INTO v_s_conv FROM public.service_catalog WHERE name = 'Lavagem Convencional' LIMIT 1;
    IF v_s_conv IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Lavagem Convencional',
            'Lavagem padrão externa e interna completa.',
            'convencional',
            'all',
            60,
            1,
            '["Pré-lavagem", "Shampoo pH neutro", "Limpeza das rodas", "Secagem com microfibra", "Aspiração interna", "Limpeza básica de painel, console e portas", "Limpeza dos vidros", "Pretinho para pneus"]'::jsonb
        ) RETURNING id INTO v_s_conv;
    END IF;

    -- Lavagem Técnica
    SELECT id INTO v_s_tec FROM public.service_catalog WHERE name = 'Lavagem Técnica' LIMIT 1;
    IF v_s_tec IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Lavagem Técnica',
            'Lavagem detalhada com proteção de cera por até 3 meses e condicionamento de plásticos.',
            'tecnica',
            'all',
            90,
            2,
            '["Pré-lavagem", "Shampoo pH neutro", "Limpeza das rodas", "Secagem com microfibra", "Aspiração interna", "Limpeza básica de painel, console e portas", "Limpeza dos vidros", "Pretinho para pneus", "Proteção da pintura com cera (até 3 meses)", "Condicionamento dos plásticos internos", "Selante para pneus com maior resistência à água"]'::jsonb
        ) RETURNING id INTO v_s_tec;
    END IF;

    -- Lavagem Premium
    SELECT id INTO v_s_prem FROM public.service_catalog WHERE name = 'Lavagem Premium' LIMIT 1;
    IF v_s_prem IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Lavagem Premium',
            'Detalhamento profundo com hidratação de couro e revitalização dos plásticos externos.',
            'premium',
            'car',
            150,
            3,
            '["Pré-lavagem", "Shampoo pH neutro", "Limpeza das rodas", "Secagem com microfibra", "Aspiração interna", "Limpeza básica de painel, console e portas", "Limpeza dos vidros", "Pretinho para pneus", "Proteção da pintura com cera (até 3 meses)", "Condicionamento dos plásticos internos", "Selante para pneus com maior resistência à água", "Limpeza e hidratação de bancos de couro", "Revitalização dos plásticos externos"]'::jsonb
        ) RETURNING id INTO v_s_prem;
    END IF;

    -- Preços Lavagem Convencional
    INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
        (v_s_conv, 'Carro / Compacto', 70.00, 60),
        (v_s_conv, 'SUV / Crossover', 90.00, 75),
        (v_s_conv, 'Porte Médio / Pickup', 100.00, 90),
        (v_s_conv, 'Moto', 35.00, 45)
    ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;

    -- Preços Lavagem Técnica
    INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
        (v_s_tec, 'Carro / Compacto', 109.90, 90),
        (v_s_tec, 'SUV / Crossover', 129.90, 105),
        (v_s_tec, 'Porte Médio / Pickup', 139.90, 120),
        (v_s_tec, 'Moto', 70.00, 60)
    ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;

    -- Preços Lavagem Premium
    INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
        (v_s_prem, 'Carro / Compacto', 199.90, 150),
        (v_s_prem, 'SUV / Crossover', 209.90, 165),
        (v_s_prem, 'Porte Médio / Pickup', 219.90, 180)
    ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;

    -- Serviços Adicionais
    SELECT id INTO v_s_vidro FROM public.service_catalog WHERE name = 'Cristalização de Para-brisa' LIMIT 1;
    IF v_s_vidro IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Cristalização de Para-brisa',
            'Aplicação de repelente de água com tecnologia hidrofóbica nos vidros frontais.',
            'adicional',
            'car',
            30,
            4,
            '["Descontaminação do vidro", "Aplicação do cristalizador hidrofóbico", "Acabamento de alta visibilidade"]'::jsonb
        ) RETURNING id INTO v_s_vidro;

        INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
            (v_s_vidro, 'Carro / Compacto', 60.00, 30),
            (v_s_vidro, 'SUV / Crossover', 60.00, 30),
            (v_s_vidro, 'Porte Médio / Pickup', 60.00, 30)
        ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;
    END IF;

    SELECT id INTO v_s_chuva FROM public.service_catalog WHERE name = 'Remoção de chuva ácida dos vidros' LIMIT 1;
    IF v_s_chuva IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Remoção de chuva ácida dos vidros',
            'Polimento químico e descontaminação de manchas minerais em todos os vidros.',
            'adicional',
            'car',
            45,
            5,
            '["Descontaminação química", "Polimento suave de vidros", "Limpeza e proteção"]'::jsonb
        ) RETURNING id INTO v_s_chuva;

        INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
            (v_s_chuva, 'Carro / Compacto', 80.00, 45),
            (v_s_chuva, 'SUV / Crossover', 80.00, 45),
            (v_s_chuva, 'Porte Médio / Pickup', 80.00, 45)
        ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;
    END IF;

    SELECT id INTO v_s_banco FROM public.service_catalog WHERE name = 'Higienização de bancos de tecido' LIMIT 1;
    IF v_s_banco IS NULL THEN
        INSERT INTO public.service_catalog (name, description, service_type, compatible_vehicle_type, estimated_duration_minutes, sort_order, included_items)
        VALUES (
            'Higienização de bancos de tecido',
            'Extração profunda de sujidades e ácaros dos estofados.',
            'adicional',
            'car',
            90,
            6,
            '["Aspiração profunda", "Aplicação de flotador e bactericida", "Extração mecânica", "Secagem acelerada"]'::jsonb
        ) RETURNING id INTO v_s_banco;

        INSERT INTO public.service_prices (service_id, commercial_category, price, estimated_duration_minutes) VALUES
            (v_s_banco, 'Carro / Compacto', 150.00, 90),
            (v_s_banco, 'SUV / Crossover', 170.00, 100),
            (v_s_banco, 'Porte Médio / Pickup', 190.00, 120)
        ON CONFLICT (service_id, commercial_category, valid_from) DO NOTHING;
    END IF;
END $$;
