-- ============================================================================
-- Migration 002 — Rename Cloudinary columns to B2 keys
-- ============================================================================
-- NOTE: any pre-existing values in these columns are Cloudinary public IDs
-- (e.g. 'novaschola/announcements/...', 'novaschola/gallery/...') and are
-- NO LONGER resolvable after this migration. Cloudinary is decommissioned;
-- the bucket is private Backblaze B2 and reads require presigned URLs.
-- New rows store B2 object keys shaped like:
--   'announcements/<timestamp>-<random>-<safe-filename>'
--   'gallery/<timestamp>-<random>-<safe-filename>'
-- The app must tolerate old rows gracefully: only keys starting with
-- 'announcements/' or 'gallery/' are treated as live B2 keys. Anything
-- else is legacy — serve the stored URL as-is (or null) and skip B2
-- deletes. Use server/scripts/wipe-legacy-media-rows.js --yes to purge
-- legacy rows once reviewed.
-- ============================================================================
-- migrate.js note: the current migrate.js runner applies DATABASE_SCHEMA.sql
-- directly (split on ';') and does not auto-load files from this directory.
-- Run this file manually with psql, or via `npm run db:migrate` after review.
-- It is safe to re-run only if the columns have not been renamed yet; if
-- either column is already `b2_key`, the corresponding statement will fail
-- and should be skipped.
-- ============================================================================

ALTER TABLE announcements RENAME COLUMN cloudinary_public_id TO b2_key;
ALTER TABLE gallery_media  RENAME COLUMN cloudinary_public_id TO b2_key;
