import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Headers,
  Logger,
  BadRequestException,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { createHmac } from 'crypto';
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
import { Permissions } from '../guards/permissions.decorator';
import { Permission } from '../entities/api-key.entity';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

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

  // ----------------- PAYSTACK WEBHOOK -----------------
  @Post('paystack/webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawBody = req.body; // Buffer from bodyParser.raw
    if (!signature) throw new BadRequestException('Webhook signature required');

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new BadRequestException('Paystack secret not set');

    const expectedSignature = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());
    await this.walletService.handleWebhook(payload.data);

    this.logger.log(`Webhook processed successfully: ${payload.data.reference}`);
    return { status: true };
  }
}
