jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { ProductsResolver } from '../../src/products/products.resolver';
import type { ProductsService } from '../../src/products/products.service';

describe('ProductsResolver', () => {
  it('매장 상품을 요청하면 서비스 결과를 반환한다', async () => {
    const result = { categories: [], products: [] };
    const storeProducts = jest.fn().mockResolvedValue(result);
    const resolver = new ProductsResolver({
      storeProducts,
    } as unknown as ProductsService);

    await expect(resolver.storeProducts('1')).resolves.toBe(result);
    expect(storeProducts).toHaveBeenCalledWith('1');
  });

  it('상품 상세를 요청하면 서비스 결과를 반환한다', async () => {
    const product = jest.fn().mockResolvedValue(null);
    const resolver = new ProductsResolver({
      product,
    } as unknown as ProductsService);

    await expect(resolver.product('10')).resolves.toBeNull();
    expect(product).toHaveBeenCalledWith('10');
  });
});
