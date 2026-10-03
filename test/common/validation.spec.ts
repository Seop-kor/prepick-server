import { BadRequestException } from '@nestjs/common';

import { isValidId, validateId } from '../../src/common/validation';

describe('ID 검증', () => {
  it('양의 32비트 정수 문자열을 입력하면 숫자로 반환한다', () => {
    expect(validateId('1')).toBe(1);
    expect(validateId('2147483647')).toBe(2147483647);
  });

  it('정수 형식이 아니거나 범위를 벗어나면 입력 오류를 반환한다', () => {
    for (const id of ['not-an-integer', '0', '01', '-1', '1.5', '2147483648']) {
      expect(() => validateId(id)).toThrow(BadRequestException);
    }
  });

  it('숫자 ID가 32비트 양의 정수이면 유효하다고 판단한다', () => {
    expect(isValidId(1)).toBe(true);
    expect(isValidId(0)).toBe(false);
    expect(isValidId(1.5)).toBe(false);
    expect(isValidId(2147483648)).toBe(false);
  });
});
