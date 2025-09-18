import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { formatJsonError, formatYamlError } from 'better-zod-errors'
import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
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

const AVAILABLE_CONFIG_FILE_PATHS = [
  path.join(process.cwd(), 'cabinet.config.json'),
  path.join(process.cwd(), 'cabinet.config.yml'),
  path.join(process.cwd(), 'cabinet.config.yaml'),
]

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

    const configFilePath = await this.loadConfig()

    this.watcher = chokidar.watch(configFilePath)
    this.watcher.on(
      'change',
      this.handleConfigChange.bind(this, configFilePath),
    )
  }

  async onModuleDestroy() {
    if (!this.watcher) {
      return
    }

    await this.watcher.close()
    this.watcher = null
  }

  private searchForConfigFile() {
    const existingConfigFilePaths = AVAILABLE_CONFIG_FILE_PATHS.filter((p) =>
      fs.existsSync(p),
    )

    if (existingConfigFilePaths.length === 0) {
      throw new Error(
        'There was no config file found. Tried: \n' +
          AVAILABLE_CONFIG_FILE_PATHS.map((p) => `  - ${p}`).join('\n'),
      )
    }

    if (existingConfigFilePaths.length > 1) {
      this.logger.warn(
        'Multiple config files found, using the first one: ' +
          existingConfigFilePaths[0],
      )
    }

    return existingConfigFilePaths[0]
  }

  private async loadConfig(targeFilePath?: string) {
    const configFilePath = targeFilePath ?? this.searchForConfigFile()
    const isJson = path.extname(configFilePath).toLowerCase() === '.json'

    const config = isJson
      ? await fs.readJson(configFilePath)
      : yaml.load(await fs.promises.readFile(configFilePath, 'utf-8'))

    try {
      this.currentConfig = configDataSchema.parse(config)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formatter = isJson ? formatJsonError : formatYamlError
        const formattedErrors = error.issues.map((issue) =>
          formatter(issue, config, {
            useColor: true,
            syntaxHighlighting: true,
          }),
        )

        throw new Error(formattedErrors[0])
      } else {
        throw error
      }
    }

    return configFilePath
  }

  private async handleConfigChange(targetFilePath: string) {
    this.logger.warn('Server configuration changed, reloading configuration...')

    try {
      await this.loadConfig(targetFilePath)
      this.logger.log('Reloaded server configuration file successfully.')
      this.emit('change')
    } catch (e) {
      this.logger.error('Failed to load configuration file:')
      this.logger.error(e)
    }
  }
}
