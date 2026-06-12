import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';

/** Discount tiers keyed by subscription plan_days */
const DISCOUNT_TIERS: Record<number, number> = {
  7: 0,
  15: 2,
  30: 5,
};

/** Default rates used when no PricingConfig row exists yet */
const DEFAULT_RATES = {
  per_km_rate: 6.0,
  rapido_rate: 7.0,
  auto_rate: 8.0,
  ola_rate: 10.0,
  uber_rate: 12.0,
} as const;

export interface FareBreakdown {
  distance_km: number;
  per_km_rate: number;
  subscription_days: number | null;
  base_price: number;
  discount_pct: number;
  discount_amount: number;
  final_price: number;
}

export interface CompetitorComparison {
  distance_km: number;
  buddy_ride: number;
  rapido: number;
  auto: number;
  ola: number;
  uber: number;
  savings_vs_rapido: number;
  savings_vs_auto: number;
  savings_vs_ola: number;
  savings_vs_uber: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get Current Pricing ──────────────────────────────────────────────────────

  /**
   * Returns the single active PricingConfig row.
   * If none exists (fresh deployment) a default row is seeded and returned.
   */
  async getCurrentPricing() {
    const existing = await this.prisma.pricingConfig.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (existing) {
      return existing;
    }

    this.logger.warn(
      'No PricingConfig found — seeding default rates.',
    );

    const seeded = await this.prisma.pricingConfig.create({
      data: DEFAULT_RATES,
    });

    return seeded;
  }

  // ─── Update Pricing ───────────────────────────────────────────────────────────

  /**
   * Updates the active PricingConfig.
   * Snapshots the previous per_km_rate into PricingHistory and writes an
   * AuditLog entry for full traceability.
   *
   * @param adminId - UUID of the admin performing the update
   * @param dto     - Fields to update (all optional)
   */
  async updatePricing(adminId: string, dto: UpdatePricingDto) {
    const current = await this.getCurrentPricing();

    // Record history snapshot before mutating
    await this.prisma.pricingHistory.create({
      data: {
        per_km_rate: current.per_km_rate,
        changed_by: adminId,
        reason: dto.reason ?? null,
      },
    });

    // Build only the supplied update fields
    const updateData: {
      per_km_rate?: number;
      rapido_rate?: number;
      auto_rate?: number;
      ola_rate?: number;
      uber_rate?: number;
      updated_by: string;
    } = { updated_by: adminId };

    if (dto.per_km_rate !== undefined) updateData.per_km_rate = dto.per_km_rate;
    if (dto.rapido_rate !== undefined) updateData.rapido_rate = dto.rapido_rate;
    if (dto.auto_rate !== undefined) updateData.auto_rate = dto.auto_rate;
    if (dto.ola_rate !== undefined) updateData.ola_rate = dto.ola_rate;
    if (dto.uber_rate !== undefined) updateData.uber_rate = dto.uber_rate;

    const updated = await this.prisma.pricingConfig.update({
      where: { id: current.id },
      data: updateData,
    });

    // Audit trail
    await this.prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'UPDATE_PRICING',
        entity_type: 'PricingConfig',
        entity_id: current.id,
        old_value: {
          per_km_rate: current.per_km_rate,
          rapido_rate: current.rapido_rate,
          auto_rate: current.auto_rate,
          ola_rate: current.ola_rate,
          uber_rate: current.uber_rate,
        },
        new_value: {
          per_km_rate: updated.per_km_rate,
          rapido_rate: updated.rapido_rate,
          auto_rate: updated.auto_rate,
          ola_rate: updated.ola_rate,
          uber_rate: updated.uber_rate,
        },
      },
    });

    this.logger.log(
      `Pricing updated by admin=${adminId}: per_km_rate ${current.per_km_rate} → ${updated.per_km_rate}`,
    );

    return updated;
  }

  // ─── Calculate Fare ───────────────────────────────────────────────────────────

  /**
   * Calculates the BuddyRide fare for a given distance and optional subscription.
   *
   * Formula: final_price = per_km_rate × distance_km × (1 - discount_pct / 100)
   *
   * @param distanceKm       - Trip distance in kilometres (must be > 0)
   * @param subscriptionDays - Subscription plan days: 7, 15, or 30 (optional)
   */
  async calculateFare(
    distanceKm: number,
    subscriptionDays?: number,
  ): Promise<FareBreakdown> {
    if (distanceKm <= 0) {
      throw new NotFoundException('Distance must be greater than 0.');
    }

    const config = await this.getCurrentPricing();
    const { per_km_rate } = config;

    const discountPct = subscriptionDays != null
      ? (DISCOUNT_TIERS[subscriptionDays] ?? 0)
      : 0;

    const base_price = parseFloat((per_km_rate * distanceKm).toFixed(2));
    const discount_amount = parseFloat(
      (base_price * (discountPct / 100)).toFixed(2),
    );
    const final_price = parseFloat((base_price - discount_amount).toFixed(2));

    return {
      distance_km: distanceKm,
      per_km_rate,
      subscription_days: subscriptionDays ?? null,
      base_price,
      discount_pct: discountPct,
      discount_amount,
      final_price,
    };
  }

  // ─── Competitor Comparison ────────────────────────────────────────────────────

  /**
   * Returns a side-by-side fare comparison between BuddyRide and competitors
   * for the given distance (no subscription discount applied here).
   *
   * @param distanceKm - Trip distance in kilometres
   */
  async getCompetitorRates(distanceKm: number): Promise<CompetitorComparison> {
    if (distanceKm <= 0) {
      throw new NotFoundException('Distance must be greater than 0.');
    }

    const config = await this.getCurrentPricing();

    const round = (n: number) => parseFloat((n).toFixed(2));

    const buddy_ride = round(config.per_km_rate * distanceKm);
    const rapido = round(config.rapido_rate * distanceKm);
    const auto = round(config.auto_rate * distanceKm);
    const ola = round(config.ola_rate * distanceKm);
    const uber = round(config.uber_rate * distanceKm);

    return {
      distance_km: distanceKm,
      buddy_ride,
      rapido,
      auto,
      ola,
      uber,
      savings_vs_rapido: round(rapido - buddy_ride),
      savings_vs_auto: round(auto - buddy_ride),
      savings_vs_ola: round(ola - buddy_ride),
      savings_vs_uber: round(uber - buddy_ride),
    };
  }

  // ─── Pricing History ──────────────────────────────────────────────────────────

  /**
   * Returns paginated pricing history records, newest first.
   *
   * @param page  - 1-based page number (default 1)
   * @param limit - Records per page (default 20, max 100)
   */
  async getPricingHistory(page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.pricingHistory.findMany({
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.pricingHistory.count(),
    ]);

    return {
      data: records,
      total,
      page,
      limit: safeLimit,
      total_pages: Math.ceil(total / safeLimit),
    };
  }
}
