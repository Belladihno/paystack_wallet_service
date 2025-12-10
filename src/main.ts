import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CustomLogger } from './logger/logger.service';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Environment variable validation
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
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach((variable) => {
      console.error(`   - ${variable}`);
    });
    process.exit(1);
  }

  console.log('All required environment variables are present');
}

async function bootstrap(): Promise<void> {
  try {
    // Validate environment variables first
    validateEnvironmentVariables();

    console.log('Creating NestJS application...');
    const customLogger = new CustomLogger();
    const app = await NestFactory.create(AppModule, {
      logger: customLogger,
    });

    console.log('Application created successfully');

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());
    console.log('Exception filter configured');

    // Global response interceptor
    app.useGlobalInterceptors(new ResponseInterceptor());
    console.log('Response interceptor configured');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    console.log('Validation pipe configured');

    // Swagger documentation
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
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API key for service-to-service authentication',
        },
        'api-key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    console.log('Swagger documentation configured');

    console.log('Starting server...');
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://0.0.0.0:${port}`);
    console.log(`Swagger docs available at: http://0.0.0.0:${port}/api`);
    console.log(`Health check available at: http://0.0.0.0:${port}/health`);
  } catch (error) {
    console.error('Application failed to start:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
}

bootstrap();
