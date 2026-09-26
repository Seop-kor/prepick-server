import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { ProductSchema } from './product.schema';
import { SkuSchema } from './sku.schema';

@Module({
  imports: [MikroOrmModule.forFeature([ProductSchema, SkuSchema])],
})
export class ProductsModule {}
