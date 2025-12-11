import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import {
  UsersWithWalletsResponseDto,
  UserWithWalletDto,
} from '../dto/user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getUsersWithWalletNumbers(): Promise<UsersWithWalletsResponseDto> {
    return this.userService.getUsersWithWalletNumbers();
  }

  @Get(':id')
  async getUserWithWalletById(
    @Param('id') userId: string,
  ): Promise<UserWithWalletDto> {
    return this.userService.getUserWithWalletById(userId);
  }
}
