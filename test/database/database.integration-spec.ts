import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../../src/mikro-orm.config';

describe('PostgreSQL database foundation', () => {
  let orm: Awaited<ReturnType<typeof MikroORM.init>> | undefined;

  afterEach(async () => {
    await orm?.close(true);
    orm = undefined;
  });

  it('PostgreSQL 설정이 유효하면 데이터베이스에 연결한다', async () => {
    orm = await MikroORM.init(mikroOrmConfig);
    await orm.connect();

    await expect(orm.checkConnection()).resolves.toEqual({ ok: true });
  });
});
