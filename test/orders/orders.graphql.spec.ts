import { Test } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { printSchema } from 'graphql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { OrdersResolver } from '../../src/orders/orders.resolver';

describe('주문 GraphQL 스키마', () => {
  it('주문 resolver를 구성하면 생성·목록·상세 API와 타입이 스키마에 표시된다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([OrdersResolver]);

    expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual([
      'orders',
      'order',
    ]);
    expect(Object.keys(schema.getMutationType()?.getFields() ?? {})).toEqual([
      'createOrder',
    ]);
    const sdl = printSchema(schema);
    expect(sdl).toContain('createOrder(input: CreateOrderInput!): Order!');
    expect(sdl).toContain('orders(size: Int = 20, cursor: String): OrderPage!');
    expect(sdl).toContain('order(id: ID!): Order');
    expect(sdl).toContain('prefixOrderNumber: String!');
    expect(sdl).toContain('orderNumber: Int!');
    expect(sdl).toContain('storeName: String!');
    expect(sdl).toContain('paidAt: DateTime!');
    expect(sdl).toContain('items: [OrderItem!]!');
    expect(sdl).toContain('items: [OrderItemInput!]!');
    expect(sdl).toContain('request: String');
    expect(sdl).not.toContain('updatedAt');
    await module.close();
  });
});
