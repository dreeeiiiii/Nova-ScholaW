-- Preserve the existing globally unique section-name design. Never merge history
-- automatically: equivalent legacy names require explicit Administrator review.
CREATE FUNCTION normalize_section_name(value TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(trim(regexp_replace(translate(value, U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF', repeat(' ', 19)), '[[:space:]]+', ' ', 'g')));
$$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sections GROUP BY normalize_section_name(name) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Equivalent section names exist. Review section IDs and academic history before applying migration 006.';
  END IF;
END;
$$;
CREATE UNIQUE INDEX sections_normalized_name_unique ON sections (normalize_section_name(name));
