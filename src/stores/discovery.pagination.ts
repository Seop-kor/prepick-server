import { BadRequestException } from '@nestjs/common';

export type CursorKind = 'nearby' | 'new' | 'store-search' | 'menu-search';

const MAX_ID = 2147483647;

function validId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= MAX_ID;
}

export function validateLocation(
  latitude?: number | null,
  longitude?: number | null,
  required = false,
): { latitude: number; longitude: number } | null {
  if (latitude == null && longitude == null && !required) return null;
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new BadRequestException('Invalid location');
  }
  return { latitude, longitude };
}

export function validateRadius(radiusKm = 5): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
    throw new BadRequestException(
      'radiusKm must be greater than 0 and at most 50',
    );
  }
  return radiusKm;
}

export function validateFirst(first = 20): number {
  if (!Number.isInteger(first) || first < 1 || first > 50) {
    throw new BadRequestException('first must be 1-50');
  }
  return first;
}

export function validateId(id: string): number {
  if (!/^[1-9]\d*$/.test(id) || !validId(Number(id))) {
    throw new BadRequestException('Invalid id');
  }
  return Number(id);
}

export function validateKeyword(keyword: string): string {
  const normalized = keyword.trim();
  if (normalized.length < 1 || normalized.length > 100) {
    throw new BadRequestException('Invalid keyword');
  }
  return normalized;
}

export function escapeLike(keyword: string): string {
  return keyword.replace(/([#%_])/g, '#$1');
}

export function encodeCursor(
  kind: CursorKind,
  scope: string,
  key: string | number,
  id: number,
): string {
  return Buffer.from(JSON.stringify([kind, scope, key, id])).toString(
    'base64url',
  );
}

export function decodeCursor(
  kind: CursorKind,
  scope: string,
  cursor?: string | null,
): { key: string | number; id: number } | null {
  if (cursor == null) return null;
  try {
    if (cursor.length > 2048) throw new Error();
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    if (Buffer.from(raw).toString('base64url') !== cursor) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      value[0] !== kind ||
      value[1] !== scope ||
      typeof value[3] !== 'number' ||
      !validId(value[3]) ||
      (kind === 'nearby'
        ? typeof value[2] !== 'number' || !Number.isFinite(value[2])
        : typeof value[2] !== 'string')
    ) {
      throw new Error();
    }
    if (kind === 'new') {
      const date = value[2] as string;
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/.test(date) ||
        new Date(date).toISOString().slice(0, 23) !== date.slice(0, 23)
      ) {
        throw new Error();
      }
    }
    return { key: value[2] as string | number, id: value[3] };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export function slicePage<T>(
  rows: T[],
  first: number,
  makeCursor: (row: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, first);
  return {
    items,
    nextCursor:
      rows.length > first ? makeCursor(items[items.length - 1]) : null,
  };
}
