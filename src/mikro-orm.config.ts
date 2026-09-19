import { config as loadEnv } from 'dotenv';

import { createMikroOrmOptions } from './database/mikro-orm.options';

loadEnv({
  path: 'environments/.env',
  override: false,
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export default createMikroOrmOptions(databaseUrl);
