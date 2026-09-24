import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class UtilService {
  normalizePhone(phone: string): string {
    const normalized = phone.replace(/[\s-]/g, '');
    if (!/^010\d{8}$/.test(normalized)) {
      throw new BadRequestException('Invalid phone');
    }
    return normalized;
  }

  getOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
