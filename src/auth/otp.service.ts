import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SmsService } from '../common/sms.service';
import { UtilService } from '../common/util.service';
import { UsersService } from '../users/users.service';
import { hmacSha256, randomToken, safeEqual, sha256 } from './auth.crypto';
import { authError } from './auth.error';
import type { OtpRequestPayload, OtpVerificationPayload } from './auth.types';
import { OtpChallenge } from './otpChallenge.entity';

const OTP_EXPIRES_MS = 5 * 60 * 1000;
const OTP_RETRY_MS = 60 * 1000;
const OTP_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const VERIFICATION_EXPIRES_MS = 10 * 60 * 1000;

@Injectable()
export class OtpService {
  private readonly hmacSecret: string;

  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly utilService: UtilService,
    configService: ConfigService,
  ) {
    this.hmacSecret = configService.getOrThrow<string>('OTP_HMAC_SECRET');
  }

  async sendSignupOtp(phone: string): Promise<OtpRequestPayload> {
    const normalizedPhone = this.utilService.normalizePhone(phone);
    if (await this.usersService.existsByPhone(normalizedPhone)) {
      throw authError(
        'PHONE_NUMBER_ALREADY_REGISTERED',
        'Phone number already registered',
        HttpStatus.CONFLICT,
      );
    }

    const issued = await this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(hashtext(?))', [
        normalizedPhone,
      ]);

      const now = new Date();
      const latest = await em.findOne(
        OtpChallenge,
        { phone: normalizedPhone },
        { orderBy: { createdAt: 'DESC' } },
      );
      if (latest && now.getTime() - latest.createdAt.getTime() < OTP_RETRY_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(
            (latest.createdAt.getTime() + OTP_RETRY_MS - now.getTime()) / 1000,
          ),
        );
        throw authError(
          'TOO_MANY_REQUESTS',
          'Please wait before requesting another OTP',
          HttpStatus.TOO_MANY_REQUESTS,
          { retryAfterSeconds },
        );
      }

      const sentLastHour = await em.count(OtpChallenge, {
        phone: normalizedPhone,
        createdAt: { $gte: new Date(now.getTime() - OTP_LIMIT_WINDOW_MS) },
      });
      if (sentLastHour >= 5) {
        throw authError(
          'TOO_MANY_REQUESTS',
          'OTP request limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await em.nativeUpdate(
        OtpChallenge,
        {
          phone: normalizedPhone,
          invalidatedAt: null,
          consumedAt: null,
        },
        { invalidatedAt: now },
      );

      const otp = this.utilService.getOtp();
      const challenge = em.create(OtpChallenge, {
        phone: normalizedPhone,
        otp: hmacSha256(otp, this.hmacSecret),
        expiresAt: new Date(now.getTime() + OTP_EXPIRES_MS),
      });
      em.persist(challenge);
      await em.flush();
      return { challenge, otp };
    });

    try {
      await this.smsService.sendOtp(normalizedPhone, issued.otp);
    } catch {
      issued.challenge.invalidatedAt = new Date();
      const cleanupEm = this.em.fork();
      cleanupEm.persist(issued.challenge);
      await cleanupEm.flush();
      throw new ServiceUnavailableException('SMS delivery failed');
    }

    return {
      expiresAt: issued.challenge.expiresAt,
      retryAfterSeconds: OTP_RETRY_MS / 1000,
    };
  }

  async verifySignupOtp(
    phone: string,
    code: string,
  ): Promise<OtpVerificationPayload> {
    if (!/^\d{6}$/.test(code)) {
      throw this.invalidOtp();
    }
    const normalizedPhone = this.utilService.normalizePhone(phone);

    const result = await this.em.transactional(async (em) => {
      const now = new Date();
      const challenge = await em.findOne(
        OtpChallenge,
        { phone: normalizedPhone },
        {
          orderBy: { createdAt: 'DESC' },
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );

      if (
        !challenge ||
        challenge.expiresAt <= now ||
        challenge.invalidatedAt ||
        challenge.consumedAt ||
        challenge.attemptCount >= 5
      ) {
        throw this.invalidOtp();
      }

      if (!safeEqual(challenge.otp, hmacSha256(code, this.hmacSecret))) {
        challenge.attemptCount += 1;
        await em.flush();
        return null;
      }

      const verificationToken = randomToken();
      const expiresAt = new Date(now.getTime() + VERIFICATION_EXPIRES_MS);
      challenge.verifiedAt = now;
      challenge.verificationToken = sha256(verificationToken);
      challenge.verificationExpiresAt = expiresAt;
      await em.flush();

      return { verificationToken, expiresAt };
    });
    if (!result) {
      throw this.invalidOtp();
    }
    return result;
  }

  async consumeVerificationToken(
    token: string,
    em: EntityManager,
  ): Promise<OtpChallenge> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw this.invalidVerificationToken();
    }

    const challenge = await em.findOne(
      OtpChallenge,
      { verificationToken: sha256(token) },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    const now = new Date();
    if (
      !challenge ||
      !challenge.verifiedAt ||
      !challenge.verificationExpiresAt ||
      challenge.verificationExpiresAt <= now ||
      challenge.consumedAt ||
      challenge.invalidatedAt
    ) {
      throw this.invalidVerificationToken();
    }

    challenge.consumedAt = now;
    return challenge;
  }

  private invalidOtp() {
    return authError('BAD_USER_INPUT', 'Invalid OTP', HttpStatus.BAD_REQUEST);
  }

  private invalidVerificationToken() {
    return authError(
      'BAD_USER_INPUT',
      'Invalid verification token',
      HttpStatus.BAD_REQUEST,
    );
  }
}
