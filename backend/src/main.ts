import { DanetApplication } from "@danet/core";
import { load } from "@std/dotenv";
import { AppModule } from "./app.module.ts";
import { ConfigurationService } from "./shared/configuration/index.ts";

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

  // Get configuration service to read port
  const configService = app.get(ConfigurationService);
  const port = await configService.getPort();

  console.log(`Jabberjaw Backend starting on port ${port}`);
  await app.listen(port);
}

if (import.meta.main) {
  bootstrap();
}
