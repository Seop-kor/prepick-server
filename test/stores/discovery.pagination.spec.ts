import { BadRequestException } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  escapeLike,
  slicePage,
  validateFirst,
  validateId,
  validateKeyword,
  validateLocation,
  validateRadius,
} from '../../src/stores/discovery.pagination';

const ID = '00000000-0000-4000-8000-000000000001';

describe('매장 탐색 입력과 커서', () => {
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

  it('반경과 페이지 크기가 허용 범위를 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateRadius(51)).toThrow(BadRequestException);
    expect(() => validateRadius(0)).toThrow(BadRequestException);
    expect(() => validateFirst(0)).toThrow(BadRequestException);
    expect(() => validateFirst(51)).toThrow(BadRequestException);
    expect(() => validateId('not-a-uuid')).toThrow(BadRequestException);
  });

  it('검색어를 정리하면 와일드카드를 문자 그대로 찾도록 만든다', () => {
    expect(validateKeyword(' 50%_# ')).toBe('50%_#');
    expect(escapeLike('50%_#')).toBe('50#%#_##');
    expect(() => validateKeyword('   ')).toThrow(BadRequestException);
  });

  it('다른 검색어 또는 목록의 커서를 사용하면 입력 오류를 반환한다', () => {
    const cursor = encodeCursor('store-search', 'coffee', 'Cafe', ID);
    expect(() => decodeCursor('store-search', 'tea', cursor)).toThrow(
      BadRequestException,
    );
    expect(() => decodeCursor('menu-search', 'coffee', cursor)).toThrow(
      BadRequestException,
    );
    expect(() => decodeCursor('store-search', 'coffee', 'invalid')).toThrow(
      BadRequestException,
    );
  });

  it('한 건을 더 받으면 마지막으로 보여준 항목의 커서를 반환한다', () => {
    expect(slicePage([1, 2, 3], 2, String)).toEqual({
      items: [1, 2],
      nextCursor: '2',
    });
  });
});
