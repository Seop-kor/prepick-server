import { EntityManager } from '@mikro-orm/postgresql';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { sha256 } from '../../src/auth/auth.crypto';
import { OtpService } from '../../src/auth/otp.service';
import { OtpChallenge } from '../../src/auth/otpChallenge.entity';
import { RefreshSession } from '../../src/auth/refreshSession.entity';
import { SessionService } from '../../src/auth/session.service';
import { SmsService } from '../../src/common/sms.service';
import { UtilService } from '../../src/common/util.service';
import { User } from '../../src/users/user.entity';
import { UsersService } from '../../src/users/users.service';

describe('authentication persistence', () => {
  const verificationToken = 'v'.repeat(43);
  const sms = { sendOtp: jest.fn().mockResolvedValue(true) };
  let module: TestingModule;
  let rootEm: EntityManager;
  let jwtService: JwtService;
  let configService: ConfigService;
  let utilService: UtilService;

  const services = (em = rootEm.fork()) => {
    const usersService = new UsersService(em);
    const sessionService = new SessionService(em, jwtService);
    const otpService = new OtpService(
      em,
      usersService,
      sms as unknown as SmsService,
      utilService,
      configService,
    );
    return {
      em,
      usersService,
      sessionService,
      otpService,
      authService: new AuthService(
        em,
        otpService,
        usersService,
        sessionService,
      ),
    };
  };

  const createUser = async (
    phone = '01012345678',
    password = 'bcrypt-value',
  ) => {
    const { em, usersService } = services();
    const user = usersService.create({ name: '홍길동', phone, password }, em);
    await em.flush();
    return user;
  };

  const createVerifiedChallenge = async (phone = '01012345678') => {
    const em = rootEm.fork();
    const challenge = em.create(OtpChallenge, {
      phone,
      otp: sha256('unused'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verifiedAt: new Date(),
      verificationToken: sha256(verificationToken),
      verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    em.persist(challenge);
    await em.flush();
    return challenge.id;
  };

  const resetDatabase = async () => {
    await rootEm
      .getConnection()
      .execute('truncate table "session", otp_challenge, "user"');
  };

  beforeAll(async () => {
    process.env.OTP_HMAC_SECRET = 'integration-test-hmac-secret';
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SmsService)
      .useValue(sms)
      .compile();
    rootEm = module.get(EntityManager);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    utilService = module.get(UtilService);
    await resetDatabase();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
  });

  afterAll(async () => {
    await module.close();
  });

  it('같은 휴대폰 번호로 사용자를 두 명 생성하면 unique 제약이 거부한다', async () => {
    const em = rootEm.fork();
    em.persist([
      em.create(User, {
        name: '첫 번째',
        phone: '01012345678',
        password: 'bcrypt-value',
      }),
      em.create(User, {
        name: '두 번째',
        phone: '01012345678',
        password: 'bcrypt-value',
      }),
    ]);

    await expect(em.flush()).rejects.toMatchObject({
      code: '23505',
      constraint: 'user_phone_unique',
    });
  });

  it('한 사용자에게 refresh session을 두 개 생성하면 unique 제약이 거부한다', async () => {
    const user = await createUser();
    const em = rootEm.fork();
    const managedUser = await em.findOneOrFail(User, { id: user.id });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    em.persist([
      em.create(RefreshSession, {
        user: managedUser,
        refreshToken: sha256('first'),
        expiresAt,
      }),
      em.create(RefreshSession, {
        user: managedUser,
        refreshToken: sha256('second'),
        expiresAt,
      }),
    ]);

    await expect(em.flush()).rejects.toMatchObject({
      code: '23505',
      constraint: 'refresh_session_user_id_unique',
    });
  });

  it('같은 refresh token을 동시에 회전하면 한 요청만 성공한다', async () => {
    const user = await createUser();
    const starter = services();
    const managedUser = await starter.em.findOneOrFail(User, { id: user.id });
    const tokens = await starter.sessionService.start(managedUser);

    const results = await Promise.allSettled([
      services().sessionService.refresh(tokens.refreshToken),
      services().sessionService.refresh(tokens.refreshToken),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { extensions: { code: 'UNAUTHENTICATED' } },
    });
  });

  it('같은 번호로 OTP를 동시에 요청하면 한 요청만 성공한다', async () => {
    const results = await Promise.allSettled([
      services().otpService.sendSignupOtp('01012345678'),
      services().otpService.sendSignupOtp('01012345678'),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { extensions: { code: 'TOO_MANY_REQUESTS' } },
    });
    expect(sms.sendOtp).toHaveBeenCalledTimes(1);
  });

  it('하나의 검증 토큰으로 동시에 가입하면 사용자와 세션을 하나씩만 생성한다', async () => {
    await createVerifiedChallenge();
    const input = {
      name: '홍길동',
      password: 'password',
      verificationToken,
    };

    const results = await Promise.allSettled([
      services().authService.signUp(input),
      services().authService.signUp(input),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    const em = rootEm.fork();
    await expect(em.count(User, {})).resolves.toBe(1);
    await expect(em.count(RefreshSession, {})).resolves.toBe(1);
  });

  it('세션 생성이 실패하면 사용자 생성과 검증 토큰 소비를 롤백한다', async () => {
    const challengeId = await createVerifiedChallenge();
    const em = rootEm.fork();
    const usersService = new UsersService(em);
    const otpService = new OtpService(
      em,
      usersService,
      sms as unknown as SmsService,
      utilService,
      configService,
    );
    const sessionError = new Error('forced session failure');
    const sessionService = {
      start: jest.fn().mockRejectedValue(sessionError),
    } as unknown as SessionService;
    const authService = new AuthService(
      em,
      otpService,
      usersService,
      sessionService,
    );

    await expect(
      authService.signUp({
        name: '홍길동',
        password: 'password',
        verificationToken,
      }),
    ).rejects.toBe(sessionError);

    const checkEm = rootEm.fork();
    await expect(checkEm.count(User, {})).resolves.toBe(0);
    const challenge = await checkEm.findOneOrFail(OtpChallenge, {
      id: challengeId,
    });
    expect(challenge.consumedAt).toBeNull();
  });

  it('새로 로그인하면 이전 refresh token만 폐기하고 access token은 유지한다', async () => {
    const password = 'password';
    const user = await createUser(
      '01012345678',
      await bcrypt.hash(password, 12),
    );
    const starter = services();
    const managedUser = await starter.em.findOneOrFail(User, { id: user.id });
    const oldTokens = await starter.sessionService.start(managedUser);

    const loggedIn = await services().authService.login({
      phone: user.phone,
      password,
    });

    await expect(
      services().sessionService.refresh(oldTokens.refreshToken),
    ).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
    await expect(
      services().sessionService.verifyAccessToken(oldTokens.accessToken),
    ).resolves.toEqual({ sub: user.id });
    expect(loggedIn.refreshToken).not.toBe(oldTokens.refreshToken);
  });
});
