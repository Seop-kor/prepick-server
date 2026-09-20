import { randomUUID } from 'node:crypto';

import type { OptionalProps } from '@mikro-orm/core';
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  declare [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  @Field(() => ID)
  id: string = randomUUID();

  @Field()
  name!: string;

  @Field()
  phone!: string;

  password!: string;

  @Field(() => GraphQLISODateTime)
  createdAt = new Date();

  updatedAt = new Date();
}
