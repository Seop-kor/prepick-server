import { randomUUID } from 'node:crypto';

import type { OptionalProps } from '@mikro-orm/core';

import { User } from '../users/user.entity';

export class RefreshSession {
  declare [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt';

  id: string = randomUUID();
  user!: User;
  refreshToken!: string;
  expiresAt!: Date;
  createdAt = new Date();
  updatedAt = new Date();
}
