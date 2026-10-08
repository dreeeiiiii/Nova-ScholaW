export const validEmail = email => typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
export const recipientEmails = recipients => [...new Set(recipients.map(r => r.email?.trim().toLowerCase()).filter(validEmail))];

export function emailEligibility(announcement, recipients, settings) {
  const blocked = reason => ({ eligible: false, reason });
  if (announcement.status !== undefined && announcement.status !== 'published') return blocked('announcement_not_published');
  if (announcement.type !== undefined && !['general','department','class'].includes(announcement.type)) return blocked('unsupported_type');
  if (announcement.email_eligible === false) return blocked('announcement_email_ineligible');
  if (!['live','test','mock'].includes(settings.emailMode)) return blocked('email_mode_not_live');
  if (settings.emailMode !== 'mock') {
    const cutoff = Date.parse(settings.emailEnabledAt), created = new Date(announcement.created_at).getTime();
    if (!Number.isFinite(cutoff) || !Number.isFinite(created) || !settings.brevoApiKey?.trim() || !validEmail(settings.emailSender) || !settings.emailSenderName?.trim() || (settings.emailMode === 'test' && !validEmail(settings.emailTestRecipient))) return blocked('configuration_missing');
    if (created < cutoff) return blocked('announcement_before_cutoff');
  }
  if (!recipientEmails(recipients).length) return blocked('no_valid_recipients');
  return { eligible: true, reason: 'eligible' };
}
export function emailConfigSummary(settings) {
  return { email_mode: settings.emailMode, email_enabled_at: settings.emailEnabledAt,
    api_key_configured: Boolean(settings.brevoApiKey?.trim()),
    sender_configured: Boolean(validEmail(settings.emailSender) && settings.emailSenderName?.trim()) };
}
