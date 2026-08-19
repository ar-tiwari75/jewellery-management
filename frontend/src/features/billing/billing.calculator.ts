export type MetalType = "GOLD" | "SILVER";

export type MetalRateUnit = "10g" | "1kg";

export interface BillingCalculationInput {
  metalType: MetalType;

  weight: number;

  metalRate: number;
  metalRateUnit: MetalRateUnit;

  wastagePercent: number;

  makingCharge: number;

  discount: number;

  gstPercent: number;
}

export interface BillingCalculationResult {
  metalValue: number;

  wastageWeight: number;

  wastageValue: number;

  makingCharge: number;

  subtotal: number;

  discount: number;

  taxableAmount: number;

  gst: number;

  grandTotal: number;
}

function roundMoney(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

function roundWeight(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 1000,
  ) / 1000;
}

export function calculateBillingItem(
  input: BillingCalculationInput,
): BillingCalculationResult {
  if (input.weight <= 0) {
    throw new Error(
      "Weight must be greater than zero.",
    );
  }

  if (input.metalRate <= 0) {
    throw new Error(
      "Metal rate must be greater than zero.",
    );
  }

  if (input.wastagePercent < 0) {
    throw new Error(
      "Wastage cannot be negative.",
    );
  }

  if (input.makingCharge < 0) {
    throw new Error(
      "Making charge cannot be negative.",
    );
  }

  if (input.discount < 0) {
    throw new Error(
      "Discount cannot be negative.",
    );
  }

  if (input.gstPercent < 0) {
    throw new Error(
      "GST percentage cannot be negative.",
    );
  }

  /*
   * Gold rates are expressed per 10g.
   *
   * Silver rates are expressed per 1kg.
   */
  const rateUnitWeight =
    input.metalRateUnit === "10g"
      ? 10
      : 1000;

  const metalValue =
    (input.weight / rateUnitWeight) *
    input.metalRate;

  const wastageWeight =
    input.weight *
    (input.wastagePercent / 100);

  const wastageValue =
    (wastageWeight / rateUnitWeight) *
    input.metalRate;

  const subtotal =
    metalValue +
    wastageValue +
    input.makingCharge;

  const taxableAmount =
    Math.max(
      0,
      subtotal - input.discount,
    );

  const gst =
    taxableAmount *
    (input.gstPercent / 100);

  const grandTotal =
    taxableAmount + gst;

  return {
    metalValue: roundMoney(metalValue),

    wastageWeight:
      roundWeight(wastageWeight),

    wastageValue:
      roundMoney(wastageValue),

    makingCharge:
      roundMoney(input.makingCharge),

    subtotal:
      roundMoney(subtotal),

    discount:
      roundMoney(input.discount),

    taxableAmount:
      roundMoney(taxableAmount),

    gst:
      roundMoney(gst),

    grandTotal:
      roundMoney(grandTotal),
  };
}