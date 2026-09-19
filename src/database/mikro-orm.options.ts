import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';

export function createMikroOrmOptions(clientUrl: string) {
  try {
    const url = new URL(clientUrl);
    const isPostgreSql = ['postgres:', 'postgresql:'].includes(url.protocol);

    if (!isPostgreSql || !url.hostname || url.pathname === '/' || url.hash) {
      throw new Error();
    }
  } catch {
    throw new Error('DATABASE_URL is invalid');
  }

  return defineConfig({
    clientUrl,
    driverOptions: { connectionString: clientUrl },
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    migrations: {
      emit: 'ts',
      path: 'dist/database/migrations',
      pathTs: 'src/database/migrations',
    },
  });
}
