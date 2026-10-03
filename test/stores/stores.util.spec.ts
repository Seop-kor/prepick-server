import { BadRequestException } from '@nestjs/common';

import {
  escapeLike,
  validateKeyword,
  validateLocation,
  validateRadius,
} from '../../src/stores/stores.util';

describe('매장 탐색 입력', () => {
  it('좌표가 없으면 검색을 허용하고 주변 조회에서는 거부한다', () => {
    expect(validateLocation(undefined, undefined, false)).toBeNull();
    expect(() => validateLocation(undefined, undefined, true)).toThrow(
      BadRequestException,
    );
  });

  it('좌표 하나만 있거나 범위를 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateLocation(37.5, undefined, false)).toThrow(
      BadRequestException,
    );
    expect(() => validateLocation(91, 127, true)).toThrow(BadRequestException);
    expect(() => validateLocation(37.5, Infinity, true)).toThrow(
      BadRequestException,
    );
  });

  it('반경이 허용 범위를 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateRadius(51)).toThrow(BadRequestException);
    expect(() => validateRadius(0)).toThrow(BadRequestException);
  });

  it('검색어를 정리하면 와일드카드를 문자 그대로 찾도록 만든다', () => {
    expect(validateKeyword(' 50%_# ')).toBe('50%_#');
    expect(escapeLike('50%_#')).toBe('50#%#_##');
    expect(() => validateKeyword('   ')).toThrow(BadRequestException);
  });
});
