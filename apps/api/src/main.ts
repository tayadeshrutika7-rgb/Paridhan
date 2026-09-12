import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { APP_CONFIG } from '@paridhan/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const webAppUrl = configService.get<string>('WEB_APP_URL', 'http://localhost:3000');

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.enableCors({
    origin: [webAppUrl, 'http://localhost:3000', 'http://localhost:8081'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );


  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle(`${APP_CONFIG.name} API`)
    .setDescription(`${APP_CONFIG.name} — ${APP_CONFIG.tagline} (Backend API Service)`)
    .setVersion(APP_CONFIG.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Supabase Auth JWT Token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`🚀 ${APP_CONFIG.name} API running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 API Swagger Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
