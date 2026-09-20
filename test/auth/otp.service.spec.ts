import type { ConfigService } from '@nestjs/config';
import type { EntityManager } from '@mikro-orm/postgresql';

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
  return { ...actual, randomToken: jest.fn(() => 'a'.repeat(43)) };
});

import { hmacSha256, sha256 } from '../../src/auth/auth.crypto';
import { OtpChallenge } from '../../src/auth/otpChallenge.entity';
import { OtpService } from '../../src/auth/otp.service';
import type { SmsService } from '../../src/common/sms.service';
import type { UsersService } from '../../src/users/users.service';

describe('OtpService', () => {
  const now = new Date('2026-09-20T00:00:00.000Z');
  const connection = { execute: jest.fn() };
  const transactionEm = {
    getConnection: jest.fn(() => connection),
    findOne: jest.fn(),
    count: jest.fn(),
    nativeUpdate: jest.fn(),
    create: jest.fn<(entity: unknown, data: object) => OtpChallenge>(),
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const cleanupEm = {
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const em = {
    transactional: jest.fn(),
    findOne: jest.fn(),
    fork: jest.fn(() => cleanupEm),
  };
  const users = { existsByPhone: jest.fn() };
  const sms = { sendOtp: jest.fn() };
  const util = { getOtp: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  let service: OtpService;

  const challenge = (overrides: Partial<OtpChallenge> = {}): OtpChallenge =>
    Object.assign(new OtpChallenge(), {
      phone: '01012345678',
      otp: hmacSha256('123456', 'pepper'),
      expiresAt: new Date(now.getTime() + 300_000),
      attemptCount: 0,
      ...overrides,
    });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    config.getOrThrow.mockReturnValue('pepper');
    users.existsByPhone.mockResolvedValue(false);
    util.getOtp.mockReturnValue('123456');
    sms.sendOtp.mockResolvedValue(true);
    transactionEm.findOne.mockResolvedValue(null);
    transactionEm.count.mockResolvedValue(0);
    transactionEm.create.mockImplementation((_entity: unknown, data: object) =>
      Object.assign(new OtpChallenge(), data),
    );
    em.transactional.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(transactionEm),
    );
    service = new OtpService(
      em as unknown as EntityManager,
      users as unknown as UsersService,
      sms as unknown as SmsService,
      util,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('OTP를 요청하면 번호를 정규화하고 잠금 후 HMAC만 저장해 발송한다', async () => {
    const result = await service.sendSignupOtp('010-1234-5678');
    const stored = transactionEm.create.mock.results[0].value as OtpChallenge;

    expect(users.existsByPhone).toHaveBeenCalledWith('01012345678');
    expect(connection.execute).toHaveBeenCalledWith(
      'select pg_advisory_xact_lock(hashtext(?))',
      ['01012345678'],
    );
    expect(connection.execute.mock.invocationCallOrder[0]).toBeLessThan(
      transactionEm.findOne.mock.invocationCallOrder[0],
    );
    expect(transactionEm.nativeUpdate).toHaveBeenCalled();
    expect(stored.otp).toBe(hmacSha256('123456', 'pepper'));
    expect(stored.otp).not.toBe('123456');
    expect(transactionEm.persist).toHaveBeenCalled();
    expect(transactionEm.flush).toHaveBeenCalled();
    expect(sms.sendOtp).toHaveBeenCalledWith('01012345678', '123456');
    expect(result).toEqual({
      expiresAt: new Date(now.getTime() + 300_000),
      retryAfterSeconds: 60,
    });
  });

  it('가입한 번호로 OTP를 요청하면 등록 오류를 반환한다', async () => {
    users.existsByPhone.mockResolvedValue(true);

    await expect(service.sendSignupOtp('01012345678')).rejects.toMatchObject({
      extensions: { code: 'PHONE_NUMBER_ALREADY_REGISTERED' },
    });
    expect(em.transactional).not.toHaveBeenCalled();
  });

  it('60초 안에 다시 요청하면 남은 대기 시간을 반환한다', async () => {
    transactionEm.findOne.mockResolvedValue(
      challenge({ createdAt: new Date(now.getTime() - 30_000) }),
    );

    await expect(service.sendSignupOtp('01012345678')).rejects.toMatchObject({
      extensions: { code: 'TOO_MANY_REQUESTS', retryAfterSeconds: 30 },
    });
  });

  it('최근 한 시간에 다섯 번 발송했으면 여섯 번째 요청을 거부한다', async () => {
    transactionEm.count.mockResolvedValue(5);

    await expect(service.sendSignupOtp('01012345678')).rejects.toMatchObject({
      extensions: { code: 'TOO_MANY_REQUESTS' },
    });
    expect(transactionEm.create).not.toHaveBeenCalled();
  });

  it('동시에 OTP를 요청하면 각 트랜잭션에서 같은 번호 잠금을 먼저 획득한다', async () => {
    await Promise.all([
      service.sendSignupOtp('01012345678'),
      service.sendSignupOtp('01012345678'),
    ]);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.execute).toHaveBeenNthCalledWith(
      1,
      'select pg_advisory_xact_lock(hashtext(?))',
      ['01012345678'],
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      2,
      'select pg_advisory_xact_lock(hashtext(?))',
      ['01012345678'],
    );
  });

  it('SMS 발송에 실패하면 challenge를 무효화하고 안전한 오류를 반환한다', async () => {
    sms.sendOtp.mockRejectedValue(new Error('provider secret'));

    await expect(service.sendSignupOtp('01012345678')).rejects.toThrow(
      'SMS delivery failed',
    );
    const stored = transactionEm.create.mock.results[0].value as OtpChallenge;
    expect(stored.invalidatedAt).toEqual(now);
    expect(cleanupEm.persist).toHaveBeenCalledWith(stored);
    expect(cleanupEm.flush).toHaveBeenCalled();
    expect(transactionEm.persist).toHaveBeenCalledTimes(1);
  });

  it.each(['12345', '1234567', '１２３４５６', '12345a'])(
    'OTP 형식이 %s이면 조회 전에 거부한다',
    async (code) => {
      await expect(
        service.verifySignupOtp('01012345678', code),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(em.transactional).not.toHaveBeenCalled();
    },
  );

  it('OTP가 일치하지 않으면 시도 횟수를 증가시키고 거부한다', async () => {
    const stored = challenge({ otp: hmacSha256('654321', 'pepper') });
    transactionEm.findOne.mockResolvedValue(stored);

    await expect(
      service.verifySignupOtp('01012345678', '123456'),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(stored.attemptCount).toBe(1);
    expect(transactionEm.flush).toHaveBeenCalled();
  });

  it('OTP를 다섯 번 실패한 뒤 여섯 번째로 검증하면 거부한다', async () => {
    const stored = challenge({ attemptCount: 5 });
    transactionEm.findOne.mockResolvedValue(stored);

    await expect(
      service.verifySignupOtp('01012345678', '123456'),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(stored.attemptCount).toBe(5);
  });

  it.each([{ expiresAt: new Date(now.getTime() - 1) }, { invalidatedAt: now }])(
    '만료되거나 무효화된 OTP를 검증하면 거부한다',
    async (overrides) => {
      transactionEm.findOne.mockResolvedValue(challenge(overrides));

      await expect(
        service.verifySignupOtp('01012345678', '123456'),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    },
  );

  it('올바른 OTP를 검증하면 토큰 원문은 응답하고 SHA-256만 저장한다', async () => {
    const stored = challenge();
    transactionEm.findOne.mockResolvedValue(stored);

    const result = await service.verifySignupOtp('01012345678', '123456');

    expect(result).toEqual({
      verificationToken: 'a'.repeat(43),
      expiresAt: new Date(now.getTime() + 600_000),
    });
    expect(stored.verificationToken).toBe(sha256('a'.repeat(43)));
    expect(stored.verificationToken).not.toBe(result.verificationToken);
    expect(stored.verifiedAt).toEqual(now);
    expect(transactionEm.flush).toHaveBeenCalled();
  });

  it.each(['short', 'a'.repeat(42), `${'a'.repeat(42)}!`])(
    '검증 토큰 형식이 잘못되면 조회 전에 거부한다',
    async (token) => {
      await expect(
        service.consumeVerificationToken(token, em as unknown as EntityManager),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(em.findOne).not.toHaveBeenCalled();
    },
  );

  it('유효한 검증 토큰을 소비하면 쓰기 잠금으로 조회하고 소비 시각을 기록한다', async () => {
    const token = 'a'.repeat(43);
    const stored = challenge({
      verifiedAt: now,
      verificationToken: sha256(token),
      verificationExpiresAt: new Date(now.getTime() + 600_000),
    });
    em.findOne.mockResolvedValue(stored);

    await expect(
      service.consumeVerificationToken(token, em as unknown as EntityManager),
    ).resolves.toBe(stored);
    expect(em.findOne).toHaveBeenCalledWith(
      OtpChallenge,
      { verificationToken: sha256(token) },
      { lockMode: 3 },
    );
    expect(stored.consumedAt).toEqual(now);
  });

  it.each([
    { verificationExpiresAt: new Date(now.getTime() - 1) },
    { consumedAt: now },
  ])('만료되거나 소비된 검증 토큰을 사용하면 거부한다', async (overrides) => {
    em.findOne.mockResolvedValue(
      challenge({
        verifiedAt: now,
        verificationToken: sha256('a'.repeat(43)),
        verificationExpiresAt: new Date(now.getTime() + 600_000),
        ...overrides,
      }),
    );

    await expect(
      service.consumeVerificationToken(
        'a'.repeat(43),
        em as unknown as EntityManager,
      ),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});
