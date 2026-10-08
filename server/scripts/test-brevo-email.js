import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { sendAnnouncementEmail } from '../src/shared/services/emailService.js';
import config from '../src/shared/config/emailConfig.js';
import { emailConfigSummary } from '../src/shared/services/emailEligibility.js';

export async function testBrevoEmail(recipient, { settings = config, transport = fetch, print = console.log } = {}) {
  const summary = emailConfigSummary(settings);
  print({ api_key_configured: summary.api_key_configured, sender_configured: summary.sender_configured });
  if (typeof recipient !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
    print({ http_status: null, sanitized_error: 'invalid_recipient' });
    return { status: 'configuration_blocked', accepted: 0, failed: 0 };
  }
  print({ recipient });
  // Explicit CLI test sends to exactly the requested mailbox using the production service.
  // The announcement creation cutoff does not apply to this explicit provider connectivity test.
  // A synthetic in-memory envelope is not saved and has no delivery claim or database imports.
  let finalDetail;
  const result = await sendAnnouncementEmail({
    title: 'Nova Schola Hub Direct Email Test',
    content: 'This is a direct transactional email test from Nova Schola Hub.',
    created_at: new Date().toISOString(),
  }, [{ email: recipient }], { settings: { ...settings, emailMode: 'live', emailEnabledAt: '1970-01-01T00:00:00Z' }, transport,
    onDelivery: async detail => { finalDetail = { ...detail }; },
  });
  print({ http_status: finalDetail?.http_status ?? null,
    ...(result.status === 'accepted' ? { messageId: finalDetail?.message_id ?? null } : { sanitized_error: finalDetail?.error ?? result.status }) });
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error('Usage: npm run email:test -- student@my.nst.edu.ph');
    process.exitCode = 1;
  } else {
    testBrevoEmail(process.argv[2]).then(result => { if (result.status !== 'accepted') process.exitCode = 1; })
      .catch(() => { console.error({ http_status: null, sanitized_error: 'email_test_failed' }); process.exitCode = 1; });
  }
}
