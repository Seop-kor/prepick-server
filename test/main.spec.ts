describe('bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@nestjs/core');
    jest.dontMock('../src/app.module');
  });

  it('애플리케이션을 시작하면 종료 훅을 활성화한다', async () => {
    const enableShutdownHooks = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      enableShutdownHooks,
      listen,
    });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));
    jest.doMock('../src/app.module', () => ({
      AppModule: class MockAppModule {},
    }));

    jest.isolateModules(() => {
      require('../src/main');
    });
    await new Promise(setImmediate);

    expect(enableShutdownHooks).toHaveBeenCalledTimes(1);
  });
});
