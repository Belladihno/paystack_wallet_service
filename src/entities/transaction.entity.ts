import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  OUTGOING_TRANSFER = 'outgoing_transfer',
  INCOMING_TRANSFER = 'incoming_transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true, unique: true })
  reference: string;

  @Column({ nullable: true })
  recipientWalletNumber: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  senderWalletNumber: string;

  @Column({ nullable: true })
  paystackEventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  user: User;

  @Column()
  userId: string;
}
