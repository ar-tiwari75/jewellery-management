export type MetalType = "GOLD" | "SILVER";
export type GoldPurity = "24K" | "23K" | "22K" | "20K" | "18K" | "16K" | "14K" | "10K";
export type SilverPurity = "999" | "995" | "958" | "925" | "900" | "800";

export const GOLD_PURITIES: GoldPurity[] = ["24K", "23K", "22K", "20K", "18K", "16K", "14K", "10K"];
export const SILVER_PURITIES: SilverPurity[] = ["999", "995", "958", "925", "900", "800"];

export const GOLD_BASE_PURITY: GoldPurity = "24K";
export const SILVER_BASE_PURITY: SilverPurity = "999";

export const GOLD_PURITY_RATIOS: Record<GoldPurity, number> = {
  "24K": 1.0,
  "23K": 23 / 24,
  "22K": 22 / 24,
  "20K": 20 / 24,
  "18K": 18 / 24,
  "16K": 16 / 24,
  "14K": 14 / 24,
  "10K": 10 / 24,
};

export const SILVER_PURITY_RATIOS: Record<SilverPurity, number> = {
  "999": 1.0,
  "995": 995 / 999,
  "958": 958 / 999,
  "925": 925 / 999,
  "900": 900 / 999,
  "800": 800 / 999,
};

export function deriveGoldRate(baseRate24k: number, purity: GoldPurity): number {
  const ratio = GOLD_PURITY_RATIOS[purity] ?? 1;
  return Math.round(baseRate24k * ratio * 100) / 100;
}

export function deriveSilverRate(baseRate999: number, purity: SilverPurity): number {
  const ratio = SILVER_PURITY_RATIOS[purity] ?? 1;
  return Math.round(baseRate999 * ratio * 100) / 100;
}

export function deriveAllGoldRates(baseRate24k: number): Record<GoldPurity, number> {
  const rates: Partial<Record<GoldPurity, number>> = {};
  for (const purity of GOLD_PURITIES) {
    rates[purity] = deriveGoldRate(baseRate24k, purity);
  }
  return rates as Record<GoldPurity, number>;
}

export function deriveAllSilverRates(baseRate999: number): Record<SilverPurity, number> {
  const rates: Partial<Record<SilverPurity, number>> = {};
  for (const purity of SILVER_PURITIES) {
    rates[purity] = deriveSilverRate(baseRate999, purity);
  }
  return rates as Record<SilverPurity, number>;
}

export function getAllPurities(metalType: MetalType): GoldPurity[] | SilverPurity[] {
  return metalType === "GOLD" ? GOLD_PURITIES : SILVER_PURITIES;
}