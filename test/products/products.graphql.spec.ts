import { Test } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { printSchema } from 'graphql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsResolver } from '../../src/products/products.resolver';

describe('매장 상품 GraphQL 스키마', () => {
  it('상품 쿼리를 구성하면 목록과 상세 타입이 스키마에 표시된다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([ProductsResolver]);

    expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual([
      'storeProducts',
      'product',
    ]);
    const sdl = printSchema(schema);
    expect(sdl).toContain('storeProducts(storeId: ID!): StoreProducts');
    expect(sdl).toContain('product(id: ID!): Product');
    expect(sdl).toContain('categories: [Category!]!');
    expect(sdl).toContain('products: [Product!]!');
    expect(sdl).toContain('productIds: [ID!]!');
    expect(sdl).toContain('storeId: ID!');
    expect(sdl).toContain('description: String');
    expect(sdl).toContain('imageUrl: String');
    expect(sdl).toContain('minPrice: Int!');
    expect(sdl).toContain('skus: [Sku!]!');
    expect(sdl).toContain('isSoldOut: Boolean!');
    await module.close();
  });
});
