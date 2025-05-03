import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import Ajv from 'ajv'
import betterAjvErrors from 'better-ajv-errors'
import * as fs from 'fs-extra'
import * as JsonSchemaGenerator from 'ts-json-schema-generator'

import * as path from 'node:path'
import * as process from 'node:process'

import { WatcherMap } from '@/crawler/watchers'

/**
 * @public
 */
export type ConfigData = {
  attachment: {
    downloadPath: string
    throttle: {
      download: number
      failover: number
    }
    thumbnailPath: string
  }
  crawlInterval: number | string
  watchers: {
    [TKey in keyof WatcherMap]?: WatcherMap[TKey]['config'][]
  }
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'cabinet.config.json')
const CONFIG_SCHEMA_FILE_PATH = path.join(
  process.cwd(),
  'cabinet.config.schema.json',
)

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name)
  private readonly ajv = new Ajv()

  private currentConfig: ConfigData | null = null

  get attachment() {
    return this.config.attachment
  }

  get crawlInterval(): number | string {
    return this.config.crawlInterval
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
}
