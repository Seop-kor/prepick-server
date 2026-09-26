import { APP_PIPE } from '@nestjs/core';

describe('AppModule configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@mikro-orm/nestjs');
    jest.dontMock('@mikro-orm/postgresql');
    jest.dontMock('@nestjs/config');
    jest.dontMock('@nestjs/graphql');
    jest.dontMock('@nestjs/apollo');
    jest.dontMock('../src/common/common.module');
    jest.dontMock('../src/users/users.module');
    jest.dontMock('../src/auth/auth.module');
    jest.dontMock('../src/stores/stores.module');
    jest.dontMock('../src/promotions/promotions.module');
    jest.dontMock('../src/mikro-orm.options');
  });

  it('애플리케이션 모듈을 불러오면 ConfigService로 MikroORM을 구성한다', () => {
    jest.isolateModules(() => {
      class MockConfigService {}
      class MockPostgreSqlDriver {}
      class MockCommonModule {}
      class MockUsersModule {}
      class MockAuthModule {}
      class MockStoresModule {}
      class MockPromotionsModule {}

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
        CommonModule: MockCommonModule,
      }));
      jest.doMock('../src/users/users.module', () => ({
        UsersModule: MockUsersModule,
      }));
      jest.doMock('../src/auth/auth.module', () => ({
        AuthModule: MockAuthModule,
      }));
      jest.doMock('../src/stores/stores.module', () => ({
        StoresModule: MockStoresModule,
      }));
      jest.doMock('../src/promotions/promotions.module', () => ({
        PromotionsModule: MockPromotionsModule,
      }));
      jest.doMock('../src/mikro-orm.options', () => ({
        createMikroOrmOptions: (clientUrl: string) => ({ clientUrl }),
      }));

      const { AppModule } =
        jest.requireActual<typeof import('../src/app.module')>(
          '../src/app.module',
        );
      const { ValidationPipe } =
        jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');

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
        .fn<string, [key: string]>()
        .mockReturnValue('postgresql://runtime-database');

      expect(asyncOptions.driver).toBe(MockPostgreSqlDriver);
      expect(asyncOptions.inject).toEqual([MockConfigService]);
      expect(asyncOptions.useFactory({ getOrThrow })).toEqual(
        expect.objectContaining({
          clientUrl: 'postgresql://runtime-database',
          entities: [],
          entitiesTs: [],
          autoLoadEntities: true,
          registerRequestContext: true,
        }),
      );
      expect(getOrThrow).toHaveBeenCalledWith('DATABASE_URL');

      const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
      expect(imports).toEqual(
        expect.arrayContaining([
          MockCommonModule,
          MockUsersModule,
          MockAuthModule,
          MockStoresModule,
          MockPromotionsModule,
        ]),
      );

      const providers = Reflect.getMetadata('providers', AppModule) as Array<{
        provide: unknown;
        useValue?: unknown;
      }>;
      const validationProvider = providers.find(
        ({ provide }) => provide === APP_PIPE,
      );

      expect(validationProvider?.useValue).toBeInstanceOf(ValidationPipe);
      expect(validationProvider?.useValue).toMatchObject({
        isTransformEnabled: true,
      });
      expect(
        (
          validationProvider?.useValue as {
            validatorOptions?: { whitelist?: boolean };
          }
        ).validatorOptions?.whitelist,
      ).toBe(true);
    });
  });
});
