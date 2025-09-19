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
import * as _ from 'lodash'
import { z } from 'zod'

import * as path from 'node:path'
import * as process from 'node:process'

import { ConfigData, configDataSchema } from '@/config/schema'
import { EventEmitter, EventMap } from '@/utils/event-emitter'

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

  private currentConfigPath: string | null = null
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

    return _.cloneDeep(this.currentConfig)
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

    this.currentConfigPath = this.searchForConfigFile()
    await this.loadConfig()

    this.watcher = chokidar.watch(this.currentConfigPath)
    this.watcher.on('change', this.handleConfigChange.bind(this))
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

  async updateConfig(configData: ConfigData) {
    if (!this.currentConfigPath) {
      throw new Error('Config file path is not set')
    }

    const isJson =
      path.extname(this.currentConfigPath).toLowerCase() === '.json'

    const dataToWrite = isJson
      ? JSON.stringify(configData, null, 2)
      : yaml.dump(configData, { noRefs: true })

    await fs.writeFile(this.currentConfigPath, dataToWrite, 'utf-8')
  }

  private async loadConfig() {
    if (!this.currentConfigPath) {
      throw new Error('Config file path is not set')
    }

    const isJson =
      path.extname(this.currentConfigPath).toLowerCase() === '.json'

    const config = isJson
      ? await fs.readJson(this.currentConfigPath)
      : yaml.load(await fs.promises.readFile(this.currentConfigPath, 'utf-8'))

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
