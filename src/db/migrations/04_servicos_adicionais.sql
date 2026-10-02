-- ====================================================================
-- GARAGE CAR - SISTEMA DE GESTÃO AUTOMOTIVA
-- MIGRATION 04: SERVIÇOS ADICIONAIS (APPOINTMENT & EXECUTED SERVICE ADDONS)
-- ====================================================================

-- 1. TABELA DE ADICIONAIS DO AGENDAMENTO (APPOINTMENT_ADDONS)
CREATE TABLE IF NOT EXISTS public.appointment_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_catalog_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
    service_name_snap VARCHAR(255) NOT NULL,
    price_snap NUMERIC(10, 2) NOT NULL,
    estimated_duration_minutes_snap INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_appointment_addons_service UNIQUE (appointment_id, service_catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_addons_appointment_id 
    ON public.appointment_addons(appointment_id);

-- 2. TABELA DE ADICIONAIS DO SERVIÇO EXECUTADO (EXECUTED_SERVICE_ADDONS - SNAPSHOTS IMUTÁVEIS)
CREATE TABLE IF NOT EXISTS public.executed_service_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_service_id UUID NOT NULL REFERENCES public.executed_services(id) ON DELETE CASCADE,
    appointment_addon_id UUID NULL REFERENCES public.appointment_addons(id) ON DELETE SET NULL,
    service_catalog_id UUID NOT NULL REFERENCES public.service_catalog(id) ON DELETE RESTRICT,
    service_name_snap VARCHAR(255) NOT NULL,
    price_snap NUMERIC(10, 2) NOT NULL,
    estimated_duration_minutes_snap INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_executed_service_addons_service UNIQUE (executed_service_id, service_catalog_id)
);

CREATE INDEX IF NOT EXISTS idx_executed_service_addons_exec_id 
    ON public.executed_service_addons(executed_service_id);

-- 3. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.appointment_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executed_service_addons ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY['appointment_addons', 'executed_service_addons'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

GRANT ALL ON TABLE public.appointment_addons TO authenticated;
GRANT ALL ON TABLE public.executed_service_addons TO authenticated;
