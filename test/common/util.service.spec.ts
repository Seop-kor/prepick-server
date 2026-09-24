import { randomInt } from 'node:crypto';

import { UtilService } from '../../src/common/util.service';

jest.mock('node:crypto', () => ({
  randomInt: jest.fn(() => 654321),
}));

describe('UtilService', () => {
  const service = new UtilService();

  it('하이픈이 있는 한국 휴대폰 번호를 입력하면 숫자만 반환한다', () => {
    expect(service.normalizePhone('010-1234-5678')).toBe('01012345678');
  });

  it('공백이 있는 한국 휴대폰 번호를 입력하면 숫자만 반환한다', () => {
    expect(service.normalizePhone(' 010 1234 5678 ')).toBe('01012345678');
  });

  it('010으로 시작하지 않는 번호를 입력하면 거부한다', () => {
    expect(() => service.normalizePhone('0111234567')).toThrow('Invalid phone');
  });

  it('숫자가 아닌 문자를 입력하면 거부한다', () => {
    expect(() => service.normalizePhone('010-1234-abcd')).toThrow(
      'Invalid phone',
    );
  });

  it('generates a six-digit OTP with the cryptographic RNG', () => {
    expect(new UtilService().getOtp()).toBe('654321');
    expect(randomInt).toHaveBeenCalledWith(100000, 1000000);
  });
});
