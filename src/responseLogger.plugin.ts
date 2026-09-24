import type {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { HttpException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { GraphQLError } from 'graphql';

type GraphqlContext = { req: Request };

export class ResponseLoggingPlugin implements ApolloServerPlugin<GraphqlContext> {
  private readonly logger = new Logger(ResponseLoggingPlugin.name);

  requestDidStart({
    contextValue,
  }: {
    contextValue: GraphqlContext;
  }): Promise<GraphQLRequestListener<GraphqlContext>> {
    const startedAt = Date.now();
    let operationName = 'anonymous';
    let error: unknown;

    return Promise.resolve({
      didResolveOperation: (requestContext) => {
        operationName = requestContext.operationName ?? 'anonymous';
        return Promise.resolve();
      },
      didEncounterErrors: (requestContext) => {
        error = requestContext.errors[0];
        while (error instanceof GraphQLError && error.originalError) {
          error = error.originalError;
        }
        return Promise.resolve();
      },
      willSendResponse: (requestContext) => {
        const metadata = {
          method: contextValue.req.method,
          path: new URL(contextValue.req.originalUrl, 'http://localhost')
            .pathname,
          operationName,
          statusCode:
            error instanceof HttpException
              ? error.getStatus()
              : (requestContext.response.http.status ?? (error ? 500 : 200)),
          durationMs: Date.now() - startedAt,
        };

        if (error) {
          this.logger.error({
            ...metadata,
            outcome: 'error',
            error: error instanceof Error ? error.name : 'UnknownError',
          });
        } else {
          this.logger.log({ ...metadata, outcome: 'success' });
        }

        return Promise.resolve();
      },
    });
  }
}
