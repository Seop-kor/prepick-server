import { BadRequestException } from '@nestjs/common';

export function normalizePhone(phone: string): string {
  const normalized = phone.replace(/[\s-]/g, '');
  if (!/^010\d{8}$/.test(normalized)) {
    throw new BadRequestException('Invalid phone');
  }
  return normalized;
}
