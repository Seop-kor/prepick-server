import {
  Field,
  GraphQLISODateTime,
  InputType,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { IsString } from 'class-validator';

import { User } from '../users/user.entity';

@ObjectType()
export class OtpRequestPayload {
  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => Int)
  retryAfterSeconds!: number;
}

@ObjectType()
export class OtpVerificationPayload {
  @Field()
  verificationToken!: string;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@ObjectType()
export class AuthPayload implements SessionTokens {
  @Field(() => User)
  user!: User;

  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;

  @Field(() => GraphQLISODateTime)
  accessTokenExpiresAt!: Date;

  @Field(() => GraphQLISODateTime)
  refreshTokenExpiresAt!: Date;
}

@InputType()
export class SignUpInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsString()
  password!: string;

  @Field()
  @IsString()
  verificationToken!: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  phone!: string;

  @Field()
  @IsString()
  password!: string;
}
