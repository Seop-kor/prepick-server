import { Args, Float, ID, Int, Query, Resolver } from '@nestjs/graphql';

import { StorePage } from './discovery.types';
import { Store } from './store.entity';
import { StoresService } from './stores.service';

@Resolver()
export class StoresResolver {
  constructor(private readonly service: StoresService) {}

  @Query(() => StorePage)
  stores(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('radiusKm', { type: () => Float, defaultValue: 5 }) radiusKm: number,
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('after', { nullable: true }) after?: string | null,
  ) {
    return this.service.nearby(latitude, longitude, radiusKm, first, after);
  }

  @Query(() => StorePage)
  newStores(
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('after', { nullable: true }) after?: string | null,
  ) {
    return this.service.newStores(first, after);
  }

  @Query(() => Store, { nullable: true })
  store(@Args('id', { type: () => ID }) id: string) {
    return this.service.store(id);
  }
}
