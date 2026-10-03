import { Test } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { printSchema } from 'graphql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { PromotionsResolver } from '../../src/promotions/promotions.resolver';
import { StoresResolver } from '../../src/stores/stores.resolver';

describe('매장 탐색 GraphQL 스키마', () => {
  it('홈과 검색 쿼리를 구성하면 페이지 필드가 스키마에 표시된다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const factory = module.get(GraphQLSchemaFactory);
    const schema = await factory.create([StoresResolver, PromotionsResolver]);
    const query = schema.getQueryType();
    expect(Object.keys(query?.getFields() ?? {})).toEqual([
      'stores',
      'newStores',
      'store',
      'search',
      'promotions',
    ]);
    expect(schema.getType('SearchResult')?.toString()).toBe('SearchResult');
    const sdl = printSchema(schema);
    expect(sdl).toContain(
      'stores(latitude: Float!, longitude: Float!, radiusKm: Float = 5, first: Int = 20, after: String): StorePage!',
    );
    expect(sdl).toContain('stores(first: Int = 20, after: String): StorePage!');
    expect(sdl).toContain(
      'menus(first: Int = 20, after: String): MenuSearchPage!',
    );
    expect(sdl).toContain('promotions: [Promotion!]!');
    await module.close();
  });
});
