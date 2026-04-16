export type DayHours = 'Daylight' | '24H';
export type VariationType = 'Hourly' | 'Continuous';
export type VToVRelation = 'None' | 'Display';
export type ChartMode = 'Bar' | 'Candlestick' | 'Line';

export interface CategorySettings {
  dayHours: DayHours;
  rateOfDepletion: number; // Max volume per hour
  startingDailyVolume: number | 'Continuous'; // 0 or Custom or Continuous
  volumeVariation: VariationType;
  hourlyVolumePattern?: Record<number, number>; // Maps hour -> volume limit. E.g. {9: 10, 10: 20}
  priceVariation: VariationType;
  hourlyPricePattern?: Record<number, number>; // Maps hour -> price
  startingPricePerDay?: number;
  endingPricePerDay?: number;
  vToVRelation: VToVRelation;
  variationPattern: boolean; // On or Off
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
  volume: number;     // Actual volume
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
  timeFrame: 'Hours' | 'Minutes' | 'Seconds';
  currency: string;
}
