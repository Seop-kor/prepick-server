import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { ProductSchema } from './product.schema';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { SkuSchema } from './sku.schema';

@Module({
  imports: [MikroOrmModule.forFeature([ProductSchema, SkuSchema])],
  providers: [ProductsService, ProductsResolver],
})
export class ProductsModule {}
