import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

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
