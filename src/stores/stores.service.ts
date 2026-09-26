import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { validateId } from '../common/validation';
import {
  decodeCursor,
  encodeCursor,
  escapeLike,
  slicePage,
  validateFirst,
  validateLocation,
  validateKeyword,
  validateRadius,
} from './stores.util';
import { MenuSearchPage, StorePage } from './stores.types';
import { Store } from './store.entity';

export type StoreRow = {
  id: number;
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
  cursor_created_at?: string;
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

export type Location = { latitude: number; longitude: number };

function distanceSql(alias: string): string {
  return `2 * 6371000 * asin(sqrt(least(1,
    power(sin(radians(${alias}.latitude - ?) / 2), 2) +
    cos(radians(?)) * cos(radians(${alias}.latitude)) *
    power(sin(radians(${alias}.longitude - ?) / 2), 2)
  )))`;
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
    const rows = await this.em.execute<StoreRow[]>(
      `WITH ranked AS (
        SELECT s.*, 2 * 6371000 * asin(sqrt(least(1,
          power(sin(radians(s.latitude - ?) / 2), 2) +
          cos(radians(?)) * cos(radians(s.latitude)) *
          power(sin(radians(s.longitude - ?) / 2), 2)
        ))) AS distance_meters
        FROM store s WHERE s.is_active
      )
      SELECT * FROM ranked WHERE distance_meters <= ?
      ${cursor ? 'AND (distance_meters, id) > (?, ?::integer)' : ''}
      ORDER BY distance_meters ASC, id ASC LIMIT ?`,
      [
        latitude,
        latitude,
        longitude,
        radiusKm * 1000,
        ...(cursor ? [cursor.key, cursor.id] : []),
        first + 1,
      ],
    );
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
    const rows = await this.em.execute<StoreRow[]>(
      `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at
       FROM store WHERE is_active
      ${cursor ? 'AND (created_at, id) < (?::timestamptz, ?::integer)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
      [...(cursor ? [cursor.key, cursor.id] : []), first + 1],
    );
    const page = slicePage(rows, first, (row) =>
      encodeCursor(
        'new',
        '',
        row.cursor_created_at ?? new Date(row.created_at).toISOString(),
        row.id,
      ),
    );
    return {
      items: page.items.map((row) => storeFromRow(row)),
      nextCursor: page.nextCursor,
    };
  }

  async store(id: string): Promise<Store | null> {
    return this.em.findOne(Store, { id: validateId(id), isActive: true });
  }

  async searchStores(
    keyword: string,
    location: Location | null,
    first = 20,
    after?: string | null,
  ): Promise<StorePage> {
    keyword = validateKeyword(keyword);
    validateFirst(first);
    if (location) validateLocation(location.latitude, location.longitude, true);
    const scope = JSON.stringify([keyword, location]);
    const cursor = decodeCursor('store-search', scope, after);
    const rows = await this.em.execute<StoreRow[]>(
      `SELECT store.*${location ? `, ${distanceSql('store')} AS distance_meters` : ''}
       FROM store WHERE is_active AND name ILIKE ? ESCAPE '#'
       ${cursor ? 'AND (name, id) > (?, ?::integer)' : ''}
       ORDER BY name ASC, id ASC LIMIT ?`,
      [
        ...(location
          ? [location.latitude, location.latitude, location.longitude]
          : []),
        `%${escapeLike(keyword)}%`,
        ...(cursor ? [cursor.key, cursor.id] : []),
        first + 1,
      ],
    );
    const page = slicePage(rows, first, (row) =>
      encodeCursor('store-search', scope, row.name, row.id),
    );
    return {
      items: page.items.map((row) => storeFromRow(row, location !== null)),
      nextCursor: page.nextCursor,
    };
  }

  async searchMenus(
    keyword: string,
    location: Location | null,
    first = 20,
    after?: string | null,
  ): Promise<MenuSearchPage> {
    keyword = validateKeyword(keyword);
    validateFirst(first);
    if (location) validateLocation(location.latitude, location.longitude, true);
    const scope = JSON.stringify([keyword, location]);
    const cursor = decodeCursor('menu-search', scope, after);
    type MenuRow = StoreRow & {
      product_id: number;
      product_name: string;
      store_id: number;
      store_name: string;
      min_price: number;
    };
    const rows = await this.em.execute<MenuRow[]>(
      `SELECT p.id AS product_id, p.name AS product_name,
        s.id AS store_id, s.name AS store_name, s.category, s.address,
        s.latitude, s.longitude, s.image_url, s.is_open, s.is_active,
        s.created_at, s.updated_at, min(k.price)::int AS min_price
        ${location ? `, ${distanceSql('s')} AS distance_meters` : ''}
       FROM product p
       JOIN store s ON s.id = p.store_id AND s.is_active
       JOIN sku k ON k.product_id = p.id AND k.is_active
       WHERE p.is_active AND p.name ILIKE ? ESCAPE '#'
       ${cursor ? 'AND (p.name, p.id) > (?, ?::integer)' : ''}
       GROUP BY p.id, s.id
       ORDER BY p.name ASC, p.id ASC LIMIT ?`,
      [
        ...(location
          ? [location.latitude, location.latitude, location.longitude]
          : []),
        `%${escapeLike(keyword)}%`,
        ...(cursor ? [cursor.key, cursor.id] : []),
        first + 1,
      ],
    );
    const page = slicePage(rows, first, (row) =>
      encodeCursor('menu-search', scope, row.product_name, row.product_id),
    );
    return {
      items: page.items.map((row) => ({
        id: row.product_id,
        name: row.product_name,
        minPrice: row.min_price,
        store: storeFromRow(
          { ...row, id: row.store_id, name: row.store_name },
          location !== null,
        ),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
