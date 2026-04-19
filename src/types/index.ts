export type DayHours = 'Daylight' | '24H';
export type VariationType = 'Hourly' | 'Continuous';
export type VToVRelation = 'None' | 'Display';
export type ChartMode = 'Bar' | 'Candlestick' | 'Line';

export interface CategorySettings {
  dayHours: DayHours;
  rateOfDepletion: number; // Max volume per hour (derived or preset)
  dailyVolumeTarget: number; // User provided target
  actualSellOutPercentage: number; // e.g. 85 for 85%
  bulkVolumeBumpValue: number; // Amount to add per bump
  bulkVolumeCount: number; // Max 10 bumps tracking
  startingDailyVolume: number | 'Continuous'; 
  volumeVariation: VariationType;
  hourlyVolumePattern?: Record<number, number>;
  priceVariation: VariationType;
  hourlyPricePattern?: Record<number, number>;
  startingPricePerDay?: number;
  endingPricePerDay?: number;
  vToVRelation: VToVRelation;
  variationPattern: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
  settings: CategorySettings;
  icon?: string;
}

export interface ChartDataPoint {
  time: Date;
  volume: number;     // Normal actual volume
  bulkVolume: number; // Volume from bulk bumps
  totalVolume: number; // Normal + Bulk
  maxVolume: number;  // The target upper limit for this span
  price: number;
  isProgressive: boolean; // Is price > prev price
  isRegressive: boolean;  // Is price < prev price
}

export interface AppState {
  categories: Category[];
  activeCategoryId: string | null;
  chartMode: ChartMode;
  isFullScreen: boolean;
  timeFrame: 'Daily' | 'Hourly' | '10 Minutes';
  currency: string;
}
