import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const isProduction = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  const swaggerEnabled = (process.env.ENABLE_SWAGGER ?? (!isProduction).toString()).toLowerCase() === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MiniCloud API')
      .setDescription('MiniCloud backend API documentation')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        'bearer'
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true
      }
    });
  }

  await app.listen(8081);
}

bootstrap();
