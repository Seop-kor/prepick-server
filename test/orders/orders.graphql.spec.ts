import { Test } from '@nestjs/testing';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { parse, printSchema, validate } from 'graphql';

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
    expect(sdl).toContain(
      'orders(size: Int = 20, cursor: String, statuses: [OrderStatus!]): OrderPage!',
    );
    const statusesType = schema
      .getQueryType()
      ?.getFields()
      .orders.args.find((arg) => arg.name === 'statuses')?.type;
    expect(statusesType?.toString()).toBe('[OrderStatus!]');
    expect(sdl).toContain('order(id: ID!): Order');
    expect(sdl).toContain('prefixOrderNumber: String!');
    expect(sdl).toContain('orderNumber: Int!');
    expect(sdl).toContain('status: OrderStatus!');
    expect(sdl).toMatch(
      /enum OrderStatus \{\s+CREATED\s+CONFIRMED\s+IN_PROGRESS\s+READY\s+PICKED_UP\s+CANCELED\s+\}/,
    );
    expect(sdl).toContain('storeName: String!');
    expect(sdl).toContain('paidAt: DateTime!');
    expect(sdl).toContain('items: [OrderItem!]!');
    expect(sdl).toContain('items: [OrderItemInput!]!');
    expect(sdl).toContain('request: String');
    expect(sdl).not.toContain('updatedAt');
    await module.close();
  });

  it('정의되지 않은 상태 값을 전달하면 주문 조회 전에 GraphQL 입력 검증 오류를 반환한다', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([OrdersResolver]);

    const errors = validate(
      schema,
      parse(`query {
        orders(statuses: [NOT_A_STATUS]) {
          items { id }
        }
      }`),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain(
      'Value "NOT_A_STATUS" does not exist in "OrderStatus" enum.',
    );
    await module.close();
  });
});
