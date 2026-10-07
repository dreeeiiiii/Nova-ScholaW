-- Required for safe recipient-level troubleshooting; existing claims are preserved.
ALTER TABLE announcement_email_deliveries
  ADD COLUMN delivery_details JSONB NOT NULL DEFAULT '[]'::jsonb;
