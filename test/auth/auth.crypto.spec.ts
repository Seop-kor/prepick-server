import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

jest.mock('node:crypto', () => ({
  ...jest.requireActual<typeof import('node:crypto')>('node:crypto'),
  randomBytes: jest.fn(),
}));

import {
  hmacSha256,
  randomToken,
  safeEqual,
  sha256,
} from '../../src/auth/auth.crypto';

// randomBytes는 오버로드가 있어 jest.mocked가 콜백형(void 반환) 시그니처를 고르므로 동기 시그니처로 좁힌다.
const mockedRandomBytes = jest.mocked(randomBytes as (size: number) => Buffer);

describe('auth crypto', () => {
  beforeEach(() => {
    mockedRandomBytes.mockReset();
    mockedRandomBytes.mockReturnValue(Buffer.alloc(32, 1));
  });

  it('문자열을 SHA-256으로 해시하면 64자리 16진수를 반환한다', () => {
    expect(sha256('secret')).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash).toBeDefined();
  });

  it('OTP를 HMAC-SHA256으로 해시하면 64자리 16진수를 반환한다', () => {
    expect(hmacSha256('123456', 'pepper')).toMatch(/^[a-f0-9]{64}$/);
    expect(createHmac).toBeDefined();
  });

  it('검증 토큰을 생성하면 43자리 base64url 문자열을 반환한다', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('동일한 해시를 비교하면 true를 반환한다', () => {
    expect(safeEqual(sha256('a'), sha256('a'))).toBe(true);
    expect(timingSafeEqual).toBeDefined();
  });

  it('다른 해시를 비교하면 false를 반환한다', () => {
    expect(safeEqual(sha256('a'), sha256('b'))).toBe(false);
  });
});
