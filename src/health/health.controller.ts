import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller()
export class HealthController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('/health')
  async healthCheck() {
    try {
      await this.userRepository.count();

      return {
        status: 'ok',
        service: 'paystack-wallet-service',
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        service: 'paystack-wallet-service',
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  // Required by Leepcell
  @Get('/kaithheathcheck')
  leepcellHealthCheck() {
    return { status: 'ok' };
  }
}
