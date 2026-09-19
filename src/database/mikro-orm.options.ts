import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';

export function createMikroOrmOptions(clientUrl: string) {
  return defineConfig({
    clientUrl,
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
