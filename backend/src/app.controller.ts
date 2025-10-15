import { Controller, Get } from "@danet/core";
import { AppService } from "./app.service.ts";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  async getHealth() {
    return await this.appService.getHealth();
  }
}
