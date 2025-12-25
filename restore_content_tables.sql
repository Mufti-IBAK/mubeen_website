-- Recreate Testimonials and Quotes tables
BEGIN;

-- 1. TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.testimonials (
    id BIGSERIAL PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_title TEXT, -- e.g. "Student of Knowledge", "BSc Computer Science"
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QUOTES (Words of Wisdom)
CREATE TABLE IF NOT EXISTS public.quotes (
    id BIGSERIAL PRIMARY KEY,
    author_name TEXT NOT NULL, -- e.g. "Ibn Taymiyyah", "Imam Ghazali"
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- 4. PUBLIC READ POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read-only access to testimonials" ON public.testimonials;
    CREATE POLICY "Allow public read-only access to testimonials" ON public.testimonials FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Allow public read-only access to quotes" ON public.quotes;
    CREATE POLICY "Allow public read-only access to quotes" ON public.quotes FOR SELECT USING (true);
END $$;

-- 5. ADMIN CRUD POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow admin all access to testimonials" ON public.testimonials;
    CREATE POLICY "Allow admin all access to testimonials" ON public.testimonials FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
    
    DROP POLICY IF EXISTS "Allow admin all access to quotes" ON public.quotes;
    CREATE POLICY "Allow admin all access to quotes" ON public.quotes FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
END $$;

COMMIT;
