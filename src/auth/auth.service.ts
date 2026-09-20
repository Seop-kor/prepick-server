import { EntityManager } from '@mikro-orm/postgresql';
import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { normalizePhone } from '../users/phone';
import { UsersService } from '../users/users.service';
import { authError } from './auth.error';
import type { AuthPayload, LoginInput, SignUpInput } from './auth.types';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';

const DUMMY_PASSWORD =
  '$2b$12$3mrlqUdi7niOK484fHY43.cInIgb0dVj6VVbSwGSJQXDe50/Cs8EC';

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthPayload> {
    try {
      return await this.em.transactional(async (em) => {
        const name = input.name.trim();
        if (
          Array.from(name).length < 1 ||
          Array.from(name).length > 50 ||
          Array.from(input.password).length < 8 ||
          Buffer.byteLength(input.password, 'utf8') > 72
        ) {
          throw authError(
            'BAD_USER_INPUT',
            'Invalid signup input',
            HttpStatus.BAD_REQUEST,
          );
        }

        const challenge = await this.otpService.consumeVerificationToken(
          input.verificationToken,
          em,
        );
        if (await this.usersService.existsByPhone(challenge.phone, em)) {
          throw this.phoneAlreadyRegistered();
        }

        const password = await bcrypt.hash(input.password, 12);
        const user = this.usersService.create(
          { name, phone: challenge.phone, password },
          em,
        );
        await em.flush();
        const tokens = await this.sessionService.start(user, em);
        return { user, ...tokens };
      });
    } catch (error) {
      if (this.isUserPhoneUniqueViolation(error)) {
        throw this.phoneAlreadyRegistered();
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthPayload> {
    const phone = normalizePhone(input.phone);
    const user = await this.usersService.findByPhone(phone);
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.password ?? DUMMY_PASSWORD,
    );

    if (!user || !passwordMatches) {
      throw authError(
        'UNAUTHENTICATED',
        'Invalid phone or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.sessionService.start(user);
    return { user, ...tokens };
  }

  private phoneAlreadyRegistered() {
    return authError(
      'PHONE_NUMBER_ALREADY_REGISTERED',
      'Phone number already registered',
      HttpStatus.CONFLICT,
    );
  }

  private isUserPhoneUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const databaseError = error as { code?: string; constraint?: string };
    return (
      databaseError.code === '23505' &&
      databaseError.constraint === 'user_phone_unique'
    );
  }
}
