describe('MikroORM CLI configuration', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    jest.resetModules();
    jest.dontMock('dotenv');
    jest.dontMock('../../src/database/mikro-orm.options');
  });

  it('uses a process-provided DATABASE_URL without changing it', () => {
    const clientUrl =
      'postgresql://ci:p%40ss@db.example:5432/prepick?sslmode=require';
    process.env.DATABASE_URL = clientUrl;
    jest.doMock('dotenv', () => ({
      config: ({ override }: { override?: boolean }) => {
        if (override) {
          process.env.DATABASE_URL = 'postgresql://file-database';
        }
        return { parsed: {} };
      },
    }));
    jest.doMock('../../src/database/mikro-orm.options', () => ({
      createMikroOrmOptions: (url: string) => ({ clientUrl: url }),
    }));

    let options: { clientUrl?: string } | undefined;
    jest.isolateModules(() => {
      options = require('../../src/mikro-orm.config').default;
    });

    expect(options?.clientUrl).toBe(clientUrl);
  });

  it('fails without exposing a connection string when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    jest.doMock('../../src/database/mikro-orm.options', () => ({
      createMikroOrmOptions: jest.fn(),
    }));

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/mikro-orm.config');
      });
    }).toThrow('DATABASE_URL is required');
  });
});
