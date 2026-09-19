import { join } from 'path';

import type { Request } from 'express';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { GraphqlExceptionFilter } from './graphqlException.filter';
import { ResponseLoggingPlugin } from './responseLogger.plugin';
import { CommonModule } from './common/common.module';
import { createMikroOrmOptions } from './database/mikro-orm.options';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'environments/.env',
    }),
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createMikroOrmOptions(
          configService.getOrThrow<string>('DATABASE_URL'),
        ),
        autoLoadEntities: true,
        registerRequestContext: true,
      }),
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
