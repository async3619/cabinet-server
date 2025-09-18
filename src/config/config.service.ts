import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { formatJsonError } from 'better-zod-errors'
import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import { z } from 'zod'

import * as path from 'node:path'
import * as process from 'node:process'

import { storageOptionsSchema } from '@/attachment/storages'
import { crawlerOptionsSchema } from '@/crawler/crawlers'
import { EventEmitter, EventMap } from '@/utils/event-emitter'

const configDataSchema = z
  .object({
    attachment: z.object({
      downloadThrottle: z.object({
        download: z.number(),
        failover: z.number(),
      }),
      hashCheck: z.boolean().optional(),
    }),
    crawling: z.object({
      deleteObsolete: z.boolean().optional(),
      interval: z.union([z.number(), z.string()]),
    }),
    storage: storageOptionsSchema,
    watchers: z.array(crawlerOptionsSchema),
  })
  .describe("The application's main configuration schema.")

/**
 * @public
 */
export type ConfigData = z.infer<typeof configDataSchema>

const CONFIG_FILE_PATH = path.join(process.cwd(), 'cabinet.config.json')
const CONFIG_SCHEMA_FILE_PATH = path.join(
  process.cwd(),
  'cabinet.config.schema.json',
)

interface ConfigServiceEventMap extends EventMap {
  change: () => void
}

@Injectable()
export class ConfigService
  extends EventEmitter<ConfigServiceEventMap>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConfigService.name)

  private currentConfig: ConfigData | null = null
  private watcher: chokidar.FSWatcher | null = null

  get storage() {
    return this.config.storage
  }

  get attachment() {
    return this.config.attachment
  }

  get crawling() {
    return {
      deleteObsolete: false,
      ...this.config.crawling,
    }
  }

  get config() {
    if (!this.currentConfig) {
      throw new Error('Config is not loaded properly')
    }

    return this.currentConfig
  }

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const jsonSchema = z.toJSONSchema(configDataSchema)
        await fs.writeJson(CONFIG_SCHEMA_FILE_PATH, jsonSchema)

        this.logger.debug(
          'Successfully generated JSON schema file for config data',
        )
      } catch {
        this.logger.debug('Failed to generate JSON schema file for config data')
      }
    }

    await this.loadConfig()

    this.watcher = chokidar.watch(CONFIG_FILE_PATH)
    this.watcher.on('change', this.handleConfigChange.bind(this))
  }

  async onModuleDestroy() {
    if (!this.watcher) {
      return
    }

    await this.watcher.close()
    this.watcher = null
  }

  private async loadConfig() {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error('Config file not found!')
    }

    const config = await fs.readJson(CONFIG_FILE_PATH)

    try {
      this.currentConfig = configDataSchema.parse(config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map((issue) =>
          formatJsonError(issue, config, {
            useColor: true,
            syntaxHighlighting: true,
          }),
        )

        throw new Error(formattedErrors[0])
      } else {
        throw error
      }
    }
  }

  private async handleConfigChange() {
    this.logger.warn('Server configuration changed, reloading configuration...')

    try {
      await this.loadConfig()
      this.logger.log('Reloaded server configuration file successfully.')
      this.emit('change')
    } catch (e) {
      this.logger.error('Failed to load configuration file:')
      this.logger.error(e)
    }
  }
}
