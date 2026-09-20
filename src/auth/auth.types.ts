import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

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
