import { Migrator } from '@mikro-orm/migrations';

import { createMikroOrmOptions } from '../../src/database/mikro-orm.options';

jest.mock('@mikro-orm/migrations', () => ({
  Migrator: class Migrator {},
}));
jest.mock('@mikro-orm/postgresql', () => ({
  defineConfig: (options: unknown) => options,
}));

describe('createMikroOrmOptions', () => {
  it('preserves the database URL and configures discovery and migrations', () => {
    const clientUrl =
      'postgresql://app:p%40ss@db.example:5432/prepick?sslmode=require';

    const options = createMikroOrmOptions(clientUrl);

    expect(options.clientUrl).toBe(clientUrl);
    expect(options.entities).toEqual(['dist/**/*.entity.js']);
    expect(options.entitiesTs).toEqual(['src/**/*.entity.ts']);
    expect(options.discovery).toEqual({ warnWhenNoEntities: false });
    expect(options.extensions).toContain(Migrator);
    expect(options.migrations).toEqual(
      expect.objectContaining({
        emit: 'ts',
        path: 'dist/database/migrations',
        pathTs: 'src/database/migrations',
      }),
    );
  });
});
