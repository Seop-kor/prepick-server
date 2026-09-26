import { EntitySchema } from '@mikro-orm/core';

import { User } from './user.entity';

export const UserSchema = new EntitySchema({
  class: User,
  tableName: 'user',
  properties: {
    id: { type: 'int', primary: true, autoincrement: true },
    name: { type: String, length: 50 },
    phone: { type: String, length: 11, unique: true },
    password: { type: String, hidden: true },
    createdAt: { type: Date, onCreate: () => new Date() },
    updatedAt: {
      type: Date,
      onCreate: () => new Date(),
      onUpdate: () => new Date(),
    },
  },
});
