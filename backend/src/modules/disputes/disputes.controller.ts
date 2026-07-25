import { Body, Controller, Get, Param, Post, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DisputesService } from './disputes.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class RaiseDisputeDto {
  @IsString() orderId!: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() evidenceUrls?: string[];
}

class ResolveDisputeDto {
  @IsString() action!: 'resolve_buyer' | 'resolve_seller' | 'escalate' | 'close';
  @IsOptional() @IsString() resolution?: string;
}

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller({ path: 'disputes', version: '1' })
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a dispute' })
  raise(@CurrentUser() user: AuthUser, @Body() dto: RaiseDisputeDto) {
    return this.disputes.raise(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my disputes' })
  myDisputes(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.disputes.myDisputes(user.id, q.page, q.limit);
  }

  @Get('seller')
  @ApiOperation({ summary: 'List disputes for seller' })
  sellerDisputes(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.disputes.sellerDisputes(user.id, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details' })
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.disputes.findOne(user.id, id);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve/escalate/close dispute' })
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolve(user.id, id, dto);
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence to dispute' })
  addEvidence(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { urls: string[]; statement?: string }) {
    return this.disputes.addEvidence(user.id, id, body);
  }
}
