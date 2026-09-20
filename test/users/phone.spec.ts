import { normalizePhone } from '../../src/users/phone';

describe('normalizePhone', () => {
  it('하이픈이 있는 한국 휴대폰 번호를 입력하면 숫자만 반환한다', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
  });

  it('공백이 있는 한국 휴대폰 번호를 입력하면 숫자만 반환한다', () => {
    expect(normalizePhone(' 010 1234 5678 ')).toBe('01012345678');
  });

  it('010으로 시작하지 않는 번호를 입력하면 거부한다', () => {
    expect(() => normalizePhone('0111234567')).toThrow('Invalid phone');
  });

  it('숫자가 아닌 문자를 입력하면 거부한다', () => {
    expect(() => normalizePhone('010-1234-abcd')).toThrow('Invalid phone');
  });
});
