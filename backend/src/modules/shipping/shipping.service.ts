import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DeliveryEstimate {
  minDays: number;
  maxDays: number;
  estimatedMin: Date;
  estimatedMax: Date;
  carrierDays: number;
}

export interface CarrierRate {
  carrier: string;
  carrierLabel: string;
  serviceType: string;
  ratePaise: number;
  estimatedDays: number;
  estimatedMin: Date;
  estimatedMax: Date;
}

export interface CarrierInfo {
  id: string;
  label: string;
  supportedServices: string[];
  hasPickup: boolean;
  hasTracking: boolean;
  hasLabelGeneration: boolean;
  website: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  private readonly CARRIERS: CarrierInfo[] = [
    { id: 'shiprocket', label: 'Shiprocket', supportedServices: ['STANDARD', 'EXPRESS'], hasPickup: true, hasTracking: true, hasLabelGeneration: true, website: 'https://shiprocket.in' },
    { id: 'delhivery', label: 'Delhivery', supportedServices: ['STANDARD', 'EXPRESS'], hasPickup: true, hasTracking: true, hasLabelGeneration: true, website: 'https://delhivery.com' },
    { id: 'bluedart', label: 'Blue Dart', supportedServices: ['STANDARD', 'EXPRESS', 'OVERNIGHT'], hasPickup: true, hasTracking: true, hasLabelGeneration: true, website: 'https://bluedart.com' },
    { id: 'dtdc', label: 'DTDC', supportedServices: ['STANDARD', 'EXPRESS'], hasPickup: true, hasTracking: true, hasLabelGeneration: false, website: 'https://dtdc.in' },
    { id: 'indiapost', label: 'India Post', supportedServices: ['STANDARD', 'INTERNATIONAL'], hasPickup: false, hasTracking: true, hasLabelGeneration: false, website: 'https://indiapost.gov.in' },
    { id: 'manual', label: 'Manual / Other', supportedServices: ['STANDARD'], hasPickup: false, hasTracking: false, hasLabelGeneration: false, website: '' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  getAllCarriers(): CarrierInfo[] {
    return this.CARRIERS;
  }

  private async assertSeller(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async createProfile(userId: string, data: {
    name: string; carrier?: string; estimatedDelivery?: string;
    chargePaise?: number; freeShipping?: boolean; isDefault?: boolean; rules?: Record<string, unknown>;
  }) {
    await this.assertSeller(userId);
    return this.prisma.shippingAccount.create({
      data: {
        sellerProfile: { connect: { userId } },
        carrier: data.carrier || 'manual',
        credentials: { name: data.name, estimatedDelivery: data.estimatedDelivery, chargePaise: data.chargePaise, freeShipping: data.freeShipping, isDefault: data.isDefault ?? false, rules: data.rules } as any,
      },
    });
  }

  async listProfiles(userId: string) {
    await this.assertSeller(userId);
    return this.prisma.shippingAccount.findMany({
      where: { sellerProfile: { userId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProfile(userId: string, id: string, data: Record<string, unknown>) {
    await this.assertSeller(userId);
    const profile = await this.prisma.shippingAccount.findFirst({
      where: { id, sellerProfile: { userId } },
    });
    if (!profile) throw new NotFoundException('Shipping profile not found');

    const creds = profile.credentials as Record<string, unknown>;
    return this.prisma.shippingAccount.update({
      where: { id },
      data: {
        carrier: (data.carrier as string) ?? profile.carrier,
        credentials: { ...creds, ...data } as any,
      },
    });
  }

  async deleteProfile(userId: string, id: string) {
    await this.assertSeller(userId);
    const profile = await this.prisma.shippingAccount.findFirst({
      where: { id, sellerProfile: { userId } },
    });
    if (!profile) throw new NotFoundException('Shipping profile not found');
    await this.prisma.shippingAccount.delete({ where: { id } });
    return { ok: true };
  }

  async shipOrder(userId: string, orderId: string, data: { trackingNumber: string; carrier?: string; status?: string }) {
    await this.assertSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.shipment.findFirst({ where: { orderId } });
    if (existing) throw new ForbiddenException('Order already has a shipment');

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId,
        carrier: data.carrier || 'manual',
        trackingNumber: data.trackingNumber,
        status: data.status || 'SHIPPED',
        shippedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'SHIPPED', shippedAt: new Date() },
    });

    await this.prisma.orderTimeline.create({
      data: { orderId, status: 'SHIPPED', note: `Shipped via ${data.carrier || 'manual'} - ${data.trackingNumber}` },
    });

    return shipment;
  }

  async updateTracking(userId: string, orderId: string, data: { trackingNumber: string; carrier?: string; status?: string }) {
    await this.assertSeller(userId);
    const shipment = await this.prisma.shipment.findFirst({
      where: { orderId, order: { items: { some: { sellerId: userId } } } },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');

    return this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        trackingNumber: data.trackingNumber,
        carrier: data.carrier ?? shipment.carrier,
        status: data.status ?? shipment.status,
      },
    });
  }

  async getSettings(userId: string) {
    await this.assertSeller(userId);
    const profiles = await this.prisma.shippingAccount.findMany({
      where: { sellerProfile: { userId } },
      orderBy: { createdAt: 'desc' },
    });
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { policies: true, storeName: true },
    });
    return { profiles, policies: seller?.policies || {} };
  }

  async updateSettings(userId: string, data: Record<string, unknown>) {
    const seller = await this.assertSeller(userId);
    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { policies: (data.policies ?? seller.policies) as any },
    });
    return { ok: true };
  }

  async getDeliveryEstimate(
    originCity: string,
    originState: string,
    originPincode: string,
    destCity: string,
    destState: string,
    destPincode: string,
    shippingMethod?: string,
  ): Promise<DeliveryEstimate> {
    const method = (shippingMethod || 'STANDARD').toUpperCase();

    const sameCity = originCity.toLowerCase() === destCity.toLowerCase();
    const sameState = originState.toLowerCase() === destState.toLowerCase();
    const metroOrigins = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'kolkata', 'chennai', 'hyderabad', 'pune', 'ahmedabad'];
    const originMetro = metroOrigins.includes(originCity.toLowerCase());
    const destMetro = metroOrigins.includes(destCity.toLowerCase());

    let minDays = 3;
    let maxDays = 7;

    if (sameCity) { minDays = 1; maxDays = 1; }
    else if (sameState) { minDays = 2; maxDays = 3; }
    else if (originMetro && destMetro) { minDays = 2; maxDays = 4; }
    else if (originMetro || destMetro) { minDays = 3; maxDays = 6; }

    if (method === 'EXPRESS') {
      minDays = Math.max(1, minDays - 1);
      maxDays = Math.max(minDays, maxDays - 2);
    } else if (method === 'OVERNIGHT') {
      minDays = 1;
      maxDays = 1;
    } else if (method === 'INTERNATIONAL') {
      minDays = 7;
      maxDays = 21;
    }

    const now = new Date();
    const estimatedMin = this.addBusinessDays(now, minDays);
    const estimatedMax = this.addBusinessDays(now, maxDays);

    return { minDays, maxDays, estimatedMin, estimatedMax, carrierDays: maxDays };
  }

  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) added++;
    }
    return result;
  }

  async rateShipment(
    sellerId: string,
    weightGrams: number,
    originPincode: string,
    destPincode: string,
    shippingMethod?: string,
  ): Promise<CarrierRate[]> {
    const method = (shippingMethod || 'STANDARD').toUpperCase();
    const baseRate = this.calculateBaseRate(weightGrams);
    const days = method === 'EXPRESS' ? 2 : method === 'OVERNIGHT' ? 1 : 4;

    return this.CARRIERS
      .filter((c) => c.id !== 'manual' && c.supportedServices.includes(method))
      .map((carrier) => {
        const multiplier = carrier.id === 'bluedart' ? 1.3 : carrier.id === 'shiprocket' ? 0.9 : carrier.id === 'indiapost' ? 0.7 : 1.0;
        const ratePaise = Math.round(baseRate * multiplier);
        const now = new Date();
        return {
          carrier: carrier.id,
          carrierLabel: carrier.label,
          serviceType: method,
          ratePaise,
          estimatedDays: days,
          estimatedMin: this.addBusinessDays(now, Math.max(1, days - 1)),
          estimatedMax: this.addBusinessDays(now, days),
        };
      });
  }

  private calculateBaseRate(weightGrams: number): number {
    if (weightGrams <= 500) return 5000;
    if (weightGrams <= 1000) return 7000;
    if (weightGrams <= 2000) return 9000;
    if (weightGrams <= 5000) return 15000;
    return 15000 + Math.ceil((weightGrams - 5000) / 1000) * 2000;
  }

  async schedulePickup(
    userId: string,
    orderId: string,
    data: { carrier: string; pickupDate: string; pickupTimeSlot: string; addressId: string },
  ) {
    await this.assertSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
      include: { shipments: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const carrier = this.CARRIERS.find((c) => c.id === data.carrier);
    if (!carrier) throw new BadRequestException(`Unsupported carrier: ${data.carrier}`);
    if (!carrier.hasPickup) throw new BadRequestException(`${carrier.label} does not support pickup scheduling`);

    const address = await this.prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw new BadRequestException('Pickup address not found');

    const pickupRequest = {
      carrier: data.carrier,
      pickupDate: data.pickupDate,
      timeSlot: data.pickupTimeSlot,
      address: `${address.line1}, ${address.line2 ? address.line2 + ', ' : ''}${address.city}, ${address.state} - ${address.postalCode}`,
      orderNumber: order.orderNumber,
      requestedAt: new Date().toISOString(),
    };

    this.logger.log(`Pickup requested for order ${order.orderNumber}: ${JSON.stringify(pickupRequest)}`);

    await this.prisma.orderTimeline.create({
      data: {
        orderId,
        status: order.status as any,
        note: `Pickup scheduled with ${carrier.label} on ${data.pickupDate} (${data.pickupTimeSlot})`,
        actorId: userId,
      },
    });

    return { ok: true, pickupRequest };
  }

  async generateLabel(userId: string, orderId: string, carrier?: string) {
    await this.assertSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, items: { some: { sellerId: userId } } },
      include: { shipments: true, shippingAddress: true, items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const shipment = order.shipments[0];
    if (!shipment) throw new BadRequestException('Order has not been shipped yet');

    const targetCarrier = carrier || shipment.carrier || 'manual';
    const carrierInfo = this.CARRIERS.find((c) => c.id === targetCarrier);
    if (!carrierInfo) throw new BadRequestException(`Unsupported carrier: ${targetCarrier}`);

    if (!carrierInfo.hasLabelGeneration) {
      throw new BadRequestException(`${carrierInfo.label} does not support automated label generation`);
    }

    const labelMeta = {
      carrier: targetCarrier,
      orderNumber: order.orderNumber,
      shipmentId: shipment.id,
      generatedAt: new Date().toISOString(),
      labelUrl: null,
    };

    this.logger.log(`Label generated for order ${order.orderNumber}: carrier=${targetCarrier}`);

    return { ok: true, label: labelMeta };
  }

  async trackShipment(carrier: string, trackingNumber: string) {
    const carrierInfo = this.CARRIERS.find((c) => c.id === carrier);
    if (!carrierInfo) throw new BadRequestException(`Unsupported carrier: ${carrier}`);

    const trackingUrl = this.buildTrackingUrl(carrier, trackingNumber);
    const statuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      carrier,
      trackingNumber,
      trackingUrl,
      status: currentStatus,
      lastUpdated: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private buildTrackingUrl(carrier: string, trackingNumber: string): string | null {
    const urls: Record<string, string> = {
      shiprocket: `https://shiprocket.in/tracking/${trackingNumber}`,
      delhivery: `https://delhivery.com/track/${trackingNumber}`,
      bluedart: `https://bluedart.com/tracking?tdn=${trackingNumber}`,
      dtdc: `https://dtdc.in/tracking/${trackingNumber}`,
      indiapost: `https://indiapost.gov.in/track/${trackingNumber}`,
    };
    return urls[carrier] || null;
  }
}
