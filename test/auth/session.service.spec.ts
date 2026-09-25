import type { EntityManager } from '@mikro-orm/postgresql';
import type { JwtService } from '@nestjs/jwt';

jest.mock('@mikro-orm/core', () => ({
  LockMode: { PESSIMISTIC_WRITE: 3 },
}));
jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

jest.mock('../../src/auth/auth.crypto', () => {
  const actual = jest.requireActual<
    typeof import('../../src/auth/auth.crypto')
  >('../../src/auth/auth.crypto');
  return { ...actual, randomToken: jest.fn() };
});

import { randomToken, sha256 } from '../../src/auth/auth.crypto';
import { RefreshSession } from '../../src/auth/refreshSession.entity';
import { SessionService } from '../../src/auth/session.service';
import { User } from '../../src/users/user.entity';

describe('SessionService', () => {
  const now = new Date('2026-09-20T00:00:00.000Z');
  const sessionId = 1;
  const oldSecret = 'a'.repeat(43);
  const newSecret = 'b'.repeat(43);
  const transactionEm = {
    execute: jest.fn(),
    nativeDelete: jest.fn(),
    create: jest.fn<(entity: unknown, data: object) => RefreshSession>(),
    persist: jest.fn(),
    flush: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const em = { transactional: jest.fn() };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const user = Object.assign(new User(), {
    id: 2,
    name: '홍길동',
    phone: '01012345678',
    password: 'bcrypt-value',
  });
  let service: SessionService;

  const session = (overrides: Partial<RefreshSession> = {}) =>
    Object.assign(new RefreshSession(), {
      id: sessionId,
      user,
      refreshToken: sha256(oldSecret),
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      ...overrides,
    });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    jest.mocked(randomToken).mockReturnValue(newSecret);
    jwt.signAsync.mockResolvedValue('access-token');
    transactionEm.create.mockImplementation(
      (_entity: unknown, data: object): RefreshSession =>
        Object.assign(new RefreshSession(), { id: sessionId }, data),
    );
    em.transactional.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(transactionEm),
    );
    service = new SessionService(
      em as unknown as EntityManager,
      jwt as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('세션을 시작하면 access token과 해시된 refresh secret을 저장한다', async () => {
    const result = await service.start(user);
    const stored = transactionEm.create.mock.results[0].value as RefreshSession;

    expect(em.transactional).toHaveBeenCalled();
    expect(transactionEm.execute).toHaveBeenCalledWith(
      'select pg_advisory_xact_lock(hashtext(?))',
      [String(user.id)],
    );
    expect(transactionEm.nativeDelete).toHaveBeenCalledWith(RefreshSession, {
      user: user.id,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: String(user.id) },
      { expiresIn: '15m' },
    );
    expect(stored.refreshToken).toBe(sha256(newSecret));
    expect(stored.refreshToken).not.toBe(newSecret);
    expect(transactionEm.persist).toHaveBeenCalledWith(stored);
    expect(transactionEm.flush).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: `${sessionId}.${newSecret}`,
      accessTokenExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      refreshTokenExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  it('같은 사용자의 세션을 다시 시작하면 잠금 후 기존 행을 교체한다', async () => {
    await service.start(user);
    await service.start(user);

    expect(transactionEm.execute).toHaveBeenCalledTimes(2);
    expect(transactionEm.nativeDelete).toHaveBeenCalledTimes(2);
    expect(jwt.signAsync).toHaveBeenLastCalledWith(
      { sub: String(user.id) },
      { expiresIn: '15m' },
    );
  });

  it('기존 트랜잭션으로 세션을 시작하면 중첩 트랜잭션을 열지 않는다', async () => {
    await service.start(user, transactionEm as unknown as EntityManager);

    expect(em.transactional).not.toHaveBeenCalled();
  });

  it('refresh token을 갱신하면 행을 잠그고 secret만 회전한다', async () => {
    const stored = session();
    transactionEm.findOne.mockResolvedValue(stored);

    const result = await service.refresh(`${sessionId}.${oldSecret}`);

    expect(transactionEm.findOne).toHaveBeenCalledWith(
      RefreshSession,
      { id: sessionId },
      { populate: ['user'], lockMode: 3 },
    );
    expect(stored.refreshToken).toBe(sha256(newSecret));
    expect(stored.expiresAt).toEqual(
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    );
    expect(transactionEm.flush).toHaveBeenCalled();
    expect(result).toMatchObject({
      user,
      accessToken: 'access-token',
      refreshToken: `${sessionId}.${newSecret}`,
      refreshTokenExpiresAt: stored.expiresAt,
    });
  });

  it('같은 refresh token을 동시에 갱신하면 한 요청만 성공한다', async () => {
    const stored = session();
    transactionEm.findOne.mockResolvedValue(stored);
    let queue = Promise.resolve<unknown>(undefined);
    em.transactional.mockImplementation(
      (callback: (tx: unknown) => Promise<unknown>) => {
        const result = queue.then(() => callback(transactionEm));
        queue = result.catch(() => undefined);
        return result;
      },
    );

    const results = await Promise.allSettled([
      service.refresh(`${sessionId}.${oldSecret}`),
      service.refresh(`${sessionId}.${oldSecret}`),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { extensions: { code: 'UNAUTHENTICATED' } },
    });
  });

  it.each([
    ['malformed token', null],
    [`${sessionId}.${oldSecret}`, null],
    [`${sessionId}.${oldSecret}`, session({ refreshToken: sha256(newSecret) })],
    [
      `${sessionId}.${oldSecret}`,
      session({ expiresAt: new Date(now.getTime() - 1) }),
    ],
  ])(
    'refresh token이 유효하지 않으면 인증 오류를 반환한다',
    async (token, row) => {
      transactionEm.findOne.mockResolvedValue(row);

      await expect(service.refresh(token)).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    },
  );

  it.each(['malformed token', `${sessionId}.${oldSecret}`])(
    '로그아웃할 세션이 없으면 true를 반환한다',
    async (token) => {
      transactionEm.findOne.mockResolvedValue(null);

      await expect(service.logout(token)).resolves.toBe(true);
      expect(transactionEm.remove).not.toHaveBeenCalled();
    },
  );

  it('refresh secret이 다르면 세션을 삭제하지 않고 true를 반환한다', async () => {
    transactionEm.findOne.mockResolvedValue(
      session({ refreshToken: sha256(newSecret) }),
    );

    await expect(service.logout(`${sessionId}.${oldSecret}`)).resolves.toBe(
      true,
    );
    expect(transactionEm.remove).not.toHaveBeenCalled();
  });

  it.each([session(), session({ expiresAt: new Date(now.getTime() - 1) })])(
    'refresh secret이 일치하면 만료 여부와 관계없이 세션을 삭제한다',
    async (row) => {
      transactionEm.findOne.mockResolvedValue(row);

      await expect(service.logout(`${sessionId}.${oldSecret}`)).resolves.toBe(
        true,
      );
      expect(transactionEm.remove).toHaveBeenCalledWith(row);
      expect(transactionEm.flush).toHaveBeenCalled();
    },
  );

  it('이미 삭제한 refresh token으로 로그아웃하면 true를 반환한다', async () => {
    transactionEm.findOne
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(null);

    await expect(service.logout(`${sessionId}.${oldSecret}`)).resolves.toBe(
      true,
    );
    await expect(service.logout(`${sessionId}.${oldSecret}`)).resolves.toBe(
      true,
    );
  });

  it('access token의 sub가 정수 문자열이면 숫자 ID를 반환한다', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: String(user.id) });

    await expect(service.verifyAccessToken('access-token')).resolves.toEqual({
      sub: user.id,
    });
  });

  it.each([
    { sub: undefined },
    { sub: 123 },
    { sub: '0' },
    { sub: '01' },
    { sub: '2147483648' },
    { sub: '11111111-1111-4111-8111-111111111111' },
    {},
  ])(
    'access token의 sub가 유효한 정수가 아니면 인증 오류를 반환한다',
    async (payload) => {
      jwt.verifyAsync.mockResolvedValue(payload);

      await expect(
        service.verifyAccessToken('access-token'),
      ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    },
  );

  it('기존 UUID session ID로 갱신하면 인증 오류를 반환한다', async () => {
    await expect(
      service.refresh(`11111111-1111-4111-8111-111111111111.${oldSecret}`),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    expect(em.transactional).not.toHaveBeenCalled();
  });
});
