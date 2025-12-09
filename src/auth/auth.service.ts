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
      user = this.userRepository.create({ googleId, email, name });
      user = await this.userRepository.save(user);

      // auto-create wallet
      const walletNumber = this.generateWalletNumber();
      const wallet = this.walletRepository.create({
        userId: user.id,
        walletNumber,
      });
      await this.walletRepository.save(wallet);
    }
    return user;
  }

  async generateJwt(user: User): Promise<GoogleAuthResponseDto> {
    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);
    return { jwt };
  }

  private generateWalletNumber(): string {
    return Math.random().toString().slice(2, 12);
  }
}
