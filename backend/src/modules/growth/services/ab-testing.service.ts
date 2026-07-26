import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../config/redis.module';

@Injectable()
export class AbTestingService {
  private readonly logger = new Logger(AbTestingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createExperiment(data: {
    name: string;
    description?: string;
    metric: string;
    variants: Array<{ name: string; config: Record<string, unknown>; trafficPct: number }>;
    hypothesis?: string;
    maxUsers?: number;
  }) {
    const totalPct = data.variants.reduce((s, v) => s + v.trafficPct, 0);
    if (totalPct > 100) throw new Error('Traffic percentage exceeds 100');

    return this.prisma.featureFlag.create({
      data: {
        key: `exp:${data.name.toLowerCase().replace(/\s+/g, '_')}`,
        description: data.description || data.hypothesis,
        enabled: true,
        rolloutPct: 100,
        rules: {
          type: 'experiment',
          metric: data.metric,
          hypothesis: data.hypothesis,
          variants: data.variants,
          maxUsers: data.maxUsers,
          results: {},
        } as any,
      },
    });
  }

  async getExperiments() {
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { startsWith: 'exp:' } },
      orderBy: { createdAt: 'desc' },
    });

    return flags.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.key.replace('exp:', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: f.description,
      enabled: f.enabled,
      createdAt: f.createdAt,
      ...((f.rules as any) || {}),
    }));
  }

  async getExperiment(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: `exp:${key.startsWith('exp:') ? key.replace('exp:', '') : key}` } });
    if (!flag) return null;
    return {
      id: flag.id,
      key: flag.key,
      name: flag.key.replace('exp:', '').replace(/_/g, ' '),
      enabled: flag.enabled,
      ...((flag.rules as any) || {}),
    };
  }

  async assignVariant(userId: string, experimentKey: string): Promise<string> {
    const cacheKey = `exp:${experimentKey}:user:${userId}`;
    const cached = await this.redis.get<string>(cacheKey);
    if (cached) return cached;

    const flag = await this.prisma.featureFlag.findUnique({ where: { key: experimentKey } });
    if (!flag || !flag.enabled) return 'control';

    const rules = flag.rules as any;
    if (!rules?.variants?.length) return 'control';

    const variants = rules.variants as Array<{ name: string; trafficPct: number; config: Record<string, unknown> }>;
    const roll = Math.random() * 100;
    let cumulative = 0;
    let assigned = variants[0].name;

    for (const v of variants) {
      cumulative += v.trafficPct;
      if (roll <= cumulative) {
        assigned = v.name;
        break;
      }
    }

    await this.redis.set(cacheKey, assigned, 86400 * 30);

    await this.redis.incr(`${experimentKey}:assignment:${assigned}`, 86400 * 30);

    return assigned;
  }

  async trackConversion(experimentKey: string, variant: string) {
    await this.redis.incr(`${experimentKey}:conversion:${variant}`, 86400 * 30);
  }

  async getResults(experimentKey: string) {
    const fullKey = experimentKey.startsWith('exp:') ? experimentKey : `exp:${experimentKey}`;
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: fullKey } });
    if (!flag) return null;

    const rules = flag.rules as any;
    if (!rules?.variants?.length) return null;

    const results = [];
    for (const v of (rules.variants as Array<{ name: string; config: Record<string, unknown> }>)) {
      const assignments = parseInt(await this.redis.get(`${fullKey}:assignment:${v.name}`) || '0', 10);
      const conversions = parseInt(await this.redis.get(`${fullKey}:conversion:${v.name}`) || '0', 10);
      results.push({
        variant: v.name,
        assignments,
        conversions,
        conversionRate: assignments > 0 ? Math.round((conversions / assignments) * 10000) / 100 : 0,
      });
    }

    return { experiment: fullKey, metric: rules.metric, hypothesis: rules.hypothesis, results };
  }

  async toggleExperiment(key: string, enabled: boolean) {
    const fullKey = key.startsWith('exp:') ? key : `exp:${key}`;
    return this.prisma.featureFlag.update({
      where: { key: fullKey },
      data: { enabled },
    });
  }
}
