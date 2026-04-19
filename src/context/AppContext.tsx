import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppState, Category, ChartMode, BulkEvent } from '../types';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore';

interface AppContextType extends AppState {
  setChartMode: (mode: ChartMode) => void;
  setFullScreen: (isFullScreen: boolean) => void;
  setTimeFrame: (timeFrame: AppState['timeFrame']) => void;
  setCurrency: (currency: string) => void;
  setActiveCategory: (id: string) => void;
  updateCategoryParams: (categoryId: string, newSettings: Partial<Category['settings']>) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  sendBulkVolume: (categoryId: string, amount: number, timeframe: '10 Minutes' | 'Hourly') => Promise<void>;
}

const defaultSettings: Category['settings'] = {
  dayHours: 'Daylight',
  rateOfDepletion: 60,
  dailyVolumeTarget: 1000,
  actualSellOutPercentage: 85,
  bulkVolumeBumpValue: 50,
  bulkVolumeCount: 0,
  startingDailyVolume: 0,
  volumeVariation: 'Continuous',
  priceVariation: 'Continuous',
  vToVRelation: 'Display',
  variationPattern: true,
  startingPricePerDay: 10,
  endingPricePerDay: 20
};

const defaultState: AppState = {
  categories: [
    {
      id: 'cat-1',
      name: 'Corporate Office Spaces',
      isActive: true,
      settings: defaultSettings
    }
  ],
  activeCategoryId: 'cat-1',
  chartMode: 'Bar',
  isFullScreen: false,
  timeFrame: 'Hourly',
  currency: 'INR'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  // Sync with Firestore
  useEffect(() => {
    // Sync app settings (excluding categories)
    const unsub = onSnapshot(doc(db, 'app', 'state'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const { categories: _, ...settings } = data; // Ignore categories in state doc
        setState(s => ({ ...s, ...settings }));
      } else {
        const { categories: _, ...settings } = defaultState;
        setDoc(doc(db, 'app', 'state'), settings);
      }
    });

    // Sync categories collection
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats: Category[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as any;
        // Convert Firestore timestamps back to Dates
        if (data.settings?.bulkEvents) {
          data.settings.bulkEvents = data.settings.bulkEvents.map((e: any) => ({
            ...e,
            timestamp: e.timestamp.toDate()
          }));
        }
        cats.push({ id: doc.id, ...data } as Category);
      });
      setState(s => ({ ...s, categories: cats }));
    });

    return () => {
      unsub();
      unsubCats();
    };
  }, []);

  const persistState = (newState: Partial<AppState>) => {
    const { categories: _, ...data } = newState;
    if (Object.keys(data).length > 0) {
      setDoc(doc(db, 'app', 'state'), data, { merge: true });
    }
  };

  const setChartMode = (chartMode: ChartMode) => persistState({ chartMode });
  const setFullScreen = (isFullScreen: boolean) => persistState({ isFullScreen });
  const setTimeFrame = (timeFrame: AppState['timeFrame']) => persistState({ timeFrame });
  const setCurrency = (currency: string) => persistState({ currency });
  const setActiveCategory = (activeCategoryId: string) => persistState({ activeCategoryId });

  const updateCategoryParams = async (categoryId: string, newSettings: Partial<Category['settings']>) => {
    const catRef = doc(db, 'categories', categoryId);
    const cat = state.categories.find(c => c.id === categoryId);
    if (cat) {
      await setDoc(catRef, { settings: { ...cat.settings, ...newSettings } }, { merge: true });
    }
  };

  const addCategory = async (category: Category) => {
    await setDoc(doc(db, 'categories', category.id), category);
  };

  const sendBulkVolume = async (categoryId: string, amount: number, timeframe: '10 Minutes' | 'Hourly' = '10 Minutes') => {
    const cat = state.categories.find(c => c.id === categoryId);
    if (cat && cat.settings.bulkVolumeCount < 10) {
      const newEvent: BulkEvent = {
        id: `bulk-${Date.now()}`,
        timestamp: new Date(),
        amount,
        timeframe
      };
      
      const updatedEvents = [...(cat.settings.bulkEvents || []), newEvent];
      await updateCategoryParams(categoryId, {
        bulkVolumeCount: cat.settings.bulkVolumeCount + 1,
        bulkEvents: updatedEvents
      });
    }
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
      addCategory,
      sendBulkVolume
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
