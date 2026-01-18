import { IncomingMessage } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';

export const AUTH_BASE_PATH = process.env.BETTER_AUTH_BASE_PATH || '/auth';

export function shouldSkipBodyParser(path: string | undefined) {
  return Boolean(path?.startsWith(AUTH_BASE_PATH));
}

export function hasJsonContent(req: IncomingMessage) {
  const type = req.headers['content-type'];
  return typeof type === 'string' && type.includes('application/json');
}

export function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve(undefined);
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        return resolve(raw.length > 0 ? JSON.parse(raw) : undefined);
      } catch (error) {
        return reject(error);
      }
    });
    req.on('error', reject);
  });
}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.use(async (req, _res, next) => {
    if (shouldSkipBodyParser(req.url)) {
      return next();
    }

    if (!hasJsonContent(req) || req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    try {
      (req as IncomingMessage & { body?: unknown }).body =
        await readJsonBody(req);
      next();
    } catch (error) {
      next(error);
    }
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Savant API')
    .setDescription('Savant backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/api-docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
