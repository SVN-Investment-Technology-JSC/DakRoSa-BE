import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name);
  readonly client: Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('storage.bucket');
    this.client = new Client({
      endPoint: config.getOrThrow<string>('storage.endpoint'),
      port: config.getOrThrow<number>('storage.port'),
      useSSL: config.getOrThrow<boolean>('storage.useSSL'),
      accessKey: config.getOrThrow<string>('storage.accessKey'),
      secretKey: config.getOrThrow<string>('storage.secretKey'),
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      if (!(await this.client.bucketExists(this.bucket))) {
        await this.client.makeBucket(this.bucket);
      }
      this.logger.log('MinIO storage is ready.');
    } catch (error) {
      this.logger.warn(
        `MinIO is not ready: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async isReady(): Promise<boolean> {
    try {
      return await this.client.bucketExists(this.bucket);
    } catch {
      return false;
    }
  }
}
