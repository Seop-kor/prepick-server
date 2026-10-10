import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

const USER = 7;
const paidAt = new Date('2026-10-04T00:59:00.000Z');

const orderRow = (id: number, orderNumber: number) => ({
  id,
  store_id: 1,
  store_name: '브루랩 강남점',
  prefix_order_number: 'A',
  order_number: orderNumber,
  amount: 12500,
  request: null,
  paid_at: paidAt,
  created_at: paidAt,
  cursor_created_at: '2026-10-04T00:59:00.000000Z',
});

const input = (
  overrides: Partial<CreateOrderInput> = {},
): CreateOrderInput => ({
  cartId: 'cart-1',
  storeId: '1',
  amount: 12500,
  request: '',
  paidAt,
  items: [
    {
      productId: '10',
      skuId: '100',
      productName: '아메리카노',
      skuName: 'ICE',
      price: 4000,
      quantity: 2,
    },
    {
      productId: '11',
      skuId: '110',
      productName: '카페라떼',
      skuName: 'HOT',
      price: 4500,
      quantity: 1,
    },
  ],
  ...overrides,
});

describe('OrdersService 주문 생성', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const txExecute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const transactional = jest.fn(
    (callback: (em: { execute: typeof txExecute }) => Promise<unknown>) =>
      callback({ execute: txExecute }),
  );
  const service = new OrdersService({
    execute,
    transactional,
  } as unknown as EntityManager);

  beforeEach(() => {
    execute.mockReset();
    txExecute.mockReset();
    transactional.mockClear();
  });

  const mockNewOrder = () => {
    execute
      .mockResolvedValueOnce([]) // cartId 조회
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }]) // 매장 조회
      .mockResolvedValueOnce([orderRow(9, 3)]) // 생성 후 주문 조회
      .mockResolvedValueOnce([]); // 생성 후 항목 조회
    txExecute
      .mockResolvedValueOnce([{ last_number: 3, order_date: '2026-10-04' }])
      .mockResolvedValueOnce([{ id: 9 }])
      .mockResolvedValueOnce([]);
  };

  it('정상 입력이면 한 트랜잭션에서 주문번호를 받고 주문과 항목을 저장한다', async () => {
    mockNewOrder();

    const order = await service.createOrder(USER, input());

    expect(transactional).toHaveBeenCalledTimes(1);
    const [counterSql, counterParams] = txExecute.mock.calls[0];
    expect(counterSql).toContain('INSERT INTO order_number_counter');
    expect(counterSql).toContain("(now() AT TIME ZONE 'Asia/Seoul')::date");
    expect(counterSql).toContain('ON CONFLICT (store_id, order_date)');
    expect(counterSql).toContain(
      'last_number = order_number_counter.last_number + 1',
    );
    expect(counterSql).toContain('order_date::text AS order_date');
    expect(counterParams).toEqual([1]);

    const [orderSql, orderParams] = txExecute.mock.calls[1];
    expect(orderSql).toContain('INSERT INTO "order"');
    expect(orderSql).toContain('RETURNING id');
    expect(orderParams).toEqual([
      USER,
      1,
      '브루랩 강남점',
      'cart-1',
      '2026-10-04',
      'A',
      3,
      12500,
      null,
      paidAt,
    ]);

    const [itemSql, itemParams] = txExecute.mock.calls[2];
    expect(itemSql).toContain('INSERT INTO order_item');
    expect(itemSql).toContain(
      'VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
    );
    expect(itemParams).toEqual([
      9,
      10,
      100,
      '아메리카노',
      'ICE',
      4000,
      2,
      9,
      11,
      110,
      '카페라떼',
      'HOT',
      4500,
      1,
    ]);

    expect(order).toMatchObject({
      id: 9,
      prefixOrderNumber: 'A',
      orderNumber: 3,
    });
  });

  it('요청사항이 비어 있으면 null로 저장하고 내용이 있으면 그대로 저장한다', async () => {
    mockNewOrder();
    await service.createOrder(USER, input({ request: '' }));
    expect(txExecute.mock.calls[1][1][8]).toBeNull();

    mockNewOrder();
    await service.createOrder(USER, input({ request: '빨대 주세요.' }));
    expect(txExecute.mock.calls[4][1][8]).toBe('빨대 주세요.');
  });

  it('매장명은 클라이언트가 아니라 DB에서 가져오고 비활성이거나 영업 종료인 매장도 거절하지 않는다', async () => {
    mockNewOrder();

    await service.createOrder(USER, input());

    const [storeSql, storeParams] = execute.mock.calls[1];
    expect(storeSql).toBe('SELECT name FROM store WHERE id = ?');
    expect(storeSql).not.toContain('is_active');
    expect(storeSql).not.toContain('is_open');
    expect(storeParams).toEqual([1]);
  });

  it('같은 사용자의 같은 cartId 주문이 이미 있으면 새로 만들지 않고 기존 주문을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([orderRow(4, 1)])
      .mockResolvedValueOnce([]);

    const order = await service.createOrder(USER, input());

    expect(execute.mock.calls[0][0]).toBe(
      'SELECT id FROM "order" WHERE user_id = ? AND cart_id = ?',
    );
    expect(execute.mock.calls[0][1]).toEqual([USER, 'cart-1']);
    expect(transactional).not.toHaveBeenCalled();
    expect(order).toMatchObject({ id: 4, orderNumber: 1 });
  });

  it('매장이 없으면 주문을 만들지 않고 Store not found 입력 오류를 반환한다', async () => {
    execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(service.createOrder(USER, input())).rejects.toThrow(
      new BadRequestException('Store not found'),
    );
    expect(transactional).not.toHaveBeenCalled();
  });

  it('ID 형식이 잘못되면 DB 조회 없이 입력 오류를 반환한다', async () => {
    await expect(
      service.createOrder(USER, input({ storeId: 'abc' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createOrder(
        USER,
        input({
          items: [{ ...input().items[0], skuId: '0' }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('같은 cartId 요청이 동시에 들어와 unique 제약에 걸리면 먼저 저장된 주문을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }])
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([orderRow(4, 1)])
      .mockResolvedValueOnce([]);
    transactional.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'order_user_id_cart_id_unique',
      }),
    );

    const order = await service.createOrder(USER, input());

    expect(execute.mock.calls[2][1]).toEqual([USER, 'cart-1']);
    expect(order).toMatchObject({ id: 4 });
  });

  it('cartId 중복이 아닌 DB 오류가 나면 그대로 던진다', async () => {
    execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ name: '브루랩 강남점' }]);
    const error = Object.assign(new Error('duplicate number'), {
      code: '23505',
      constraint: 'order_store_id_order_date_number_unique',
    });
    transactional.mockRejectedValueOnce(error);

    await expect(service.createOrder(USER, input())).rejects.toBe(error);
  });
});
