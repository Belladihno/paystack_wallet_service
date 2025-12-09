import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  // Uses default throttler behavior with configurable limits
  // Can be customized per endpoint with @Throttle() decorator
}