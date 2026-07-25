import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { AiService } from './ai.service';

class GenerateListingDto {
  @IsOptional() @IsString() imageHints?: string;
  @IsOptional() @IsString() categoryHint?: string;
  @IsOptional() @IsString() brandHint?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() rawNotes?: string;
}

class PriceSuggestDto {
  @IsString() title!: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() category?: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('listing')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  generateListing(@Body() dto: GenerateListingDto) {
    return this.ai.generateListing(dto);
  }

  @Post('price')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  suggestPrice(@Body() dto: PriceSuggestDto) {
    return this.ai.suggestPrice(dto);
  }

  @Post('spam-check')
  spamCheck(@Body() body: { text: string }) {
    return this.ai.detectSpam(body.text || '');
  }
}
