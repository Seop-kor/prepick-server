import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly httpService: HttpService) {}

  async send(phone: string, message: string): Promise<boolean> {
    try {
      const res = await this.httpService.axiosRef.post(
        `${process.env.ALIGO_API_URL}/send/`,
        {
          key: process.env.ALIGO_API_KEY,
          user_id: process.env.ALIGO_API_USER_ID,
          sender: process.env.ALIGO_API_SENDER,
          receiver: phone,
          msg: message,
          testmode_yn: 'Y',
        },
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      if (res.status !== 200) {
        throw new Error(res.statusText);
      }

      return true;
    } catch (error) {
      this.logger.error({
        event: 'sms.send.failed',
        receiver:
          phone.length > 7
            ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
            : '[REDACTED]',
        error: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    return await this.send(
      phone,
      `[프리픽] 본인확인 인증번호[${otp}]를 입력해 주세요.`,
    );
  }
}
