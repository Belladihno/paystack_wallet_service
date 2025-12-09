import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { ApiKeyService } from '../api-key/api-key.service';
import { Reflector } from '@nestjs/core';
import { Permission } from '../entities/api-key.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const payload = this.jwtService.verify(token);
        request.user = { id: payload.sub, email: payload.email };
        return true;
      } catch (error) {
        throw new UnauthorizedException('Invalid JWT token');
      }
    } else if (apiKey) {
      console.log('Using API key authentication');
      // API key auth
      const result = await this.apiKeyService.validateApiKey(apiKey);
      if (!result) {
        throw new UnauthorizedException('Invalid API key');
      }

      const { user, permissions } = result;

      // Check permissions
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
    } else {
      throw new UnauthorizedException('Authentication required');
    }
  }
}