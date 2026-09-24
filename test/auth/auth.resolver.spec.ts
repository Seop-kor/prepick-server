import 'reflect-metadata';

jest.mock('@mikro-orm/core', () => ({
  LockMode: { PESSIMISTIC_WRITE: 3 },
}));
jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { AuthResolver } from '../../src/auth/auth.resolver';
import type { AuthService } from '../../src/auth/auth.service';
import { IS_PUBLIC_KEY } from '../../src/auth/public.decorator';
import type { OtpService } from '../../src/auth/otp.service';
import type { SessionService } from '../../src/auth/session.service';

describe('AuthResolver', () => {
  const otp = {
    sendSignupOtp: jest.fn(),
    verifySignupOtp: jest.fn(),
  };
  const auth = { signUp: jest.fn(), login: jest.fn() };
  const sessions = { refresh: jest.fn(), logout: jest.fn() };
  const resolver = new AuthResolver(
    otp as unknown as OtpService,
    auth as unknown as AuthService,
    sessions as unknown as SessionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendSignupOtp를 호출하면 OTP 서비스 결과를 반환한다', async () => {
    const payload = { expiresAt: new Date(), retryAfterSeconds: 60 };
    otp.sendSignupOtp.mockResolvedValue(payload);

    await expect(resolver.sendSignupOtp('01012345678')).resolves.toBe(payload);
    expect(otp.sendSignupOtp).toHaveBeenCalledWith('01012345678');
  });

  it('verifySignupOtp를 호출하면 OTP 서비스 결과를 반환한다', async () => {
    const payload = { verificationToken: 'token', expiresAt: new Date() };
    otp.verifySignupOtp.mockResolvedValue(payload);

    await expect(
      resolver.verifySignupOtp('01012345678', '123456'),
    ).resolves.toBe(payload);
    expect(otp.verifySignupOtp).toHaveBeenCalledWith('01012345678', '123456');
  });

  it('signUp을 호출하면 인증 서비스 결과를 반환한다', async () => {
    const input = {
      name: '홍길동',
      password: 'password',
      verificationToken: 'token',
    };
    const payload = { user: {} };
    auth.signUp.mockResolvedValue(payload);

    await expect(resolver.signUp(input)).resolves.toBe(payload);
    expect(auth.signUp).toHaveBeenCalledWith(input);
  });

  it('login을 호출하면 인증 서비스 결과를 반환한다', async () => {
    const input = { phone: '01012345678', password: 'password' };
    const payload = { user: {} };
    auth.login.mockResolvedValue(payload);

    await expect(resolver.login(input)).resolves.toBe(payload);
    expect(auth.login).toHaveBeenCalledWith(input);
  });

  it('refreshSession을 호출하면 세션 서비스 결과를 반환한다', async () => {
    const payload = { user: {} };
    sessions.refresh.mockResolvedValue(payload);

    await expect(resolver.refreshSession('refresh-token')).resolves.toBe(
      payload,
    );
    expect(sessions.refresh).toHaveBeenCalledWith('refresh-token');
  });

  it('logout을 호출하면 세션 서비스 결과를 반환한다', async () => {
    sessions.logout.mockResolvedValue(true);

    await expect(resolver.logout('refresh-token')).resolves.toBe(true);
    expect(sessions.logout).toHaveBeenCalledWith('refresh-token');
  });

  it.each([
    'sendSignupOtp',
    'verifySignupOtp',
    'signUp',
    'login',
    'refreshSession',
    'logout',
  ] as const)('%s mutation이면 public metadata가 true이다', (method) => {
    const target: unknown = Object.getOwnPropertyDescriptor(
      AuthResolver.prototype,
      method,
    )?.value;
    expect(typeof target).toBe('function');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, target as object)).toBe(true);
  });
});
