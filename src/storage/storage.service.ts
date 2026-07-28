import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    const fileExtension = extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    await this.client.putObject(this.bucket, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return fileName;
  }

  async getFileUrl(
    fileName: string,
    expirySeconds: number = 24 * 60 * 60,
  ): Promise<string> {
    return await this.client.presignedGetObject(
      this.bucket,
      fileName,
      expirySeconds,
    );
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.client.removeObject(this.bucket, fileName);
  }

  async putTenantLogo(
    tenantId: string,
    file: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(
      this.bucket,
      this.tenantLogoKey(tenantId),
      file,
      file.length,
      { 'Content-Type': contentType },
    );
  }

  async getTenantLogo(tenantId: string) {
    const key = this.tenantLogoKey(tenantId);
    try {
      const [stream, stat] = await Promise.all([
        this.client.getObject(this.bucket, key),
        this.client.statObject(this.bucket, key),
      ]);
      return {
        stream,
        contentType: stat.metaData['content-type'] ?? 'application/octet-stream',
      };
    } catch {
      throw new NotFoundException('Không tìm thấy logo doanh nghiệp.');
    }
  }

  async removeTenantLogo(tenantId: string): Promise<void> {
    await this.client.removeObject(this.bucket, this.tenantLogoKey(tenantId));
  }

  private tenantLogoKey(tenantId: string): string {
    return `tenant-logos/${tenantId}/logo`;
  }
}
