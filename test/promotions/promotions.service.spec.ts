import type { EntityManager } from '@mikro-orm/postgresql';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { Promotion } from '../../src/promotions/promotion.entity';
import { PromotionsService } from '../../src/promotions/promotions.service';

describe('PromotionsService', () => {
  it('프로모션을 조회하면 활성 배너만 표시 순서대로 반환한다', async () => {
    const banner = new Promotion();
    const find = jest.fn().mockResolvedValue([banner]);
    const service = new PromotionsService({ find } as unknown as EntityManager);
    await expect(service.list()).resolves.toEqual([banner]);
    expect(find).toHaveBeenCalledWith(
      Promotion,
      { isActive: true },
      { orderBy: { sortOrder: 'ASC', id: 'ASC' } },
    );
  });
});
