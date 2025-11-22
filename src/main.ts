import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import fastifyCookie, { FastifyCookieOptions } from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create app with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === 'development' ? true : {
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
  );

  // Add hook to handle empty JSON bodies before parsing
  app.getHttpAdapter().getInstance().addHook('preParsing', async (request: any, reply: any, payload: any) => {
    if (request.headers['content-type'] === 'application/json') {
      // Check if payload is empty
      const chunks: any[] = [];
      for await (const chunk of payload) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString('utf8');

      // If empty, return a stream with empty object
      if (body === '') {
        const { Readable } = require('stream');
        const readable = new Readable();
        readable.push('{}');
        readable.push(null);
        return readable;
      }

      // Otherwise, return original payload
      const { Readable } = require('stream');
      const readable = new Readable();
      readable.push(body);
      readable.push(null);
      return readable;
    }
    return payload;
  });

  const configService = app.get(ConfigService);

  await app.register<FastifyCookieOptions>(fastifyCookie as any, {
    secret: configService.get<string>('COOKIE_SECRET'),
    parseOptions: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  });

  // Security
  await app.register(helmet as any, {
    contentSecurityPolicy: false,
  });

  // CORS - Allow requests from local network
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests from localhost, 192.168.x.x network, and no origin (mobile apps, Postman, etc)
      if (!origin ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.match(/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: false,
      validateCustomDecorators: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Elarin API')
    .setDescription('AI-powered fitness trainer API built with NestJS + Fastify')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Exercises', 'Exercise management endpoints')
    .addTag('Training', 'Training session endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get('port') || 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
  Logger.log(`API Documentation: http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
