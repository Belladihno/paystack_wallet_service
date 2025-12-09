import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { User } from '../entities/user.entity';
import { CreateApiKeyDto, CreateApiKeyResponseDto, RolloverApiKeyDto } from '../dto/api-key.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<CreateApiKeyResponseDto> {
    const activeKeys = await this.apiKeyRepository.count({
      where: { userId, revoked: false },
    });
    if (activeKeys >= 5) {
      throw new BadRequestException('Maximum 5 active API keys allowed per user');
    }

    const expiresAt = this.calculateExpiry(dto.expiry);
    const apiKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newKey = this.apiKeyRepository.create({
      userId,
      hashedKey,
      name: dto.name,
      permissions: dto.permissions,
      expiresAt,
    });
    await this.apiKeyRepository.save(newKey);

    return {
      api_key: apiKey,
      expires_at: expiresAt.toISOString(),
    };
  }

  async rolloverApiKey(userId: string, dto: RolloverApiKeyDto): Promise<CreateApiKeyResponseDto> {
    const expiredKey = await this.apiKeyRepository.findOne({
      where: { id: dto.expired_key_id, userId, revoked: false },
    });
    if (!expiredKey || expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('Invalid or not expired API key');
    }

    const expiresAt = this.calculateExpiry(dto.expiry);
    const apiKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newKey = this.apiKeyRepository.create({
      userId,
      hashedKey,
      name: expiredKey.name,
      permissions: expiredKey.permissions,
      expiresAt,
    });
    await this.apiKeyRepository.save(newKey);

    return {
      api_key: apiKey,
      expires_at: expiresAt.toISOString(),
    };
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });
    if (!key) {
      throw new BadRequestException('API key not found');
    }
    key.revoked = true;
    await this.apiKeyRepository.save(key);
  }

  async validateApiKey(apiKey: string): Promise<{ user: User; permissions: string[] } | null> {
    const keys = await this.apiKeyRepository.find({
      where: { revoked: false },
      relations: ['user'],
    });
    for (const key of keys) {
      if (await bcrypt.compare(apiKey, key.hashedKey)) {
        if (key.expiresAt < new Date()) {
          throw new BadRequestException('API key expired');
        }
        return { user: key.user, permissions: key.permissions };
      }
    }
    return null;
  }

  private calculateExpiry(expiry: string): Date {
    const now = new Date();
    switch (expiry) {
      case '1H':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '1D':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '1Y':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        throw new BadRequestException('Invalid expiry format');
    }
  }

  private generateApiKey(): string {
    return 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}