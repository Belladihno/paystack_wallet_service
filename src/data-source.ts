import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User, Wallet, Transaction, ApiKey } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [User, Wallet, Transaction, ApiKey],
  migrations: ['dist/migrations/*.js'],
  ssl: false,
  synchronize: false,
});
