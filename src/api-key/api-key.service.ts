import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { User } from '../entities/user.entity';
import { CreateApiKeyDto, CreateApiKeyResponseDto, RolloverApiKeyDto, ApiKeyListResponseDto } from '../dto/api-key.dto';
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
      where: {
        userId,
        revoked: false,
        expiresAt: MoreThan(new Date())
      },
    });
    if (activeKeys >= 5) {
      throw new BadRequestException('Maximum 5 active API keys allowed per user');
    }

    const expiresAt = this.calculateExpiry(dto.expiry);
    const apiKey = this.generateApiKey();
    const keyPrefix = apiKey.substring(0, 8);
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newKey = this.apiKeyRepository.create({
      userId,
      keyPrefix,
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
    if (!expiredKey) {
      throw new BadRequestException('API key not found');
    }

    // Check if the key is actually expired
    if (expiredKey.expiresAt > new Date()) {
      throw new BadRequestException('API key has not expired yet');
    }

    // Check if creating new key would exceed 5-key limit
    const activeKeys = await this.apiKeyRepository.count({
      where: {
        userId,
        revoked: false,
        expiresAt: MoreThan(new Date())
      },
    });
    if (activeKeys >= 5) {
      throw new BadRequestException('Maximum 5 active API keys allowed per user');
    }

    const expiresAt = this.calculateExpiry(dto.expiry);
    const apiKey = this.generateApiKey();
    const keyPrefix = apiKey.substring(0, 8);
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const newKey = this.apiKeyRepository.create({
      userId,
      keyPrefix,
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

  async getUserApiKeys(userId: string): Promise<ApiKeyListResponseDto> {
    const keys = await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const keyList = keys.map(key => {
      const status = key.revoked ? 'revoked' :
                    key.expiresAt < new Date() ? 'expired' : 'active';

      return {
        id: key.id,
        name: key.name,
        permissions: key.permissions,
        expires_at: key.expiresAt.toISOString(),
        created_at: key.createdAt.toISOString(),
        status: status,
      };
    });

    return { keys: keyList };
  }

  async validateApiKey(apiKey: string): Promise<{ user: User; permissions: string[] } | null> {
    const keyPrefix = apiKey.substring(0, 8);

    // First, find keys with matching prefix (much more efficient)
    const candidateKeys = await this.apiKeyRepository.find({
      where: {
        keyPrefix,
        revoked: false,
        expiresAt: MoreThan(new Date()) // Only non-expired keys
      },
      relations: ['user'],
    });

    // Then verify the exact key with bcrypt (only for matching prefixes)
    for (const key of candidateKeys) {
      if (await bcrypt.compare(apiKey, key.hashedKey)) {
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