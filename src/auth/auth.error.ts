import { HttpException, HttpStatus } from '@nestjs/common';
import { GraphQLError } from 'graphql';

export type AuthErrorCode =
  | 'BAD_USER_INPUT'
  | 'PHONE_NUMBER_ALREADY_REGISTERED'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHENTICATED';

export function authError(
  code: AuthErrorCode,
  message: string,
  status: HttpStatus,
  extra: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(message, {
    originalError: new HttpException(message, status),
    extensions: { code, ...extra },
  });
}
