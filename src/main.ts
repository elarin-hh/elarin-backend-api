import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import fastifyCookie, { FastifyCookieOptions } from '@fastify/cookie';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';

const collectInvalidFields = (
  errors: ValidationError[],
  parentPath = '',
): string[] => {
  const fields: string[] = [];

  for (const error of errors) {
    const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints && Object.keys(error.constraints).length > 0) {
      fields.push(currentPath);
    }

    if (error.children && error.children.length > 0) {
      fields.push(...collectInvalidFields(error.children, currentPath));
    }
  }

  return fields;
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === 'development' ? true : {
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const rawCorsOrigins = configService.get<string>('corsOrigin') || '';
  const allowedOrigins = rawCorsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  await app.register<FastifyCookieOptions>(fastifyCookie as any, {
    secret: configService.get<string>('COOKIE_SECRET'),
    parseOptions: {
      httpOnly: true,
      sameSite: nodeEnv === 'production' ? 'none' : 'lax',
      path: '/',
      secure: nodeEnv === 'production',
    },
  });

  await app.register(helmet as any, {
    contentSecurityPolicy: false,
  });

  app.enableCors({
    origin: (origin, callback) => {
      const isLocal =
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.match(/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/);

      const isAllowedOrigin = allowedOrigins.includes(origin || '');

      if (isLocal || isAllowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
  });

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
      exceptionFactory: (errors) => {
        const fields = collectInvalidFields(errors);
        const uniqueFields = Array.from(new Set(fields));
        const message =
          uniqueFields.length > 0
            ? `Dados inválidos: ${uniqueFields.join(', ')}.`
            : 'Dados inválidos.';
        return new BadRequestException(message);
      },
    }),
  );

  const port = configService.get('port') || 3000;
  await app.listen(port, '0.0.0.0');

  Logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
