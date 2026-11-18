# DeepDrishti — Supabase Cloud Backend Setup

This directory contains the database migration scripts and setup instructions for configuring a Supabase PostgreSQL backend for DeepDrishti.

---

## Architecture Overview

DeepDrishti maintains strict separation between source scientific observations and derived ecological metrics:
- **Database Layer (Supabase PostgreSQL)**: Stores raw expedition metadata, biological sampling stations, exact Amplicon Sequence Variants (ASVs), and sparse read count occurrence matrices.
- **Frontend / Client Layer**: Pure mathematical derivations (Shannon $H'$, Gini-Simpson $1-D$, Bray-Curtis dissimilarity, Jaccard distances, Pielou's evenness, gamma pool) are calculated deterministically on the client using `metrics.ts`.

---

## Step-by-Step Setup Guide

### 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Click **New project** and select an oceanographic region close to your primary lab/station.
3. Note your database password and wait ~2 minutes for the database cluster to provision.

### 2. Run Database Migration
1. In the Supabase Dashboard, navigate to **SQL Editor** (terminal icon in left sidebar).
2. Click **New query**.
3. Copy the entire contents of [`supabase/migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. Confirm that the following tables and indexes were created:
   - `public.researchers`
   - `public.expeditions`
   - `public.samples`
   - `public.asvs`
   - `public.occurrences`
   - Row Level Security (RLS) policies and performance indexes.
6. Run [`supabase/migrations/002_community_schema.sql`](./migrations/002_community_schema.sql) in a new SQL Editor query to enable the shared Community feature.

The Community migration creates `community_posts`, `community_comments`, `community_post_endorsements`, `community_comment_endorsements`, and `community_bookmarks`. Signed-in researchers share the feed; authors can manage their own content, while bookmarks and endorsement identities are private to their owner. The UI obtains shared endorsement counts through authenticated aggregate functions. Community preview data is not seeded into the database.

### 3. Configure Authentication (Optional / Recommended)
1. In the dashboard, navigate to **Authentication** > **Providers** > **Email**.
2. Ensure **Email provider** is enabled.
3. For local development or test staging, you can disable "Confirm email" if you wish to test instant sign-up without configuring SMTP mail delivery.

### 4. Configure Local Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Retrieve your project credentials from **Project Settings** > **API**:
   - **Project URL**: Found under `Project URL` (e.g., `https://yourprojectref.supabase.co`).
   - **Anon Key**: Found under `Project API keys` labeled `anon` / `public`.
3. Fill in `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-publishable-key-here
   ```
   > **SECURITY WARNING:** NEVER paste the `service_role` secret key into `.env` or frontend code. DeepDrishti connects strictly via the public `anon` key, relying on PostgreSQL Row-Level Security for multi-tenant isolation.

### 5. Launch DeepDrishti
Start the development server:
```bash
npm run dev
```
The application will automatically detect the Supabase configuration and activate **SUPABASE CLOUD PERSISTENCE** mode. If environment variables are empty or missing, DeepDrishti seamlessly falls back to **LOCAL MODE** without breaking.
