import type { EntityManager } from '@mikro-orm/postgresql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { User } from '../../src/users/user.entity';
import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  const findOne = jest.fn();
  const count = jest.fn();
  const create = jest.fn();
  const persist = jest.fn();
  const em = {
    findOne,
    count,
    create,
    persist,
  } as unknown as EntityManager;
  const transactionCreate = jest.fn();
  const transactionPersist = jest.fn();
  const transactionEm = {
    create: transactionCreate,
    persist: transactionPersist,
  } as unknown as EntityManager;
  const service = new UsersService(em);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('휴대폰 번호로 사용자를 찾으면 주입된 EntityManager를 사용한다', async () => {
    await service.findByPhone('01012345678');

    expect(findOne).toHaveBeenCalledWith(User, { phone: '01012345678' });
  });

  it('ID로 사용자를 찾으면 주입된 EntityManager를 사용한다', async () => {
    await service.findById(7);

    expect(findOne).toHaveBeenCalledWith(User, {
      id: 7,
    });
  });

  it('휴대폰 번호가 존재하면 true를 반환한다', async () => {
    count.mockResolvedValue(1);

    await expect(service.existsByPhone('01012345678')).resolves.toBe(true);
    expect(count).toHaveBeenCalledWith(User, { phone: '01012345678' });
  });

  it('트랜잭션에서 사용자를 생성하면 같은 EntityManager에 저장한다', () => {
    const user = new User();
    transactionCreate.mockReturnValue(user);
    const input = {
      name: '홍길동',
      phone: '01012345678',
      password: 'bcrypt-value',
    };

    expect(service.create(input, transactionEm)).toBe(user);
    expect(transactionCreate).toHaveBeenCalledWith(User, input);
    expect(transactionPersist).toHaveBeenCalledWith(user);
  });
});
