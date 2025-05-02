import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'

import { ConfigService } from '@/config/config.service'
import { WATCHER_CONSTRUCTOR_MAP, WatcherMap } from '@/crawler/watchers'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name)
  private readonly watchers: BaseWatcher<string, any>[] = []

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const watcherNames = Object.keys(
      this.configService.config.watchers,
    ) as Array<keyof WatcherMap>

    for (const watcherName of watcherNames) {
      const watcherConfigs = this.configService.config.watchers[watcherName]
      if (!watcherConfigs) {
        continue
      }

      for (const config of watcherConfigs) {
        switch (config.type) {
          case 'four-chan':
            this.watchers.push(new WATCHER_CONSTRUCTOR_MAP[config.type](config))
            break

          default:
            throw new Error(
              `Unknown watcher configuration type '${config.type}'`,
            )
        }

        this.logger.log(`Successfully created '${config.type}' watcher`)
      }
    }
  }
}
