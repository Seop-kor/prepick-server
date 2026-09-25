import { EntitySchema } from '@mikro-orm/core';

import { Sku } from './sku.entity';

export const SkuSchema = new EntitySchema({
  class: Sku,
  tableName: 'sku',
  properties: {
    id: { type: 'uuid', primary: true },
    productId: { type: 'uuid', fieldName: 'product_id' },
    name: { type: String, length: 100 },
    price: { type: 'int' },
    isActive: { type: Boolean, default: true },
  },
});
