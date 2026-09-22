-- ====================================================================
-- GARAGE CAR - SISTEMA DE GESTÃO AUTOMOTIVA
-- MIGRATION 01: FASE 1 — FUNDAÇÃO, BANCO, SEGURANÇA (RLS), STORAGE E AUDITORIA
-- ====================================================================

-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. TABELAS DE FUNDAÇÃO & GOVERNANÇA
-- ====================================================================

-- 2.1 CLIENTES (REGRA ABSOLUTA: NÃO CRIAR CPF)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 AUDITORIA DO SISTEMA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email VARCHAR(255) DEFAULT '',
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 MOVIMENTAÇÕES FINANCEIRAS (FUNDAÇÃO FINANCEIRA)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'expense')),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL,
    executed_service_id UUID,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversal_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 APORTES DE CAPITAL (FUNDAÇÃO FINANCEIRA)
CREATE TABLE IF NOT EXISTS public.capital_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_type VARCHAR(40) NOT NULL CHECK (
        contribution_type IN ('direct_cash', 'owner_paid_purchase')
    ),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 LISTA DE DESEJOS (PLANEJAMENTO)
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT '',
    estimated_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high')
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'planned' CHECK (
        status IN ('planned', 'purchased', 'cancelled')
    ),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 3. SEGURANÇA: ROW LEVEL SECURITY (RLS) - FASE 1
-- ====================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'clients', 'system_settings', 'audit_logs',
        'financial_transactions', 'capital_contributions', 'wishlist'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ====================================================================
-- 4. STORAGE: CONFIGURAÇÃO DE BUCKET DO SUPABASE
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('garage-car-assets', 'garage-car-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public view assets" ON storage.objects;
CREATE POLICY "Public view assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'garage-car-assets');

DROP POLICY IF EXISTS "Admin upload assets" ON storage.objects;
CREATE POLICY "Admin upload assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'garage-car-assets')
WITH CHECK (bucket_id = 'garage-car-assets');

-- ====================================================================
-- 5. SEEDS DE FUNDAÇÃO (IDEMPOTENTES)
-- ====================================================================

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES 
    ('business_hours', '{
        "monday": { "isOpen": false, "open": "08:00", "close": "18:00" },
        "tuesday": { "isOpen": false, "open": "08:00", "close": "18:00" },
        "wednesday": { "isOpen": false, "open": "08:00", "close": "18:00" },
        "thursday": { "isOpen": false, "open": "08:00", "close": "18:00" },
        "friday": { "isOpen": false, "open": "08:00", "close": "18:00" },
        "saturday": { "isOpen": true, "open": "08:00", "close": "18:00" },
        "sunday": { "isOpen": true, "open": "08:00", "close": "14:00" }
    }'::jsonb),
    ('company_profile', '{
        "name": "Garage Car",
        "segment": "Estética Automotiva",
        "currency": "BRL",
        "description": "Estética automotiva especializada em lavagens técnicas, convencionais e detalhamento."
    }'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
