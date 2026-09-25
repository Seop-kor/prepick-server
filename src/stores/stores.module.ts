import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { StoreSchema } from './store.schema';
import { ProductSchema } from './product.schema';
import { SkuSchema } from './sku.schema';
import { StoresResolver } from './stores.resolver';
import { StoresService } from './stores.service';

@Module({
  imports: [MikroOrmModule.forFeature([StoreSchema, ProductSchema, SkuSchema])],
  providers: [StoresService, StoresResolver],
  exports: [StoresService],
})
export class StoresModule {}
