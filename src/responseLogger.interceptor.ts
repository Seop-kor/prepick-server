import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import type { GraphQLResolveInfo } from 'graphql';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ResponseLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context)
        : undefined;
    const request = gqlContext
      ? gqlContext.getContext<{ req: Request }>().req
      : context.switchToHttp().getRequest<Request>();
    const response =
      request.res ?? context.switchToHttp().getResponse<Response>();
    const operationName =
      gqlContext?.getInfo<GraphQLResolveInfo>().operation.name?.value ??
      'anonymous';
    const startedAt = Date.now();
    const metadata = (statusCode: number) => ({
      method: request.method,
      path: request.originalUrl ?? request.url,
      operationName,
      statusCode,
      durationMs: Date.now() - startedAt,
    });

    return next.handle().pipe(
      tap({
        complete: () =>
          this.logger.log({
            ...metadata(response?.statusCode ?? 200),
            outcome: 'success',
          }),
        error: (error: unknown) =>
          this.logger.error({
            ...metadata(
              error instanceof HttpException ? error.getStatus() : 500,
            ),
            outcome: 'error',
            error: error instanceof Error ? error.name : 'UnknownError',
          }),
      }),
    );
  }
}
