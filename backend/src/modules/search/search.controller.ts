import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.search.autocomplete(q || '');
  }

  @Public()
  @Get('trending')
  trending() {
    return this.search.trendingSearches();
  }

  @Post('reindex')
  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  reindex() {
    return this.search.reindexAll();
  }
}
