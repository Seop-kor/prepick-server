import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';
import { AuthGuard } from './auth.guard';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { OtpChallengeSchema } from './otpChallenge.schema';
import { RefreshSessionSchema } from './refreshSession.schema';
import { SessionService } from './session.service';

@Module({
  imports: [
    CommonModule,
    UsersModule,
    MikroOrmModule.forFeature([OtpChallengeSchema, RefreshSessionSchema]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    OtpService,
    SessionService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
