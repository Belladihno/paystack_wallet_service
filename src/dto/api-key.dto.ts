import { IsArray, IsIn, IsString, IsOptional } from 'class-validator';
import { Permission } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  permissions: Permission[];

  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}

export class CreateApiKeyResponseDto {
  @IsString()
  api_key: string;

  @IsString()
  expires_at: string;
}

export class RolloverApiKeyDto {
  @IsString()
  expired_key_id: string;

  @IsString()
  @IsIn(['1H', '1D', '1M', '1Y'])
  expiry: string;
}

export class RevokeApiKeyDto {
  @IsString()
  key_id: string;
}

export class ApiKeyListItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  permissions: Permission[];

  @IsString()
  expires_at: string;

  @IsString()
  created_at: string;

  @IsString()
  status: string;
}

export class ApiKeyListResponseDto {
  @IsArray()
  keys: ApiKeyListItemDto[];
}