import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

import { SmsService } from '../../src/common/sms.service';

describe('SmsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends prepick branded OTP message', async () => {
    const post = jest.fn().mockResolvedValue({ status: 200 });
    const smsService = new SmsService({
      axiosRef: { post },
    } as unknown as HttpService);

    await smsService.sendOtp('01012345678', '123456');

    expect(post).toHaveBeenCalledWith(
      `${process.env.ALIGO_API_URL}/send/`,
      expect.objectContaining({
        receiver: '01012345678',
        msg: '[프리픽] 본인확인 인증번호[123456]를 입력해 주세요.',
      }),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  });

  it('logs a masked receiver without sensitive values when sending fails', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const post = jest.fn().mockRejectedValue(new Error('provider-secret'));
    const smsService = new SmsService({
      axiosRef: { post },
    } as unknown as HttpService);

    await expect(smsService.sendOtp('01012345678', '123456')).rejects.toThrow(
      'provider-secret',
    );

    expect(errorLog).toHaveBeenCalledWith({
      event: 'sms.send.failed',
      receiver: '010****5678',
      error: 'Error',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('01012345678');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('123456');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'provider-secret',
    );
  });

  it('redacts seven-character receivers when sending fails', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const post = jest.fn().mockRejectedValue(new Error('provider-secret'));
    const smsService = new SmsService({
      axiosRef: { post },
    } as unknown as HttpService);

    await expect(smsService.send('1234567', 'message')).rejects.toThrow(
      'provider-secret',
    );

    expect(errorLog).toHaveBeenCalledWith({
      event: 'sms.send.failed',
      receiver: '[REDACTED]',
      error: 'Error',
    });
  });
});
