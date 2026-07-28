import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif'];
const MAX_SIZE = 10 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  constructor(private readonly config: ConfigService) {}

  async getSignedUpload(userId: string, contentType: string, folder = 'products') {
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException('Unsupported file type');
    }

    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    const key = `${folder}/${userId}/${randomUUID()}.${ext}`;
    const provider = this.config.get('storageProvider') || 'local';
    const baseUrl = this.config.get('appUrl') || 'http://localhost:4000';

    return {
      provider,
      key,
      uploadUrl: `${baseUrl}/api/v1/uploads/local/${key}`,
      publicUrl: `${baseUrl}/api/v1/uploads/local/${key}`,
      headers: { 'Content-Type': contentType },
      expiresIn: 600,
    };
  }

  async saveLocalFile(buffer: Buffer, key: string): Promise<string> {
    const uploadDir = join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    const baseUrl = this.config.get('appUrl') || 'http://localhost:4000';
    return `${baseUrl}/api/v1/uploads/local/${key}`;
  }

  async uploadBuffer(userId: string, buffer: Buffer, filename: string): Promise<{ url: string; key: string }> {
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `products/${userId}/${randomUUID()}.${ext}`;
    const url = await this.saveLocalFile(buffer, key);
    return { url, key };
  }
}
