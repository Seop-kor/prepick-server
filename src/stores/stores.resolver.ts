import {
  Args,
  Float,
  ID,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { validateKeyword, validateLocation } from './stores.util';
import { MenuSearchPage, SearchResult, StorePage } from './stores.types';
import { Store } from './store.entity';
import { StoresService } from './stores.service';

@Resolver(() => SearchResult)
export class StoresResolver {
  constructor(private readonly service: StoresService) {}

  @Query(() => StorePage)
  stores(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('radiusKm', { type: () => Float, nullable: true, defaultValue: 5 })
    radiusKm: number,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ) {
    return this.service.nearby(latitude, longitude, radiusKm, first, after);
  }

  @Query(() => StorePage)
  newStores(
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ) {
    return this.service.newStores(first, after);
  }

  @Query(() => Store, { nullable: true })
  store(@Args('id', { type: () => ID }) id: string) {
    return this.service.store(id);
  }

  @Query(() => SearchResult)
  search(
    @Args('keyword') keyword: string,
    @Args('latitude', { type: () => Float, nullable: true }) latitude?: number,
    @Args('longitude', { type: () => Float, nullable: true })
    longitude?: number,
  ): SearchResult {
    const location = validateLocation(latitude, longitude);
    return {
      keyword: validateKeyword(keyword),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    };
  }

  @ResolveField(() => StorePage, { name: 'stores' })
  searchStores(
    @Parent() parent: SearchResult,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ) {
    const location =
      parent.latitude === null
        ? null
        : { latitude: parent.latitude, longitude: parent.longitude! };
    return this.service.searchStores(parent.keyword, location, first, after);
  }

  @ResolveField(() => MenuSearchPage, { name: 'menus' })
  searchMenus(
    @Parent() parent: SearchResult,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 })
    first: number,
    @Args('after', { type: () => String, nullable: true })
    after?: string | null,
  ) {
    const location =
      parent.latitude === null
        ? null
        : { latitude: parent.latitude, longitude: parent.longitude! };
    return this.service.searchMenus(parent.keyword, location, first, after);
  }
}
