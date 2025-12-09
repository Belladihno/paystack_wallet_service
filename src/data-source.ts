import { DataSource } from 'typeorm';
import { User, Wallet, Transaction, ApiKey } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'paystack_wallet',
  entities: [User, Wallet, Transaction, ApiKey],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});