import 'dotenv/config';

// Independent of database/storage configuration so the direct test needs only email settings.
export function readEmailConfig(env = process.env, { validate = true } = {}) {
  const emailMode = (env.EMAIL_MODE || (env.NODE_ENV === 'production' ? 'disabled' : 'mock')).trim();
  if (!['disabled', 'mock', 'test', 'live'].includes(emailMode)) throw new Error('EMAIL_MODE must be disabled, mock, test, or live.');
  const settings = {
    emailMode,
    brevoApiKey: (env.BREVO_API_KEY || '').trim(),
    emailSender: (env.EMAIL_SENDER_ADDRESS || '').trim(),
    emailSenderName: (env.EMAIL_SENDER_NAME || '').trim(),
    emailEnabledAt: (env.EMAIL_ENABLED_AT || '').trim(),
    emailTestRecipient: (env.EMAIL_TEST_RECIPIENT || '').trim(),
  };
  if (validate && ['live', 'test'].includes(emailMode)) {
    for (const [key, field] of [['BREVO_API_KEY','brevoApiKey'], ['EMAIL_SENDER_ADDRESS','emailSender'], ['EMAIL_SENDER_NAME','emailSenderName'], ['EMAIL_ENABLED_AT','emailEnabledAt']]) {
      if (!settings[field]) throw new Error(key + ' must not be blank.');
    }
    const validEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
    if (!validEmail(settings.emailSender)) throw new Error('EMAIL_SENDER_ADDRESS must be a valid email address.');
    const cutoff = settings.emailEnabledAt;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(cutoff) || !Number.isFinite(Date.parse(cutoff)) || new Date(cutoff).toISOString().replace('.000Z', 'Z') !== cutoff.replace('.000Z', 'Z')) throw new Error('EMAIL_ENABLED_AT must be a valid ISO UTC timestamp ending in Z.');
    if (emailMode === 'test' && !validEmail(settings.emailTestRecipient)) throw new Error('EMAIL_TEST_RECIPIENT must be a valid email address.');
  }
  return Object.freeze(settings);
}
// The app validates at startup; the standalone service reports missing settings safely.
export default readEmailConfig(process.env, { validate: false });
