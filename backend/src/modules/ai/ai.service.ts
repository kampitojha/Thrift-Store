import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AI listing assistant — SpaceXAI / OpenAI-compatible chat completions.
 * Features: title, description, tags, category, brand, price estimate, SEO.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateListing(input: {
    imageHints?: string;
    categoryHint?: string;
    brandHint?: string;
    condition?: string;
    rawNotes?: string;
  }) {
    if (!this.config.get('features.aiListing')) {
      throw new ServiceUnavailableException('AI listing disabled');
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: { name: true, slug: true },
      take: 20,
    });

    const prompt = `You are Thrift Store's thrift marketplace listing expert for India.
Generate a high-converting product listing JSON with keys:
title (max 100 chars), description (80-150 words, engaging), tags (array max 12),
suggestedCategorySlug, suggestedBrand, estimatedPricePaise (integer INR paise),
seoTitle, seoDescription, suggestedKeywords (array).

Context:
- notes: ${input.rawNotes || 'n/a'}
- category hint: ${input.categoryHint || 'n/a'}
- brand hint: ${input.brandHint || 'n/a'}
- condition: ${input.condition || 'n/a'}
- image hints: ${input.imageHints || 'n/a'}
- available categories: ${categories.map((c) => c.slug).join(', ')}

Return ONLY valid JSON.`;

    const result = await this.chat(prompt);
    try {
      const json = this.extractJson(result);
      return { ...json, provider: this.config.get('ai.provider') };
    } catch {
      return {
        title: input.rawNotes?.slice(0, 80) || 'Thrift find',
        description: result,
        tags: [],
        estimatedPricePaise: null,
        raw: result,
      };
    }
  }

  async detectSpam(text: string) {
    const prompt = `Classify if this marketplace listing is spam/fraud. Return JSON: { "isSpam": boolean, "score": 0-1, "reasons": string[] }\n\nText:\n${text.slice(0, 2000)}`;
    const result = await this.chat(prompt);
    try {
      return this.extractJson(result);
    } catch {
      return { isSpam: false, score: 0, reasons: [] };
    }
  }

  async suggestPrice(input: {
    title: string;
    brand?: string;
    condition?: string;
    category?: string;
  }) {
    // Rule-based baseline + optional AI refinement
    const similar = await this.prisma.product.findMany({
      where: {
        status: { in: ['ACTIVE', 'SOLD'] },
        ...(input.brand
          ? { brand: { name: { contains: input.brand, mode: 'insensitive' } } }
          : {}),
        title: { contains: input.title.split(' ')[0], mode: 'insensitive' },
      },
      select: { pricePaise: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    if (similar.length >= 3) {
      const prices = similar.map((p) => p.pricePaise).sort((a, b) => a - b);
      const mid = prices[Math.floor(prices.length / 2)];
      return {
        estimatedPricePaise: mid,
        lowPaise: prices[Math.floor(prices.length * 0.25)],
        highPaise: prices[Math.floor(prices.length * 0.75)],
        sampleSize: prices.length,
        method: 'market_comps',
      };
    }

    const prompt = `Estimate fair resale price in India for thrift marketplace.
Item: ${input.title}, brand: ${input.brand || '?'}, condition: ${input.condition || '?'}, category: ${input.category || '?'}.
Return JSON: { "estimatedPricePaise": number, "lowPaise": number, "highPaise": number, "confidence": 0-1 }`;
    const result = await this.chat(prompt);
    try {
      return { ...this.extractJson(result), method: 'ai' };
    } catch {
      return { estimatedPricePaise: null, method: 'unavailable' };
    }
  }

  private async chat(prompt: string): Promise<string> {
    const apiKey = this.config.get<string>('ai.apiKey');
    const baseUrl = this.config.get<string>('ai.baseUrl');
    const model = this.config.get<string>('ai.model');

    if (!apiKey) {
      this.logger.warn('AI_API_KEY not set — returning heuristic response');
      return JSON.stringify({
        title: 'Curated thrift find',
        description:
          'Gently used item in great condition. Perfect for sustainable fashion lovers. Ships carefully packed pan-India.',
        tags: ['thrift', 'preloved', 'sustainable'],
        estimatedPricePaise: 99900,
      });
    }

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful marketplace AI. Always respond with valid JSON when asked.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI API ${res.status}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content || '{}';
    } catch (e) {
      this.logger.error(`AI call failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('AI service unavailable');
    }
  }

  private extractJson(text: string): Record<string, unknown> {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    return JSON.parse(match[0]);
  }
}
