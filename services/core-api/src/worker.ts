import { startWorkers } from './workers/workers.js';
import { closeDatabase } from './db/client.js';
import { validateRuntimeConfig } from './lib/config.js';

validateRuntimeConfig();
const stop = startWorkers();
console.log('SellFastBuyFast workers started.');

function shutdown(): void {
  stop();
  void closeDatabase().finally(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
