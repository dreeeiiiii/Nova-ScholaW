import config from './config/env.js';
import createApp from './app.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] Nova Schola API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});