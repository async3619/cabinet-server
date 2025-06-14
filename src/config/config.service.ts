import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import Ajv from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import * as JsonSchemaGenerator from 'ts-json-schema-generator'

import * as path from 'node:path'
import * as process from 'node:process'

import { StorageOptionsMap } from '@/attachment/storages'
import { CrawlerMap } from '@/crawler/crawlers'
import { EventEmitter, EventMap } from '@/utils/event-emitter'

/**
 * @public
 */
export type ConfigData = {
  attachment: {
    downloadThrottle: {
      download: number
      failover: number
    }
    hashCheck?: boolean
  }
  crawling: {
    deleteObsolete?: boolean
    interval: number | string
  }
  storage: StorageOptionsMap[keyof StorageOptionsMap]
  watchers: {
    [TKey in keyof CrawlerMap]?: CrawlerMap[TKey]['config'][]
  }
}

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
  private readonly ajv = new Ajv({ allowUnionTypes: true })

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
        const jsonSchema = JsonSchemaGenerator.createGenerator({
          path: path.join(process.cwd(), 'src', 'config', 'config.service.ts'),
          tsconfig: path.join(process.cwd(), 'tsconfig.json'),
          type: 'ConfigData',
        }).createSchema('ConfigData')

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
    if (!fs.existsSync(CONFIG_SCHEMA_FILE_PATH)) {
      throw new Error('Config data schema file not found')
    }

    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error('Config file not found!')
    }

    const schema = await fs.readJson(CONFIG_SCHEMA_FILE_PATH)
    const config = await fs.readJson(CONFIG_FILE_PATH)

    const validate = this.ajv.compile(schema)
    const valid = validate(config)

    if (!valid && validate.errors) {
      const output = betterAjvErrors(schema, config, validate.errors)
      throw new Error(output)
    }

    this.currentConfig = config
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
