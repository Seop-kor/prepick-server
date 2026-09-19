import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';

import { AppModule } from '../../src/app.module';
import mikroOrmConfig from '../../src/mikro-orm.config';

describe('PostgreSQL database foundation', () => {
  let orm: Awaited<ReturnType<typeof MikroORM.init>> | undefined;
  let testingModule: TestingModule | undefined;

  afterEach(async () => {
    await testingModule?.close();
    testingModule = undefined;
    await orm?.close(true);
    orm = undefined;
  });

  it('PostgreSQL 설정이 유효하면 데이터베이스에 연결한다', async () => {
    orm = await MikroORM.init(mikroOrmConfig);
    await orm.connect();

    await expect(orm.checkConnection()).resolves.toEqual({ ok: true });
  });

  it('NestJS 모듈을 구성하면 PostgreSQL EntityManager를 주입한다', async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(testingModule.get(EntityManager)).toBeInstanceOf(EntityManager);
  });
});
