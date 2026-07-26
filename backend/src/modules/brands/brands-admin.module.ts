import { Module } from '@nestjs/common';
import { BrandsAdminService } from './brands-admin.service';
import { BrandsAdminController } from './brands-admin.controller';

@Module({
  controllers: [BrandsAdminController],
  providers: [BrandsAdminService],
  exports: [BrandsAdminService],
})
export class BrandsAdminModule {}
