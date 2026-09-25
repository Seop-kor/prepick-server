import { EntitySchema } from '@mikro-orm/core';

import { Promotion } from './promotion.entity';

export const PromotionSchema = new EntitySchema({
  class: Promotion,
  tableName: 'promotion',
  properties: {
    id: { type: 'uuid', primary: true },
    title: { type: String, length: 100 },
    description: { type: 'text' },
    imageUrl: { type: 'text', nullable: true },
    sortOrder: { type: 'int', default: 0 },
    isActive: { type: Boolean, default: true },
  },
});
