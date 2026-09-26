import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { Promotion } from './promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(private readonly em: EntityManager) {}

  list(): Promise<Promotion[]> {
    return this.em.find(
      Promotion,
      { isActive: true },
      {
        orderBy: { sortOrder: 'ASC', id: 'ASC' },
      },
    );
  }
}
