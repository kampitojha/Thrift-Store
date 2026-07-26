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
import { BrandsAdminService } from './brands-admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Brands Admin')
@ApiBearerAuth()
@Controller({ path: 'admin/brands', version: '1' })
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class BrandsAdminController {
  constructor(private readonly brands: BrandsAdminService) {}

  @Get()
  list(
    @Query() q: PaginationDto,
    @Query('q') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.brands.list(q.page, q.limit, {
      q: search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.brands.get(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() body: { name: string; slug?: string; logoUrl?: string; isLuxury?: boolean; isActive?: boolean }) {
    return this.brands.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.brands.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  delete(@Param('id') id: string) {
    return this.brands.delete(id);
  }
}
