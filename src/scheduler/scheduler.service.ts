import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  // Run every hour to timeout stuck PENDING transactions
  @Cron(CronExpression.EVERY_HOUR)
  async timeoutPendingTransactions() {
    this.logger.log('Running pending transaction timeout check', 'timeoutPendingTransactions');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.transactionRepository.update(
      {
        status: TransactionStatus.PENDING,
        createdAt: LessThan(twentyFourHoursAgo),
      },
      {
        status: TransactionStatus.FAILED,
        description: 'Transaction timed out after 24 hours',
      }
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Timed out ${result.affected} pending transactions`, 'timeoutPendingTransactions');
    }
  }

  // Run daily to revoke expired API keys
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredApiKeys() {
    this.logger.log('Running expired API key cleanup', 'cleanupExpiredApiKeys');

    const result = await this.apiKeyRepository.update(
      {
        revoked: false,
        expiresAt: LessThan(new Date()),
      },
      {
        revoked: true,
      }
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Revoked ${result.affected} expired API keys`, 'cleanupExpiredApiKeys');
    }
  }
}