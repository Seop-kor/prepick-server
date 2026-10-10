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
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    return this.service.findNearbyStores(
      latitude,
      longitude,
      radiusKm,
      size,
      cursor,
    );
  }

  @Query(() => StorePage)
  newStores(
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    return this.service.findNewStores(size, cursor);
  }

  @Query(() => Store, { nullable: true })
  store(@Args('id', { type: () => ID }) id: string) {
    return this.service.findStore(id);
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
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    const location =
      parent.latitude === null
        ? null
        : { latitude: parent.latitude, longitude: parent.longitude! };
    return this.service.searchStores(parent.keyword, location, size, cursor);
  }

  @ResolveField(() => MenuSearchPage, { name: 'menus' })
  searchMenus(
    @Parent() parent: SearchResult,
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    const location =
      parent.latitude === null
        ? null
        : { latitude: parent.latitude, longitude: parent.longitude! };
    return this.service.searchMenus(parent.keyword, location, size, cursor);
  }
}
