import type { EntityManager } from '@mikro-orm/postgresql';

jest.mock('@mikro-orm/core', () => ({
  LockMode: { PESSIMISTIC_WRITE: 3 },
}));
jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

import { AuthService } from '../../src/auth/auth.service';
import type { OtpService } from '../../src/auth/otp.service';
import type { SessionService } from '../../src/auth/session.service';
import type { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/user.entity';

describe('AuthService', () => {
  const transactionEm = { flush: jest.fn() };
  const em = { transactional: jest.fn() };
  const otp = { consumeVerificationToken: jest.fn() };
  const users = {
    existsByPhone: jest.fn(),
    create: jest.fn(),
    findByPhone: jest.fn(),
  };
  const sessions = { start: jest.fn() };
  const challenge = { phone: '01012345678' };
  const user = Object.assign(new User(), {
    name: '홍길동',
    phone: challenge.phone,
    password: 'bcrypt-value',
  });
  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: new Date('2026-09-20T00:15:00.000Z'),
    refreshTokenExpiresAt: new Date('2026-10-20T00:00:00.000Z'),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionEm.flush.mockResolvedValue(undefined);
    em.transactional.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(transactionEm),
    );
    otp.consumeVerificationToken.mockResolvedValue(challenge);
    users.existsByPhone.mockResolvedValue(false);
    users.create.mockReturnValue(user);
    users.findByPhone.mockResolvedValue(user);
    sessions.start.mockResolvedValue(tokens);
    jest.mocked(bcrypt.hash).mockResolvedValue('bcrypt-value');
    jest.mocked(bcrypt.compare).mockResolvedValue(true);
    service = new AuthService(
      em as unknown as EntityManager,
      otp as unknown as OtpService,
      users as unknown as UsersService,
      sessions as unknown as SessionService,
    );
  });

  it('유효한 입력으로 가입하면 하나의 트랜잭션에서 사용자를 만들고 로그인한다', async () => {
    const result = await service.signUp({
      name: '  홍길동  ',
      password: 'password',
      verificationToken: 'a'.repeat(43),
    });

    expect(otp.consumeVerificationToken).toHaveBeenCalledWith(
      'a'.repeat(43),
      transactionEm,
    );
    expect(users.existsByPhone).toHaveBeenCalledWith(
      challenge.phone,
      transactionEm,
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
    expect(users.create).toHaveBeenCalledWith(
      {
        name: '홍길동',
        phone: challenge.phone,
        password: 'bcrypt-value',
      },
      transactionEm,
    );
    expect(transactionEm.flush).toHaveBeenCalled();
    expect(sessions.start).toHaveBeenCalledWith(user, transactionEm);
    expect(result).toEqual({ user, ...tokens });
  });

  it('비밀번호가 정확히 UTF-8 72바이트이면 가입을 허용한다', async () => {
    await expect(
      service.signUp({
        name: '홍길동',
        password: '가'.repeat(24),
        verificationToken: 'a'.repeat(43),
      }),
    ).resolves.toEqual({ user, ...tokens });
  });

  it('비밀번호가 UTF-8 73바이트이면 가입을 거부한다', async () => {
    await expect(
      service.signUp({
        name: '홍길동',
        password: `${'가'.repeat(24)}a`,
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(otp.consumeVerificationToken).not.toHaveBeenCalled();
  });

  it.each([
    { name: '   ', password: 'password' },
    { name: '홍길동', password: '1234567' },
    { name: '가'.repeat(51), password: 'password' },
  ])('이름이나 비밀번호 길이가 잘못되면 가입을 거부한다', async (input) => {
    await expect(
      service.signUp({ ...input, verificationToken: 'a'.repeat(43) }),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('검증된 번호가 이미 가입되어 있으면 등록 오류를 반환한다', async () => {
    users.existsByPhone.mockResolvedValue(true);

    await expect(
      service.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toMatchObject({
      extensions: { code: 'PHONE_NUMBER_ALREADY_REGISTERED' },
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it('사용자 전화번호 unique 경합이 발생하면 등록 오류를 반환한다', async () => {
    transactionEm.flush.mockRejectedValue(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'user_phone_unique',
      }),
    );

    await expect(
      service.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toMatchObject({
      extensions: { code: 'PHONE_NUMBER_ALREADY_REGISTERED' },
    });
  });

  it('다른 데이터베이스 오류가 발생하면 그대로 다시 던진다', async () => {
    const databaseError = Object.assign(new Error('database unavailable'), {
      code: '08006',
    });
    transactionEm.flush.mockRejectedValue(databaseError);

    await expect(
      service.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toBe(databaseError);
  });

  it('소비된 검증 토큰으로 다시 가입하면 사용자와 세션을 만들지 않는다', async () => {
    otp.consumeVerificationToken.mockRejectedValue(
      Object.assign(new Error('Invalid verification token'), {
        extensions: { code: 'BAD_USER_INPUT' },
      }),
    );

    await expect(
      service.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(users.create).not.toHaveBeenCalled();
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it('세션 생성이 실패하면 회원가입 트랜잭션도 실패한다', async () => {
    const sessionError = new Error('session failed');
    sessions.start.mockRejectedValue(sessionError);

    await expect(
      service.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken: 'a'.repeat(43),
      }),
    ).rejects.toBe(sessionError);
    expect(em.transactional).toHaveBeenCalledTimes(1);
    expect(otp.consumeVerificationToken).toHaveBeenCalledWith(
      expect.any(String),
      transactionEm,
    );
    expect(users.create).toHaveBeenCalledWith(
      expect.any(Object),
      transactionEm,
    );
  });

  it('로그인하면 전화번호를 정규화한 뒤 사용자를 찾는다', async () => {
    await service.login({ phone: '010-1234-5678', password: 'password' });

    expect(users.findByPhone).toHaveBeenCalledWith('01012345678');
  });

  it('로그인 비밀번호가 UTF-8 73바이트이면 bcrypt 비교 전에 거부한다', async () => {
    await expect(
      service.login({
        phone: '01012345678',
        password: `${'a'.repeat(72)}b`,
      }),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it.each([
    ['등록되지 않은 번호', null, true],
    ['잘못된 비밀번호', user, false],
  ])(
    '%s로 로그인하면 같은 인증 오류를 반환한다',
    async (_case, foundUser, passwordMatches) => {
      users.findByPhone.mockResolvedValue(foundUser);
      jest.mocked(bcrypt.compare).mockResolvedValue(passwordMatches);

      const result = service.login({
        phone: '01012345678',
        password: 'supplied-password',
      });
      await expect(result).rejects.toMatchObject({
        message: 'Invalid phone or password',
        extensions: { code: 'UNAUTHENTICATED' },
      });
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(
        JSON.stringify(await result.catch((error: unknown) => error)),
      ).not.toContain('supplied-password');
    },
  );

  it('로그인 정보가 맞으면 기존 세션을 교체하고 payload를 반환한다', async () => {
    await expect(
      service.login({ phone: '01012345678', password: 'password' }),
    ).resolves.toEqual({ user, ...tokens });
    expect(bcrypt.compare).toHaveBeenCalledWith('password', 'bcrypt-value');
    expect(sessions.start).toHaveBeenCalledWith(user);
  });
});
