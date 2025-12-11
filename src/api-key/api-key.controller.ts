import { Controller, Post, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, CreateApiKeyResponseDto, RolloverApiKeyDto } from '../dto/api-key.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: CreateApiKeyResponseDto,
  })
  async create(@Body() dto: CreateApiKeyDto, @Req() req: any): Promise<CreateApiKeyResponseDto> {
    return this.apiKeyService.createApiKey(req.user.id, dto);
  }

  @Post('rollover')
  @ApiOperation({ summary: 'Rollover an existing API key' })
  @ApiResponse({
    status: 200,
    description: 'API key rolled over successfully',
    type: CreateApiKeyResponseDto,
  })
  async rollover(@Body() dto: RolloverApiKeyDto, @Req() req: any): Promise<CreateApiKeyResponseDto> {
    return this.apiKeyService.rolloverApiKey(req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
  })
  async revoke(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.apiKeyService.revokeApiKey(req.user.id, id);
  }
}