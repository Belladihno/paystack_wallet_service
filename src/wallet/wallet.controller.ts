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
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
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
import { PaystackWebhookDto } from '../dto/webhook.dto';
import { CombinedAuthGuard } from '../guards/combined-auth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '../guards/permissions.decorator';
import { Permission } from '../entities/api-key.entity';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private walletService: WalletService) {}

  @Post('deposit')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 deposits per minute
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
    this.logger.log(`Deposit callback received for reference: ${reference}`, 'depositCallback');

    try {
      const statusResponse = await this.walletService.getDepositStatus(reference);
      return {
        message: 'Payment callback received',
        reference,
        trxref,
        status: statusResponse.status,
        amount: statusResponse.amount,
        note: 'Check deposit status endpoint for final confirmation'
      };
    } catch (error) {
      this.logger.warn(`Failed to get status for callback reference: ${reference}`, 'depositCallback');
      return {
        message: 'Payment callback received',
        reference,
        trxref,
        status: 'unknown',
        note: 'Unable to verify status at this time'
      };
    }
  }

  @Post('paystack/webhook')
  @Throttle({ webhook: { limit: 100, ttl: 60000 } }) // 100 webhooks per minute
  async handleWebhook(
    @Body() body: PaystackWebhookDto,
    @Headers('x-paystack-signature') signature?: string,
  ): Promise<{ status: boolean }> {
    this.logger.log(`Webhook received for reference: ${body.data.reference}`, 'handleWebhook');

    // Validate Paystack signature (skip in development)
    if (process.env.NODE_ENV === 'production') {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        this.logger.error('Paystack secret key not configured', 'handleWebhook');
        throw new BadRequestException('Paystack secret key not configured');
      }

      if (!signature) {
        this.logger.error('Missing webhook signature in production', 'handleWebhook');
        throw new BadRequestException('Webhook signature required');
      }

      const expectedSignature = createHmac('sha512', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.error('Invalid webhook signature', 'handleWebhook');
        throw new BadRequestException('Invalid webhook signature');
      }

      this.logger.log('Webhook signature validated successfully', 'handleWebhook');
    } else {
      this.logger.warn('Skipping webhook signature validation in development mode', 'handleWebhook');
    }

    try {
      await this.walletService.handleWebhook(body.data);
      this.logger.log(`Webhook processed successfully for reference: ${body.data.reference}`, 'handleWebhook');
      return { status: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, 'handleWebhook');
      throw error;
    }
  }

  @Post('paystack/webhook/test')
  @Throttle({ webhook: { limit: 10, ttl: 60000 } }) // 10 test webhooks per minute
  async handleTestWebhook(@Body() body: PaystackWebhookDto): Promise<{ status: boolean; message: string }> {
    this.logger.log(`Test webhook received for reference: ${body.data.reference}`, 'handleTestWebhook');

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test webhook endpoint not available in production');
    }

    try {
      await this.walletService.handleWebhook(body.data);
      this.logger.log(`Test webhook processed successfully for reference: ${body.data.reference}`, 'handleTestWebhook');
      return { status: true, message: 'Test webhook processed successfully' };
    } catch (error) {
      this.logger.error(`Test webhook processing failed: ${error.message}`, 'handleTestWebhook');
      return { status: false, message: `Processing failed: ${error.message}` };
    }
  }
}
