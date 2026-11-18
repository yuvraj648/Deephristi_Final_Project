-- ========================================================
-- DEEPDRISHTI COMMUNITY TABLES
-- Shared access for authenticated researchers with author-scoped writes.
-- ========================================================

INSERT INTO public.researchers (id, email, display_name)
SELECT
    id,
    email,
    COALESCE(NULLIF(raw_user_meta_data->>'display_name', ''), split_part(email, '@', 1))
FROM auth.users
WHERE email IS NOT NULL AND email <> ''
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Researcher',
    category TEXT NOT NULL CHECK (category IN ('discovery', 'field_log', 'taxa_query', 'protocol')),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
    content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
    station_tag TEXT CHECK (station_tag IS NULL OR length(station_tag) <= 120),
    asv_tag TEXT CHECK (asv_tag IS NULL OR length(asv_tag) <= 120),
    channel_tag TEXT CHECK (channel_tag IS NULL OR length(channel_tag) <= 80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Researcher',
    content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.community_post_endorsements (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    researcher_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, researcher_id)
);

CREATE TABLE IF NOT EXISTS public.community_comment_endorsements (
    comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
    researcher_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (comment_id, researcher_id)
);

CREATE TABLE IF NOT EXISTS public.community_bookmarks (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    researcher_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, researcher_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
    ON public.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_category_created_at
    ON public.community_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_channel
    ON public.community_posts (channel_tag);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created_at
    ON public.community_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_post_endorsements_post
    ON public.community_post_endorsements (post_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_endorsements_comment
    ON public.community_comment_endorsements (comment_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_researcher
    ON public.community_bookmarks (researcher_id);

CREATE OR REPLACE FUNCTION public.set_community_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    resolved_author_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Researcher')
        INTO resolved_author_name
        FROM public.researchers
        WHERE id = NEW.author_id;
        NEW.author_name := COALESCE(resolved_author_name, 'Researcher');
        NEW.created_at := timezone('utc'::text, now());
        IF TG_TABLE_NAME = 'community_posts' THEN
            NEW.updated_at := NEW.created_at;
        END IF;
    ELSE
        NEW.author_id := OLD.author_id;
        NEW.author_name := OLD.author_name;
        NEW.created_at := OLD.created_at;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_community_posts_author ON public.community_posts;
CREATE TRIGGER trigger_community_posts_author
    BEFORE INSERT OR UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_community_author();

DROP TRIGGER IF EXISTS trigger_community_comments_author ON public.community_comments;
CREATE TRIGGER trigger_community_comments_author
    BEFORE INSERT OR UPDATE ON public.community_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_community_author();

DROP TRIGGER IF EXISTS trigger_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER trigger_community_posts_updated_at
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can read community posts" ON public.community_posts;
CREATE POLICY "Authenticated researchers can read community posts"
    ON public.community_posts FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Researchers can create their own community posts" ON public.community_posts;
CREATE POLICY "Researchers can create their own community posts"
    ON public.community_posts FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Researchers can update their own community posts" ON public.community_posts;
CREATE POLICY "Researchers can update their own community posts"
    ON public.community_posts FOR UPDATE TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Researchers can delete their own community posts" ON public.community_posts;
CREATE POLICY "Researchers can delete their own community posts"
    ON public.community_posts FOR DELETE TO authenticated
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated researchers can read community comments" ON public.community_comments;
CREATE POLICY "Authenticated researchers can read community comments"
    ON public.community_comments FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Researchers can comment as themselves" ON public.community_comments;
CREATE POLICY "Researchers can comment as themselves"
    ON public.community_comments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Researchers can delete their own community comments" ON public.community_comments;
CREATE POLICY "Researchers can delete their own community comments"
    ON public.community_comments FOR DELETE TO authenticated
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated researchers can read post endorsements" ON public.community_post_endorsements;
DROP POLICY IF EXISTS "Researchers can read their own post endorsements" ON public.community_post_endorsements;
CREATE POLICY "Researchers can read their own post endorsements"
    ON public.community_post_endorsements FOR SELECT TO authenticated
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can endorse posts as themselves" ON public.community_post_endorsements;
CREATE POLICY "Researchers can endorse posts as themselves"
    ON public.community_post_endorsements FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can remove their own post endorsements" ON public.community_post_endorsements;
CREATE POLICY "Researchers can remove their own post endorsements"
    ON public.community_post_endorsements FOR DELETE TO authenticated
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Authenticated researchers can read comment endorsements" ON public.community_comment_endorsements;
DROP POLICY IF EXISTS "Researchers can read their own comment endorsements" ON public.community_comment_endorsements;
CREATE POLICY "Researchers can read their own comment endorsements"
    ON public.community_comment_endorsements FOR SELECT TO authenticated
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can endorse comments as themselves" ON public.community_comment_endorsements;
CREATE POLICY "Researchers can endorse comments as themselves"
    ON public.community_comment_endorsements FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can remove their own comment endorsements" ON public.community_comment_endorsements;
CREATE POLICY "Researchers can remove their own comment endorsements"
    ON public.community_comment_endorsements FOR DELETE TO authenticated
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can read their own bookmarks" ON public.community_bookmarks;
CREATE POLICY "Researchers can read their own bookmarks"
    ON public.community_bookmarks FOR SELECT TO authenticated
    USING (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can create their own bookmarks" ON public.community_bookmarks;
CREATE POLICY "Researchers can create their own bookmarks"
    ON public.community_bookmarks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = researcher_id);

DROP POLICY IF EXISTS "Researchers can delete their own bookmarks" ON public.community_bookmarks;
CREATE POLICY "Researchers can delete their own bookmarks"
    ON public.community_bookmarks FOR DELETE TO authenticated
    USING (auth.uid() = researcher_id);

CREATE OR REPLACE FUNCTION public.get_community_post_stats(p_post_ids UUID[])
RETURNS TABLE (
    post_id UUID,
    endorsement_count BIGINT,
    endorsed_by_me BOOLEAN,
    bookmarked_by_me BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT
        requested.post_id,
        (
            SELECT COUNT(*)
            FROM public.community_post_endorsements AS endorsements
            WHERE endorsements.post_id = requested.post_id
        ),
        EXISTS (
            SELECT 1
            FROM public.community_post_endorsements AS endorsements
            WHERE endorsements.post_id = requested.post_id
              AND endorsements.researcher_id = auth.uid()
        ),
        EXISTS (
            SELECT 1
            FROM public.community_bookmarks AS bookmarks
            WHERE bookmarks.post_id = requested.post_id
              AND bookmarks.researcher_id = auth.uid()
        )
    FROM UNNEST(p_post_ids) AS requested(post_id)
    WHERE auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_community_comment_stats(p_comment_ids UUID[])
RETURNS TABLE (
    comment_id UUID,
    endorsement_count BIGINT,
    endorsed_by_me BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
    SELECT
        requested.comment_id,
        (
            SELECT COUNT(*)
            FROM public.community_comment_endorsements AS endorsements
            WHERE endorsements.comment_id = requested.comment_id
        ),
        EXISTS (
            SELECT 1
            FROM public.community_comment_endorsements AS endorsements
            WHERE endorsements.comment_id = requested.comment_id
              AND endorsements.researcher_id = auth.uid()
        )
    FROM UNNEST(p_comment_ids) AS requested(comment_id)
    WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_community_post_stats(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_comment_stats(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_post_stats(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_comment_stats(UUID[]) TO authenticated;

REVOKE ALL ON public.community_posts FROM PUBLIC, anon;
REVOKE ALL ON public.community_comments FROM PUBLIC, anon;
REVOKE ALL ON public.community_post_endorsements FROM PUBLIC, anon;
REVOKE ALL ON public.community_comment_endorsements FROM PUBLIC, anon;
REVOKE ALL ON public.community_bookmarks FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_post_endorsements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_comment_endorsements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_bookmarks TO authenticated;
