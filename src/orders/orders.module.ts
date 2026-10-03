import { Module } from '@nestjs/common';

import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

// 엔티티 없이 raw SQL만 쓰므로 forFeature가 필요 없다. EntityManager는 MikroOrmModule이 전역으로 제공한다.
@Module({
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}
