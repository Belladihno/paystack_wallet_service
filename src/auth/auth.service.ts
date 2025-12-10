import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Wallet } from '../entities/wallet.entity';
import { GoogleAuthResponseDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
  ) {}

  async findOrCreateUser(
    googleId: string,
    email: string,
    name: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({ where: { googleId } });
    if (!user) {
      // Create new user
      user = this.userRepository.create({ googleId, email, name });
      user = await this.userRepository.save(user);
      console.log(`New user created: ${user.id}, ${user.email}`);

      // auto-create wallet
      try {
        const walletNumber = await this.generateWalletNumber();
        console.log(`Generated wallet number: ${walletNumber} for user: ${user.id}`);

        const wallet = this.walletRepository.create({
          userId: user.id,
          walletNumber,
        });
        await this.walletRepository.save(wallet);
        console.log(`Wallet created successfully for user: ${user.id}`);
      } catch (walletError) {
        console.error(`Failed to create wallet for user ${user.id}: ${walletError.message}`);
        // Continue without wallet creation to allow user login
      }
    } else {
      console.log(`Existing user found: ${user.id}, ${user.email}`);

      // Check if user has a wallet
      try {
        const wallet = await this.walletRepository.findOne({ where: { userId: user.id } });
        if (!wallet) {
          console.warn(`Existing user ${user.id} has no wallet!`);
        } else {
          console.log(`User ${user.id} has wallet: ${wallet.walletNumber}`);
        }
      } catch (walletCheckError) {
        console.error(`Failed to check wallet for user ${user.id}: ${walletCheckError.message}`);
      }
    }
    return user;
  }

  async generateJwt(user: User): Promise<GoogleAuthResponseDto> {
    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);
    return { jwt };
  }

  private async generateWalletNumber(): Promise<string> {
    let walletNumber: string;
    let attempts = 0;

    do {
      walletNumber = Math.random().toString().slice(2, 15);
      attempts++;

      if (attempts > 10) {
        throw new Error('Failed to generate unique wallet number after 10 attempts');
      }
    } while (await this.walletRepository.findOne({ where: { walletNumber } }));

    return walletNumber;
  }
}

