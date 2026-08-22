import { HttpService } from '@nestjs/axios';

import { SmsService } from '../../src/common/sms.service';

describe('SmsService', () => {
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
});
