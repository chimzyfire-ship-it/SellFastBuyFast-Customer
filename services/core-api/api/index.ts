import { createApp } from '../src/app.js';
import { validateRuntimeConfig } from '../src/lib/config.js';

export const config = { api: { bodyParser: false } };

validateRuntimeConfig();

export default createApp();
