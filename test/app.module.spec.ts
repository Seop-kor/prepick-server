describe('AppModule configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@mikro-orm/nestjs');
    jest.dontMock('@nestjs/config');
    jest.dontMock('@nestjs/graphql');
    jest.dontMock('@nestjs/apollo');
    jest.dontMock('../src/common/common.module');
    jest.dontMock('../src/database/mikro-orm.options');
  });

  it('loads the env file and configures MikroORM from ConfigService', () => {
    jest.isolateModules(() => {
      class MockConfigService {}

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
          inject: unknown[];
          useFactory: (config: {
            getOrThrow: (key: string) => string;
          }) => Record<string, unknown>;
        },
      ];
      const getOrThrow = jest
        .fn<(key: string) => string>()
        .mockReturnValue('postgresql://runtime-database');

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
