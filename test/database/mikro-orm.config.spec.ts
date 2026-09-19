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

  it('프로세스에 DATABASE_URL이 있으면 변경하지 않고 사용한다', () => {
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

  it('DATABASE_URL이 없으면 연결 문자열을 노출하지 않고 실패한다', () => {
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
