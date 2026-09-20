import type { Request } from 'express';

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';

import { authError } from './auth.error';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionService } from './session.service';

export type AuthenticatedRequest = Request & { userId: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = GqlExecutionContext.create(context).getContext<{
      req: Request;
    }>().req;
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? /^Bearer ([^\s]+)$/.exec(authorization)
        : null;
    if (!match) {
      throw this.unauthenticated();
    }

    const payload = await this.sessionService.verifyAccessToken(match[1]);
    (request as AuthenticatedRequest).userId = payload.sub;
    return true;
  }

  private unauthenticated() {
    return authError(
      'UNAUTHENTICATED',
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
