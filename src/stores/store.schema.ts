import { EntitySchema } from '@mikro-orm/core';

import { Store } from './store.entity';

export const StoreSchema = new EntitySchema({
  class: Store,
  tableName: 'store',
  properties: {
    id: { type: 'int', primary: true, autoincrement: true },
    name: { type: String, length: 100 },
    category: { type: String, length: 50 },
    address: { type: 'text' },
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
    imageUrl: { type: 'text', nullable: true },
    isOpen: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    distanceMeters: { type: Number, nullable: true, persist: false },
    createdAt: { type: Date, onCreate: () => new Date() },
    updatedAt: {
      type: Date,
      onCreate: () => new Date(),
      onUpdate: () => new Date(),
    },
  },
});
