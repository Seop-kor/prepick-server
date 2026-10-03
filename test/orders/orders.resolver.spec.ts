jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import type { AuthenticatedRequest } from '../../src/auth/auth.guard';
import { OrdersResolver } from '../../src/orders/orders.resolver';
import type { OrdersService } from '../../src/orders/orders.service';
import type { CreateOrderInput } from '../../src/orders/orders.types';

const req = { userId: 7 } as AuthenticatedRequest;

describe('OrdersResolver', () => {
  it('주문을 생성하면 토큰의 사용자 ID로 서비스를 호출한다', async () => {
    const order = { id: 1 };
    const createOrder = jest.fn().mockResolvedValue(order);
    const resolver = new OrdersResolver({
      createOrder,
    } as unknown as OrdersService);
    const input = { cartId: 'cart-1' } as CreateOrderInput;

    await expect(resolver.createOrder(input, req)).resolves.toBe(order);
    expect(createOrder).toHaveBeenCalledWith(7, input);
  });

  it('주문 목록을 요청하면 토큰의 사용자 ID와 페이지 인자를 전달한다', async () => {
    const page = { items: [], nextCursor: null };
    const findOrders = jest.fn().mockResolvedValue(page);
    const resolver = new OrdersResolver({
      findOrders,
    } as unknown as OrdersService);

    await expect(resolver.orders(req, 10, 'cursor')).resolves.toBe(page);
    expect(findOrders).toHaveBeenCalledWith(7, 10, 'cursor');
  });

  it('주문 상세를 요청하면 토큰의 사용자 ID와 주문 ID를 전달한다', async () => {
    const findOrder = jest.fn().mockResolvedValue(null);
    const resolver = new OrdersResolver({
      findOrder,
    } as unknown as OrdersService);

    await expect(resolver.order('5', req)).resolves.toBeNull();
    expect(findOrder).toHaveBeenCalledWith(7, '5');
  });
});
