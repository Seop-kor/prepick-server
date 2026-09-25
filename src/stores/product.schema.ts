import { EntitySchema } from '@mikro-orm/core';

import { Product } from './product.entity';

export const ProductSchema = new EntitySchema({
  class: Product,
  tableName: 'product',
  properties: {
    id: { type: 'uuid', primary: true },
    storeId: { type: 'uuid', fieldName: 'store_id' },
    name: { type: String, length: 100 },
    isActive: { type: Boolean, default: true },
  },
});
