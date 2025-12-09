import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get()
  async healthCheck() {
    try {
      // Simple database connectivity check
      await this.userRepository.count();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'paystack-wallet-service',
        version: '1.0.0',
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'paystack-wallet-service',
        database: 'disconnected',
        error: error.message,
      };
    }
  }
}