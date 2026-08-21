export type MetalRateCity = "Mumbai";

export interface MetalRateResult {
  rateDate: string;
  city: MetalRateCity;

  gold24k: number;
  gold23k: number;
  gold22k: number;
  gold20k: number;
  gold18k: number;
  gold16k: number;
  gold14k: number;
  gold10k: number;

  silver999: number;
  silver995: number;
  silver958: number;
  silver925: number;
  silver900: number;
  silver800: number;

  goldUnit: "10g";
  silverUnit: "1kg";
}

export interface MetalRateProvider {
  getDailyRate(): Promise<MetalRateResult>;
}