import { randomInt } from 'node:crypto';

import { UtilService } from '../../src/common/util.service';

jest.mock('node:crypto', () => ({
  randomInt: jest.fn(() => 654321),
}));

describe('UtilService', () => {
  it('generates a six-digit OTP with the cryptographic RNG', () => {
    expect(new UtilService().getOtp()).toBe('654321');
    expect(randomInt).toHaveBeenCalledWith(100000, 1000000);
  });
});
