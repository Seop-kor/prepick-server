import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';

import { AppModule } from '../../src/app.module';
import { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

// user 테이블과 외래 키가 없으므로 실제 사용자와 겹치지 않을 큰 ID를 쓴다.
const USER_A = 2000000001;
const USER_B = 2000000002;

describe('주문 생성 동시성', () => {
  let testingModule: TestingModule;
  let em: EntityManager;
  let service: OrdersService;
  let storeId: number;

  const input = (cartId: string): CreateOrderInput => ({
    cartId,
    storeId: String(storeId),
    amount: 4000,
    request: null,
    paidAt: new Date(),
    items: [
      {
        productId: '1',
        skuId: '1',
        productName: '아메리카노',
        skuName: 'ICE',
        price: 4000,
        quantity: 1,
      },
    ],
  });

  beforeAll(async () => {
    process.env.OTP_HMAC_SECRET = 'integration-test-hmac-secret';
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    em = testingModule.get(EntityManager);
    service = testingModule.get(OrdersService);
    const [store] = await em.execute<{ id: number }[]>(
      `INSERT INTO store (name, category, address, latitude, longitude, created_at, updated_at)
       VALUES ('동시성 테스트 매장', '카페', '서울', 37.5, 127, now(), now())
       RETURNING id`,
    );
    storeId = store.id;
  });

  afterAll(async () => {
    if (storeId) {
      await em.execute(
        'DELETE FROM order_item WHERE order_id IN (SELECT id FROM "order" WHERE store_id = ?)',
        [storeId],
      );
      await em.execute('DELETE FROM "order" WHERE store_id = ?', [storeId]);
      await em.execute('DELETE FROM order_number_counter WHERE store_id = ?', [
        storeId,
      ]);
      await em.execute('DELETE FROM store WHERE id = ?', [storeId]);
    }
    await testingModule?.close();
  });

  it('같은 매장에 동시에 10건을 주문하면 주문번호를 1부터 10까지 중복 없이 부여한다', async () => {
    const startedAt = performance.now();
    const orders = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        service.createOrder(USER_A, input(`concurrent-${storeId}-${i}`)),
      ),
    );
    console.log(
      `동시 주문 10건 소요 시간: ${Math.round(performance.now() - startedAt)}ms`,
    );

    expect(
      orders.map((order) => order.orderNumber).sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(orders.map((order) => order.id)).size).toBe(10);
  });

  it('같은 cartId로 동시에 2건을 보내면 주문을 하나만 만들고 진 쪽은 주문번호를 소모하지 않는다', async () => {
    const cartId = `same-cart-${storeId}`;
    const [first, second] = await Promise.all([
      service.createOrder(USER_B, input(cartId)),
      service.createOrder(USER_B, input(cartId)),
    ]);

    expect(first.id).toBe(second.id);
    const [{ count }] = await em.execute<{ count: string }[]>(
      'SELECT count(*) FROM "order" WHERE user_id = ? AND cart_id = ?',
      [USER_B, cartId],
    );
    expect(Number(count)).toBe(1);

    const next = await service.createOrder(USER_B, input(`after-${storeId}`));
    expect(next.orderNumber).toBe(first.orderNumber + 1);
  });

  it('다른 사용자가 같은 cartId를 쓰면 각자 별도 주문을 만든다', async () => {
    const cartId = `shared-cart-${storeId}`;
    const a = await service.createOrder(USER_A, input(cartId));
    const b = await service.createOrder(USER_B, input(cartId));

    expect(a.id).not.toBe(b.id);
    await expect(service.findOrder(USER_B, String(a.id))).resolves.toBeNull();
  });
});
