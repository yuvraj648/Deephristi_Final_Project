-- ========================================================
-- DEEPDRISHTI SUPABASE DATABASE SCHEMA MIGRATION 001
-- Canonical Schema for eDNA expeditions, samples, ASVs, and occurrences
-- Strictly separates source observations from derived ecological metrics
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- Table: researchers
-- Stores authenticated researcher profiles
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researchers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------
-- Table: expeditions
-- Stores expedition-level oceanographic metadata and provenance
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expeditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    researcher_id UUID REFERENCES public.researchers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    description TEXT,
    sampling_start TIMESTAMPTZ,
    sampling_end TIMESTAMPTZ,
    provenance TEXT NOT NULL CHECK (provenance IN ('demo', 'uploaded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --------------------------------------------------------
-- Table: samples
-- Stores biological specimen collection stations and physical metadata
-- Missing coordinates or depths remain NULL (never 0)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL REFERENCES public.expeditions(id) ON DELETE CASCADE,
    sample_id TEXT NOT NULL,
    site TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    depth DOUBLE PRECISION,
    date TEXT,
    replicate TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_expedition_sample UNIQUE (expedition_id, sample_id)
);

-- --------------------------------------------------------
-- Table: asvs
-- Stores exact amplicon sequence variants and optional taxonomic lineages
-- Strictly does NOT store Shannon, Simpson, or richness metrics
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL REFERENCES public.expeditions(id) ON DELETE CASCADE,
    asv_id TEXT NOT NULL,
    sequence TEXT NOT NULL,
    sequence_length INTEGER NOT NULL,
    -- Optional nullable taxonomic hierarchy (never fabricated)
    kingdom TEXT,
    phylum TEXT,
    class TEXT,
    "order" TEXT,
    family TEXT,
    genus TEXT,
    species TEXT,
    assignment_status TEXT DEFAULT 'unassigned',
    confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_expedition_asv UNIQUE (expedition_id, asv_id)
);

-- --------------------------------------------------------
-- Table: occurrences
-- Stores sparse abundance matrix (ASV x Sample read counts)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL REFERENCES public.expeditions(id) ON DELETE CASCADE,
    asv_id TEXT NOT NULL,
    sample_id TEXT NOT NULL,
    abundance INTEGER NOT NULL CHECK (abundance >= 0),
    CONSTRAINT uq_expedition_asv_sample UNIQUE (expedition_id, asv_id, sample_id)
);

-- --------------------------------------------------------
-- Performance Indexes for Large ASV Datasets
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_expeditions_researcher ON public.expeditions(researcher_id);
CREATE INDEX IF NOT EXISTS idx_expeditions_provenance ON public.expeditions(provenance);

CREATE INDEX IF NOT EXISTS idx_samples_expedition ON public.samples(expedition_id);
CREATE INDEX IF NOT EXISTS idx_samples_site ON public.samples(site);

CREATE INDEX IF NOT EXISTS idx_asvs_expedition ON public.asvs(expedition_id);
CREATE INDEX IF NOT EXISTS idx_asvs_asv_id ON public.asvs(asv_id);

CREATE INDEX IF NOT EXISTS idx_occurrences_expedition ON public.occurrences(expedition_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_asv ON public.occurrences(asv_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_sample ON public.occurrences(sample_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_composite ON public.occurrences(expedition_id, sample_id, asv_id);

-- --------------------------------------------------------
-- Trigger: Keep updated_at synchronized on expeditions
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expeditions_updated_at ON public.expeditions;
CREATE TRIGGER trigger_expeditions_updated_at
    BEFORE UPDATE ON public.expeditions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------
-- Trigger: Handle new Supabase Auth user registration
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.researchers (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user ownership isolation with public demo visibility
-- ========================================================

ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

-- 1. Researchers Policies
DROP POLICY IF EXISTS "Researchers can view their own profile" ON public.researchers;
CREATE POLICY "Researchers can view their own profile"
    ON public.researchers FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Researchers can update their own profile" ON public.researchers;
CREATE POLICY "Researchers can update their own profile"
    ON public.researchers FOR UPDATE
    USING (auth.uid() = id);

-- 2. Expeditions Policies
DROP POLICY IF EXISTS "Users can view own expeditions or demo expeditions" ON public.expeditions;
CREATE POLICY "Users can view own expeditions or demo expeditions"
    ON public.expeditions FOR SELECT
    USING (provenance = 'demo' OR auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Authenticated users can create expeditions" ON public.expeditions;
CREATE POLICY "Authenticated users can create expeditions"
    ON public.expeditions FOR INSERT
    WITH CHECK (auth.uid() = researcher_id OR researcher_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own expeditions" ON public.expeditions;
CREATE POLICY "Users can update their own expeditions"
    ON public.expeditions FOR UPDATE
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Users can delete their own uploaded expeditions" ON public.expeditions;
CREATE POLICY "Users can delete their own uploaded expeditions"
    ON public.expeditions FOR DELETE
    USING (provenance = 'uploaded' AND auth.uid() = researcher_id);

-- 3. Samples Policies
DROP POLICY IF EXISTS "Users can view samples of accessible expeditions" ON public.samples;
CREATE POLICY "Users can view samples of accessible expeditions"
    ON public.samples FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = samples.expedition_id
              AND (e.provenance = 'demo' OR e.researcher_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert samples into their own expeditions" ON public.samples;
CREATE POLICY "Users can insert samples into their own expeditions"
    ON public.samples FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = samples.expedition_id
              AND (e.researcher_id = auth.uid() OR e.researcher_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users can update samples in their own expeditions" ON public.samples;
CREATE POLICY "Users can update samples in their own expeditions"
    ON public.samples FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = samples.expedition_id
              AND e.researcher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete samples from their own expeditions" ON public.samples;
CREATE POLICY "Users can delete samples from their own expeditions"
    ON public.samples FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = samples.expedition_id
              AND e.researcher_id = auth.uid()
        )
    );

-- 4. ASVs Policies
DROP POLICY IF EXISTS "Users can view ASVs of accessible expeditions" ON public.asvs;
CREATE POLICY "Users can view ASVs of accessible expeditions"
    ON public.asvs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = asvs.expedition_id
              AND (e.provenance = 'demo' OR e.researcher_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert ASVs into their own expeditions" ON public.asvs;
CREATE POLICY "Users can insert ASVs into their own expeditions"
    ON public.asvs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = asvs.expedition_id
              AND (e.researcher_id = auth.uid() OR e.researcher_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users can delete ASVs from their own expeditions" ON public.asvs;
CREATE POLICY "Users can delete ASVs from their own expeditions"
    ON public.asvs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = asvs.expedition_id
              AND e.researcher_id = auth.uid()
        )
    );

-- 5. Occurrences Policies
DROP POLICY IF EXISTS "Users can view occurrences of accessible expeditions" ON public.occurrences;
CREATE POLICY "Users can view occurrences of accessible expeditions"
    ON public.occurrences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = occurrences.expedition_id
              AND (e.provenance = 'demo' OR e.researcher_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert occurrences into their own expeditions" ON public.occurrences;
CREATE POLICY "Users can insert occurrences into their own expeditions"
    ON public.occurrences FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = occurrences.expedition_id
              AND (e.researcher_id = auth.uid() OR e.researcher_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users can delete occurrences from their own expeditions" ON public.occurrences;
CREATE POLICY "Users can delete occurrences from their own expeditions"
    ON public.occurrences FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expeditions e
            WHERE e.id = occurrences.expedition_id
              AND e.researcher_id = auth.uid()
        )
    );
