import { DanetApplication } from '@danet/core';
import { load } from '@std/dotenv';
import { AppModule } from './app.module.ts';

// Load environment variables
await load({ export: true });

async function bootstrap() {
  const app = new DanetApplication();
  await app.init(AppModule);

  const port = Number(Deno.env.get('PORT')) || 3000;
  
  console.log(`Road Trip Narrator Backend starting on port ${port}`);
  await app.listen(port);
}

if (import.meta.main) {
  bootstrap();
}