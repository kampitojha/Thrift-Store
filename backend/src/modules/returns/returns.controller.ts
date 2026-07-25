import { Body, Controller, Get, Param, Post, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max, IsArray } from 'class-validator';
import { ReturnsService } from './returns.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class RequestReturnDto {
  @IsString() reason!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() evidenceUrls?: string[];
}

class ProcessReturnDto {
  @IsString() action!: 'approve' | 'reject' | 'complete';
  @IsOptional() @IsString() note?: string;
}

@ApiTags('Returns')
@ApiBearerAuth()
@Controller({ path: 'returns', version: '1' })
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a return for an order item' })
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestReturnDto & { orderId: string }) {
    return this.returns.requestReturn(user.id, dto.orderId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my return requests' })
  myReturns(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.returns.myReturns(user.id, q.page, q.limit);
  }

  @Get('seller')
  @ApiOperation({ summary: 'List return requests for seller' })
  sellerReturns(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.returns.sellerReturns(user.id, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request details' })
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.returns.findOne(user.id, id);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: 'Approve/reject/complete return' })
  process(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ProcessReturnDto,
  ) {
    return this.returns.processReturn(user.id, id, dto);
  }
}
