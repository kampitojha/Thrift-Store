import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('CMS')
@Controller({ path: 'cms', version: '1' })
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get('home')
  home() {
    return this.cms.home();
  }

  @Public()
  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.cms.page(slug);
  }

  @Public()
  @Get('faqs')
  faqs() {
    return this.cms.faqs();
  }

  @Public()
  @Get('blogs')
  blogs(@Query('page') page?: string) {
    return this.cms.blogs(Number(page) || 1);
  }
}
