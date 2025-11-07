-- =====================================================
-- ADD SLUG COLUMN TO GUIDES TABLE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add slug column
ALTER TABLE guides 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_guides_slug ON guides(slug);

-- Step 3: Auto-generate slugs for existing guides
-- This creates slugs from titles (lowercase, spaces to hyphens)
UPDATE guides 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Step 4: Verify slugs were created
SELECT id, title, slug FROM guides;

-- =====================================================
-- OPTIONAL: Function to auto-generate slug on insert
-- =====================================================

-- Create function to auto-generate slug
CREATE OR REPLACE FUNCTION generate_guide_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug on insert/update
DROP TRIGGER IF EXISTS trigger_generate_guide_slug ON guides;
CREATE TRIGGER trigger_generate_guide_slug
  BEFORE INSERT OR UPDATE ON guides
  FOR EACH ROW
  EXECUTE FUNCTION generate_guide_slug();

-- =====================================================
-- TEST: Verify everything works
-- =====================================================

-- This should now work:
SELECT id, slug, title FROM guides;

-- =====================================================
-- DONE! Now you can use guide_slug in access_codes
-- =====================================================

