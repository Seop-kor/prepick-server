import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { StoreSchema } from './store.schema';
import { StoresResolver } from './stores.resolver';
import { StoresService } from './stores.service';

@Module({
  imports: [MikroOrmModule.forFeature([StoreSchema])],
  providers: [StoresService, StoresResolver],
  exports: [StoresService],
})
export class StoresModule {}
