import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlContextType, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphqlExceptionFilter
  extends BaseExceptionFilter
  implements GqlExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType<GqlContextType>() !== 'graphql') {
      return super.catch(exception, host);
    }

    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof BadRequestException) {
      return new GraphQLError(exception.message, {
        originalError: exception,
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    if (exception instanceof UnauthorizedException) {
      return new GraphQLError(exception.message, {
        originalError: exception,
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    return exception instanceof HttpException
      ? exception
      : new InternalServerErrorException();
  }
}
