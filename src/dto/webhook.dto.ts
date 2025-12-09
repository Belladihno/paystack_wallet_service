import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaystackWebhookDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'charge.success'
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Event data containing transaction details'
  })
  @IsObject()
  data: {
    id?: string;
    reference: string;
    status: string;
    amount: number;
    customer?: {
      email: string;
    };
    [key: string]: any;
  };
}