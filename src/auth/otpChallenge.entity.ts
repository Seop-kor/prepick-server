import { randomUUID } from 'node:crypto';

import type { OptionalProps } from '@mikro-orm/core';

export class OtpChallenge {
  declare [OptionalProps]?: 'id' | 'attemptCount' | 'createdAt';

  id: string = randomUUID();
  phone!: string;
  otp!: string;
  expiresAt!: Date;
  attemptCount = 0;
  verificationToken: string | null = null;
  verificationExpiresAt: Date | null = null;
  verifiedAt: Date | null = null;
  consumedAt: Date | null = null;
  invalidatedAt: Date | null = null;
  createdAt = new Date();
}
