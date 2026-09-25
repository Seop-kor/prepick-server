import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { Store } from './store.entity';

@ObjectType()
export class StorePage {
  @Field(() => [Store])
  items!: Store[];

  @Field(() => String, { nullable: true })
  nextCursor!: string | null;
}

@ObjectType()
export class SearchResult {
  keyword!: string;
  latitude: number | null = null;
  longitude: number | null = null;
}

@ObjectType()
export class MenuSearchHit {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => Int)
  minPrice!: number;

  @Field(() => Store)
  store!: Store;
}

@ObjectType()
export class MenuSearchPage {
  @Field(() => [MenuSearchHit])
  items!: MenuSearchHit[];

  @Field(() => String, { nullable: true })
  nextCursor!: string | null;
}
