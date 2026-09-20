import { HttpException, HttpStatus } from '@nestjs/common';

import { authError } from '../../src/auth/auth.error';

describe('authError', () => {
  it('인증 오류를 생성하면 GraphQL 코드와 HTTP 상태를 함께 보존한다', () => {
    const error = authError(
      'PHONE_NUMBER_ALREADY_REGISTERED',
      'Phone is already registered',
      HttpStatus.CONFLICT,
    );

    expect(error.extensions.code).toBe('PHONE_NUMBER_ALREADY_REGISTERED');
    expect(error.originalError).toBeInstanceOf(HttpException);
    expect((error.originalError as HttpException).getStatus()).toBe(409);
  });
});
