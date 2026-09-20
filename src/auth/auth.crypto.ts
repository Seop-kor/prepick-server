import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const hmacSha256 = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('hex');

export const randomToken = (): string => randomBytes(32).toString('base64url');

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
