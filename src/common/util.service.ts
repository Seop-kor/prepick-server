import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class UtilService {
  getOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
