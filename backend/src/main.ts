import { DanetApplication } from "@danet/core";
import { SwaggerModule, SpecBuilder } from "@danet/swagger";
import { load } from "@std/dotenv";
import { AppModule } from "./app.module.ts";
import { ConfigurationService } from "./configuration/index.ts";

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

  // Setup OpenAPI/Swagger documentation
  const config = new SpecBuilder()
    .setTitle("Jabberjaw API")
    .setDescription("Location-aware travel content generation API")
    .setVersion("1.0")
    .addTag("journey", "Journey and story management")
    .addTag("poi", "Point of Interest discovery")
    .addTag("content", "Content generation and storage")
    .build();

  const document = await SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Get configuration service to read port
  const configService = app.get(ConfigurationService);
  const port = await configService.getPort();

  console.log(`Jabberjaw Backend starting on port ${port}`);
  await app.listen(port);
}

if (import.meta.main) {
  bootstrap();
}
