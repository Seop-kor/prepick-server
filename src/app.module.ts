import { join } from 'path';

import type { Request } from 'express';
import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { GraphqlExceptionFilter } from './graphqlException.filter';
import { ResponseLoggingPlugin } from './responseLogger.plugin';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'environments/.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      graphiql: true,
      sortSchema: true,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      context: ({ req }: { req: Request }) => ({ req }),
      plugins: [new ResponseLoggingPlugin()],
    }),
    CommonModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AppModule {}
