import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthResponseDto } from '../dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects user to Google OAuth consent screen for authentication'
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth'
  })
  async googleAuth() {
    // Initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Handles Google OAuth callback, creates/updates user, and returns JWT token'
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: GoogleAuthResponseDto
  })
  async googleAuthRedirect(@Req() req: any): Promise<GoogleAuthResponseDto> {
    const user = req.user;
    return await this.authService.generateJwt(user);
  }
}
