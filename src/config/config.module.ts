import { Module } from '@nestjs/common'

import { ConfigController } from '@/config/config.controller'
import { ConfigService } from '@/config/config.service'

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
  controllers: [ConfigController],
})
export class ConfigModule {}
