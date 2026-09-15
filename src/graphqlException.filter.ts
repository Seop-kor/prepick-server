import {
  ArgumentsHost,
  Catch,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlContextType, GqlExceptionFilter } from '@nestjs/graphql';

@Catch()
export class GraphqlExceptionFilter
  extends BaseExceptionFilter
  implements GqlExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType<GqlContextType>() !== 'graphql') {
      return super.catch(exception, host);
    }

    return exception instanceof HttpException
      ? exception
      : new InternalServerErrorException();
  }
}
