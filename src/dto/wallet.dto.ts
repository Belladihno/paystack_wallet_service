import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit in Naira (will be converted to kobo for Paystack)',
    example: 5000,
    minimum: 100,
    maximum: 10000000
  })
  @IsNumber()
  @Min(100, { message: 'Minimum deposit amount is ₦100' })
  @Max(10000000, { message: 'Maximum deposit amount is ₦10,000,000' })
  amount: number;
}

export class DepositResponseDto {
  @ApiProperty({
    description: 'Unique transaction reference',
    example: 'ref_1733723456789_abc123def'
  })
  @IsString()
  reference: string;

  @ApiProperty({
    description: 'Paystack payment authorization URL',
    example: 'https://checkout.paystack.com/xyz123'
  })
  @IsString()
  authorization_url: string;
}

export class DepositStatusResponseDto {
  @ApiProperty({
    description: 'Transaction reference',
    example: 'ref_1733723456789_abc123def'
  })
  @IsString()
  reference: string;

  @ApiProperty({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.SUCCESS
  })
  @IsString()
  status: TransactionStatus;

  @ApiProperty({
    description: 'Transaction amount in Naira',
    example: 5000
  })
  @IsNumber()
  amount: number;
}

export class BalanceResponseDto {
  @ApiProperty({
    description: 'Current wallet balance in Naira',
    example: 15000
  })
  @IsNumber()
  balance: number;
}

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number',
    example: '123456789012'
  })
  @IsString()
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer in Naira',
    example: 3000,
    minimum: 100,
    maximum: 10000000
  })
  @IsNumber()
  @Min(100, { message: 'Minimum transfer amount is ₦100' })
  @Max(10000000, { message: 'Maximum transfer amount is ₦10,000,000' })
  amount: number;
}

export class TransferResponseDto {
  @ApiProperty({
    description: 'Transfer status',
    example: 'success'
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Status message',
    example: 'Transfer completed'
  })
  @IsString()
  message: string;
}

export class TransactionDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.DEPOSIT
  })
  @IsString()
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction amount in Naira',
    example: 5000
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.SUCCESS
  })
  @IsString()
  status: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Human-readable transaction description',
    example: 'Deposit of ₦5000'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Sender wallet number (for transfers)',
    example: '123456789012'
  })
  @IsString()
  @IsOptional()
  senderWalletNumber?: string;

  @ApiPropertyOptional({
    description: 'Recipient wallet number (for transfers)',
    example: '987654321098'
  })
  @IsString()
  @IsOptional()
  recipientWalletNumber?: string;
}

export class TransactionsResponseDto {
  @ApiProperty({
    description: 'List of user transactions',
    type: [TransactionDto]
  })
  transactions: TransactionDto[];
}
