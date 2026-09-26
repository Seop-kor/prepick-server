import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsService } from '../../src/products/products.service';

const row = (id: number, skuId: number, price: number, isSoldOut = false) => ({
  id,
  store_id: 1,
  name: `상품${id}`,
  description: null,
  image_url: null,
  sku_id: skuId,
  sku_name: `SKU${skuId}`,
  price,
  is_sold_out: isSoldOut,
});

describe('ProductsService', () => {
  const execute = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const service = new ProductsService({ execute } as unknown as EntityManager);

  beforeEach(() => execute.mockReset());

  it('없거나 비활성인 매장을 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.storeProducts('1')).resolves.toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toContain('is_active');
    expect(execute.mock.calls[0][1]).toEqual([1]);
  });

  it('노출할 상품이 없는 활성 매장을 조회하면 빈 목록을 반환한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.storeProducts('1')).resolves.toEqual({
      categories: [],
      products: [],
    });
  });

  it('매장 상품을 조회하면 SKU를 상품별로 묶고 최저가와 품절 여부를 계산한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        row(10, 100, 3500, true),
        row(10, 101, 4000, false),
        row(11, 110, 4500, true),
      ])
      .mockResolvedValueOnce([]);

    const result = await service.storeProducts('1');

    expect(result?.products).toEqual([
      {
        id: 10,
        storeId: 1,
        name: '상품10',
        description: null,
        imageUrl: null,
        minPrice: 3500,
        isSoldOut: false,
        skus: [
          { id: 100, name: 'SKU100', price: 3500, isSoldOut: true },
          { id: 101, name: 'SKU101', price: 4000, isSoldOut: false },
        ],
      },
      {
        id: 11,
        storeId: 1,
        name: '상품11',
        description: null,
        imageUrl: null,
        minPrice: 4500,
        isSoldOut: true,
        skus: [{ id: 110, name: 'SKU110', price: 4500, isSoldOut: true }],
      },
    ]);
    const [sql, params] = execute.mock.calls[1];
    expect(sql).toContain('JOIN store s ON s.id = p.store_id AND s.is_active');
    expect(sql).toContain('JOIN sku k ON k.product_id = p.id AND k.is_active');
    expect(sql).toContain('p.is_active');
    expect(sql).toContain('p.store_id = ?');
    expect(sql).toContain(
      'ORDER BY p.name ASC, p.id ASC, k.price ASC, k.id ASC',
    );
    expect(params).toEqual([1]);
  });

  it('카테고리를 조회하면 노출 상품만 남기고 빈 카테고리를 제외한다', async () => {
    execute
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([
        row(10, 100, 3500),
        row(11, 110, 4500),
        row(12, 120, 5000),
      ])
      .mockResolvedValueOnce([
        { id: 1, name: '인기', product_id: 10 },
        { id: 2, name: '커피', product_id: 11 },
        { id: 2, name: '커피', product_id: 10 },
        { id: 2, name: '커피', product_id: 99 },
        { id: 3, name: '디저트', product_id: 99 },
      ]);

    const result = await service.storeProducts('1');

    expect(result?.categories).toEqual([
      { id: 1, name: '인기', productIds: [10] },
      { id: 2, name: '커피', productIds: [11, 10] },
    ]);
    expect(result?.products.map(({ id }) => id)).toEqual([10, 11, 12]);
    const [sql, params] = execute.mock.calls[2];
    expect(sql).toContain('JOIN product_category pc ON pc.category_id = c.id');
    expect(sql).toContain('c.store_id = ? AND c.is_active');
    expect(sql).toContain(
      'ORDER BY c.sort_order ASC, c.id ASC, pc.sort_order ASC, pc.product_id ASC',
    );
    expect(params).toEqual([1]);
  });

  it('상품 상세를 조회하면 활성 SKU와 함께 반환한다', async () => {
    execute.mockResolvedValueOnce([
      row(10, 100, 3500),
      row(10, 101, 4000, true),
    ]);

    await expect(service.product('10')).resolves.toMatchObject({
      id: 10,
      storeId: 1,
      minPrice: 3500,
      isSoldOut: false,
      skus: [{ id: 100 }, { id: 101, isSoldOut: true }],
    });
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('JOIN store s ON s.id = p.store_id AND s.is_active');
    expect(sql).toContain('JOIN sku k ON k.product_id = p.id AND k.is_active');
    expect(sql).toContain('p.id = ?');
    expect(params).toEqual([10]);
  });

  it('노출할 수 없는 상품을 조회하면 null을 반환한다', async () => {
    execute.mockResolvedValueOnce([]);

    await expect(service.product('10')).resolves.toBeNull();
  });

  it('잘못된 ID로 조회하면 DB 조회 없이 입력 오류를 반환한다', async () => {
    await expect(service.storeProducts('abc')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.product('0')).rejects.toThrow(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });
});
