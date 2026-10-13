export const FORECAST_COLOR = "#7C6CF0";
export const FORECAST_DAYS = 7;
export const FORECAST_MONTHS = 3;

export interface LinearTrend {
  slope: number;
  intercept: number;
}

export function linearTrend(values: number[]): LinearTrend {
  const points = values.filter((value) => Number.isFinite(value));

  if (points.length < 2) {
    return { slope: 0, intercept: points[0] ?? 0 };
  }

  const count = points.length;
  const meanX = (count - 1) / 2;
  const meanY = points.reduce((total, value) => total + value, 0) / count;

  let numerator = 0;
  let denominator = 0;

  points.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) * (index - meanX);
  });

  const slope = denominator === 0 ? 0 : numerator / denominator;

  return {
    slope,
    intercept: meanY - slope * meanX,
  };
}

interface ProjectionOptions {
  minimum?: number | null;
  round?: boolean;
}

export function projectNextValues(
  values: number[],
  periods: number,
  options: ProjectionOptions = {},
): number[] {
  const { minimum = 0, round = true } = options;
  const { slope, intercept } = linearTrend(values);
  const count = values.length;

  return Array.from({ length: periods }, (_, offset) => {
    const projected = intercept + slope * (count + offset);
    const bounded =
      minimum === null || minimum === undefined
        ? projected
        : Math.max(minimum, projected);

    if (!round) return bounded;
    return Math.max(0, Math.round(bounded * 100) / 100);
  });
}

export function futureDayLabels(periods: number): string[] {
  return Array.from({ length: periods }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);

    return [
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });
}

export function futureMonthKeys(periods: number): string[] {
  const now = new Date();

  return Array.from({ length: periods }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}
