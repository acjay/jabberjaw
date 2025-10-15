import { assertEquals, assertObjectMatch } from "@std/assert";
import { describe, it, beforeAll, afterAll } from "@std/testing/bdd";
import { DanetApplication } from "@danet/core";
import { AppModule } from "../src/app.module.ts";

describe("AppController (e2e)", () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = new DanetApplication();
    await app.init(AppModule);

    // Use port 0 to let the OS assign an available port
    const server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET)", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const json = await response.json();

    assertEquals(response.status, 200);
    assertObjectMatch(json, {
      status: "healthy",
      service: "road-trip-narrator-backend",
      runtime: "Deno",
    });
  });
});
