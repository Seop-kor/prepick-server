import type { Request } from 'express';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { UsersResolver } from '../../src/users/users.resolver';
import type { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/user.entity';

describe('UsersResolver', () => {
  const users = { findById: jest.fn() };
  const resolver = new UsersResolver(users as unknown as UsersService);
  const user = Object.assign(new User(), {
    id: 2,
    name: '홍길동',
    phone: '01012345678',
    password: 'bcrypt-value',
  });
  const request = { userId: user.id } as Request & { userId: number };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('인증된 사용자를 조회하면 userId로 사용자를 반환한다', async () => {
    users.findById.mockResolvedValue(user);

    await expect(resolver.currentUser(request)).resolves.toBe(user);
    expect(users.findById).toHaveBeenCalledWith(user.id);
  });

  it('인증된 사용자가 삭제되었으면 null 대신 인증 오류를 반환한다', async () => {
    users.findById.mockResolvedValue(null);

    await expect(resolver.currentUser(request)).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required',
    });
  });
});
