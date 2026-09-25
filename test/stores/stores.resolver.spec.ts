import { StoresResolver } from '../../src/stores/stores.resolver';
import type { StoresService } from '../../src/stores/stores.service';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

describe('StoresResolver', () => {
  it('주변 매장 조회를 요청하면 서비스 결과를 반환한다', async () => {
    const page = { items: [], nextCursor: null };
    const service = {
      nearby: jest.fn().mockResolvedValue(page),
    } as unknown as StoresService;
    const resolver = new StoresResolver(service);

    await expect(resolver.stores(37.5, 127, 5, 20, null)).resolves.toBe(page);
    expect(service.nearby).toHaveBeenCalledWith(37.5, 127, 5, 20, null);
  });
});
