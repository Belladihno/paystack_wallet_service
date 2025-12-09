import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { DepositDto, DepositResponseDto, DepositStatusResponseDto, BalanceResponseDto, TransferDto, TransferResponseDto, TransactionsResponseDto, TransactionDto } from '../dto/wallet.dto';
import Paystack from 'paystack-api';

@Injectable()
export class WalletService {
  private paystack: any;

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {
    this.paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
  }

  async deposit(userId: string, dto: DepositDto, userEmail?: string): Promise<DepositResponseDto> {
    console.log('Deposit called with:', { userId, amount: dto.amount, userEmail });

    let transaction: Transaction | undefined;

    try {
      const wallet = await this.walletRepository.findOne({ where: { userId } });
      console.log('Wallet found:', wallet);

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const reference = this.generateReference();
      console.log('Generated reference:', reference);

      // Create pending transaction
      transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.DEPOSIT,
        amount: dto.amount,
        status: TransactionStatus.PENDING,
        reference,
      });
      console.log('Transaction created:', transaction);

      await this.transactionRepository.save(transaction);
      console.log('Transaction saved successfully');

      // Initialize Paystack transaction
      const response = await this.paystack.transaction.initialize({
        amount: dto.amount * 100, // Paystack expects kobo
        email: userEmail || 'test@example.com',
        reference,
        callback_url: 'http://localhost:3001/wallet/deposit/callback',
      });

      return {
        reference,
        authorization_url: response.data.authorization_url,
      };
    } catch (error: any) {
      console.error('Deposit Error:', error.response?.data || error.message);

      // If transaction was created, mark it as failed
      if (transaction) {
        transaction.status = TransactionStatus.FAILED;
        await this.transactionRepository.save(transaction);
      }

      throw new BadRequestException(
        `Failed to initialize payment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async getBalance(userId: string): Promise<BalanceResponseDto> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    return { balance: wallet?.balance || 0 };
  }

  async transfer(userId: string, dto: TransferDto): Promise<TransferResponseDto> {
    const senderWallet = await this.walletRepository.findOne({ where: { userId } });
    if (!senderWallet || senderWallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const recipientWallet = await this.walletRepository.findOne({ where: { walletNumber: dto.wallet_number } });
    if (!recipientWallet) {
      throw new BadRequestException('Recipient wallet not found');
    }

    // Atomic transfer
    await this.walletRepository.manager.transaction(async manager => {
      // Deduct from sender
      senderWallet.balance -= dto.amount;
      await manager.save(senderWallet);

      // Add to recipient
      recipientWallet.balance += dto.amount;
      await manager.save(recipientWallet);

      // Record transactions
      const senderTransaction = manager.create(Transaction, {
        userId,
        type: TransactionType.TRANSFER,
        amount: dto.amount,
        status: TransactionStatus.SUCCESS,
        recipientWalletNumber: dto.wallet_number,
      });
      await manager.save(senderTransaction);

      const recipientTransaction = manager.create(Transaction, {
        userId: recipientWallet.userId,
        type: TransactionType.TRANSFER,
        amount: dto.amount,
        status: TransactionStatus.SUCCESS,
      });
      await manager.save(recipientTransaction);
    });

    return { status: 'success', message: 'Transfer completed' };
  }

  async getDepositStatus(reference: string): Promise<DepositStatusResponseDto> {
    const transaction = await this.transactionRepository.findOne({ where: { reference } });
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
    const transactions = await this.transactionRepository.find({ where: { userId } });
    const transactionDtos: TransactionDto[] = transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      status: t.status,
    }));
    return { transactions: transactionDtos };
  }

  async handleWebhook(data: any): Promise<void> {
    console.log('Processing webhook data:', data);

    const { reference, status } = data;
    console.log('Webhook reference:', reference, 'status:', status);

    const transaction = await this.transactionRepository.findOne({ where: { reference } });
    console.log('Found transaction:', transaction);

    if (!transaction || transaction.status !== TransactionStatus.PENDING) {
      console.log('Transaction not found or not pending, skipping');
      return; // Idempotent
    }

    if (status === 'success') {
      console.log('Payment successful, updating transaction and wallet');

      transaction.status = TransactionStatus.SUCCESS;
      await this.transactionRepository.save(transaction);
      console.log('Transaction updated to SUCCESS');

      // Credit wallet
      const wallet = await this.walletRepository.findOne({ where: { userId: transaction.userId } });
      console.log('Found wallet:', wallet);

      if (wallet) {
        const oldBalance = Number(wallet.balance);
        const creditAmount = Number(transaction.amount);
        const newBalance = oldBalance + creditAmount;

        wallet.balance = newBalance;
        await this.walletRepository.save(wallet);
        console.log(`Wallet credited: ${oldBalance} → ${newBalance}`);
      } else {
        console.log('Wallet not found for user:', transaction.userId);
      }
    } else {
      console.log('Payment failed, updating transaction status');
      transaction.status = TransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
    }
  }

  private generateReference(): string {
    return 'ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}