import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                pricePaise: true,
                originalPricePaise: true,
                status: true,
                quantity: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true } },
                seller: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  pricePaise: true,
                  originalPricePaise: true,
                  status: true,
                  quantity: true,
                  media: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  seller: { select: { id: true, username: true } },
                },
              },
            },
          },
        },
      });
    }

    const subtotalPaise = cart.items.reduce(
      (sum, i) => sum + i.product.pricePaise * i.quantity,
      0,
    );

    return {
      id: cart.id,
      items: cart.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        pricePaise: i.product.pricePaise,
        product: {
          ...i.product,
          thumbnailUrl: i.product.media[0]?.url ?? null,
        },
      })),
      itemCount: cart.items.length,
      subtotalPaise,
    };
  }

  async addItem(userId: string, productId: string, quantity = 1) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE', deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not available');
    if (product.sellerId === userId) {
      throw new BadRequestException('Cannot add your own product to cart');
    }
    if (product.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        pricePaise: product.pricePaise,
      },
      update: {
        quantity: { increment: quantity },
        pricePaise: product.pricePaise,
      },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart empty');

    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    } else {
      await this.prisma.cartItem.updateMany({
        where: { id: itemId, cartId: cart.id },
        data: { quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart empty');

    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.getCart(userId);
  }
}
