import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_EXPIRY_HOURS = 48;

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(buyerId: string, productId: string, amountPaise: number, message?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE', deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === buyerId) throw new BadRequestException('Cannot offer on own item');
    if (amountPaise >= product.pricePaise) {
      throw new BadRequestException('Offer must be below listing price');
    }
    if (amountPaise < Math.floor(product.pricePaise * 0.5)) {
      throw new BadRequestException('Offer too low (min 50% of price)');
    }

    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3600_000);
    return this.prisma.offer.create({
      data: {
        productId,
        buyerId,
        sellerId: product.sellerId,
        amountPaise,
        message,
        status: 'PENDING',
        expiresAt,
      },
    });
  }

  async respond(
    userId: string,
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterAmountPaise?: number,
  ) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException();
    if (offer.expiresAt < new Date()) throw new BadRequestException('Offer expired');
    if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
      throw new BadRequestException('Offer not actionable');
    }

    if (action === 'accept') {
      if (offer.sellerId !== userId && offer.buyerId !== userId) {
        throw new ForbiddenException();
      }
      return this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
    }

    if (action === 'reject') {
      if (offer.sellerId !== userId) throw new ForbiddenException();
      return this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
    }

    if (action === 'counter') {
      if (offer.sellerId !== userId) throw new ForbiddenException();
      if (!counterAmountPaise) throw new BadRequestException('counterAmountPaise required');

      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'COUNTERED', respondedAt: new Date() },
      });

      return this.prisma.offer.create({
        data: {
          productId: offer.productId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          amountPaise: counterAmountPaise,
          status: 'PENDING',
          parentOfferId: offerId,
          expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3600_000),
        },
      });
    }

    throw new BadRequestException('Invalid action');
  }

  async mine(userId: string, role: 'buyer' | 'seller' = 'buyer') {
    return this.prisma.offer.findMany({
      where: role === 'buyer' ? { buyerId: userId } : { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            pricePaise: true,
            media: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
      },
      take: 50,
    });
  }
}
