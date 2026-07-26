import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { SavedSearchesService } from './saved-searches.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateSavedSearchDto {
  @IsString() query!: string;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsBoolean() alertOn?: boolean;
}

class UpdateSavedSearchDto {
  @IsOptional() @IsString() query?: string;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsBoolean() alertOn?: boolean;
}

@ApiTags('Saved Searches')
@ApiBearerAuth()
@Controller({ path: 'saved-searches', version: '1' })
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearches.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.savedSearches.findAll(user.id, q.page, q.limit);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearches.update(user.id, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.savedSearches.delete(user.id, id);
  }

  @Patch(':id/toggle-alert')
  toggleAlert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.savedSearches.toggleAlert(user.id, id);
  }
}
