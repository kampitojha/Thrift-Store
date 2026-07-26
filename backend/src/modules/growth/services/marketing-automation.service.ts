import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface CampaignDefinition {
  type: string;
  name: string;
  description: string;
  trigger: string;
  delayHours: number;
  channel: 'email' | 'push' | 'sms' | 'whatsapp';
}

const BUILT_IN_CAMPAIGNS: CampaignDefinition[] = [
  { type: 'welcome', name: 'Welcome Series', description: 'Send welcome message after signup', trigger: 'user.signup', delayHours: 1, channel: 'email' },
  { type: 'abandoned_cart', name: 'Abandoned Cart', description: 'Remind users about items left in cart', trigger: 'cart.abandoned', delayHours: 4, channel: 'push' },
  { type: 'abandoned_cart_followup', name: 'Abandoned Cart Follow-up', description: 'Follow-up reminder with discount', trigger: 'cart.abandoned', delayHours: 24, channel: 'email' },
  { type: 'price_drop', name: 'Price Drop Alert', description: 'Notify when wishlist item price drops', trigger: 'product.price_drop', delayHours: 0, channel: 'push' },
  { type: 'review_reminder', name: 'Review Reminder', description: 'Ask for review after delivery', trigger: 'order.delivered', delayHours: 72, channel: 'email' },
  { type: 'wishlist_reminder', name: 'Wishlist Reminder', description: 'Remind about wishlist items', trigger: 'wishlist.reminder', delayHours: 168, channel: 'email' },
  { type: 'reactivation', name: 'Reactivation Campaign', description: 'Win back inactive users', trigger: 'user.inactive', delayHours: 0, channel: 'email' },
  { type: 'birthday', name: 'Birthday Campaign', description: 'Send birthday wish with coupon', trigger: 'user.birthday', delayHours: 0, channel: 'email' },
  { type: 'weekly_digest', name: 'Weekly Digest', description: 'Weekly activity summary', trigger: 'cron.weekly', delayHours: 0, channel: 'email' },
];

@Injectable()
export class MarketingAutomationService {
  private readonly logger = new Logger(MarketingAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  getBuiltInCampaigns() {
    return BUILT_IN_CAMPAIGNS;
  }

  async getCampaigns(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      this.prisma.platformJob.findMany({
        where: { type: 'campaign', tags: { has: 'marketing' } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.platformJob.count({ where: { type: 'campaign', tags: { has: 'marketing' } } }),
    ]);

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: (c.payload as any)?.name || c.type,
        type: (c.payload as any)?.campaignType || 'general',
        status: c.status,
        progress: c.progress,
        channel: (c.payload as any)?.channel || 'email',
        segments: (c.payload as any)?.segments || [],
        scheduledAt: c.scheduledAt,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async createCampaign(data: {
    name: string;
    type: string;
    description?: string;
    segments?: string[];
    delayHours?: number;
    channel?: string;
    template?: Record<string, unknown>;
    isActive?: boolean;
  }) {
    return this.prisma.platformJob.create({
      data: {
        type: 'campaign',
        status: data.isActive !== false ? 'pending' : 'paused',
        priority: 5,
        payload: {
          name: data.name,
          campaignType: data.type,
          description: data.description,
          segments: data.segments || [],
          delayHours: data.delayHours || 0,
          channel: data.channel || 'email',
        template: (data.template || {}) as any,
      },
      tags: ['marketing', data.type],
      },
    });
  }

  async updateCampaign(id: string, data: any) {
    const job = await this.prisma.platformJob.findUnique({ where: { id } });
    if (!job) return null;

    const payload = { ...(job.payload as any), ...data };
    return this.prisma.platformJob.update({
      where: { id },
      data: { payload, status: data.isActive !== undefined ? (data.isActive ? 'pending' : 'paused') : job.status },
    });
  }

  async deleteCampaign(id: string) {
    await this.prisma.platformJob.delete({ where: { id } });
    return { ok: true };
  }

  async triggerAbandonedCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { select: { id: true, title: true, slug: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } } } } } },
    });

    if (!cart?.items.length) return;

    const itemsList = cart.items.map((i) => `${i.product.title} (₹${(i.pricePaise / 100).toFixed(0)})`).join(', ');

    await this.notifications.push(userId, 'PROMOTION', 'Complete Your Purchase!', `You left ${itemsList} in your cart. Check out now!`, { cartId: cart.id, itemCount: cart.items.length }, 'IN_APP');
  }

  async triggerPriceDropAlert(productId: string, oldPrice: number, newPrice: number) {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { productId },
      include: { user: { select: { id: true } } },
    });

    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { title: true, slug: true } });
    if (!product) return;

    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    for (const item of wishlistItems) {
      await this.notifications.push(item.user.id, 'PRICE_DROP', `Price Drop: ${product.title}`, `Price dropped by ${discount}%! Now ₹${(newPrice / 100).toFixed(0)}`, { productId, oldPrice, newPrice, discount }, 'IN_APP');
    }
  }

  async triggerWishlistReminder(userId: string) {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, title: true, pricePaise: true, slug: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
      take: 5,
    });

    if (!wishlistItems.length) return;

    const itemsList = wishlistItems.map((wi) => wi.product.title).join(', ');
    await this.notifications.push(userId, 'WISHLIST_ALERT', 'Items in Your Wishlist', `Don't forget about ${itemsList}`, { itemCount: wishlistItems.length }, 'IN_APP');
  }

  async scheduleBirthdayCampaign() {
    const today = new Date();
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: { id: true, metadata: true, displayName: true },
    });

    const birthdayUsers = users.filter((u) => {
      const dob = (u.metadata as any)?.dateOfBirth;
      if (!dob) return false;
      const d = new Date(dob);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    });

    for (const user of birthdayUsers) {
      await this.notifications.push(user.id, 'PROMOTION', 'Happy Birthday!', `Happy Birthday ${user.displayName || ''}! Enjoy a special birthday discount!`, { type: 'birthday' }, 'IN_APP');
    }
  }
}
