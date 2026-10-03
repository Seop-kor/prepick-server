import { BadRequestException } from '@nestjs/common';

import {
  decodeCursor,
  encodeCursor,
  slicePage,
  validateSize,
} from '../../src/common/pagination';

const ID = 1;

describe('커서 페이지네이션', () => {
  it('페이지 크기가 1~50을 벗어나면 입력 오류를 반환한다', () => {
    expect(() => validateSize(0)).toThrow(BadRequestException);
    expect(() => validateSize(51)).toThrow(BadRequestException);
    expect(validateSize(50)).toBe(50);
    expect(validateSize()).toBe(20);
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
    expect(decodeCursor('store-search', 'coffee', cursor)).toEqual({
      key: 'Cafe',
      id: ID,
    });
    const oldUuidCursor = Buffer.from(
      JSON.stringify([
        'store-search',
        'coffee',
        'Cafe',
        '00000000-0000-4000-8000-000000000001',
      ]),
    ).toString('base64url');
    expect(() => decodeCursor('store-search', 'coffee', oldUuidCursor)).toThrow(
      BadRequestException,
    );
  });

  it('한 건을 더 받으면 마지막으로 보여준 항목의 커서를 반환한다', () => {
    expect(slicePage([1, 2, 3], 2, String)).toEqual({
      items: [1, 2],
      nextCursor: '2',
    });
  });

  it('신규 매장 커서에 마이크로초 시각이 있으면 그대로 복원한다', () => {
    const key = '2026-09-25T12:34:56.123456Z';
    expect(decodeCursor('new', '', encodeCursor('new', '', key, ID))).toEqual({
      key,
      id: ID,
    });
  });
});
