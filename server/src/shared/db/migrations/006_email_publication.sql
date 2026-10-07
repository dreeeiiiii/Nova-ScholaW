-- Additive delivery ledger. Existing announcements are deliberately ineligible.
ALTER TABLE announcements ADD COLUMN email_eligible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE announcements ALTER COLUMN email_eligible SET DEFAULT TRUE;
CREATE TABLE announcement_email_deliveries (
 announcement_id BIGINT PRIMARY KEY REFERENCES announcements(id),
 mode TEXT NOT NULL, status TEXT NOT NULL,
 recipient_count INTEGER NOT NULL DEFAULT 0,
 accepted_count INTEGER NOT NULL DEFAULT 0, failed_count INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
