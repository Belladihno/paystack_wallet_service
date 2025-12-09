import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

export enum Permission {
  READ = 'read',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
}

@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 8 })
  keyPrefix: string;

  @Column()
  hashedKey: string;

  @Column()
  name: string;

  @Column('simple-array')
  permissions: Permission[];

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.apiKeys)
  user: User;

  @Column()
  userId: string;
}
