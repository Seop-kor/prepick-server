import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { validateId } from '../common/validation';
import { Category, ProductType, StoreProducts } from './products.types';

type ProductRow = {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  sku_id: number;
  sku_name: string;
  price: number;
  is_sold_out: boolean;
};

type CategoryRow = { id: number; name: string; product_id: number };

const PRODUCT_SQL = `SELECT p.id, p.store_id, p.name, p.description, p.image_url,
  k.id AS sku_id, k.name AS sku_name, k.price, k.is_sold_out
  FROM product p
  JOIN store s ON s.id = p.store_id AND s.is_active
  JOIN sku k ON k.product_id = p.id AND k.is_active
  WHERE p.is_active`;

// 행 순서(상품 정렬 후 SKU 정렬)를 그대로 유지하며 상품별로 묶는다.
function toProducts(rows: ProductRow[]): ProductType[] {
  const products = new Map<number, ProductType>();
  for (const row of rows) {
    let product = products.get(row.id);
    if (!product) {
      product = {
        id: row.id,
        storeId: row.store_id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        minPrice: row.price,
        isSoldOut: true,
        skus: [],
      };
      products.set(row.id, product);
    }
    product.skus.push({
      id: row.sku_id,
      name: row.sku_name,
      price: row.price,
      isSoldOut: row.is_sold_out,
    });
    product.minPrice = Math.min(product.minPrice, row.price);
    product.isSoldOut &&= row.is_sold_out;
  }
  return [...products.values()];
}

@Injectable()
export class ProductsService {
  constructor(private readonly em: EntityManager) {}

  async storeProducts(storeId: string): Promise<StoreProducts | null> {
    const id = validateId(storeId);
    const stores = await this.em.execute<{ id: number }[]>(
      'SELECT id FROM store WHERE id = ? AND is_active',
      [id],
    );
    if (stores.length === 0) return null;

    const products = toProducts(
      await this.em.execute<ProductRow[]>(
        `${PRODUCT_SQL} AND p.store_id = ?
        ORDER BY p.name ASC, p.id ASC, k.price ASC, k.id ASC`,
        [id],
      ),
    );
    const visible = new Set(products.map(({ id }) => id));
    const rows = await this.em.execute<CategoryRow[]>(
      `SELECT c.id, c.name, pc.product_id
       FROM category c
       JOIN product_category pc ON pc.category_id = c.id
       WHERE c.store_id = ? AND c.is_active
       ORDER BY c.sort_order ASC, c.id ASC, pc.sort_order ASC, pc.product_id ASC`,
      [id],
    );
    const categories = new Map<number, Category>();
    for (const row of rows) {
      if (!visible.has(row.product_id)) continue;
      let category = categories.get(row.id);
      if (!category) {
        category = { id: row.id, name: row.name, productIds: [] };
        categories.set(row.id, category);
      }
      category.productIds.push(row.product_id);
    }
    return { categories: [...categories.values()], products };
  }

  async product(id: string): Promise<ProductType | null> {
    const rows = await this.em.execute<ProductRow[]>(
      `${PRODUCT_SQL} AND p.id = ? ORDER BY k.price ASC, k.id ASC`,
      [validateId(id)],
    );
    return toProducts(rows)[0] ?? null;
  }
}
