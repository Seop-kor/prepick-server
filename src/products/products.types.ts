import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Sku')
export class SkuType {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Int)
  price!: number;

  @Field()
  isSoldOut!: boolean;
}

@ObjectType('Product')
export class ProductType {
  @Field(() => ID)
  id!: number;

  @Field(() => ID)
  storeId!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  imageUrl!: string | null;

  @Field(() => Int)
  minPrice!: number;

  @Field()
  isSoldOut!: boolean;

  @Field(() => [SkuType])
  skus!: SkuType[];
}

@ObjectType()
export class Category {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field(() => [ID])
  productIds!: number[];
}

@ObjectType()
export class StoreProducts {
  @Field(() => [Category])
  categories!: Category[];

  @Field(() => [ProductType])
  products!: ProductType[];
}
