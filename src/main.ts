import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CustomLogger } from './logger/logger.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  // Exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Paystack webhook: capture raw body for HMAC verification
  app.use(
    '/wallet/paystack/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  // JSON parsing for other routes
  app.use(bodyParser.json());

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running at http://0.0.0.0:${port}`);
}
bootstrap();
