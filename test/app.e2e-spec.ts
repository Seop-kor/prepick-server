import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CommonService } from './../src/common/common.service';

describe('GraphQL common queries (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.OTP_HMAC_SECRET = 'e2e-test-hmac-secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns true for healthCheck', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ healthCheck }' })
      .expect(200);

    expect(response.body).toEqual({ data: { healthCheck: true } });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: 'anonymous' }),
    );
  });

  it('does not write request bodies to the console', async () => {
    const consoleLog = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ healthCheck }', password: 'request-secret' })
      .expect(200);

    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain(
      'request-secret',
    );
  });

  it('logs only the pathname when the URL contains query-string secrets', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await request(app.getHttpServer())
      .post('/graphql?token=query-secret')
      .send({ query: 'query SafePath { healthCheck }' })
      .expect(200);

    const [metadata] = log.mock.calls[0] as unknown[];
    expect(metadata).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/graphql',
        operationName: 'SafePath',
        statusCode: 200,
        outcome: 'success',
      }),
    );
    expect(typeof (metadata as { durationMs?: unknown }).durationMs).toBe(
      'number',
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('query-secret');
  });

  it('logs one outcome for an aliased multi-root operation', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: 'query Duo { first: healthCheck second: healthCheck }',
      })
      .expect(200);

    const operationLogs = log.mock.calls.filter(
      ([entry]) =>
        (entry as { operationName?: unknown }).operationName === 'Duo',
    );
    expect(operationLogs).toHaveLength(1);
  });

  it('does not pass unknown exceptions with sensitive fields to a logger', async () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const providerError = Object.assign(new Error('provider-secret'), {
      config: {
        auth: { username: 'credential-secret' },
        data: { receiver: '01012345678', message: 'sms-secret' },
      },
    });
    jest.spyOn(app.get(CommonService), 'healthCheck').mockImplementation(() => {
      throw providerError;
    });

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query SensitiveFailure { healthCheck }' })
      .expect(200);

    expect(errorLog.mock.calls.some(([entry]) => entry === providerError)).toBe(
      false,
    );
    expect(response.text).not.toContain('provider-secret');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'credential-secret',
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('01012345678');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sms-secret');
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operationName: 'SensitiveFailure',
        statusCode: 500,
        outcome: 'error',
        error: 'InternalServerErrorException',
      }),
    );
  });

  it('preserves known HttpException details and status metadata', async () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(app.get(CommonService), 'healthCheck').mockImplementation(() => {
      throw new BadRequestException('known bad request');
    });

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: 'query KnownFailure { healthCheck }' })
      .expect(200);

    expect(
      (response.body as { errors: Array<{ message: string }> }).errors[0]
        ?.message,
    ).toBe('known bad request');
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operationName: 'KnownFailure',
        statusCode: 400,
        outcome: 'error',
        error: 'BadRequestException',
      }),
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });
});
