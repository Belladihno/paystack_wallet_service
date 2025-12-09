import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../api-key/api-key.service';
import { Permission } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const result = await this.apiKeyService.validateApiKey(apiKey);
    if (!result) {
      throw new UnauthorizedException('Invalid API key');
    }

    const { user, permissions } = result;

    // Check permissions if required
    const requiredPermissions = this.reflector.get<Permission[]>('permissions', context.getHandler());
    if (requiredPermissions) {
      for (const perm of requiredPermissions) {
        if (!permissions.includes(perm)) {
          throw new UnauthorizedException(`Permission '${perm}' required`);
        }
      }
    }

    request.user = user;
    return true;
  }
}