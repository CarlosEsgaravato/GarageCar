-- ====================================================================
-- GARAGE CAR - SISTEMA DE GESTÃO AUTOMOTIVA
-- MIGRATION 03: FASE 3 — OPERAÇÃO (AGENDA, EXECUÇÃO, FIFO, ESTOQUE E PAGAMENTOS)
-- ====================================================================

-- 1. TABELA DE AGENDAMENTOS (APPOINTMENTS)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_start TIME NOT NULL,
    scheduled_end TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
    ),
    is_exceptional_hours BOOLEAN NOT NULL DEFAULT false,
    estimated_duration_minutes INTEGER DEFAULT 60,
    estimated_price NUMERIC(10, 2) DEFAULT 0.00,
    condition_level VARCHAR(30) DEFAULT 'normal' CHECK (
        condition_level IN ('normal', 'above_normal', 'heavy', 'extreme')
    ),
    surcharge_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    cancellation_reason TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas adicionais para instalações pré-existentes
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 60,
    ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS condition_level VARCHAR(30) DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS surcharge_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT '';

-- 2. TABELA DE SERVIÇOS EXECUTADOS (EXECUTED_SERVICES - SNAPSHOTS IMUTÁVEIS)
CREATE TABLE IF NOT EXISTS public.executed_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
    client_name_snap VARCHAR(255) NOT NULL,
    vehicle_model_snap VARCHAR(255) NOT NULL,
    vehicle_plate_snap VARCHAR(20) DEFAULT '',
    vehicle_category_snap VARCHAR(100) NOT NULL,
    service_name_snap VARCHAR(255) NOT NULL,
    base_price_snap NUMERIC(10, 2) NOT NULL,
    condition_level VARCHAR(30) NOT NULL CHECK (
        condition_level IN ('normal', 'above_normal', 'heavy', 'extreme')
    ),
    surcharge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(10, 2) NOT NULL,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    actual_duration_minutes INTEGER,
    revenue_per_hour NUMERIC(10, 2),
    is_rework BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (
        status IN ('in_progress', 'completed', 'cancelled')
    ),
    condition_notes TEXT DEFAULT '',
    rework_notes TEXT DEFAULT '',
    total_products_cost NUMERIC(10, 2) DEFAULT 0.00,
    simple_gross_margin NUMERIC(10, 2) DEFAULT 0.00,
    simple_gross_margin_percent NUMERIC(5, 2) DEFAULT 0.00,
    cancellation_reason TEXT DEFAULT '',
    cancelled_at TIMESTAMPTZ,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'cancelled')
    ),
    payment_method VARCHAR(30) CHECK (
        payment_method IN ('cash', 'pix', 'debit', 'credit', 'other')
    ),
    paid_at TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas adicionais para instalações pré-existentes
ALTER TABLE public.executed_services
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS condition_notes TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS rework_notes TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS total_products_cost NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS simple_gross_margin NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS simple_gross_margin_percent NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 3. PRODUTOS UTILIZADOS NO SERVIÇO (EXECUTED_SERVICE_PRODUCTS - CUSTO HISTÓRICO)
CREATE TABLE IF NOT EXISTS public.executed_service_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_service_id UUID NOT NULL REFERENCES public.executed_services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.product_batches(id) ON DELETE RESTRICT,
    product_name_snap VARCHAR(255) NOT NULL,
    batch_code_snap VARCHAR(100) DEFAULT '',
    quantity_used NUMERIC(12, 4) NOT NULL CHECK (quantity_used > 0),
    unit_cost_snap NUMERIC(12, 4) NOT NULL,
    total_cost_snap NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA DE CONSUMO PADRÃO POR SERVIÇO (SERVICE_DEFAULT_PRODUCTS)
CREATE TABLE IF NOT EXISTS public.service_default_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    suggested_quantity NUMERIC(12, 4) NOT NULL CHECK (suggested_quantity > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'ml',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VÍNCULO SEGURO EM MOVIMENTAÇÕES FINANCEIRAS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_transactions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_financial_transactions_executed_service' AND table_name = 'financial_transactions'
        ) THEN
            ALTER TABLE public.financial_transactions
            ADD CONSTRAINT fk_financial_transactions_executed_service
            FOREIGN KEY (executed_service_id) REFERENCES public.executed_services(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 6. ÍNDICES DE PERFORMANCE (REQUISITO 44)
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON public.appointments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_executed_services_client_id ON public.executed_services(client_id);
CREATE INDEX IF NOT EXISTS idx_executed_services_vehicle_id ON public.executed_services(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_executed_services_service_id ON public.executed_services(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_executed_services_appointment_id ON public.executed_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_executed_services_payment_status ON public.executed_services(payment_status);
CREATE INDEX IF NOT EXISTS idx_executed_services_created_at ON public.executed_services(created_at);

CREATE INDEX IF NOT EXISTS idx_executed_service_products_exec_id ON public.executed_service_products(executed_service_id);
CREATE INDEX IF NOT EXISTS idx_executed_service_products_prod_id ON public.executed_service_products(product_id);
CREATE INDEX IF NOT EXISTS idx_executed_service_products_batch_id ON public.executed_service_products(batch_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_executed_service_id ON public.stock_movements(executed_service_id);

CREATE INDEX IF NOT EXISTS idx_product_batches_product_fifo ON public.product_batches(product_id, purchase_date ASC, created_at ASC);

-- 7. RLS NAS TABELAS DA FASE 3
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executed_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executed_service_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_default_products ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'appointments', 'executed_services', 'executed_service_products', 'service_default_products'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 8. FUNÇÃO RPC TRANSACIONADA: FINALIZAÇÃO ATÔMICA DE SERVIÇO
CREATE OR REPLACE FUNCTION public.complete_service_transactional(
    p_service_id UUID,
    p_finished_at TIMESTAMPTZ,
    p_payment_status VARCHAR(20),
    p_payment_method VARCHAR(30) DEFAULT NULL,
    p_products_used JSONB DEFAULT '[]'::jsonb,
    p_condition_level VARCHAR(30) DEFAULT NULL,
    p_condition_notes TEXT DEFAULT NULL,
    p_surcharge_amount NUMERIC(10, 2) DEFAULT NULL,
    p_discount_amount NUMERIC(10, 2) DEFAULT NULL,
    p_final_price NUMERIC(10, 2) DEFAULT NULL,
    p_is_rework BOOLEAN DEFAULT NULL,
    p_rework_notes TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_paid_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service RECORD;
    v_duration_min INTEGER;
    v_revenue_hour NUMERIC(10, 2);
    v_final_price NUMERIC(10, 2);
    v_item JSONB;
    v_product_id UUID;
    v_batch_id UUID;
    v_product RECORD;
    v_batch RECORD;
    v_qty NUMERIC(12, 4);
    v_unit_cost NUMERIC(12, 4);
    v_total_cost NUMERIC(10, 2);
    v_prod_name VARCHAR(255);
    v_batch_code VARCHAR(100);
    v_prev_batch_stock NUMERIC(12, 4);
    v_new_batch_stock NUMERIC(12, 4);
    v_prev_prod_stock NUMERIC(12, 4);
    v_new_prod_stock NUMERIC(12, 4);
    v_total_products_cost NUMERIC(10, 2) := 0.00;
    v_simple_gross_margin NUMERIC(10, 2);
    v_simple_gross_margin_percent NUMERIC(5, 2);
    v_paid_timestamp TIMESTAMPTZ;
BEGIN
    -- 1. Obter serviço executado com lock pessimista (FOR UPDATE)
    SELECT * INTO v_service 
    FROM public.executed_services 
    WHERE id = p_service_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Serviço % não encontrado.', p_service_id;
    END IF;

    -- 2. Regra anti-duplicidade: Não permitir finalizar novamente um serviço já finalizado
    IF v_service.status = 'completed' THEN
        RAISE EXCEPTION 'Serviço % já foi finalizado anteriormente.', p_service_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.executed_service_products 
        WHERE executed_service_id = p_service_id
    ) THEN
        RAISE EXCEPTION 'Serviço % já possui produtos movimentados e finalizados.', p_service_id;
    END IF;

    -- 3. Definir preço final do serviço
    v_final_price := COALESCE(p_final_price, v_service.final_price);

    -- 4. Calcular duração real e receita por hora
    IF v_service.started_at IS NOT NULL THEN
        v_duration_min := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (p_finished_at - v_service.started_at)) / 60));
        IF v_duration_min > 0 THEN
            v_revenue_hour := ROUND((v_final_price / (v_duration_min::NUMERIC / 60.0)), 2);
        ELSE
            v_revenue_hour := v_final_price;
        END IF;
    ELSE
        v_duration_min := NULL;
        v_revenue_hour := NULL;
    END IF;

    -- 5. Processamento dos produtos consumidos (FIFO ou lote manual)
    IF p_products_used IS NOT NULL AND jsonb_array_length(p_products_used) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_products_used)
        LOOP
            v_product_id := (v_item->>'product_id')::UUID;
            v_qty := (v_item->>'quantity_used')::NUMERIC;
            
            IF v_qty IS NULL OR v_qty <= 0 THEN
                v_qty := (v_item->>'quantity')::NUMERIC;
            END IF;

            IF v_qty IS NOT NULL AND v_qty > 0 THEN
                -- Obter produto com lock pessimista
                SELECT * INTO v_product 
                FROM public.products 
                WHERE id = v_product_id 
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Produto % não encontrado no cadastro.', v_product_id;
                END IF;

                v_prod_name := COALESCE(v_item->>'product_name_snap', v_product.name);
                
                -- Identificar lote manual ou alocado
                IF v_item->>'batch_id' IS NOT NULL AND (v_item->>'batch_id') != 'virtual-batch' THEN
                    v_batch_id := (v_item->>'batch_id')::UUID;
                ELSIF v_item->>'manual_batch_id' IS NOT NULL AND (v_item->>'manual_batch_id') != 'virtual-batch' THEN
                    v_batch_id := (v_item->>'manual_batch_id')::UUID;
                ELSE
                    v_batch_id := NULL;
                END IF;

                IF v_batch_id IS NOT NULL THEN
                    SELECT * INTO v_batch 
                    FROM public.product_batches 
                    WHERE id = v_batch_id 
                    FOR UPDATE;

                    IF NOT FOUND THEN
                        SELECT * INTO v_batch 
                        FROM public.product_batches 
                        WHERE product_id = v_product_id 
                        ORDER BY purchase_date DESC, created_at DESC 
                        LIMIT 1 
                        FOR UPDATE;
                    END IF;
                ELSE
                    -- Se não especificado lote, consumir o mais antigo por FIFO
                    SELECT * INTO v_batch 
                    FROM public.product_batches 
                    WHERE product_id = v_product_id 
                    ORDER BY purchase_date ASC, created_at ASC 
                    LIMIT 1 
                    FOR UPDATE;
                END IF;

                -- Requisito 6: Não inventar lote se o produto não possui nenhum lote cadastrado
                IF v_batch.id IS NULL THEN
                    RAISE EXCEPTION 'Produto "%" não possui nenhum lote cadastrado. É necessário registrar uma compra/lote antes de realizar o consumo.', v_product.name;
                END IF;

                -- Custos e snapshots
                v_batch_code := COALESCE(v_item->>'batch_code_snap', v_batch.batch_code, 'LOTE');
                IF v_item->>'unit_cost_snap' IS NOT NULL THEN
                    v_unit_cost := (v_item->>'unit_cost_snap')::NUMERIC;
                ELSE
                    v_unit_cost := v_batch.unit_cost;
                END IF;

                IF v_item->>'total_cost_snap' IS NOT NULL THEN
                    v_total_cost := (v_item->>'total_cost_snap')::NUMERIC;
                ELSE
                    v_total_cost := ROUND(v_qty * v_unit_cost, 2);
                END IF;

                -- Atualizar saldo do lote (permitindo saldo negativo - Requisito 14)
                v_prev_batch_stock := v_batch.current_quantity;
                v_new_batch_stock := v_batch.current_quantity - v_qty;

                UPDATE public.product_batches
                SET current_quantity = v_new_batch_stock
                WHERE id = v_batch.id;

                -- Atualizar saldo consolidado do produto (permitindo saldo negativo)
                v_prev_prod_stock := v_product.current_stock;
                v_new_prod_stock := v_product.current_stock - v_qty;

                UPDATE public.products
                SET current_stock = v_new_prod_stock, updated_at = NOW()
                WHERE id = v_product.id;

                -- Inserir movimentação de estoque (saída por serviço)
                INSERT INTO public.stock_movements (
                    product_id,
                    batch_id,
                    movement_type,
                    quantity,
                    previous_stock,
                    new_stock,
                    reason,
                    executed_service_id,
                    created_at
                ) VALUES (
                    v_product_id,
                    v_batch.id,
                    'service_consumption',
                    -v_qty,
                    v_prev_prod_stock,
                    v_new_prod_stock,
                    'Consumo no serviço #' || SUBSTRING(p_service_id::text, 1, 8) || ' (' || v_service.service_name_snap || ')',
                    p_service_id,
                    p_finished_at
                );

                -- Inserir snapshot imutável em executed_service_products
                INSERT INTO public.executed_service_products (
                    executed_service_id,
                    product_id,
                    batch_id,
                    product_name_snap,
                    batch_code_snap,
                    quantity_used,
                    unit_cost_snap,
                    total_cost_snap,
                    created_at
                ) VALUES (
                    p_service_id,
                    v_product_id,
                    v_batch.id,
                    v_prod_name,
                    v_batch_code,
                    v_qty,
                    v_unit_cost,
                    v_total_cost,
                    p_finished_at
                );

                v_total_products_cost := v_total_products_cost + v_total_cost;
            END IF;
        END LOOP;
    END IF;

    -- 6. Métricas financeiras e margens
    v_total_products_cost := ROUND(v_total_products_cost, 2);
    v_simple_gross_margin := ROUND(v_final_price - v_total_products_cost, 2);
    IF v_final_price > 0 THEN
        v_simple_gross_margin_percent := ROUND(((v_final_price - v_total_products_cost) / v_final_price) * 100, 2);
    ELSE
        v_simple_gross_margin_percent := 0.00;
    END IF;

    IF p_payment_status = 'paid' THEN
        v_paid_timestamp := COALESCE(p_paid_at, NOW());
    ELSE
        v_paid_timestamp := NULL;
    END IF;

    -- 7. Atualizar serviço executado com snapshots e métricas finais
    UPDATE public.executed_services
    SET 
        status = 'completed',
        finished_at = p_finished_at,
        actual_duration_minutes = v_duration_min,
        revenue_per_hour = v_revenue_hour,
        condition_level = COALESCE(p_condition_level, condition_level),
        condition_notes = COALESCE(p_condition_notes, condition_notes),
        surcharge_amount = COALESCE(p_surcharge_amount, surcharge_amount),
        discount_amount = COALESCE(p_discount_amount, discount_amount),
        final_price = v_final_price,
        total_products_cost = v_total_products_cost,
        simple_gross_margin = v_simple_gross_margin,
        simple_gross_margin_percent = v_simple_gross_margin_percent,
        payment_status = p_payment_status,
        payment_method = CASE WHEN p_payment_status = 'paid' THEN p_payment_method ELSE NULL END,
        paid_at = v_paid_timestamp,
        is_rework = COALESCE(p_is_rework, is_rework),
        rework_notes = COALESCE(p_rework_notes, rework_notes),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_service_id;

    -- 8. Lançar receita se pagamento concluído
    IF p_payment_status = 'paid' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.financial_transactions 
            WHERE executed_service_id = p_service_id AND NOT is_reversed
        ) THEN
            INSERT INTO public.financial_transactions (
                type,
                category,
                description,
                amount,
                transaction_date,
                payment_method,
                executed_service_id
            ) VALUES (
                'revenue',
                'Serviço Realizado',
                'Receita: ' || v_service.service_name_snap || ' - ' || v_service.vehicle_model_snap,
                v_final_price,
                (p_finished_at AT TIME ZONE 'UTC')::DATE,
                COALESCE(p_payment_method, 'other'),
                p_service_id
            );
        END IF;
    END IF;

    -- 9. Se houver agendamento, marcar concluído
    IF v_service.appointment_id IS NOT NULL THEN
        UPDATE public.appointments
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_service.appointment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'service_id', p_service_id,
        'actual_duration_minutes', v_duration_min,
        'revenue_per_hour', v_revenue_hour,
        'total_products_cost', v_total_products_cost,
        'simple_gross_margin', v_simple_gross_margin,
        'simple_gross_margin_percent', v_simple_gross_margin_percent,
        'payment_status', p_payment_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_service_transactional(
    UUID, TIMESTAMPTZ, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT, NUMERIC, NUMERIC, NUMERIC, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ
) TO authenticated;

-- 8.1 FUNÇÃO RPC TRANSACIONADA: REGISTRO DE COMPRA / ENTRADA DE LOTE
CREATE OR REPLACE FUNCTION public.register_product_purchase(
    p_product_id UUID,
    p_batch_code VARCHAR(100),
    p_purchase_date DATE,
    p_quantity NUMERIC(12, 4),
    p_total_cost NUMERIC(10, 2),
    p_supplier VARCHAR(255),
    p_funding_source VARCHAR(30),
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_batch RECORD;
    v_unit_cost NUMERIC(12, 4);
    v_prev_stock NUMERIC(12, 4);
    v_new_stock NUMERIC(12, 4);
    v_batch_code VARCHAR(100);
BEGIN
    -- 1. Validar quantidade e custo
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'A quantidade comprada deve ser maior que zero.';
    END IF;

    IF p_total_cost IS NULL OR p_total_cost < 0 THEN
        RAISE EXCEPTION 'O custo total não pode ser negativo.';
    END IF;

    -- 2. Validar produto ativo com lock pessimista
    SELECT * INTO v_product 
    FROM public.products 
    WHERE id = p_product_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % não encontrado no cadastro.', p_product_id;
    END IF;

    IF NOT v_product.is_active THEN
        RAISE EXCEPTION 'Produto "%" está inativo para novas compras.', v_product.name;
    END IF;

    -- 3. Calcular custo unitário
    v_unit_cost := ROUND(p_total_cost / p_quantity, 4);

    -- 4. Definir código do lote
    IF p_batch_code IS NOT NULL AND TRIM(p_batch_code) <> '' THEN
        v_batch_code := TRIM(p_batch_code);
    ELSE
        v_batch_code := 'LOTE-' || TO_CHAR(p_purchase_date, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    END IF;

    -- 5. Criar registro em product_batches
    INSERT INTO public.product_batches (
        product_id,
        batch_code,
        purchase_date,
        initial_quantity,
        current_quantity,
        total_cost,
        unit_cost,
        supplier,
        funding_source,
        notes
    ) VALUES (
        p_product_id,
        v_batch_code,
        p_purchase_date,
        p_quantity,
        p_quantity,
        p_total_cost,
        v_unit_cost,
        COALESCE(p_supplier, ''),
        p_funding_source,
        COALESCE(p_notes, '')
    ) RETURNING * INTO v_batch;

    -- 6. Atualizar estoque consolidado do produto
    v_prev_stock := v_product.current_stock;
    v_new_stock := v_prev_stock + p_quantity;

    UPDATE public.products
    SET current_stock = v_new_stock, updated_at = NOW()
    WHERE id = p_product_id;

    -- 7. Registrar movimentação de entrada em stock_movements
    INSERT INTO public.stock_movements (
        product_id,
        batch_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        created_at
    ) VALUES (
        p_product_id,
        v_batch.id,
        'purchase',
        p_quantity,
        v_prev_stock,
        v_new_stock,
        'Entrada por compra - Lote ' || v_batch_code,
        (p_purchase_date::text || ' ' || TO_CHAR(NOW(), 'HH24:MI:SS'))::TIMESTAMPTZ
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch.id,
        'product_id', p_product_id,
        'batch_code', v_batch_code,
        'initial_quantity', p_quantity,
        'current_quantity', p_quantity,
        'unit_cost', v_unit_cost,
        'total_cost', p_total_cost,
        'previous_stock', v_prev_stock,
        'new_stock', v_new_stock
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_product_purchase(
    UUID, VARCHAR, DATE, NUMERIC, NUMERIC, VARCHAR, VARCHAR, TEXT
) TO authenticated;

-- 9. SEEDS DE LOTES PARA TESTES DE FIFO (INCLUINDO V-FLOC COM 2 LOTES)
DO $$
DECLARE
    v_floc_id UUID;
    v_ultra_id UUID;
    v_dremov_id UUID;
    v_glazy_id UUID;
    v_darker_id UUID;
    v_aroma_id UUID;
BEGIN
    SELECT id INTO v_floc_id FROM public.products WHERE name ILIKE '%V-Floc%' LIMIT 1;
    SELECT id INTO v_ultra_id FROM public.products WHERE name ILIKE '%Ultra%' LIMIT 1;
    SELECT id INTO v_dremov_id FROM public.products WHERE name ILIKE '%D-Remov%' LIMIT 1;
    SELECT id INTO v_glazy_id FROM public.products WHERE name ILIKE '%Glazy%' LIMIT 1;
    SELECT id INTO v_darker_id FROM public.products WHERE name ILIKE '%Darker%' LIMIT 1;
    SELECT id INTO v_aroma_id FROM public.products WHERE name ILIKE '%Aromatizante%' LIMIT 1;

    -- Lotes de V-Floc para demonstrar FIFO
    IF v_floc_id IS NOT NULL THEN
        -- Lote A: mais antigo (100ml saldo) - R$ 0,018/ml
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_floc_id, 'LOTE-VF-A', '2025-01-10', 500.00, 100.00, 9.00, 0.0180, 'Distribuidor Estética SP', 'company_cash', 'Lote A mais antigo para FIFO')
        ON CONFLICT DO NOTHING;

        -- Lote B: mais recente (3000ml saldo) - R$ 0,016/ml
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_floc_id, 'LOTE-VF-B', '2025-02-01', 3000.00, 3000.00, 48.00, 0.0160, 'Vonixx Oficial', 'company_cash', 'Lote B mais recente')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lote Ultra Limpador
    IF v_ultra_id IS NOT NULL THEN
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_ultra_id, 'LOTE-ULTRA-01', '2025-01-05', 5000.00, 5000.00, 60.00, 0.0120, 'Distribuidor Químico', 'company_cash', 'Galão 5L APC')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lote D-Remov
    IF v_dremov_id IS NOT NULL THEN
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_dremov_id, 'LOTE-DREMOV-01', '2025-01-08', 3000.00, 3000.00, 45.00, 0.0150, 'Delux Distribuição', 'company_cash', 'Desengraxante 3L')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lote Glazy
    IF v_glazy_id IS NOT NULL THEN
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_glazy_id, 'LOTE-GLAZY-01', '2025-01-15', 1500.00, 1500.00, 36.00, 0.0240, 'Vonixx Oficial', 'company_cash', 'Limpa Vidros 1.5L')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lote Darker
    IF v_darker_id IS NOT NULL THEN
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_darker_id, 'LOTE-DARKER-01', '2025-01-15', 3000.00, 3000.00, 60.00, 0.0200, 'Vintex Oficial', 'company_cash', 'Pneus Darker 3L')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Lote Aromatizante
    IF v_aroma_id IS NOT NULL THEN
        INSERT INTO public.product_batches (product_id, batch_code, purchase_date, initial_quantity, current_quantity, total_cost, unit_cost, supplier, funding_source, notes)
        VALUES (v_aroma_id, 'LOTE-AROMA-01', '2025-01-18', 20.00, 20.00, 90.00, 4.5000, 'Bugatti Aromas', 'company_cash', 'Pack 20 un aromatizantes')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
