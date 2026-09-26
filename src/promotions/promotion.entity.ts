import type { OptionalProps } from '@mikro-orm/core';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Promotion {
  declare [OptionalProps]?: 'id' | 'sortOrder' | 'isActive';

  @Field(() => ID)
  id!: number;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => String, { nullable: true })
  imageUrl!: string | null;

  sortOrder = 0;
  isActive = true;
}
