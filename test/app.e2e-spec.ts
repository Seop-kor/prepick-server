import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('GraphQL common queries (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns true for healthCheck', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ healthCheck }' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ data: { healthCheck: true } });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
