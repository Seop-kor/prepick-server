import type { EntityManager } from '@mikro-orm/postgresql';

import { User } from '../../src/users/user.entity';
import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  const em = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    persist: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;
  const transactionEm = {
    create: jest.fn(),
    persist: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;
  const service = new UsersService(em);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('휴대폰 번호로 사용자를 찾으면 주입된 EntityManager를 사용한다', async () => {
    await service.findByPhone('01012345678');

    expect(em.findOne).toHaveBeenCalledWith(User, { phone: '01012345678' });
  });

  it('ID로 사용자를 찾으면 주입된 EntityManager를 사용한다', async () => {
    await service.findById('7e219e7e-f53a-43c1-b090-d2e91c1a564d');

    expect(em.findOne).toHaveBeenCalledWith(User, {
      id: '7e219e7e-f53a-43c1-b090-d2e91c1a564d',
    });
  });

  it('휴대폰 번호가 존재하면 true를 반환한다', async () => {
    em.count.mockResolvedValue(1);

    await expect(service.existsByPhone('01012345678')).resolves.toBe(true);
    expect(em.count).toHaveBeenCalledWith(User, { phone: '01012345678' });
  });

  it('트랜잭션에서 사용자를 생성하면 같은 EntityManager에 저장한다', () => {
    const user = new User();
    transactionEm.create.mockReturnValue(user);
    const input = {
      name: '홍길동',
      phone: '01012345678',
      password: 'bcrypt-value',
    };

    expect(service.create(input, transactionEm)).toBe(user);
    expect(transactionEm.create).toHaveBeenCalledWith(User, input);
    expect(transactionEm.persist).toHaveBeenCalledWith(user);
  });
});
