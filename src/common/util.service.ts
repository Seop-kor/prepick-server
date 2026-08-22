import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilService {
  getOtp(): string {
    const otpNumber = Math.floor(Math.random() * 900000) + 100000;

    return otpNumber.toString();
  }
}
