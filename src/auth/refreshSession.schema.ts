import { EntitySchema } from '@mikro-orm/core';

import { User } from '../users/user.entity';
import { RefreshSession } from './refreshSession.entity';

export const RefreshSessionSchema = new EntitySchema({
  class: RefreshSession,
  tableName: 'session',
  properties: {
    id: { type: 'uuid', primary: true },
    user: {
      kind: '1:1',
      entity: () => User,
      owner: true,
      unique: true,
      fieldName: 'user_id',
      createForeignKeyConstraint: false,
    },
    refreshToken: { type: String, length: 64 },
    expiresAt: { type: Date },
    createdAt: { type: Date, onCreate: () => new Date() },
    updatedAt: {
      type: Date,
      onCreate: () => new Date(),
      onUpdate: () => new Date(),
    },
  },
});
