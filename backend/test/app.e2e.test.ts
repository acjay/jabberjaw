import { assertEquals, assertObjectMatch } from '@std/assert';
import { describe, it, beforeAll, afterAll } from '@std/testing/bdd';
import { DanetApplication } from '@danet/core';
import { AppModule } from '../src/app.module.ts';

describe('AppController (e2e)', () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = new DanetApplication();
    await app.init(AppModule);
    
    const port = 3001; // Use different port for testing
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', async () => {
    const response = await fetch(`${baseUrl}/`);
    const text = await response.text();
    
    assertEquals(response.status, 200);
    assertEquals(text, 'Road Trip Narrator Backend API is running with Deno and Danet!');
  });

  it('/health (GET)', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const json = await response.json();
    
    assertEquals(response.status, 200);
    assertObjectMatch(json, {
      status: 'healthy',
      service: 'road-trip-narrator-backend',
      runtime: 'Deno',
    });
  });
});