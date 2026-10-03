import { join } from 'path';

import type { Request } from 'express';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { GraphqlExceptionFilter } from './graphqlException.filter';
import { ResponseLoggingPlugin } from './responseLogger.plugin';
import { CommonModule } from './common/common.module';
import { createMikroOrmOptions } from './mikro-orm.options';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StoresModule } from './stores/stores.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'environments/.env',
    }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const options = createMikroOrmOptions(
          configService.getOrThrow<string>('DATABASE_URL'),
        );
        return {
          ...options,
          entities: [],
          entitiesTs: [],
          autoLoadEntities: true,
          registerRequestContext: true,
        };
      },
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
    UsersModule,
    AuthModule,
    StoresModule,
    ProductsModule,
    PromotionsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true, whitelist: true }),
    },
  ],
})
export class AppModule {}
