import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Wallet, Transaction, ApiKey } from './entities';
import { AuthModule } from './auth/auth.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { WalletModule } from './wallet/wallet.module';
import { HealthModule } from './health/health.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CustomLogger } from './logger/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for general endpoints
      },
      {
        name: 'webhook',
        ttl: 60000,
        limit: 100, // Higher limit for webhooks
      },
      {
        name: 'deposit',
        ttl: 60000,
        limit: 5, // Lower limit for deposits to prevent abuse
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [User, Wallet, Transaction, ApiKey],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'], // ✅ Changed this line
      synchronize: false,
      retryAttempts: 3, // ADDED: Retry connection 3 times
      retryDelay: 3000, // ADDED: Wait 3 seconds between retries
      connectTimeoutMS: 5000, // ADDED: Timeout after 5 seconds
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false, // ADDED: SSL for production
      extra: {
        connectionTimeoutMillis: 5000, // ADDED: Extra timeout config
      },
    }),
    AuthModule,
    ApiKeyModule,
    WalletModule,
    HealthModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
