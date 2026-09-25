import { StoresResolver } from '../../src/stores/stores.resolver';
import { BadRequestException } from '@nestjs/common';
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

  it('검색 좌표를 하나만 제공하면 입력 오류를 반환한다', () => {
    const resolver = new StoresResolver({} as StoresService);
    expect(() => resolver.search('커피', 37.5)).toThrow(BadRequestException);
  });

  it('검색 결과의 매장과 상품을 각각 독립적인 페이지로 조회한다', async () => {
    const service = {
      searchStores: jest
        .fn()
        .mockResolvedValue({ items: [], nextCursor: null }),
      searchMenus: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
    } as unknown as StoresService;
    const resolver = new StoresResolver(service);
    const parent = resolver.search(' 커피 ', 37.5, 127);
    await resolver.searchStores(parent, 2, 'store-cursor');
    await resolver.searchMenus(parent, 3, 'menu-cursor');
    expect(service.searchStores).toHaveBeenCalledWith(
      '커피',
      { latitude: 37.5, longitude: 127 },
      2,
      'store-cursor',
    );
    expect(service.searchMenus).toHaveBeenCalledWith(
      '커피',
      { latitude: 37.5, longitude: 127 },
      3,
      'menu-cursor',
    );
  });
});
