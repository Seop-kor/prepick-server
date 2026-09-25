import { randomUUID } from 'node:crypto';

import type { OptionalProps } from '@mikro-orm/core';
import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class Store {
  declare [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'distanceMeters';

  @Field(() => ID)
  id: string = randomUUID();

  @Field()
  name!: string;

  @Field()
  category!: string;

  @Field()
  address!: string;

  latitude!: number;
  longitude!: number;

  @Field(() => String, { nullable: true })
  imageUrl!: string | null;

  @Field()
  isOpen!: boolean;

  isActive!: boolean;

  @Field(() => Int, { nullable: true })
  distanceMeters: number | null = null;

  @Field(() => GraphQLISODateTime)
  createdAt = new Date();

  updatedAt = new Date();
}
