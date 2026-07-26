import { Module } from '@nestjs/common';
import { SavedSearchesService } from './saved-searches.service';
import { SavedSearchesController } from './saved-searches.controller';

@Module({
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
