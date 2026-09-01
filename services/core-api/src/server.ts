import { createApp } from './app.js';
import { closeDatabase } from './db/client.js';
import { config, validateRuntimeConfig } from './lib/config.js';

validateRuntimeConfig();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`SellFastBuyFast Core API listening on http://localhost:${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    void closeDatabase().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
