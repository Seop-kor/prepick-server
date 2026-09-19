describe('AppModule configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@mikro-orm/nestjs');
    jest.dontMock('@mikro-orm/postgresql');
    jest.dontMock('@nestjs/config');
    jest.dontMock('@nestjs/graphql');
    jest.dontMock('@nestjs/apollo');
    jest.dontMock('../src/common/common.module');
    jest.dontMock('../src/database/mikro-orm.options');
  });

  it('애플리케이션 모듈을 불러오면 ConfigService로 MikroORM을 구성한다', () => {
    jest.isolateModules(() => {
      class MockConfigService {}
      class MockPostgreSqlDriver {}

      const configForRoot = jest.fn(() => ({
        module: class MockConfigModule {},
      }));
      const mikroOrmForRootAsync = jest.fn(() => ({
        module: class MockMikroOrmModule {},
      }));

      jest.doMock('@nestjs/config', () => ({
        ConfigModule: { forRoot: configForRoot },
        ConfigService: MockConfigService,
      }));
      jest.doMock('@mikro-orm/nestjs', () => ({
        MikroOrmModule: { forRootAsync: mikroOrmForRootAsync },
      }));
      jest.doMock('@mikro-orm/postgresql', () => ({
        PostgreSqlDriver: MockPostgreSqlDriver,
      }));
      jest.doMock('@nestjs/graphql', () => ({
        GraphQLModule: {
          forRoot: jest.fn(() => ({
            module: class MockGraphQLModule {},
          })),
        },
      }));
      jest.doMock('@nestjs/apollo', () => ({
        ApolloDriver: class MockApolloDriver {},
      }));
      jest.doMock('../src/common/common.module', () => ({
        CommonModule: class MockCommonModule {},
      }));
      jest.doMock('../src/database/mikro-orm.options', () => ({
        createMikroOrmOptions: (clientUrl: string) => ({ clientUrl }),
      }));

      require('../src/app.module');

      expect(configForRoot).toHaveBeenCalledWith({
        isGlobal: true,
        envFilePath: 'environments/.env',
      });

      const [asyncOptions] = mikroOrmForRootAsync.mock.calls[0] as unknown as [
        {
          driver: unknown;
          inject: unknown[];
          useFactory: (config: {
            getOrThrow: (key: string) => string;
          }) => Record<string, unknown>;
        },
      ];
      const getOrThrow = jest
        .fn<(key: string) => string>()
        .mockReturnValue('postgresql://runtime-database');

      expect(asyncOptions.driver).toBe(MockPostgreSqlDriver);
      expect(asyncOptions.inject).toEqual([MockConfigService]);
      expect(asyncOptions.useFactory({ getOrThrow })).toEqual(
        expect.objectContaining({
          clientUrl: 'postgresql://runtime-database',
          autoLoadEntities: true,
          registerRequestContext: true,
        }),
      );
      expect(getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    });
  });
});
