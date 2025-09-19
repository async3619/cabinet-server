import { Body, Controller, Get, Inject, Put } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import { ConfigService } from '@/config/config.service'
import { configDataSchema } from '@/config/schema'

class ConfigDTO extends createZodDto(configDataSchema) {}

@Controller('config')
export class ConfigController {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  @Get('/')
  getConfig() {
    return this.configService.config
  }

  @Put('/')
  async update(@Body() newConfig: ConfigDTO) {
    await this.configService.updateConfig(newConfig)
  }
}
