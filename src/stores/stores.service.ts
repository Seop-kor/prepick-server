import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateFirst,
  validateId,
  validateLocation,
  validateRadius,
} from './discovery.pagination';
import { StorePage } from './discovery.types';
import { Store } from './store.entity';

export type StoreRow = {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  is_open: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  distance_meters?: number | null;
};

export function storeFromRow(row: StoreRow, includeDistance = false): Store {
  return Object.assign(new Store(), {
    id: row.id,
    name: row.name,
    category: row.category,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_url,
    isOpen: row.is_open,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    distanceMeters:
      includeDistance && row.distance_meters != null
        ? Math.round(row.distance_meters)
        : null,
  });
}

@Injectable()
export class StoresService {
  constructor(private readonly em: EntityManager) {}

  async nearby(
    latitude: number,
    longitude: number,
    radiusKm = 5,
    first = 20,
    after?: string | null,
  ): Promise<StorePage> {
    validateLocation(latitude, longitude, true);
    validateRadius(radiusKm);
    validateFirst(first);
    const scope = JSON.stringify([latitude, longitude, radiusKm]);
    const cursor = decodeCursor('nearby', scope, after);
    const rows = (await this.em.execute(
      `WITH ranked AS (
        SELECT s.*, 2 * 6371000 * asin(sqrt(least(1,
          power(sin(radians(s.latitude - ?) / 2), 2) +
          cos(radians(?)) * cos(radians(s.latitude)) *
          power(sin(radians(s.longitude - ?) / 2), 2)
        ))) AS distance_meters
        FROM store s WHERE s.is_active
      )
      SELECT * FROM ranked WHERE distance_meters <= ?
      ${cursor ? 'AND (distance_meters, id) > (?, ?::uuid)' : ''}
      ORDER BY distance_meters ASC, id ASC LIMIT ?`,
      [
        latitude,
        latitude,
        longitude,
        radiusKm * 1000,
        ...(cursor ? [cursor.key, cursor.id] : []),
        first + 1,
      ],
    )) as StoreRow[];
    const page = slicePage(rows, first, (row) =>
      encodeCursor('nearby', scope, row.distance_meters!, row.id),
    );
    return {
      items: page.items.map((row) => storeFromRow(row, true)),
      nextCursor: page.nextCursor,
    };
  }

  async newStores(first = 20, after?: string | null): Promise<StorePage> {
    validateFirst(first);
    const cursor = decodeCursor('new', '', after);
    const rows = (await this.em.execute(
      `SELECT * FROM store WHERE is_active
      ${cursor ? 'AND (created_at, id) < (?::timestamptz, ?::uuid)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
      [...(cursor ? [cursor.key, cursor.id] : []), first + 1],
    )) as StoreRow[];
    const page = slicePage(rows, first, (row) =>
      encodeCursor('new', '', new Date(row.created_at).toISOString(), row.id),
    );
    return { items: page.items.map(storeFromRow), nextCursor: page.nextCursor };
  }

  async store(id: string): Promise<Store | null> {
    validateId(id);
    return this.em.findOne(Store, { id, isActive: true });
  }
}
