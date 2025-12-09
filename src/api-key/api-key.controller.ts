import { Controller, Post, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, CreateApiKeyResponseDto, RolloverApiKeyDto } from '../dto/api-key.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post('create')
  async create(@Body() dto: CreateApiKeyDto, @Req() req: any): Promise<CreateApiKeyResponseDto> {
    return this.apiKeyService.createApiKey(req.user.id, dto);
  }

  @Post('rollover')
  async rollover(@Body() dto: RolloverApiKeyDto, @Req() req: any): Promise<CreateApiKeyResponseDto> {
    return this.apiKeyService.rolloverApiKey(req.user.id, dto);
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.apiKeyService.revokeApiKey(req.user.id, id);
  }
}