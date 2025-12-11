import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('/health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns service health status',
    schema: {
      example: {
        status: 'ok',
        service: 'paystack-wallet-service',
        database: 'connected',
      },
    },
  })
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
  @ApiOperation({ summary: 'Leepcell health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns simple health status for Leepcell monitoring',
    schema: {
      example: {
        status: 'ok',
      },
    },
  })
  leepcellHealthCheck() {
    return { status: 'ok' };
  }
}
