import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './logger/logger.service';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import * as bodyParser from 'body-parser';
import expressModule from 'express';

// ---------------------------
// ENV VAR VALIDATION
// ---------------------------
const requiredEnvVars = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'BASE_URL',
];

function validateEnvironmentVariables(): void {
  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) missingVars.push(envVar);
  }

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }

  console.log('All required environment variables are present');
}

// ---------------------------
// BOOTSTRAP
// ---------------------------
async function bootstrap(): Promise<void> {
  try {
    validateEnvironmentVariables();

    console.log('Creating NestJS application...');
    const customLogger = new CustomLogger();

    // Disable bodyParser globally, we'll handle JSON & raw separately
    const app = await NestFactory.create(AppModule, {
      logger: customLogger,
      bodyParser: false,
    });

    console.log('Application created successfully');

    // ---------------------------
    // RAW BODY PARSER FOR PAYSTACK WEBHOOK
    // ---------------------------
    const webhookApp = expressModule();
    webhookApp.use(bodyParser.raw({ type: '*/*' }));
    app.use('/wallet/paystack/webhook', webhookApp);

    // ---------------------------
    // GLOBAL MIDDLEWARE
    // ---------------------------
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // ---------------------------
    // SWAGGER
    // ---------------------------
    const config = new DocumentBuilder()
      .setTitle('Paystack Wallet Service API')
      .setDescription(
        'A comprehensive wallet service with Paystack integration, JWT authentication, and API key management',
      )
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('wallet', 'Wallet operations')
      .addTag('keys', 'API key management')
      .addTag('health', 'Health monitoring')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    // ---------------------------
    // START SERVER
    // ---------------------------
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`Application running on http://0.0.0.0:${port}`);
    console.log(`Swagger docs at http://0.0.0.0:${port}/api`);
    console.log(`Health check at http://0.0.0.0:${port}/health`);
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
