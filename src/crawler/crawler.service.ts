import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import chalk from 'chalk'
import { CronJob } from 'cron'
import * as pluralize from 'pluralize'
import prettyMilliseconds from 'pretty-ms'

import { ConfigService } from '@/config/config.service'
import { getBoardUniqueId, RawBoard } from '@/crawler/types/board'
import { WATCHER_CONSTRUCTOR_MAP, WatcherMap } from '@/crawler/watchers'
import { BaseWatcher } from '@/crawler/watchers/base.watcher'
import { stopwatch } from '@/utils/stopwatch'

const CRAWLER_TASK_NAME = 'crawler'

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name)
  private readonly watchers: BaseWatcher<string, any>[] = []

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  private async createWatchers(): Promise<void> {
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

  private initializeSchedulers(): void {
    const crawlInterval = this.configService.crawlInterval
    if (typeof crawlInterval === 'string') {
      const job = new CronJob(crawlInterval, this.doCrawling.bind(this))
      this.schedulerRegistry.addCronJob(CRAWLER_TASK_NAME, job)
      job.start()
    } else {
      const interval = setInterval(this.doCrawling.bind(this), crawlInterval)
      this.schedulerRegistry.addInterval(CRAWLER_TASK_NAME, interval)
    }
  }

  private async doCrawling(): Promise<void> {
    this.logger.log(
      `Starting crawling task for ${this.watchers.length} watchers`,
    )

    const allBoardMap: Record<string, RawBoard<string>> = {}
    const elapsedTime = await stopwatch(async () => {
      for (const watcher of this.watchers) {
        const boards = await watcher.watch()
        for (const board of boards) {
          allBoardMap[getBoardUniqueId(board)] = board
        }
      }
    })

    const boardCount = Object.keys(allBoardMap).length
    const tokens = [
      `${boardCount.toString()} ${pluralize('board', boardCount)}`,
    ]
      .map((token) => chalk.blue(token))
      .join(' and ')

    this.logger.log(`Successfully finished crawling task with ${tokens}`)

    this.logger.log(
      `This crawling task took ${chalk.blue(prettyMilliseconds(elapsedTime, { verbose: true }))}`,
    )
  }

  async onModuleInit() {
    await this.createWatchers()
    this.initializeSchedulers()
  }
}
