import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  Query,
  UseGuards,
  RawBodyRequest,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { WalletService } from './wallet.service';
import {
  DepositDto,
  DepositResponseDto,
  DepositStatusResponseDto,
  BalanceResponseDto,
  TransferDto,
  TransferResponseDto,
  TransactionsResponseDto,
} from '../dto/wallet.dto';
import { CombinedAuthGuard } from '../guards/combined-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '../guards/permissions.decorator';
import { Permission } from '../entities/api-key.entity';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post('deposit')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.DEPOSIT)
  async deposit(
    @Body() dto: DepositDto,
    @Req() req: any,
  ): Promise<DepositResponseDto> {
    return this.walletService.deposit(req.user.id, dto, req.user.email);
  }

  @Get('deposit/:reference/status')
  async getDepositStatus(
    @Param('reference') reference: string,
  ): Promise<DepositStatusResponseDto> {
    return this.walletService.getDepositStatus(reference);
  }

  @Get('balance')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.READ)
  async getBalance(@Req() req: any): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('transfer')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.TRANSFER)
  async transfer(
    @Body() dto: TransferDto,
    @Req() req: any,
  ): Promise<TransferResponseDto> {
    return this.walletService.transfer(req.user.id, dto);
  }

  @Get('transactions')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.READ)
  async getTransactions(@Req() req: any): Promise<TransactionsResponseDto> {
    return this.walletService.getTransactions(req.user.id);
  }

  @Get('deposit/callback')
  async depositCallback(
    @Query('reference') reference: string,
    @Query('trxref') trxref: string,
  ) {
    // For testing: return success message
    // In production, this would redirect to your frontend
    return {
      message: 'Payment completed successfully',
      reference,
      trxref,
      status: 'success'
    };
  }

  @Post('paystack/webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ): Promise<{ status: boolean }> {
    console.log('Webhook received:', { body, signature });

    // Validate Paystack signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('Paystack secret key not configured');
    }

    const expectedSignature = createHmac('sha512', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    console.log('Webhook signature validated successfully');

    await this.walletService.handleWebhook(body.data);
    console.log('Webhook processed successfully');

    return { status: true };
  }
}
