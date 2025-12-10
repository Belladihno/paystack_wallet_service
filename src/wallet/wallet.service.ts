import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../entities/transaction.entity';
import {
  DepositDto,
  DepositResponseDto,
  DepositStatusResponseDto,
  BalanceResponseDto,
  TransferDto,
  TransferResponseDto,
  TransactionsResponseDto,
  TransactionDto,
} from '../dto/wallet.dto';
import Paystack from 'paystack-api';
import Decimal from 'decimal.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private paystack: any;

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {
    this.paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
  }

  async deposit(
    userId: string,
    dto: DepositDto,
    userEmail?: string,
  ): Promise<DepositResponseDto> {
    this.logger.log(
      `Deposit initiated for user ${userId}, amount: ${dto.amount}`,
      'deposit',
    );

    if (!userEmail) {
      throw new BadRequestException('User email required for deposit');
    }

    // Check for existing pending deposit with same amount to prevent duplicates (idempotency)
    const existingPending = await this.transactionRepository.findOne({
      where: {
        userId,
        amount: dto.amount, // Make it amount-specific
        status: TransactionStatus.PENDING,
        type: TransactionType.DEPOSIT,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPending) {
      const timeSinceCreation = Date.now() - existingPending.createdAt.getTime();
      const oneMinute = 60000; // 1 minute in milliseconds

      if (timeSinceCreation < oneMinute) {
        // Provide better messaging with pending deposit details
        const remainingTime = Math.ceil((oneMinute - timeSinceCreation) / 1000);
        throw new BadRequestException(
          `Pending deposit of ₦${dto.amount} already exists. ` +
          `Status: ${existingPending.status}. ` +
          `Please wait ${remainingTime} seconds or check deposit status using reference: ${existingPending.reference}`,
        );
      }
      // If older than 1 minute, allow new deposit (transaction may have failed)
    }

    let transaction: Transaction | undefined;

    try {
      const wallet = await this.walletRepository.findOne({ where: { userId } });
      this.logger.debug(
        `Wallet found for user ${userId}: ${!!wallet}`,
        'deposit',
      );
  
      if (!wallet) {
        this.logger.error(`Wallet not found for user: ${userId}`, 'deposit');
        throw new BadRequestException('Wallet not found');
      }

      const reference = this.generateReference();
      this.logger.debug(`Generated reference: ${reference}`, 'deposit');

      // Create pending transaction
      transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.DEPOSIT,
        amount: dto.amount,
        status: TransactionStatus.PENDING,
        reference,
        description: `Deposit of ₦${dto.amount}`,
      });
      this.logger.debug(
        `Transaction created with ID: ${transaction.id}`,
        'deposit',
      );

      await this.transactionRepository.save(transaction);
      this.logger.log(
        `Transaction saved successfully for reference: ${reference}`,
        'deposit',
      );

      // Initialize Paystack transaction
      const response = await this.paystack.transaction.initialize({
        amount: dto.amount * 100, // Paystack expects kobo
        email: userEmail || 'test@example.com',
        reference,
        callback_url: `${process.env.BASE_URL}/wallet/deposit/callback`,
      });

      return {
        reference,
        authorization_url: response.data.authorization_url,
      };
    } catch (error: any) {
      this.logger.error(
        `Deposit failed: ${error.response?.data?.message || error.message}`,
        'deposit',
      );

      // Rollback: If transaction was created but Paystack failed, mark as failed
      if (transaction) {
        try {
          transaction.status = TransactionStatus.FAILED;
          transaction.description = `Failed deposit: ${error.response?.data?.message || error.message}`;
          await this.transactionRepository.save(transaction);
          this.logger.log(
            `Transaction ${transaction.id} marked as failed due to Paystack error`,
            'deposit',
          );
        } catch (rollbackError) {
          this.logger.error(
            `Failed to rollback transaction ${transaction.id}: ${rollbackError.message}`,
            'deposit',
          );
        }
      }

      throw new BadRequestException(
        `Failed to initialize payment: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async getBalance(userId: string): Promise<BalanceResponseDto> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    return { balance: wallet?.balance || 0 };
  }

  async transfer(
    userId: string,
    dto: TransferDto,
  ): Promise<TransferResponseDto> {
    const senderWallet = await this.walletRepository.findOne({
      where: { userId },
    });
    if (!senderWallet) {
      throw new BadRequestException('Sender wallet not found');
    }

    const senderBalance = new Decimal(senderWallet.balance);
    const transferAmount = new Decimal(dto.amount);

    if (senderBalance.lessThan(transferAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    const recipientWallet = await this.walletRepository.findOne({
      where: { walletNumber: dto.wallet_number },
    });
    if (!recipientWallet) {
      throw new BadRequestException('Recipient wallet not found');
    }

    // Prevent self-transfer
    if (senderWallet.walletNumber === dto.wallet_number) {
      throw new BadRequestException('Cannot transfer to own wallet');
    }

    // Atomic transfer with pessimistic locking
    await this.walletRepository.manager.transaction(async (manager) => {
      // Lock sender wallet for update
      const lockedSenderWallet = await manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedSenderWallet) {
        throw new BadRequestException('Sender wallet not found');
      }

      const currentSenderBalance = new Decimal(lockedSenderWallet.balance);
      if (currentSenderBalance.lessThan(transferAmount)) {
        throw new BadRequestException('Insufficient balance');
      }

      // Lock recipient wallet for update
      const lockedRecipientWallet = await manager.findOne(Wallet, {
        where: { walletNumber: dto.wallet_number },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedRecipientWallet) {
        throw new BadRequestException('Recipient wallet not found');
      }

      // Perform atomic balance updates using Decimal.js
      lockedSenderWallet.balance = currentSenderBalance
        .minus(transferAmount)
        .toNumber();
      lockedRecipientWallet.balance = new Decimal(lockedRecipientWallet.balance)
        .plus(transferAmount)
        .toNumber();

      await manager.save(lockedSenderWallet);
      await manager.save(lockedRecipientWallet);

      // Record transactions
      const senderTransaction = manager.create(Transaction, {
        userId,
        type: TransactionType.OUTGOING_TRANSFER,
        amount: dto.amount,
        status: TransactionStatus.SUCCESS,
        recipientWalletNumber: dto.wallet_number,
        senderWalletNumber: senderWallet.walletNumber,
        description: `Transfer to wallet ${dto.wallet_number}`,
      });
      await manager.save(senderTransaction);

      const recipientTransaction = manager.create(Transaction, {
        userId: recipientWallet.userId,
        type: TransactionType.INCOMING_TRANSFER,
        amount: dto.amount,
        status: TransactionStatus.SUCCESS,
        senderWalletNumber: senderWallet.walletNumber,
        description: `Transfer from wallet ${senderWallet.walletNumber}`,
      });
      await manager.save(recipientTransaction);
    });

    return { status: 'success', message: 'Transfer completed' };
  }

  async getDepositStatus(reference: string): Promise<DepositStatusResponseDto> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });
    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }
    return {
      reference,
      status: transaction.status,
      amount: transaction.amount,
    };
  }

  async getTransactions(userId: string): Promise<TransactionsResponseDto> {
    const transactions = await this.transactionRepository.find({
      where: { userId },
    });
    const transactionDtos: TransactionDto[] = transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      senderWalletNumber: t.senderWalletNumber,
      recipientWalletNumber: t.recipientWalletNumber,
    }));
    return { transactions: transactionDtos };
  }

  async handleWebhook(data: any): Promise<void> {
    this.logger.log(
      `Processing webhook for reference: ${data.reference}, status: ${data.status}`,
      'handleWebhook',
    );

    const { reference, status, amount: amountInKobo, id: eventId } = data;

    // FIXED: Convert amount from kobo to naira
    const amountInNaira = amountInKobo / 100;
    this.logger.debug(
      `Amount received: ${amountInKobo} kobo = ₦${amountInNaira}`,
      'handleWebhook',
    );

    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });
    this.logger.debug(
      `Transaction lookup result: ${!!transaction}`,
      'handleWebhook',
    );

    if (!transaction || transaction.status !== TransactionStatus.PENDING) {
      this.logger.warn(
        `Transaction not found or not pending for reference: ${reference}`,
        'handleWebhook',
      );
      return; // Idempotent
    }

    // Prevent webhook replay attacks by checking event ID
    if (transaction.paystackEventId) {
      this.logger.warn(
        `Webhook already processed for event ID: ${eventId}`,
        'handleWebhook',
      );
      return; 
    }

    const expectedAmount = new Decimal(transaction.amount);
    const receivedAmount = new Decimal(amountInNaira);

    if (!receivedAmount.equals(expectedAmount)) {
      this.logger.error(
        `Amount mismatch! Expected: ₦${expectedAmount.toString()}, Received: ₦${receivedAmount.toString()}`,
        'handleWebhook',
      );
      transaction.status = TransactionStatus.FAILED;
      transaction.description = `Amount mismatch: expected ₦${expectedAmount.toString()}, received ₦${receivedAmount.toString()}`;
      transaction.paystackEventId = eventId;
      await this.transactionRepository.save(transaction);
      return;
    }

    if (status === 'success') {
      this.logger.log(
        `Payment successful for reference: ${reference}, crediting wallet`,
        'handleWebhook',
      );

      transaction.status = TransactionStatus.SUCCESS;
      transaction.paystackEventId = eventId; // Store event ID to prevent replay
      await this.transactionRepository.save(transaction);

      // Credit wallet with precise decimal arithmetic
      const wallet = await this.walletRepository.findOne({
        where: { userId: transaction.userId },
      });

      if (wallet) {
        const oldBalance = new Decimal(wallet.balance);
        const creditAmount = new Decimal(transaction.amount);
        const newBalance = oldBalance.plus(creditAmount);

        wallet.balance = newBalance.toNumber();
        await this.walletRepository.save(wallet);
        this.logger.log(
          `Wallet credited: user ${transaction.userId}, ₦${oldBalance.toString()} → ₦${newBalance.toString()}`,
          'handleWebhook',
        );
      } else {
        this.logger.error(
          `Wallet not found for user: ${transaction.userId}`,
          'handleWebhook',
        );
      }
    } else {
      this.logger.warn(
        `Payment failed for reference: ${reference}`,
        'handleWebhook',
      );
      transaction.status = TransactionStatus.FAILED;
      transaction.paystackEventId = eventId; // Store event ID to prevent replay
      await this.transactionRepository.save(transaction);
    }
  }

  private generateReference(): string {
    return (
      'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
    );
  }
}
