// Loaded before test modules: private .env values must never select real email/storage.
Object.assign(process.env, {
  EMAIL_MODE: 'mock', ANNOUNCEMENT_SCHEDULER_ENABLED: 'false',
  B2_BUCKET_NAME: 'local-test', B2_BUCKET_ID: 'local-test',
  B2_ENDPOINT: '127.0.0.1:1', B2_REGION: 'local-test', B2_KEY_ID: 'fake', B2_APPLICATION_KEY: 'fake',
});
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, ...args) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Safe tests forbid external fetch requests');
  return originalFetch(input, ...args);
};
