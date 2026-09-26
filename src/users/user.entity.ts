import type { OptionalProps } from '@mikro-orm/core';
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  declare [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field()
  phone!: string;

  password!: string;

  @Field(() => GraphQLISODateTime)
  createdAt = new Date();

  updatedAt = new Date();
}
