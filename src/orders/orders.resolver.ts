import {
  Args,
  Context,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';

import type { AuthenticatedRequest } from '../auth/auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderInput, OrderPage, OrderType } from './orders.types';

@Resolver()
export class OrdersResolver {
  constructor(private readonly service: OrdersService) {}

  @Mutation(() => OrderType)
  createOrder(
    @Args('input') input: CreateOrderInput,
    @Context('req') req: AuthenticatedRequest,
  ) {
    return this.service.createOrder(req.userId, input);
  }

  @Query(() => OrderPage)
  orders(
    @Context('req') req: AuthenticatedRequest,
    @Args('size', { type: () => Int, nullable: true, defaultValue: 20 })
    size: number,
    @Args('cursor', { type: () => String, nullable: true })
    cursor?: string | null,
  ) {
    return this.service.findOrders(req.userId, size, cursor);
  }

  @Query(() => OrderType, { nullable: true })
  order(
    @Args('id', { type: () => ID }) id: string,
    @Context('req') req: AuthenticatedRequest,
  ) {
    return this.service.findOrder(req.userId, id);
  }
}
