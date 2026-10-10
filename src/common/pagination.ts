import { BadRequestException } from '@nestjs/common';

import { isValidId } from './validation';

export type CursorKind =
  'nearby' | 'new' | 'store-search' | 'menu-search' | 'orders';

export function validateSize(size = 20): number {
  if (!Number.isInteger(size) || size < 1 || size > 50) {
    throw new BadRequestException('size must be 1-50');
  }
  return size;
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
    if (!Array.isArray(value) || value.length !== 4) throw new Error();
    const [cursorKind, cursorScope, key, id] = value as unknown[];
    if (
      cursorKind !== kind ||
      cursorScope !== scope ||
      typeof id !== 'number' ||
      !isValidId(id) ||
      (kind === 'nearby'
        ? typeof key !== 'number' || !Number.isFinite(key)
        : typeof key !== 'string')
    ) {
      throw new Error();
    }
    if (kind === 'new' || kind === 'orders') {
      const date = key as string;
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/.test(date) ||
        new Date(date).toISOString().slice(0, 23) !== date.slice(0, 23)
      ) {
        throw new Error();
      }
    }
    return { key: key as string | number, id };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

export function slicePage<T>(
  rows: T[],
  size: number,
  makeCursor: (row: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, size);
  return {
    items,
    nextCursor: rows.length > size ? makeCursor(items[items.length - 1]) : null,
  };
}
