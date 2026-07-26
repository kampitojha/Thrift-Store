import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller({ path: 'admin/feature-flags', version: '1' })
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  list(@Query() q: PaginationDto) {
    return this.flags.list(q.page, q.limit);
  }

  @Get('public')
  @Public()
  getAllEnabled() {
    return this.flags.getAllEnabled();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.flags.get(id);
  }

  @Get('key/:key')
  getByKey(@Param('key') key: string) {
    return this.flags.getByKey(key);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() body: { key: string; description?: string; enabled?: boolean; rolloutPct?: number; rules?: any }) {
    return this.flags.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.flags.update(id, body);
  }

  @Patch(':id/toggle')
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggle(@Param('id') id: string) {
    return this.flags.toggle(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  delete(@Param('id') id: string) {
    return this.flags.delete(id);
  }
}
