-- =====================================================
-- ADD SLUG COLUMN TO YOUR GUIDES TABLE
-- =====================================================
-- Copy and run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add slug column to guides table
ALTER TABLE guides 
ADD COLUMN slug TEXT UNIQUE;

-- Step 2: Auto-generate slugs for existing guides
UPDATE guides 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars
    '\s+', '-', 'g'                                      -- Replace spaces with hyphens
  )
)
WHERE slug IS NULL;

-- Step 3: Verify slugs were created
SELECT id, title, slug FROM guides;

-- =====================================================
-- RESULT: Your guides table now has slug column!
-- =====================================================
-- Example output:
-- id                                   | title                                          | slug
-- -------------------------------------|------------------------------------------------|---------------------------
-- abc123...                            | The Creator Gold Rush for Pakistani Women      | the-creator-gold-rush-for-pakistani-women
-- def456...                            | Another Guide Title                             | another-guide-title

-- =====================================================
-- OPTIONAL: Add trigger for future guides
-- =====================================================

-- This will auto-generate slugs when new guides are added
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

CREATE TRIGGER auto_generate_slug
  BEFORE INSERT OR UPDATE ON guides
  FOR EACH ROW
  EXECUTE FUNCTION generate_guide_slug();

-- =====================================================
-- DONE! Now run INFLUENCER_ACCESS_SCHEMA.sql
-- =====================================================

