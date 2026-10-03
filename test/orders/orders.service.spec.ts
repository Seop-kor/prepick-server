import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { OrdersService } from '../../src/orders/orders.service';

const USER = 7;
const createdAt = new Date('2026-10-04T01:00:00.000Z');
const paidAt = new Date('2026-10-04T00:59:00.000Z');

const orderRow = (
  id: number,
  cursorCreatedAt = '2026-10-04T01:00:00.123456Z',
) => ({
  id,
  store_id: 1,
  store_name: '브루랩 강남점',
  prefix_order_number: 'A',
  order_number: id,
  amount: 8000,
  request: null,
  paid_at: paidAt,
  created_at: createdAt,
  cursor_created_at: cursorCreatedAt,
});

const itemRow = (id: number, orderId: number) => ({
  id,
  order_id: orderId,
  product_id: 10,
  sku_id: 100,
  product_name: '아메리카노',
  sku_name: 'ICE',
  price: 4000,
  quantity: 2,
});

describe('OrdersService 조회', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const service = new OrdersService({ execute } as unknown as EntityManager);

  beforeEach(() => execute.mockReset());

  it('주문이 없는 사용자의 목록을 조회하면 빈 목록을 반환하고 항목을 조회하지 않는다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.findOrders(USER, 20, null)).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('목록을 조회하면 본인 주문을 최신순으로 가져오고 항목을 주문별로 묶는다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([itemRow(31, 3), itemRow(21, 2), itemRow(32, 3)]);

    const page = await service.findOrders(USER, 20, null);

    expect(execute.mock.calls[0][0]).toContain('FROM "order"');
    expect(execute.mock.calls[0][0]).toContain('user_id = ?');
    expect(execute.mock.calls[0][0]).toContain(
      'ORDER BY created_at DESC, id DESC',
    );
    expect(execute.mock.calls[0][1]).toEqual([USER, 21]);
    expect(execute.mock.calls[1][0]).toContain('order_id IN (?, ?)');
    expect(execute.mock.calls[1][0]).toContain('ORDER BY id ASC');
    expect(execute.mock.calls[1][1]).toEqual([3, 2]);
    expect(page.nextCursor).toBeNull();
    expect(page.items).toEqual([
      {
        id: 3,
        storeId: 1,
        storeName: '브루랩 강남점',
        prefixOrderNumber: 'A',
        orderNumber: 3,
        amount: 8000,
        request: null,
        paidAt,
        createdAt,
        items: [
          {
            id: 31,
            productId: 10,
            skuId: 100,
            productName: '아메리카노',
            skuName: 'ICE',
            price: 4000,
            quantity: 2,
          },
          {
            id: 32,
            productId: 10,
            skuId: 100,
            productName: '아메리카노',
            skuName: 'ICE',
            price: 4000,
            quantity: 2,
          },
        ],
      },
      expect.objectContaining({
        id: 2,
        items: [expect.objectContaining({ id: 21 })],
      }),
    ]);
  });

  it('같은 시각의 주문이 페이지 경계에 걸리면 마이크로초 시각과 ID로 다음 페이지를 이어 조회한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([orderRow(1)])
      .mockResolvedValueOnce([]);

    const first = await service.findOrders(USER, 1, null);
    expect(first.items.map(({ id }) => id)).toEqual([3]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await service.findOrders(USER, 1, first.nextCursor);
    expect(second.items.map(({ id }) => id)).toEqual([1]);
    expect(execute.mock.calls[0][0]).toContain('cursor_created_at');
    expect(execute.mock.calls[2][0]).toContain(
      '(created_at, id) < (?::timestamptz, ?::integer)',
    );
    expect(execute.mock.calls[2][1]).toEqual([
      USER,
      '2026-10-04T01:00:00.123456Z',
      3,
      2,
    ]);
  });

  it('다른 사용자의 커서로 목록을 조회하면 입력 오류를 반환한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(3), orderRow(2)])
      .mockResolvedValueOnce([]);
    const page = await service.findOrders(USER, 1, null);

    await expect(
      service.findOrders(USER + 1, 1, page.nextCursor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('페이지 크기가 범위를 벗어나면 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.findOrders(USER, 0, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('본인 주문이 아니거나 없는 주문을 상세 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.findOrder(USER, '5')).resolves.toBeNull();
    expect(execute.mock.calls[0][0]).toContain('id = ? AND user_id = ?');
    expect(execute.mock.calls[0][1]).toEqual([5, USER]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('본인 주문을 상세 조회하면 항목을 포함해 반환한다', async () => {
    execute
      .mockResolvedValueOnce([orderRow(5)])
      .mockResolvedValueOnce([itemRow(51, 5)]);

    const order = await service.findOrder(USER, '5');

    expect(order).toMatchObject({
      id: 5,
      orderNumber: 5,
      items: [{ id: 51 }],
    });
  });

  it('주문 ID 형식이 잘못되면 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.findOrder(USER, 'abc')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
