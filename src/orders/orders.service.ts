import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateSize,
} from '../common/pagination';
import { validateId } from '../common/validation';
import {
  CreateOrderInput,
  OrderItemType,
  OrderPage,
  OrderType,
} from './orders.types';

type OrderRow = {
  id: number;
  store_id: number;
  store_name: string;
  prefix_order_number: string;
  order_number: number;
  amount: number;
  request: string | null;
  paid_at: Date | string;
  created_at: Date | string;
  cursor_created_at: string;
};

type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  sku_id: number;
  product_name: string;
  sku_name: string;
  price: number;
  quantity: number;
};

// cursor_created_at은 커서가 마이크로초까지 보존하도록 DB에서 문자열로 만든다.
const ORDER_COLUMNS = `id, store_id, store_name, prefix_order_number, order_number,
  amount, request, paid_at, created_at,
  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at`;

const ORDER_NUMBER_PREFIX = 'A';

function isCartIdUniqueViolation(error: unknown): boolean {
  const databaseError = error as { code?: string; constraint?: string } | null;
  return (
    databaseError?.code === '23505' &&
    databaseError.constraint === 'order_user_id_cart_id_unique'
  );
}

@Injectable()
export class OrdersService {
  constructor(private readonly em: EntityManager) {}

  // 결제가 끝난 장바구니를 기록한다. 가격·품절·영업 여부는 결제 전 단계의 책임이다.
  async createOrder(
    userId: number,
    input: CreateOrderInput,
  ): Promise<OrderType> {
    const storeId = validateId(input.storeId);
    const items = input.items.map((item) => ({
      ...item,
      productId: validateId(item.productId),
      skuId: validateId(item.skuId),
    }));

    const existingId = await this.findIdByCartId(userId, input.cartId);
    if (existingId) return (await this.loadOrder(userId, existingId))!;

    const [store] = await this.em.execute<{ name: string }[]>(
      'SELECT name FROM store WHERE id = ?',
      [storeId],
    );
    if (!store) throw new BadRequestException('Store not found');

    let orderId: number;
    try {
      orderId = await this.em.transactional(async (em) => {
        // (매장, 주문일) 행 락으로 같은 매장 주문을 직렬화한다.
        const [counter] = await em.execute<
          { last_number: number; order_date: string }[]
        >(
          `INSERT INTO order_number_counter (store_id, order_date, last_number)
           VALUES (?, (now() AT TIME ZONE 'Asia/Seoul')::date, 1)
           ON CONFLICT (store_id, order_date)
           DO UPDATE SET last_number = order_number_counter.last_number + 1
           RETURNING last_number, order_date::text AS order_date`,
          [storeId],
        );
        const [order] = await em.execute<{ id: number }[]>(
          `INSERT INTO "order" (user_id, store_id, store_name, cart_id, order_date,
             prefix_order_number, order_number, amount, request, paid_at)
           VALUES (?, ?, ?, ?, ?::date, ?, ?, ?, ?, ?)
           RETURNING id`,
          [
            userId,
            storeId,
            store.name,
            input.cartId,
            counter.order_date,
            ORDER_NUMBER_PREFIX,
            counter.last_number,
            input.amount,
            input.request || null,
            input.paidAt,
          ],
        );
        await em.execute(
          `INSERT INTO order_item (order_id, product_id, sku_id, product_name, sku_name, price, quantity)
           VALUES ${items.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
          items.flatMap((item) => [
            order.id,
            item.productId,
            item.skuId,
            item.productName,
            item.skuName,
            item.price,
            item.quantity,
          ]),
        );
        return order.id;
      });
    } catch (error) {
      // 같은 cartId 요청이 동시에 들어오면 늦은 쪽이 롤백되고 먼저 저장된 주문을 반환한다.
      if (!isCartIdUniqueViolation(error)) throw error;
      const id = await this.findIdByCartId(userId, input.cartId);
      if (!id) throw error;
      orderId = id;
    }
    return (await this.loadOrder(userId, orderId))!;
  }

  async findOrders(
    userId: number,
    size = 20,
    cursor?: string | null,
  ): Promise<OrderPage> {
    validateSize(size);
    const scope = String(userId);
    const start = decodeCursor('orders', scope, cursor);
    const rows = await this.em.execute<OrderRow[]>(
      `SELECT ${ORDER_COLUMNS} FROM "order" WHERE user_id = ?
      ${start ? 'AND (created_at, id) < (?::timestamptz, ?::integer)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
      [userId, ...(start ? [start.key, start.id] : []), size + 1],
    );
    const page = slicePage(rows, size, (row) =>
      encodeCursor('orders', scope, row.cursor_created_at, row.id),
    );
    return {
      items: await this.withItems(page.items),
      nextCursor: page.nextCursor,
    };
  }

  async findOrder(userId: number, id: string): Promise<OrderType | null> {
    return this.loadOrder(userId, validateId(id));
  }

  private async findIdByCartId(
    userId: number,
    cartId: string,
  ): Promise<number | null> {
    const [row] = await this.em.execute<{ id: number }[]>(
      'SELECT id FROM "order" WHERE user_id = ? AND cart_id = ?',
      [userId, cartId],
    );
    return row?.id ?? null;
  }

  private async loadOrder(
    userId: number,
    id: number,
  ): Promise<OrderType | null> {
    const rows = await this.em.execute<OrderRow[]>(
      `SELECT ${ORDER_COLUMNS} FROM "order" WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    return (await this.withItems(rows))[0] ?? null;
  }

  // 주문 수와 관계없이 항목은 한 번에 조회한다.
  private async withItems(rows: OrderRow[]): Promise<OrderType[]> {
    if (rows.length === 0) return [];
    const itemRows = await this.em.execute<OrderItemRow[]>(
      `SELECT id, order_id, product_id, sku_id, product_name, sku_name, price, quantity
       FROM order_item WHERE order_id IN (${rows.map(() => '?').join(', ')})
       ORDER BY id ASC`,
      rows.map(({ id }) => id),
    );
    const items = new Map<number, OrderItemType[]>();
    for (const row of itemRows) {
      const list = items.get(row.order_id) ?? [];
      list.push({
        id: row.id,
        productId: row.product_id,
        skuId: row.sku_id,
        productName: row.product_name,
        skuName: row.sku_name,
        price: row.price,
        quantity: row.quantity,
      });
      items.set(row.order_id, list);
    }
    return rows.map((row) => ({
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      prefixOrderNumber: row.prefix_order_number,
      orderNumber: row.order_number,
      amount: row.amount,
      request: row.request,
      paidAt: new Date(row.paid_at),
      createdAt: new Date(row.created_at),
      items: items.get(row.id) ?? [],
    }));
  }
}
