import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException } from '@nestjs/common';

jest.mock('@mikro-orm/postgresql', () => ({
  EntityManager: class EntityManager {},
}));

import { Store } from '../../src/stores/store.entity';
import { StoresService } from '../../src/stores/stores.service';

const [A, B, C] = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];
const createdAt = new Date('2026-09-25T00:00:00.000Z');
const row = (id: string) => ({
  id,
  name: 'Cafe',
  category: '카페',
  address: '서울',
  latitude: 37.5,
  longitude: 127,
  image_url: null,
  is_open: true,
  is_active: true,
  created_at: createdAt,
  updated_at: createdAt,
  distance_meters: 100.4,
});

describe('StoresService', () => {
  const execute = jest.fn();
  const findOne = jest.fn();
  const service = new StoresService({
    execute,
    findOne,
  } as unknown as EntityManager);

  beforeEach(() => {
    execute.mockReset();
    findOne.mockReset();
  });

  it('같은 거리의 매장이 있으면 ID 순서로 다음 페이지를 반환한다', async () => {
    execute
      .mockResolvedValueOnce([row(A), row(B), row(C)])
      .mockResolvedValueOnce([row(C)]);

    const first = await service.nearby(37.5, 127, 5, 2, null);
    expect(first.items.map(({ id }) => id)).toEqual([A, B]);
    expect(first.items[0].distanceMeters).toBe(100);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await service.nearby(37.5, 127, 5, 2, first.nextCursor);
    expect(second.items.map(({ id }) => id)).toEqual([C]);
    expect(second.nextCursor).toBeNull();
    expect(execute.mock.calls[0][0]).toContain(
      'ORDER BY distance_meters ASC, id ASC',
    );
    expect(execute.mock.calls[1][0]).toContain('(distance_meters, id) >');
    expect(execute.mock.calls[0][1]).toEqual([37.5, 37.5, 127, 5000, 3]);
  });

  it('같은 등록일의 신규 매장이 있으면 ID로 다음 페이지를 구분한다', async () => {
    execute
      .mockResolvedValueOnce([row(C), row(B), row(A)])
      .mockResolvedValueOnce([row(A)]);

    const first = await service.newStores(2, null);
    expect(first.items.map(({ id }) => id)).toEqual([C, B]);
    expect(first.items[0].distanceMeters).toBeNull();

    const second = await service.newStores(2, first.nextCursor);
    expect(second.items.map(({ id }) => id)).toEqual([A]);
    expect(execute.mock.calls[0][0]).toContain('is_active');
    expect(execute.mock.calls[1][0]).toContain('(created_at, id) <');
  });

  it('비활성 매장을 조회하면 결과가 없다고 처리한다', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.store(A)).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith(Store, { id: A, isActive: true });
  });

  it('매장 ID가 UUID가 아니면 입력 오류를 반환한다', async () => {
    await expect(service.store('wrong')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findOne).not.toHaveBeenCalled();
  });
});
