import type {
  MetalRateProvider,
  MetalRateResult,
} from "./metal-rate-provider.ts";

const GOLD_URL =
  "https://www.goodreturns.in/gold-rates/mumbai.html";

const SILVER_URL =
  "https://www.goodreturns.in/silver-rates/mumbai.html";

const USER_AGENT =
  "Mozilla/5.0 (compatible; JewelleryShop/1.0)";

function parseIndianNumber(value: string): number {
  const normalized = value
    .replace(/[₹,\s]/g, "")
    .trim();

  const result = Number(normalized);

  if (!Number.isFinite(result) || result <= 0) {
    throw new Error(`Invalid rate value: ${value}`);
  }

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8377;/gi, "₹")
    .replace(/&#x20B9;/gi, "₹")
    .replace(/&rupee;/gi, "₹")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRateAfterLabel(
  text: string,
  labelPattern: RegExp,
  label: string,
): number {
  const match = text.match(labelPattern);

  if (!match?.[1]) {
    throw new Error(
      `Unable to extract ${label} rate.`,
    );
  }

  return parseIndianNumber(match[1]);
}

async function fetchPage(
  url: string,
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml",
      "Accept-Language":
        "en-IN,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Rate provider returned HTTP ${response.status}`,
    );
  }

  const html = await response.text();

  if (!html || html.length < 1000) {
    throw new Error(
      "Rate provider returned an unexpected response.",
    );
  }

  return html;
}

function extractGoldRates(
  html: string,
): {
  gold24k: number;
  gold22k: number;
  gold18k: number;
} {
  const text = stripHtml(html);

  /*
   * Current page structure:
   *
   * 24K Gold /g ₹15,235
   * 22K Gold /g ₹13,965
   * 18K Gold /g ₹11,426
   *
   * The value can be separated from the label
   * by HTML elements/whitespace, so we allow
   * arbitrary non-digit content between them.
   */

  const gold24k = extractRateAfterLabel(
    text,
    /24K\s*Gold\s*\/g[\s\S]{0,80}?₹?\s*([\d,]+(?:\.\d+)?)/i,
    "24K gold",
  );

  const gold22k = extractRateAfterLabel(
    text,
    /22K\s*Gold\s*\/g[\s\S]{0,80}?₹?\s*([\d,]+(?:\.\d+)?)/i,
    "22K gold",
  );

  const gold18k = extractRateAfterLabel(
    text,
    /18K\s*Gold\s*\/g[\s\S]{0,80}?₹?\s*([\d,]+(?:\.\d+)?)/i,
    "18K gold",
  );

  return {
    gold24k,
    gold22k,
    gold18k,
  };
}

function extractSilverRate(
  html: string,
): number {
  const text = stripHtml(html);

  return extractRateAfterLabel(
    text,
    /Silver\s*\/g[\s\S]{0,80}?₹?\s*([\d,]+(?:\.\d+)?)/i,
    "silver",
  );
}

function getMumbaiDate(): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year",
  )?.value;

  const month = parts.find(
    (part) => part.type === "month",
  )?.value;

  const day = parts.find(
    (part) => part.type === "day",
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "Unable to determine Mumbai date.",
    );
  }

  return `${year}-${month}-${day}`;
}

function validateMetalRate(
  rate: MetalRateResult,
): void {
  if (rate.city !== "Mumbai") {
    throw new Error(
      "Unsupported metal-rate city.",
    );
  }

  if (rate.goldUnit !== "10g") {
    throw new Error(
      "Gold unit must be 10g.",
    );
  }

  if (rate.silverUnit !== "1kg") {
    throw new Error(
      "Silver unit must be 1kg.",
    );
  }

  const values = [
    rate.gold24k,
    rate.gold22k,
    rate.gold18k,
    rate.silver999,
  ];

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) ||
        value <= 0,
    )
  ) {
    throw new Error(
      "One or more metal rates are invalid.",
    );
  }

  if (
    rate.gold24k < rate.gold22k ||
    rate.gold22k < rate.gold18k
  ) {
    throw new Error(
      "Gold purity rates are inconsistent.",
    );
  }
}

export class AutomaticMetalRateProvider
  implements MetalRateProvider
{
  async getDailyRate(): Promise<MetalRateResult> {
    const [goldHtml, silverHtml] =
      await Promise.all([
        fetchPage(GOLD_URL),
        fetchPage(SILVER_URL),
      ]);

    const {
      gold24k,
      gold22k,
      gold18k,
    } = extractGoldRates(goldHtml);

    const silverPerGram =
      extractSilverRate(silverHtml);

    const rate: MetalRateResult = {
      rateDate: getMumbaiDate(),
      city: "Mumbai",

      // Gold provider value = ₹ / gram
      // Application value = ₹ / 10g
      gold24k: gold24k * 10,
      gold22k: gold22k * 10,
      gold18k: gold18k * 10,

      // Silver provider value = ₹ / gram
      // Application value = ₹ / kg
      silver999: silverPerGram * 1000,

      goldUnit: "10g",
      silverUnit: "1kg",
    };

    validateMetalRate(rate);

    return rate;
  }
}