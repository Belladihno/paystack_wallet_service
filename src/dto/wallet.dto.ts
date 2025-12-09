import { IsNumber, IsString, IsOptional } from 'class-validator';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

export class DepositDto {
  @IsNumber()
  amount: number;
}

export class DepositResponseDto {
  @IsString()
  reference: string;

  @IsString()
  authorization_url: string;
}

export class DepositStatusResponseDto {
  @IsString()
  reference: string;

  @IsString()
  status: TransactionStatus;

  @IsNumber()
  amount: number;
}

export class BalanceResponseDto {
  @IsNumber()
  balance: number;
}

export class TransferDto {
  @IsString()
  wallet_number: string;

  @IsNumber()
  amount: number;
}

export class TransferResponseDto {
  @IsString()
  status: string;

  @IsString()
  message: string;
}

export class TransactionDto {
  @IsString()
  type: TransactionType;

  @IsNumber()
  amount: number;

  @IsString()
  status: TransactionStatus;
}

export class TransactionsResponseDto {
  transactions: TransactionDto[];
}