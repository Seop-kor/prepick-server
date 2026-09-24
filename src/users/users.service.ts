import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  findByPhone(phone: string, em = this.em): Promise<User | null> {
    return em.findOne(User, { phone });
  }

  findById(id: string, em = this.em): Promise<User | null> {
    return em.findOne(User, { id });
  }

  async existsByPhone(phone: string, em = this.em): Promise<boolean> {
    return (await em.count(User, { phone })) > 0;
  }

  create(input: Pick<User, 'name' | 'phone' | 'password'>, em = this.em): User {
    const user = em.create(User, input);
    em.persist(user);
    return user;
  }
}
