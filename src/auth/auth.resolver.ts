import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { AuthService } from './auth.service';
import {
  AuthPayload,
  LoginInput,
  OtpRequestPayload,
  OtpVerificationPayload,
  SignUpInput,
} from './auth.types';
import { OtpService } from './otp.service';
import { Public } from './public.decorator';
import { SessionService } from './session.service';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly otpService: OtpService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Mutation(() => OtpRequestPayload)
  sendSignupOtp(@Args('phone') phone: string) {
    return this.otpService.sendSignupOtp(phone);
  }

  @Public()
  @Mutation(() => OtpVerificationPayload)
  verifySignupOtp(@Args('phone') phone: string, @Args('code') code: string) {
    return this.otpService.verifySignupOtp(phone, code);
  }

  @Public()
  @Mutation(() => AuthPayload)
  signUp(@Args('input') input: SignUpInput) {
    return this.authService.signUp(input);
  }

  @Public()
  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  @Public()
  @Mutation(() => AuthPayload)
  refreshSession(@Args('refreshToken') refreshToken: string) {
    return this.sessionService.refresh(refreshToken);
  }

  @Public()
  @Mutation(() => Boolean)
  logout(@Args('refreshToken') refreshToken: string) {
    return this.sessionService.logout(refreshToken);
  }
}
