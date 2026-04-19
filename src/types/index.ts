export type DayHours = 'Daylight' | '24H';
export type VariationType = 'Hourly' | 'Continuous';
export type VToVRelation = 'None' | 'Display';
export type ChartMode = 'Bar' | 'Candlestick' | 'Line';

export interface BulkEvent {
  id: string;
  timestamp: Date;
  amount: number;
  timeframe: '10 Minutes' | 'Hourly';
}

export interface CategorySettings {
  dayHours: DayHours;
  rateOfDepletion: number; 
  dailyVolumeTarget: number; 
  actualSellOutPercentage: number; 
  bulkVolumeBumpValue: number; 
  bulkVolumeCount: number; 
  bulkEvents?: BulkEvent[]; // New field to track individual bumps
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
