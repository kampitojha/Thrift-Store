import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class ModerateDto {
  @IsEnum(['approve', 'reject']) action!: 'approve' | 'reject';
  @IsOptional() @IsString() notes?: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('products/pending')
  pending(@Query() q: PaginationDto) {
    return this.admin.pendingProducts(q.page, q.limit);
  }

  @Patch('products/:id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateDto,
  ) {
    return this.admin.moderateProduct(user.id, id, dto.action, dto.notes);
  }

  @Get('users')
  users(@Query() q: PaginationDto, @Query('q') search?: string) {
    return this.admin.listUsers(q.page, q.limit, search);
  }

  @Patch('users/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.admin.setUserStatus(user.id, id, body.status);
  }
}
