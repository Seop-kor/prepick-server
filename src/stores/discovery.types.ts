import { Field, ObjectType } from '@nestjs/graphql';

import { Store } from './store.entity';

@ObjectType()
export class StorePage {
  @Field(() => [Store])
  items!: Store[];

  @Field(() => String, { nullable: true })
  nextCursor!: string | null;
}
