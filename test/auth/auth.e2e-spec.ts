import { jest } from '@jest/globals';
import { EntityManager } from '@mikro-orm/postgresql';
import { type INestApplication, Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { OtpChallenge } from '../../src/auth/otpChallenge.entity';
import { SmsService } from '../../src/common/sms.service';

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions: { code?: string } }>;
};

describe('GraphQL authentication journey (e2e)', () => {
  const now = new Date('2026-09-20T00:00:00.000Z');
  const sendOtp = jest
    .fn<(phone: string, otp: string) => Promise<boolean>>()
    .mockResolvedValue(true);
  let app: INestApplication<App>;
  let module: TestingModule;
  let rootEm: EntityManager;

  const graphql = async <T>(
    query: string,
    variables: Record<string, unknown> = {},
    accessToken?: string,
  ) => {
    const call = request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables });
    if (accessToken) {
      call.set('Authorization', `Bearer ${accessToken}`);
    }
    const response = await call.expect(200);
    return response.body as GraphqlResponse<T>;
  };

  const sendAndVerifyOtp = async (phone = '010-1234-5678') => {
    const sent = await graphql<{
      sendSignupOtp: { expiresAt: string; retryAfterSeconds: number };
    }>(
      `
        mutation SendSignupOtp($phone: String!) {
          sendSignupOtp(phone: $phone) {
            expiresAt
            retryAfterSeconds
          }
        }
      `,
      { phone },
    );
    expect(sent.errors).toBeUndefined();
    expect(sent.data?.sendSignupOtp.retryAfterSeconds).toBe(60);
    expect(new Date(sent.data!.sendSignupOtp.expiresAt)).toEqual(
      new Date(now.getTime() + 5 * 60 * 1000),
    );

    const otp = sendOtp.mock.calls.at(-1)?.[1];
    expect(otp).toMatch(/^\d{6}$/);
    const verified = await graphql<{
      verifySignupOtp: { verificationToken: string; expiresAt: string };
    }>(
      `
        mutation VerifySignupOtp($phone: String!, $code: String!) {
          verifySignupOtp(phone: $phone, code: $code) {
            verificationToken
            expiresAt
          }
        }
      `,
      { phone: '01012345678', code: otp },
    );
    expect(verified.errors).toBeUndefined();
    expect(verified.data?.verifySignupOtp).not.toHaveProperty('otp');
    return {
      otp: otp!,
      verificationToken: verified.data!.verifySignupOtp.verificationToken,
    };
  };

  const signUp = async (password = 'password-secret', name = '홍길동') => {
    const { otp, verificationToken } = await sendAndVerifyOtp();
    const signedUp = await graphql<{
      signUp: {
        user: { id: string; phone: string };
        accessToken: string;
        refreshToken: string;
        accessTokenExpiresAt: string;
        refreshTokenExpiresAt: string;
      };
    }>(
      `
        mutation SignUp($input: SignUpInput!) {
          signUp(input: $input) {
            user {
              id
              phone
            }
            accessToken
            refreshToken
            accessTokenExpiresAt
            refreshTokenExpiresAt
          }
        }
      `,
      { input: { name, password, verificationToken } },
    );
    expect(signedUp.errors).toBeUndefined();
    return {
      otp,
      verificationToken,
      ...signedUp.data!.signUp,
      password,
    };
  };

  const login = async (phone: string, password: string) =>
    graphql<{
      login: {
        user: { id: string; phone: string };
        accessToken: string;
        refreshToken: string;
        refreshTokenExpiresAt: string;
      };
    }>(
      `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              phone
            }
            accessToken
            refreshToken
            refreshTokenExpiresAt
          }
        }
      `,
      { input: { phone, password } },
    );

  beforeEach(async () => {
    process.env.OTP_HMAC_SECRET = 'e2e-test-hmac-secret';
    jest
      .useFakeTimers({
        doNotFake: [
          'nextTick',
          'setImmediate',
          'setInterval',
          'setTimeout',
          'queueMicrotask',
        ],
      })
      .setSystemTime(now);
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SmsService)
      .useValue({ sendOtp })
      .compile();
    app = module.createNestApplication();
    await app.init();
    rootEm = module.get(EntityManager);
    await rootEm
      .getConnection()
      .execute('truncate table "session", otp_challenge, "user"');
    sendOtp.mockClear();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    await rootEm
      .getConnection()
      .execute('truncate table "session", otp_challenge, "user"');
    await app.close();
  });

  it('OTP 요청부터 로그아웃까지 전체 인증 흐름을 완료한다', async () => {
    const registered = await signUp();
    expect(registered.user.phone).toBe('01012345678');
    expect(registered.accessToken).toEqual(expect.any(String));
    expect(registered.refreshToken).toEqual(expect.any(String));

    const anonymous = await graphql<{ currentUser: unknown }>(
      'query CurrentUser { currentUser { id phone } }',
    );
    expect(anonymous.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');

    const authenticated = await graphql<{
      currentUser: { id: string; phone: string };
    }>(
      'query CurrentUser { currentUser { id phone } }',
      {},
      registered.accessToken,
    );
    expect(authenticated.data?.currentUser).toEqual(registered.user);

    jest.advanceTimersByTime(1000);
    const refreshed = await graphql<{
      refreshSession: {
        accessToken: string;
        refreshToken: string;
        refreshTokenExpiresAt: string;
      };
    }>(
      `
        mutation RefreshSession($refreshToken: String!) {
          refreshSession(refreshToken: $refreshToken) {
            accessToken
            refreshToken
            refreshTokenExpiresAt
          }
        }
      `,
      { refreshToken: registered.refreshToken },
    );
    expect(refreshed.errors).toBeUndefined();
    expect(refreshed.data?.refreshSession.accessToken).not.toBe(
      registered.accessToken,
    );
    expect(refreshed.data?.refreshSession.refreshToken).not.toBe(
      registered.refreshToken,
    );
    expect(refreshed.data?.refreshSession.refreshTokenExpiresAt).toBe(
      registered.refreshTokenExpiresAt,
    );

    const reused = await graphql(
      `
        mutation RefreshSession($refreshToken: String!) {
          refreshSession(refreshToken: $refreshToken) {
            accessToken
          }
        }
      `,
      { refreshToken: registered.refreshToken },
    );
    expect(reused.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');

    const currentRefresh = refreshed.data!.refreshSession.refreshToken;
    const firstLogout = await graphql<{ logout: boolean }>(
      'mutation Logout($token: String!) { logout(refreshToken: $token) }',
      { token: currentRefresh },
    );
    const secondLogout = await graphql<{ logout: boolean }>(
      'mutation Logout($token: String!) { logout(refreshToken: $token) }',
      { token: currentRefresh },
    );
    expect(firstLogout.data?.logout).toBe(true);
    expect(secondLogout.data?.logout).toBe(true);

    const afterLogout = await graphql(
      `
        mutation RefreshSession($refreshToken: String!) {
          refreshSession(refreshToken: $refreshToken) {
            accessToken
          }
        }
      `,
      { refreshToken: currentRefresh },
    );
    expect(afterLogout.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('가입한 번호로 OTP를 다시 요청하면 등록 오류를 반환한다', async () => {
    await signUp();

    const response = await graphql(
      'mutation { sendSignupOtp(phone: "01012345678") { retryAfterSeconds } }',
    );
    expect(response.errors?.[0].extensions.code).toBe(
      'PHONE_NUMBER_ALREADY_REGISTERED',
    );
  });

  it('없는 번호와 잘못된 비밀번호로 로그인하면 같은 오류를 반환한다', async () => {
    await signUp();

    const unknown = await login('01099999999', 'wrong-password');
    const mismatch = await login('01012345678', 'wrong-password');
    expect(unknown.errors?.[0]).toMatchObject({
      message: 'Invalid phone or password',
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(mismatch.errors?.[0]).toMatchObject({
      message: 'Invalid phone or password',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('72바이트 비밀번호 계정에 73바이트 비밀번호로 로그인하면 거부한다', async () => {
    const password = 'a'.repeat(72);
    await signUp(password);

    const exact = await login('01012345678', password);
    const truncatedByBcrypt = await login('01012345678', `${password}b`);
    expect(exact.errors).toBeUndefined();
    expect(truncatedByBcrypt.errors?.[0]).toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('OTP를 다섯 번 틀리면 여섯 번째 검증도 거부한다', async () => {
    const sent = await graphql(
      'mutation { sendSignupOtp(phone: "01012345678") { retryAfterSeconds } }',
    );
    expect(sent.errors).toBeUndefined();
    const issuedOtp = sendOtp.mock.calls[0][1];
    const wrongOtp = issuedOtp === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await graphql(
        `
          mutation VerifySignupOtp($code: String!) {
            verifySignupOtp(phone: "01012345678", code: $code) {
              verificationToken
            }
          }
        `,
        { code: wrongOtp },
      );
      expect(response.errors?.[0].extensions.code).toBe('BAD_USER_INPUT');
    }

    const challenge = await rootEm.fork().findOneOrFail(OtpChallenge, {
      phone: '01012345678',
    });
    expect(challenge.attemptCount).toBe(5);
  });

  it('새 로그인은 이전 refresh token만 폐기하고 access 만료는 유지한다', async () => {
    const registered = await signUp();

    const loggedIn = await login('01012345678', registered.password);
    expect(loggedIn.errors).toBeUndefined();
    const oldRefresh = await graphql(
      `
        mutation RefreshSession($token: String!) {
          refreshSession(refreshToken: $token) {
            accessToken
          }
        }
      `,
      { token: registered.refreshToken },
    );
    expect(oldRefresh.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');

    const current = await graphql(
      'query { currentUser { id } }',
      {},
      registered.accessToken,
    );
    expect(current.errors).toBeUndefined();

    jest.advanceTimersByTime(15 * 60 * 1000 + 1000);
    const expired = await graphql(
      'query { currentUser { id } }',
      {},
      registered.accessToken,
    );
    expect(expired.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('인증 흐름을 실행하면 비밀값 원문을 로그에 남기지 않는다', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const consoleLog = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const registered = await signUp('password-secret', '로그검증');
    const loggedIn = await login('01012345678', 'password-secret');
    const currentRefresh = loggedIn.data!.login.refreshToken;

    await graphql(
      `
        mutation RefreshSession($token: String!) {
          refreshSession(refreshToken: $token) {
            accessToken
          }
        }
      `,
      { token: registered.refreshToken },
    );
    await graphql(
      'mutation Logout($token: String!) { logout(refreshToken: $token) }',
      { token: currentRefresh },
    );

    const output = JSON.stringify([
      ...log.mock.calls,
      ...error.mock.calls,
      ...consoleLog.mock.calls,
    ]);
    expect(output).toContain('SignUp');
    for (const secret of [
      '01012345678',
      'password-secret',
      registered.otp,
      registered.verificationToken,
      registered.accessToken,
      registered.refreshToken,
      currentRefresh,
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
