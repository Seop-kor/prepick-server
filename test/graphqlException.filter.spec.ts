import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';

import { authError } from '../src/auth/auth.error';
import { GraphqlExceptionFilter } from '../src/graphqlException.filter';

describe('GraphqlExceptionFilter', () => {
  const graphqlHost = {
    getType: () => 'graphql',
  } as unknown as ArgumentsHost;
  const filter = new GraphqlExceptionFilter();

  it('코드화된 GraphQL 오류를 받으면 원본을 그대로 반환한다', () => {
    const error = authError(
      'PHONE_NUMBER_ALREADY_REGISTERED',
      'Phone is already registered',
      409,
    );

    expect(filter.catch(error, graphqlHost)).toBe(error);
  });

  it('잘못된 입력 예외를 받으면 BAD_USER_INPUT으로 변환한다', () => {
    const exception = new BadRequestException('invalid input');
    const mapped = filter.catch(exception, graphqlHost) as GraphQLError;

    expect(mapped.extensions.code).toBe('BAD_USER_INPUT');
    expect(mapped.message).toBe('invalid input');
    expect(mapped.originalError).toBe(exception);
  });

  it('인증 예외를 받으면 UNAUTHENTICATED로 변환한다', () => {
    const exception = new UnauthorizedException('Authentication required');
    const mapped = filter.catch(exception, graphqlHost) as GraphQLError;

    expect(mapped.extensions.code).toBe('UNAUTHENTICATED');
    expect(mapped.message).toBe('Authentication required');
    expect(mapped.originalError).toBe(exception);
  });

  it('그 밖의 알려진 HTTP 예외를 받으면 그대로 반환한다', () => {
    const exception = new HttpException('known', 422);

    expect(filter.catch(exception, graphqlHost)).toBe(exception);
  });

  it('알 수 없는 오류를 받으면 내부 오류로 숨긴다', () => {
    expect(filter.catch(new Error('secret'), graphqlHost)).toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
