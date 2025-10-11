import { DanetApplication } from "@danet/core";
import { load } from "@std/dotenv";
import { AppModule } from "./app.module.ts";

// Load environment variables
await load({ export: true });

async function bootstrap() {
  const app = new DanetApplication();
  await app.init(AppModule);

  // Configure CORS for mobile app communication
  app.enableCors({
    origin: "*", // Allow all origins for development
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  });

  const port = Number(Deno.env.get("PORT")) || 3000;

  console.log(`Jabberjaw Backend starting on port ${port}`);
  await app.listen(port);
}

if (import.meta.main) {
  bootstrap();
}
