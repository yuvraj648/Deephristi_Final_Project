-- ========================================================
-- DEEPDRISHTI SUPABASE MIGRATION 002: RESEARCHER PROFILE EXPANSION
-- Adds comprehensive oceanographic lab & researcher fields to public.researchers
-- and updates the auth trigger to automatically capture metadata during sign up.
-- ========================================================

-- 1. Add laboratory, institutional, and oceanographic credential columns
ALTER TABLE public.researchers 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS lab_name TEXT,
  ADD COLUMN IF NOT EXISTS lab_location TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS research_focus TEXT,
  ADD COLUMN IF NOT EXISTS orcid_id TEXT,
  ADD COLUMN IF NOT EXISTS clearance_level TEXT DEFAULT 'Level 3 - Biodiversity Surveillance',
  ADD COLUMN IF NOT EXISTS target_gene_marker TEXT DEFAULT '18S V9 (Marine Eukaryotes)',
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Update existing rows with defaults if null
UPDATE public.researchers
SET 
  full_name = COALESCE(full_name, display_name, split_part(email, '@', 1)),
  lab_name = COALESCE(lab_name, 'Marine eDNA & Ocean Surveillance Core'),
  lab_location = COALESCE(lab_location, 'Arabian Sea Operations Base'),
  institution = COALESCE(institution, 'CSIR - National Institute of Oceanography (NIO)'),
  role_title = COALESCE(role_title, 'Marine eDNA Researcher'),
  research_focus = COALESCE(research_focus, 'Marine Environmental DNA & Ocean Surveillance'),
  clearance_level = COALESCE(clearance_level, 'Level 3 - Biodiversity Surveillance'),
  target_gene_marker = COALESCE(target_gene_marker, '18S V9 (Marine Eukaryotes)'),
  updated_at = timezone('utc'::text, now())
WHERE full_name IS NULL;

-- 3. Replace handle_new_user() trigger to automatically map all registration metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.researchers (
        id,
        email,
        display_name,
        full_name,
        lab_name,
        lab_location,
        institution,
        role_title,
        research_focus,
        orcid_id,
        clearance_level,
        target_gene_marker,
        contact_phone,
        bio,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'lab_name', 'Marine eDNA & Ocean Surveillance Core'),
        COALESCE(NEW.raw_user_meta_data->>'lab_location', 'Arabian Sea Operations Base'),
        COALESCE(NEW.raw_user_meta_data->>'institution', 'National Oceanographic Research Institute'),
        COALESCE(NEW.raw_user_meta_data->>'role_title', 'Marine eDNA Researcher'),
        COALESCE(NEW.raw_user_meta_data->>'research_focus', 'Marine Environmental DNA & Ocean Surveillance'),
        NEW.raw_user_meta_data->>'orcid_id',
        COALESCE(NEW.raw_user_meta_data->>'clearance_level', 'Level 3 - Biodiversity Surveillance'),
        COALESCE(NEW.raw_user_meta_data->>'target_gene_marker', '18S V9 (Marine Eukaryotes)'),
        NEW.raw_user_meta_data->>'contact_phone',
        NEW.raw_user_meta_data->>'bio',
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        lab_name = EXCLUDED.lab_name,
        lab_location = EXCLUDED.lab_location,
        institution = EXCLUDED.institution,
        role_title = EXCLUDED.role_title,
        research_focus = EXCLUDED.research_focus,
        orcid_id = EXCLUDED.orcid_id,
        clearance_level = EXCLUDED.clearance_level,
        target_gene_marker = EXCLUDED.target_gene_marker,
        contact_phone = EXCLUDED.contact_phone,
        bio = EXCLUDED.bio,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS and permissions for authenticated researchers to insert & update their own record
DROP POLICY IF EXISTS "Researchers can insert their own profile" ON public.researchers;
CREATE POLICY "Researchers can insert their own profile"
    ON public.researchers FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Researchers can update their own profile" ON public.researchers;
CREATE POLICY "Researchers can update their own profile"
    ON public.researchers FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Researchers can view their own profile" ON public.researchers;
CREATE POLICY "Researchers can view their own profile"
    ON public.researchers FOR SELECT
    USING (auth.uid() = id);
