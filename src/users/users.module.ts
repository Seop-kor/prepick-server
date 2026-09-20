import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { UserSchema } from './user.schema';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [MikroOrmModule.forFeature([UserSchema])],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
