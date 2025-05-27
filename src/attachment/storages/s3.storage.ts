import {
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  DeleteObjectCommand,
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
    const { hostname: bucketName, pathname: filePath } = new URL(destinationUri)

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
        Key: filePath.startsWith('/') ? filePath.slice(1) : filePath,
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
    const { hostname: bucketName, pathname: filePath } = new URL(targetUri)
    const key = filePath.startsWith('/') ? filePath.slice(1) : filePath

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
}
