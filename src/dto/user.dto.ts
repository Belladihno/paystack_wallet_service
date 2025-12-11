import { ApiProperty } from '@nestjs/swagger';

export class UserWithWalletDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  walletNumber: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  createdAt: Date;
}

export class UsersWithWalletsResponseDto {
  @ApiProperty({ type: [UserWithWalletDto] })
  users: UserWithWalletDto[];
}