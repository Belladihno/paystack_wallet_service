import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { ApiKey } from './entities/api-key.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Wallet, Transaction, ApiKey],
  migrations: ['src/migrations/*.ts'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  synchronize: false,
});
