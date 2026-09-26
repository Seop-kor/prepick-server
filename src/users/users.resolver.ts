import type { Request } from 'express';

import { UnauthorizedException } from '@nestjs/common';
import { Context, Query, Resolver } from '@nestjs/graphql';

import { User } from './user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  async currentUser(
    @Context('req') request: Request & { userId: number },
  ): Promise<User> {
    const user = await this.usersService.findById(request.userId);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
