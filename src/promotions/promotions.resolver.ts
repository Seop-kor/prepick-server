import { Query, Resolver } from '@nestjs/graphql';

import { Promotion } from './promotion.entity';
import { PromotionsService } from './promotions.service';

@Resolver(() => Promotion)
export class PromotionsResolver {
  constructor(private readonly service: PromotionsService) {}

  @Query(() => [Promotion])
  promotions() {
    return this.service.list();
  }
}
