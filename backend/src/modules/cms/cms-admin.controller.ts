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
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CmsAdminService } from './cms-admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('CMS Admin')
@ApiBearerAuth()
@Controller({ path: 'admin/cms', version: '1' })
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CmsAdminController {
  constructor(private readonly cmsAdmin: CmsAdminService) {}

  // ── Banners ──────────────────────────────────────────────

  @Get('banners')
  listBanners(@Query() q: PaginationDto) {
    return this.cmsAdmin.listBanners(q.page, q.limit);
  }

  @Get('banners/:id')
  getBanner(@Param('id') id: string) {
    return this.cmsAdmin.getBanner(id);
  }

  @Post('banners')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createBanner(@Body() body: any) {
    return this.cmsAdmin.createBanner(body);
  }

  @Patch('banners/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateBanner(@Param('id') id: string, @Body() body: any) {
    return this.cmsAdmin.updateBanner(id, body);
  }

  @Delete('banners/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteBanner(@Param('id') id: string) {
    return this.cmsAdmin.deleteBanner(id);
  }

  @Post('banners/reorder')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reorderBanners(@Body('ids') ids: string[]) {
    return this.cmsAdmin.reorderBanners(ids);
  }

  // ── Blog Posts ───────────────────────────────────────────

  @Get('blogs')
  listBlogs(
    @Query() q: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.cmsAdmin.listBlogs(q.page, q.limit, { status });
  }

  @Get('blogs/:id')
  getBlog(@Param('id') id: string) {
    return this.cmsAdmin.getBlog(id);
  }

  @Post('blogs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createBlog(@Body() body: any) {
    return this.cmsAdmin.createBlog(body);
  }

  @Patch('blogs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateBlog(@Param('id') id: string, @Body() body: any) {
    return this.cmsAdmin.updateBlog(id, body);
  }

  @Delete('blogs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteBlog(@Param('id') id: string) {
    return this.cmsAdmin.deleteBlog(id);
  }

  // ── Static Pages ─────────────────────────────────────────

  @Get('pages')
  listPages(@Query() q: PaginationDto) {
    return this.cmsAdmin.listPages(q.page, q.limit);
  }

  @Get('pages/:id')
  getPage(@Param('id') id: string) {
    return this.cmsAdmin.getPage(id);
  }

  @Post('pages')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createPage(@Body() body: any) {
    return this.cmsAdmin.createPage(body);
  }

  @Patch('pages/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updatePage(@Param('id') id: string, @Body() body: any) {
    return this.cmsAdmin.updatePage(id, body);
  }

  @Delete('pages/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deletePage(@Param('id') id: string) {
    return this.cmsAdmin.deletePage(id);
  }

  // ── FAQs ─────────────────────────────────────────────────

  @Get('faqs')
  listFaqs(@Query() q: PaginationDto) {
    return this.cmsAdmin.listFaqs(q.page, q.limit);
  }

  @Get('faqs/:id')
  getFaq(@Param('id') id: string) {
    return this.cmsAdmin.getFaq(id);
  }

  @Post('faqs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createFaq(@Body() body: any) {
    return this.cmsAdmin.createFaq(body);
  }

  @Patch('faqs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateFaq(@Param('id') id: string, @Body() body: any) {
    return this.cmsAdmin.updateFaq(id, body);
  }

  @Delete('faqs/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteFaq(@Param('id') id: string) {
    return this.cmsAdmin.deleteFaq(id);
  }

  @Post('faqs/reorder')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reorderFaqs(@Body('ids') ids: string[]) {
    return this.cmsAdmin.reorderFaqs(ids);
  }
}
