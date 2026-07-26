import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import { CmsAdminService } from './cms-admin.service';
import { CmsAdminController } from './cms-admin.controller';

@Module({
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService, CmsAdminService],
  exports: [CmsService, CmsAdminService],
})
export class CmsModule {}
