import {
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  S3Client,
  S3ServiceException,
  waitUntilBucketExists,
  waitUntilObjectNotExists,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

import type {
  BaseStorageOptions,
  StorageDeleteOptions,
  StorageSaveResult,
} from '@/attachment/storages/base.storage'
import { BaseStorage } from '@/attachment/storages/base.storage'
import type { RawAttachment } from '@/crawler/types/attachment'
import { DownloadError } from '@/utils/downloadFile'
import { md5 } from '@/utils/hash'
import { mimeType } from '@/utils/mimetype'

/**
 * @public
 */
export interface S3StorageOptions extends BaseStorageOptions<'s3'> {
  bypassExistsCheck?: boolean
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
  endpoint?: string
  ensureBucketExists?: boolean
  fileBucketUri: string
  region?: string
  thumbnailBucketUri: string
}

export class S3Storage extends BaseStorage<'s3', S3StorageOptions> {
  private readonly client: S3Client

  constructor(options: S3StorageOptions) {
    super('s3', options)

    this.client = new S3Client({
      region: options.region,
      credentials: options.credentials,
      endpoint: options.endpoint,
    })
  }

  private parseUri(uri: string): { bucketName: string; key: string } {
    const url = new URL(uri)
    if (url.protocol !== 's3:') {
      throw new Error(`Invalid S3 URI "${uri}". It must start with "s3://".`)
    }

    const bucketName = url.hostname
    const key = url.pathname.startsWith('/')
      ? url.pathname.slice(1)
      : url.pathname

    return { bucketName, key }
  }

  private async ensureBucket(bucketUri: string) {
    const url = new URL(bucketUri)
    if (url.protocol !== 's3:') {
      throw new Error(
        `Invalid bucket URI "${bucketUri}". It must start with "s3://" protocol.`,
      )
    }

    const bucketName = url.hostname

    try {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: bucketName,
        }),
      )
      await waitUntilBucketExists(
        { client: this.client, maxWaitTime: 10 },
        { Bucket: bucketName },
      )
    } catch (error) {
      if (error instanceof BucketAlreadyOwnedByYou) {
        return
      }

      if (error instanceof BucketAlreadyExists) {
        throw new Error(
          `The bucket "${bucketName}" already exists in another AWS account. Bucket names must be globally unique.`,
        )
      }

      throw error
    }

    await this.client.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicPolicy: false,
        },
      }),
    )

    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${bucketName}/*`,
            },
          ],
        }),
      }),
    )
  }

  private async uploadFromUrl(fileUrl: string, destinationUri: string) {
    const { key, bucketName } = this.parseUri(destinationUri)
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new DownloadError(await response.text(), response.status)
    }

    if (!response.body) {
      throw new Error('Invalid response body')
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
      },
    })

    await upload.done()

    return {
      mime: await mimeType(buffer),
      hash: await md5(buffer),
    }
  }

  private async deleteObject(targetUri: string) {
    const { key, bucketName } = this.parseUri(targetUri)

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      )

      await waitUntilObjectNotExists(
        { client: this.client, maxWaitTime: 10 },
        { Bucket: bucketName, Key: key },
      )
    } catch (error) {
      if (error instanceof S3ServiceException) {
        if (error.name === 'NoSuchBucket') {
          throw new Error(
            `Error from S3 while deleting object from ${bucketName}. The bucket doesn't exist.`,
          )
        }

        throw new Error(
          `Error from S3 while deleting object from ${bucketName}. ${error.name}: ${error.message}`,
        )
      }

      throw error
    }
  }

  async initialize() {
    if (this.options.ensureBucketExists) {
      await this.ensureBucket(this.options.fileBucketUri)
      await this.ensureBucket(this.options.thumbnailBucketUri)
    }
  }

  async save(attachment: RawAttachment<string>): Promise<StorageSaveResult> {
    const { fileBucketUri, thumbnailBucketUri } = this.options
    const fileUri = new URL(fileBucketUri)
    const thumbnailUri = new URL(thumbnailBucketUri)

    fileUri.pathname = `${attachment.createdAt}${attachment.extension}`
    thumbnailUri.pathname = `${attachment.createdAt}s.jpg`

    const { mime, hash } = await this.uploadFromUrl(
      attachment.url,
      fileUri.toString(),
    )
    if (attachment.thumbnail) {
      await this.uploadFromUrl(
        attachment.thumbnail.url,
        thumbnailUri.toString(),
      )
    }

    return {
      fileUri: fileUri.toString(),
      mime,
      hash,
      thumbnailUri: attachment.thumbnail ? thumbnailUri.toString() : undefined,
    }
  }

  async delete({ fileUri, thumbnailUri }: StorageDeleteOptions): Promise<void> {
    if (fileUri) {
      await this.deleteObject(fileUri)
    }

    if (thumbnailUri) {
      await this.deleteObject(thumbnailUri)
    }
  }

  async exists(uri: string): Promise<boolean> {
    const { bucketName, key } = this.parseUri(uri)
    if (this.options.bypassExistsCheck) {
      return true
    }

    try {
      await this.client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      )

      return true
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return false
      }

      if (error instanceof S3ServiceException) {
        throw new Error(
          `Error from S3 while getting object from ${bucketName}.  ${error.name}: ${error.message}`,
        )
      }

      throw error
    }
  }

  async getHashOf(): Promise<string | null> {
    throw new Error('Method not implemented.')
  }
}
