import config from '../config/env.js';

// Never log provider responses, request headers, email content, or credentials.
export async function sendAnnouncementEmail(announcement, recipients, { settings = config, transport = fetch } = {}) {
  const emails = [...new Set(recipients.map(r => r.email.trim().toLowerCase()))];
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
  let accepted = 0, failed = 0;
  // Individual messages keep recipient addresses private. No automatic retry.
  for (const email of targets) {
    try {
      const response = await transport('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'api-key': settings.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sender: { email: settings.emailSender, name: settings.emailSenderName },
          to: [{ email }], subject: announcement.title,
          textContent: announcement.content, headers: { idempotencyKey: `announcement-${announcement.id}-${email}` } }),
      });
      if (response.ok) accepted++; else failed++;
    } catch { failed++; }
  }
  return { status: failed ? (accepted ? 'partial_failure' : 'failed') : 'accepted', accepted, failed };
}
