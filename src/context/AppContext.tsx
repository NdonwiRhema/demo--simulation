import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState, Category, ChartMode } from '../types';

interface AppContextType extends AppState {
  setChartMode: (mode: ChartMode) => void;
  setFullScreen: (isFullScreen: boolean) => void;
  setTimeFrame: (timeFrame: AppState['timeFrame']) => void;
  setCurrency: (currency: string) => void;
  setActiveCategory: (id: string) => void;
  updateCategoryParams: (categoryId: string, newSettings: Partial<Category['settings']>) => void;
  savePreset: () => void;
  // Future Firebase methods will expose here
}

const defaultState: AppState = {
  categories: [
    {
      id: 'cat-1',
      name: 'Corporate Office Spaces',
      isActive: true,
      settings: {
        dayHours: 'Daylight',
        rateOfDepletion: 60,
        startingDailyVolume: 0,
        volumeVariation: 'Continuous',
        priceVariation: 'Continuous',
        vToVRelation: 'Display',
        variationPattern: true,
        startingPricePerDay: 10,
        endingPricePerDay: 20
      }
    },
    {
      id: 'cat-2',
      name: 'Retail Shop Spaces',
      isActive: false,
      settings: {
        dayHours: '24H',
        rateOfDepletion: 100,
        startingDailyVolume: 'Continuous',
        volumeVariation: 'Hourly',
        hourlyVolumePattern: { 9: 50, 10: 100 },
        priceVariation: 'Hourly',
        hourlyPricePattern: { 9: 15, 10: 25 },
        vToVRelation: 'None',
        variationPattern: false
      }
    }
  ],
  activeCategoryId: 'cat-1',
  chartMode: 'Candlestick',
  isFullScreen: false,
  timeFrame: 'Minutes', // Default changed per user requirement
  currency: 'INR'
};

const STORAGE_KEY = 'munch_forex_preset';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Dates inside objects won't auto parse via pure JSON in deeper layers usually, but settings objects are string/num so it's fine.
        return parsed;
      } catch (e) {
        console.error("Failed to restore preset", e);
      }
    }
    return defaultState;
  });

  const savePreset = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const setChartMode = (chartMode: ChartMode) => setState(s => ({ ...s, chartMode }));
  const setFullScreen = (isFullScreen: boolean) => setState(s => ({ ...s, isFullScreen }));
  const setTimeFrame = (timeFrame: AppState['timeFrame']) => setState(s => ({ ...s, timeFrame }));
  const setCurrency = (currency: string) => setState(s => ({ ...s, currency }));
  const setActiveCategory = (activeCategoryId: string) => setState(s => ({ ...s, activeCategoryId }));

  const updateCategoryParams = (categoryId: string, newSettings: Partial<Category['settings']>) => {
    setState(s => ({
      ...s,
      categories: s.categories.map(c => 
        c.id === categoryId ? { ...c, settings: { ...c.settings, ...newSettings } } : c
      )
    }));
  };

  return (
    <AppContext.Provider value={{
      ...state,
      setChartMode,
      setFullScreen,
      setTimeFrame,
      setCurrency,
      setActiveCategory,
      updateCategoryParams,
      savePreset
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppConfig = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppConfig must be used within an AppProvider');
  return context;
};
