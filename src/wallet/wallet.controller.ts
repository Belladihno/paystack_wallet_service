import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
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
import { Permissions } from '../guards/permissions.decorator';
import { Permission } from '../entities/api-key.entity';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private walletService: WalletService) {}

  // -----------------------------------------------
  // Deposit
  // -----------------------------------------------
  @Post('deposit')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  // -----------------------------------------------
  // Balance
  // -----------------------------------------------
  @Get('balance')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.READ)
  async getBalance(@Req() req: any): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(req.user.id);
  }

  // -----------------------------------------------
  // Transfer
  // -----------------------------------------------
  @Post('transfer')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.TRANSFER)
  async transfer(
    @Body() dto: TransferDto,
    @Req() req: any,
  ): Promise<TransferResponseDto> {
    return this.walletService.transfer(req.user.id, dto);
  }

  // -----------------------------------------------
  // Transactions
  // -----------------------------------------------
  @Get('transactions')
  @UseGuards(CombinedAuthGuard)
  @Permissions(Permission.READ)
  async getTransactions(@Req() req: any): Promise<TransactionsResponseDto> {
    return this.walletService.getTransactions(req.user.id);
  }

  // -----------------------------------------------
  // Deposit Callback (Frontend Redirect)
  // -----------------------------------------------
  @Get('deposit/callback')
  async depositCallback(
    @Query('reference') reference: string,
    @Query('trxref') trxref: string,
  ) {
    this.logger.log(
      `Deposit callback received for reference: ${reference}`,
      'depositCallback',
    );

    try {
      const statusResponse =
        await this.walletService.getDepositStatus(reference);

      return {
        message: 'Payment callback received',
        reference,
        trxref,
        status: statusResponse.status,
        amount: statusResponse.amount,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get status for callback reference: ${reference}`,
        'depositCallback',
      );
      return {
        message: 'Payment callback received',
        reference,
        trxref,
        status: 'unknown',
      };
    }
  }

  // -----------------------------------------------
  // PAYSTACK WEBHOOK (PRODUCTION)
  // -----------------------------------------------
  @Post('paystack/webhook')
  @Throttle({ webhook: { limit: 100, ttl: 60000 } })
  async handleWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature?: string,
  ): Promise<{ status: boolean }> {
    const rawBody = req.body; // Buffer
    const secret = process.env.PAYSTACK_SECRET_KEY;

    this.logger.log(`Webhook attempt received`, 'handleWebhook');

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error(
        'Raw body missing — ensure raw body parser is enabled for this route',
      );
      throw new BadRequestException('Invalid raw body');
    }

    if (!signature) {
      this.logger.error('Missing webhook signature');
      throw new BadRequestException('Webhook signature required');
    }

    // Validate that secret key is available
    if (!secret) {
      this.logger.error('Paystack secret key is not configured');
      throw new BadRequestException('Server configuration error');
    }

    // Verify signature using raw body
    const expectedSignature = createHmac('sha512', secret as string)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log('Webhook signature validated', 'handleWebhook');

    // Parse JSON manually
    let event: PaystackWebhookDto;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      this.logger.error(`Failed to parse webhook body: ${err.message}`);
      throw new BadRequestException('Invalid JSON');
    }

    // Process webhook
    try {
      await this.walletService.handleWebhook(event.data);
      this.logger.log(
        `Webhook processed successfully for reference: ${event.data.reference}`,
        'handleWebhook',
      );
      return { status: true };
    } catch (error) {
      this.logger.error(
        `Webhook processing failed: ${error.message}`,
        'handleWebhook',
      );
      throw error;
    }
  }

  // -----------------------------------------------
  // PAYSTACK WEBHOOK (TESTING ONLY)
  // -----------------------------------------------
  @Post('paystack/webhook/test')
  async testWebhook(@Body() body: PaystackWebhookDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Test webhook disabled in production');
    }

    this.logger.log(
      `Test webhook received for reference: ${body.data.reference}`,
      'handleTestWebhook',
    );

    await this.walletService.handleWebhook(body.data);

    return {
      status: true,
      message: 'Test webhook processed successfully',
    };
  }
}
