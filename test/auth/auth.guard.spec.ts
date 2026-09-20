import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Reflector } from '@nestjs/core';

jest.mock('@mikro-orm/core', () => ({
  LockMode: { PESSIMISTIC_WRITE: 3 },
}));

import { AuthGuard } from '../../src/auth/auth.guard';
import type { SessionService } from '../../src/auth/session.service';

describe('AuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const sessions = { verifyAccessToken: jest.fn() };
  const handler = jest.fn();
  class ResolverClass {}
  const context = {
    getHandler: jest.fn(() => handler),
    getClass: jest.fn(() => ResolverClass),
  } as unknown as ExecutionContext;
  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    sessions.verifyAccessToken.mockResolvedValue({ userId: 'ignored' });
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      sessions as unknown as SessionService,
    );
  });

  it('Public handler이면 Authorization 헤더를 읽지 않고 허용한다', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const gqlContext = jest.spyOn(GqlExecutionContext, 'create');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
      handler,
      ResolverClass,
    ]);
    expect(gqlContext).not.toHaveBeenCalled();
    expect(sessions.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('Bearer token이 유효하면 request에 userId만 기록한다', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    sessions.verifyAccessToken.mockResolvedValue({ sub: 'user-id' });
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: request }),
    } as unknown as GqlExecutionContext);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessions.verifyAccessToken).toHaveBeenCalledWith('access-token');
    expect(request).toEqual({
      headers: { authorization: 'Bearer access-token' },
      userId: 'user-id',
    });
  });

  it.each([
    undefined,
    'Basic access-token',
    'Bearer',
    'Bearer ',
    'bearer access-token',
  ])(
    'Authorization 헤더가 %s이면 인증 오류를 반환한다',
    async (authorization) => {
      const request = { headers: { authorization } };
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: request }),
      } as unknown as GqlExecutionContext);

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
      expect(sessions.verifyAccessToken).not.toHaveBeenCalled();
    },
  );

  it.each(['invalid JWT', 'expired JWT', 'non-string sub'])(
    '%s이면 인증 오류를 그대로 반환한다',
    async () => {
      const request = { headers: { authorization: 'Bearer access-token' } };
      const authError = Object.assign(new Error('Authentication required'), {
        extensions: { code: 'UNAUTHENTICATED' },
      });
      sessions.verifyAccessToken.mockRejectedValue(authError);
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: request }),
      } as unknown as GqlExecutionContext);

      await expect(guard.canActivate(context)).rejects.toBe(authError);
      expect(request).not.toHaveProperty('userId');
    },
  );
});
