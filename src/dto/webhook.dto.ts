import { IsString, IsObject, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PaystackWebhookDataDto {
  @ApiProperty({
    description: 'Unique event identifier',
    example: 'evt_1234567890'
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'ref_1733723456789_abc123def'
  })
  @IsString()
  reference: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'success'
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Transaction amount in kobo',
    example: 500000
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Customer information',
    required: false
  })
  @IsOptional()
  @IsObject()
  customer?: {
    email: string;
  };
}

export class PaystackWebhookDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'charge.success'
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Event data containing transaction details',
    type: PaystackWebhookDataDto
  })
  @ValidateNested()
  @Type(() => PaystackWebhookDataDto)
  data: PaystackWebhookDataDto;
}