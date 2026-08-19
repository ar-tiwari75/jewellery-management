export type MetalRateCity = "Mumbai";

export interface MetalRateResult {
  rateDate: string;
  city: MetalRateCity;

  gold24k: number;
  gold22k: number;
  gold18k: number;

  silver999: number;

  goldUnit: "10g";
  silverUnit: "1kg";
}

export interface MetalRateProvider {
  getDailyRate(): Promise<MetalRateResult>;
}