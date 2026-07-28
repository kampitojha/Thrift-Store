import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { UploadsService } from './uploads.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class SignedUploadDto {
  @IsString() contentType!: string;
  @IsOptional() @IsString() folder?: string;
}

@ApiTags('Uploads')
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('signed-url')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  signed(@CurrentUser() user: AuthUser, @Body() dto: SignedUploadDto) {
    return this.uploads.getSignedUpload(user.id, dto.contentType, dto.folder);
  }

  @Post('file')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('File required');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    return this.uploads.uploadBuffer(user.id, file.buffer, file.originalname);
  }

  private readonly allowedFolders = new Set(['products', 'avatars', 'banners', 'categories', 'documents', 'logos', 'media']);

  @Get('local/:folder/:userId/:file')
  serveLocal(
    @Param('folder') folder: string,
    @Param('userId') _userId: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    if (!this.allowedFolders.has(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }
    const sanitizedFile = file.replace(/\.\.\//g, '').replace(/\.\.\\/g, '').replace(/[/\\]/g, '');
    if (!sanitizedFile) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    const basePath = resolve(process.cwd(), 'uploads');
    const filePath = resolve(basePath, folder, _userId, sanitizedFile);
    if (!filePath.startsWith(basePath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    const stream = createReadStream(filePath);
    stream.on('error', () => res.status(404).json({ error: 'Not found' }));
    stream.pipe(res);
  }
}
