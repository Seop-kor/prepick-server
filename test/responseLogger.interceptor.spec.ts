import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { ResponseLoggingInterceptor } from '../src/responseLogger.interceptor';

function graphqlContext(operationName?: string): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/graphql',
    body: { password: 'request-secret' },
    res: { statusCode: 200 },
  };
  const info = {
    operation: { name: operationName ? { value: operationName } : undefined },
  };

  return {
    getType: () => 'graphql',
    getArgs: () => [{}, {}, { req: request }, info],
    getClass: () => class TestResolver {},
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

describe('ResponseLoggingInterceptor', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs GraphQL metadata without request or response bodies', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const next = {
      handle: () => of({ token: 'response-secret' }),
    } as CallHandler;

    await lastValueFrom(
      new ResponseLoggingInterceptor().intercept(
        graphqlContext('SendEmail'),
        next,
      ),
    );

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/graphql',
        operationName: 'SendEmail',
        statusCode: 200,
        durationMs: expect.any(Number),
        outcome: 'success',
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('request-secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('response-secret');
  });

  it('uses anonymous for an unnamed GraphQL operation', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await lastValueFrom(
      new ResponseLoggingInterceptor().intercept(graphqlContext(), {
        handle: () => of(true),
      } as CallHandler),
    );

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: 'anonymous' }),
    );
  });

  it('logs only the error class when a request fails', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const next = {
      handle: () => throwError(() => new Error('response-secret')),
    } as CallHandler;

    await expect(
      lastValueFrom(
        new ResponseLoggingInterceptor().intercept(
          graphqlContext('SendEmail'),
          next,
        ),
      ),
    ).rejects.toThrow('response-secret');

    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operationName: 'SendEmail',
        statusCode: 500,
        outcome: 'error',
        error: 'Error',
      }),
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'response-secret',
    );
  });
});
