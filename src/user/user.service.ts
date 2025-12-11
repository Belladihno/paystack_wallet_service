import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserWithWalletDto, UsersWithWalletsResponseDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUsersWithWalletNumbers(): Promise<UsersWithWalletsResponseDto> {
    // Fetch all users with their associated wallets using TypeORM relations
    const users = await this.userRepository.find({
      relations: ['wallet'], // This will eager load the wallet relation
    });

    // Map the entities to DTOs
    const userDtos: UserWithWalletDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      walletNumber: user.wallet?.walletNumber || 'No wallet assigned',
      balance: user.wallet?.balance || 0,
      createdAt: user.createdAt,
    }));

    return { users: userDtos };
  }

  async getUserWithWalletById(userId: string): Promise<UserWithWalletDto> {
    // Fetch a specific user with their wallet
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      walletNumber: user.wallet?.walletNumber || 'No wallet assigned',
      balance: user.wallet?.balance || 0,
      createdAt: user.createdAt,
    };
  }
}