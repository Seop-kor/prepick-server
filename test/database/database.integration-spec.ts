import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';

import { AppModule } from '../../src/app.module';

describe('PostgreSQL database foundation', () => {
  let testingModule: TestingModule | undefined;

  beforeEach(() => {
    process.env.OTP_HMAC_SECRET = 'integration-test-hmac-secret';
  });

  afterEach(async () => {
    await testingModule?.close();
    testingModule = undefined;
  });

  it('NestJS 모듈을 구성하면 PostgreSQL EntityManager를 주입한다', async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(testingModule.get(EntityManager)).toBeInstanceOf(EntityManager);
  });
});
