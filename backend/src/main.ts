import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Use a custom logger for more control over output
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // Global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  const allowedOrigins =
    'production' === process.env.NODE_ENV
      ? [
          'https://g88.app',
          'https://www.g88.app',
          'capacitor://localhost', // Capacitor iOS
          'ionic://localhost', // Capacitor Android
          'http://localhost', // Capacitor general
        ]
      : [
          'http://localhost:3000',
          'http://localhost:8081',
          'http://10.0.2.2:8081', // Android emulator
        ];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  logger.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('G88 API')
    .setDescription('G88 Location-Based Social Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('locations', 'Geospatial operations')
    .addTag('chat', 'Real-time messaging')
    .addTag('payments', 'Stripe payments')
    .addTag('verification', 'Identity verification')
    .addTag('notifications', 'Push notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const serverUrl = `http://localhost:${port}`;
  const apiUrl = `${serverUrl}/api/v1`;
  const docsUrl = `${serverUrl}/api/docs`;

  logger.log(`
    \n
    ╔═══════════════════════════════════════════════════════════════╗
    ║                    G88 Backend Server                         ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  🚀 Server running on: ${serverUrl}                            ║
    ║  📖 API Docs:          ${docsUrl}                               ║
    ║  📱 Android Emulator:  http://10.0.2.2:${port}                  ║
    ║  🔌 API Endpoint:      ${apiUrl}                                ║
    ╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  // Ensure any unhandled bootstrap errors are logged
  const logger = new Logger('Bootstrap');
  logger.error('Failed to bootstrap the application', err);
  process.exit(1);
});
