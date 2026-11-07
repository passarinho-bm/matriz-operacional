import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','), methods: ['GET', 'POST'] });
  // Produção: o mesmo processo serve o front já compilado.
  const web = join(process.cwd(), 'dist/app');
  if (existsSync(web)) app.useStaticAssets(web);
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, process.env.API_HOST ?? '0.0.0.0');
  console.log(`API em http://localhost:${port}/api`);
}
void bootstrap();
