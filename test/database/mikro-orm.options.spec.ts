import { Migrator } from '@mikro-orm/migrations';

import { createMikroOrmOptions } from '../../src/database/mikro-orm.options';

jest.mock('@mikro-orm/migrations', () => ({
  Migrator: class Migrator {},
}));
jest.mock('@mikro-orm/postgresql', () => ({
  defineConfig: (options: unknown) => options,
}));

describe('createMikroOrmOptions', () => {
  it('데이터베이스 URL을 전달하면 엔티티 탐색과 마이그레이션 옵션을 구성한다', () => {
    const clientUrl =
      'postgresql://app:p%40ss@db.example:5432/prepick?sslmode=require';

    const options = createMikroOrmOptions(clientUrl);

    expect(options.clientUrl).toBe(clientUrl);
    expect(options.entities).toEqual(['dist/**/*.entity.js']);
    expect(options.entitiesTs).toEqual(['src/**/*.entity.ts']);
    expect(options.discovery).toEqual({ warnWhenNoEntities: false });
    expect(options.driverOptions).toEqual({ connectionString: clientUrl });
    expect(options.extensions).toContain(Migrator);
    expect(options.migrations).toEqual(
      expect.objectContaining({
        emit: 'ts',
        path: 'dist/database/migrations',
        pathTs: 'src/database/migrations',
      }),
    );
  });

  it('DATABASE_URL 형식이 올바르지 않으면 원문을 노출하지 않고 실패한다', () => {
    const clientUrl =
      'postgresql://app:unescaped#secret@db.example:5432/prepick';

    expect(() => createMikroOrmOptions(clientUrl)).toThrow(
      'DATABASE_URL is invalid',
    );

    try {
      createMikroOrmOptions(clientUrl);
    } catch (error) {
      expect((error as Error).message).not.toContain('unescaped#secret');
    }
  });
});
