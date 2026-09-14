describe('AppModule configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@nestjs/config');
    jest.dontMock('@nestjs/graphql');
    jest.dontMock('@nestjs/apollo');
    jest.dontMock('../src/common/common.module');
    jest.dontMock('../src/responseLogger.interceptor');
  });

  it('loads environment variables from environments/.env', () => {
    jest.isolateModules(() => {
      const configForRoot = jest.fn(() => ({
        module: class MockConfigModule {},
      }));

      jest.doMock('@nestjs/config', () => ({
        ConfigModule: {
          forRoot: configForRoot,
        },
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
      jest.doMock('../src/responseLogger.interceptor', () => ({
        ResponseLoggingInterceptor: class MockResponseLoggingInterceptor {},
      }));

      require('../src/app.module');

      expect(configForRoot).toHaveBeenCalledWith({
        isGlobal: true,
        envFilePath: 'environments/.env',
      });
    });
  });
});
