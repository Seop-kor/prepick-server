import { Args, ID, Query, Resolver } from '@nestjs/graphql';

import { ProductsService } from './products.service';
import { ProductType, StoreProducts } from './products.types';

@Resolver()
export class ProductsResolver {
  constructor(private readonly service: ProductsService) {}

  @Query(() => StoreProducts, { nullable: true })
  storeProducts(@Args('storeId', { type: () => ID }) storeId: string) {
    return this.service.storeProducts(storeId);
  }

  @Query(() => ProductType, { nullable: true })
  product(@Args('id', { type: () => ID }) id: string) {
    return this.service.product(id);
  }
}
