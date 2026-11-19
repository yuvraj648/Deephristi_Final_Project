// ========================================================
// DEEPDRISHTI RESEARCHER PROFILE SERVICE
// Manages researcher laboratory details, oceanographic credentials,
// and synchronized persistence across Supabase PostgreSQL and local storage.
// ========================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ResearcherProfile {
  id: string;
  email: string;
  display_name?: string;
  full_name: string;
  lab_name: string;
  lab_location: string;
  institution: string;
  role_title: string;
  research_focus: string;
  orcid_id?: string;
  clearance_level: string;
  target_gene_marker?: string;
  contact_phone?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_PROFILE_KEY = 'deepdrishti_active_researcher_profile';

/**
 * Retrieve cached active profile from local storage
 */
export function getLocalProfile(): ResearcherProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResearcherProfile;
  } catch {
    return null;
  }
}

/**
 * Cache active researcher profile in local storage
 */
export function setLocalProfile(profile: ResearcherProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    }
  } catch (err) {
    console.warn('DeepDrishti: Failed to cache researcher profile in localStorage', err);
  }
}

/**
 * Fetch complete researcher profile from Supabase PostgreSQL (or Auth user metadata)
 */
export async function fetchResearcherProfile(userId: string, userEmail?: string): Promise<ResearcherProfile> {
  const fallbackProfile: ResearcherProfile = {
    id: userId,
    email: userEmail || '',
    full_name: userEmail ? userEmail.split('@')[0] : 'Marine Researcher',
    display_name: userEmail ? userEmail.split('@')[0] : 'Marine Researcher',
    lab_name: 'Marine eDNA & Ocean Surveillance Core',
    lab_location: 'Arabian Sea Hydrographic Station',
    institution: 'National Oceanographic Research Institute',
    role_title: 'Chief Marine Bioinformatician',
    research_focus: 'Marine Environmental DNA & Ocean Surveillance',
    clearance_level: 'Level 3 - Biodiversity Surveillance',
    target_gene_marker: '18S V9 (Marine Eukaryotes)',
  };

  if (!isSupabaseConfigured() || !supabase) {
    const cached = getLocalProfile();
    return cached && cached.id === userId ? cached : fallbackProfile;
  }

  try {
    // 1. Attempt to fetch from public.researchers table
    const { data, error } = await supabase
      .from('researchers')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      const profile: ResearcherProfile = {
        id: data.id,
        email: data.email || userEmail || '',
        display_name: data.display_name || data.full_name || (userEmail ? userEmail.split('@')[0] : ''),
        full_name: data.full_name || data.display_name || (userEmail ? userEmail.split('@')[0] : 'Marine Researcher'),
        lab_name: data.lab_name || 'Marine eDNA & Ocean Surveillance Core',
        lab_location: data.lab_location || 'Oceanographic Operations Base',
        institution: data.institution || 'National Oceanographic Agency',
        role_title: data.role_title || 'Marine eDNA Researcher',
        research_focus: data.research_focus || 'Marine Environmental DNA & Ocean Surveillance',
        orcid_id: data.orcid_id || undefined,
        clearance_level: data.clearance_level || 'Level 3 - Biodiversity Surveillance',
        target_gene_marker: data.target_gene_marker || '18S V9 (Marine Eukaryotes)',
        contact_phone: data.contact_phone || undefined,
        bio: data.bio || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setLocalProfile(profile);
      return profile;
    }

    // 2. If table doesn't have expanded columns or record yet, check Supabase Auth metadata
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === userId) {
      const meta = authData.user.user_metadata || {};
      const profileFromMeta: ResearcherProfile = {
        id: userId,
        email: authData.user.email || userEmail || '',
        display_name: meta.display_name || meta.full_name || (authData.user.email ? authData.user.email.split('@')[0] : ''),
        full_name: meta.full_name || meta.display_name || (authData.user.email ? authData.user.email.split('@')[0] : 'Marine Researcher'),
        lab_name: meta.lab_name || 'Marine eDNA & Ocean Surveillance Core',
        lab_location: meta.lab_location || 'Oceanographic Operations Base',
        institution: meta.institution || 'National Oceanographic Agency',
        role_title: meta.role_title || 'Marine eDNA Researcher',
        research_focus: meta.research_focus || 'Marine Environmental DNA & Ocean Surveillance',
        orcid_id: meta.orcid_id || undefined,
        clearance_level: meta.clearance_level || 'Level 3 - Biodiversity Surveillance',
        target_gene_marker: meta.target_gene_marker || '18S V9 (Marine Eukaryotes)',
        contact_phone: meta.contact_phone || undefined,
        bio: meta.bio || undefined,
      };

      setLocalProfile(profileFromMeta);
      return profileFromMeta;
    }
  } catch (err) {
    console.warn('DeepDrishti: Error fetching researcher profile from database, using cached/fallback', err);
  }

  const cached = getLocalProfile();
  return cached && cached.id === userId ? cached : fallbackProfile;
}

/**
 * Save or update researcher profile in Supabase and local storage
 */
export async function saveResearcherProfile(profile: ResearcherProfile): Promise<void> {
  setLocalProfile(profile);

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    // 1. Try upserting full expanded profile into public.researchers
    const { error } = await supabase
      .from('researchers')
      .upsert({
        id: profile.id,
        email: profile.email,
        display_name: profile.full_name || profile.display_name,
        full_name: profile.full_name,
        lab_name: profile.lab_name,
        lab_location: profile.lab_location,
        institution: profile.institution,
        role_title: profile.role_title,
        research_focus: profile.research_focus,
        orcid_id: profile.orcid_id || null,
        clearance_level: profile.clearance_level,
        target_gene_marker: profile.target_gene_marker || null,
        contact_phone: profile.contact_phone || null,
        bio: profile.bio || null,
        updated_at: new Date().toISOString(),
      });

    // 2. If table hasn't added columns yet, fallback gracefully to existing columns (id, email, display_name)
    if (error && (error.message.includes('column') || error.code === '42703')) {
      console.warn('DeepDrishti: Expanded columns not yet migrated in Supabase. Upserting base columns & saving to user_metadata.');
      await supabase.from('researchers').upsert({
        id: profile.id,
        email: profile.email,
        display_name: profile.full_name || profile.display_name,
      });
    }

    // 3. Always synchronize with Supabase Auth user_metadata so it is never lost
    await supabase.auth.updateUser({
      data: {
        full_name: profile.full_name,
        display_name: profile.full_name || profile.display_name,
        lab_name: profile.lab_name,
        lab_location: profile.lab_location,
        institution: profile.institution,
        role_title: profile.role_title,
        research_focus: profile.research_focus,
        orcid_id: profile.orcid_id,
        clearance_level: profile.clearance_level,
        target_gene_marker: profile.target_gene_marker,
        contact_phone: profile.contact_phone,
        bio: profile.bio,
      },
    });
  } catch (err) {
    console.warn('DeepDrishti: Failed to persist profile updates to Supabase', err);
  }
}
