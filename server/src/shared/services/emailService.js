import config from '../config/env.js';

const validEmail = email => typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const httpError = status => status === 401 ? 'authentication_rejected' : status === 403 ? 'sender_or_permission_rejected' : status === 429 ? 'rate_limited' : status >= 500 ? 'provider_unavailable' : 'provider_request_rejected';

// Never log provider responses, request headers, email content, or credentials.
export async function sendAnnouncementEmail(announcement, recipients, { settings = config, transport = fetch, onDelivery = async () => {} } = {}) {
  const emails = [...new Set(recipients.map(r => r.email?.trim().toLowerCase()).filter(validEmail))];
  if (settings.emailMode === 'disabled') return { status: 'skipped', accepted: 0, failed: 0 };
  if (settings.emailMode === 'mock') return { status: 'mock', accepted: emails.length, failed: 0 };
  const cutoff = Date.parse(settings.emailEnabledAt);
  const validSender = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.emailSender ?? '') && typeof settings.emailSenderName === 'string' && settings.emailSenderName.trim().length > 0;
  const created = new Date(announcement.created_at).getTime();
  if (!['live', 'test'].includes(settings.emailMode) || !Number.isFinite(cutoff) || !Number.isFinite(created) || created < cutoff ||
      (settings.emailMode === 'live' && !settings.isProduction) || !settings.brevoApiKey?.trim() || !validSender) {
    return { status: 'configuration_blocked', accepted: 0, failed: emails.length };
  }
  if (settings.emailMode === 'test' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.emailTestRecipient)) {
    return { status: 'configuration_blocked', accepted: 0, failed: emails.length };
  }
  const targets = settings.emailMode === 'test' ? (emails.length ? [settings.emailTestRecipient] : []) : emails;
  if (!targets.length) return { status: 'no_recipients', accepted: 0, failed: 0 };
  let accepted = 0, failed = 0;
  // Individual messages keep recipient addresses private. No automatic retry.
  for (const email of targets) {
    // Persist before transport. An interrupted attempt remains uncertain and must not be retried automatically.
    const detail = { recipient_email: email, status: 'processing', attempted_at: new Date().toISOString(), message_id: null, error: null };
    await onDelivery(detail);
    try {
      const response = await transport('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'api-key': settings.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: { email: settings.emailSender, name: settings.emailSenderName },
          to: [{ email }], subject: announcement.title,
          htmlContent: `<!doctype html><html><body><h1>${escapeHtml(announcement.title)}</h1><div>${escapeHtml(announcement.content).replace(/\r?\n/g, '<br>')}</div></body></html>`,
          textContent: announcement.content, headers: { idempotencyKey: `announcement-${announcement.id}-${email}` } }),
      });
      detail.http_status = response.status ?? null;
      // Never retain arbitrary provider error messages: they can echo request data/secrets.
      let payload;
      try { payload = await response.json(); } catch { /* HTTP status still determines outcome. */ }
      if (response.ok) {
        accepted++; detail.status = 'accepted';
        if (typeof payload?.messageId === 'string' && payload.messageId.length <= 512 && !payload.messageId.includes(settings.brevoApiKey)) detail.message_id = payload.messageId;
      } else {
        failed++; detail.status = 'failed'; detail.error = httpError(response.status);
        if (typeof payload?.message === 'string' && /sender/i.test(payload.message)) detail.error = 'sender_rejected_or_unverified';
      }
    } catch {
      failed++; detail.status = 'uncertain'; detail.error = 'network_or_timeout';
    }
    detail.completed_at = new Date().toISOString();
    // Recording failures stop the loop rather than continuing an unrecorded bulk send.
    await onDelivery(detail);
  }
  return { status: failed ? (accepted ? 'partial_failure' : 'failed') : 'accepted', accepted, failed };
}
