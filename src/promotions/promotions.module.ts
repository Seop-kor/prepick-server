import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { PromotionSchema } from './promotion.schema';
import { PromotionsResolver } from './promotions.resolver';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [MikroOrmModule.forFeature([PromotionSchema])],
  providers: [PromotionsService, PromotionsResolver],
})
export class PromotionsModule {}
