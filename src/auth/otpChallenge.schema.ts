import { EntitySchema } from '@mikro-orm/core';

import { OtpChallenge } from './otpChallenge.entity';

export const OtpChallengeSchema = new EntitySchema({
  class: OtpChallenge,
  tableName: 'otp_challenge',
  properties: {
    id: { type: 'uuid', primary: true },
    phone: { type: String, length: 11 },
    otp: { type: String, length: 64 },
    expiresAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    verificationToken: {
      type: String,
      length: 64,
      nullable: true,
      unique: true,
    },
    verificationExpiresAt: { type: Date, nullable: true },
    verifiedAt: { type: Date, nullable: true },
    consumedAt: { type: Date, nullable: true },
    invalidatedAt: { type: Date, nullable: true },
    createdAt: { type: Date, onCreate: () => new Date() },
  },
});
