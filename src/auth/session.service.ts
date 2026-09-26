import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { User } from '../users/user.entity';
import { randomToken, safeEqual, sha256 } from './auth.crypto';
import { authError } from './auth.error';
import type { AuthPayload, SessionTokens } from './auth.types';
import { RefreshSession } from './refreshSession.entity';

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function parseId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id <= 2147483647 ? id : null;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  async start(user: User, em?: EntityManager): Promise<SessionTokens> {
    if (!em) {
      return this.em.transactional((transactionEm) =>
        this.start(user, transactionEm),
      );
    }

    await em.execute('select pg_advisory_xact_lock(hashtext(?))', [
      String(user.id),
    ]);
    await em.nativeDelete(RefreshSession, { user: user.id });

    const now = new Date();
    const secret = randomToken();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_SECONDS * 1000);
    const session = em.create(RefreshSession, {
      user,
      refreshToken: sha256(secret),
      expiresAt,
    });
    em.persist(session);
    await em.flush();

    const access = await this.signAccessToken(user.id, now);
    return {
      ...access,
      refreshToken: `${session.id}.${secret}`,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async refresh(rawToken: string): Promise<AuthPayload> {
    const parsed = this.parseRefreshToken(rawToken);
    if (!parsed) {
      throw this.unauthenticated();
    }

    return this.em.transactional(async (em) => {
      const session = await em.findOne(
        RefreshSession,
        { id: parsed.id },
        { populate: ['user'], lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      const now = new Date();
      if (
        !session ||
        session.expiresAt <= now ||
        !safeEqual(session.refreshToken, sha256(parsed.secret))
      ) {
        throw this.unauthenticated();
      }

      const secret = randomToken();
      session.refreshToken = sha256(secret);
      await em.flush();

      const access = await this.signAccessToken(session.user.id, now);
      return {
        user: session.user,
        ...access,
        refreshToken: `${session.id}.${secret}`,
        refreshTokenExpiresAt: session.expiresAt,
      };
    });
  }

  async logout(rawToken: string): Promise<boolean> {
    const parsed = this.parseRefreshToken(rawToken);
    if (!parsed) {
      return true;
    }

    return this.em.transactional(async (em) => {
      const session = await em.findOne(
        RefreshSession,
        { id: parsed.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (session && safeEqual(session.refreshToken, sha256(parsed.secret))) {
        em.remove(session);
        await em.flush();
      }
      return true;
    });
  }

  async verifyAccessToken(rawToken: string): Promise<{ sub: number }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: unknown;
      }>(rawToken);
      const id = parseId(payload.sub);
      if (id === null) {
        throw new Error('Invalid subject');
      }
      return { sub: id };
    } catch {
      throw this.unauthenticated();
    }
  }

  private async signAccessToken(userId: number, now: Date) {
    return {
      accessToken: await this.jwtService.signAsync(
        { sub: String(userId) },
        { expiresIn: '15m' },
      ),
      accessTokenExpiresAt: new Date(
        now.getTime() + ACCESS_TOKEN_SECONDS * 1000,
      ),
    };
  }

  private parseRefreshToken(rawToken: string) {
    const parts = rawToken.split('.');
    if (parts.length !== 2 || !REFRESH_SECRET_PATTERN.test(parts[1])) {
      return null;
    }
    const id = parseId(parts[0]);
    return id === null ? null : { id, secret: parts[1] };
  }

  private unauthenticated() {
    return authError(
      'UNAUTHENTICATED',
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
