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
    if (!cat) return;

    const now = new Date();
    
    // --- VALIDATION: 10-Minute Reset Logic ---
    // Count how many bumps have occurred in the current 10-minute window
    const tenMinWindowStart = new Date(now.getTime() - (10 * 60 * 1000));
    const recentBumps = (cat.settings.bulkEvents || []).filter(e => {
      const eDate = e.timestamp instanceof Date ? e.timestamp : (e.timestamp as any).toDate ? (e.timestamp as any).toDate() : new Date(e.timestamp as any);
      return eDate > tenMinWindowStart;
    });

    // --- VALIDATION: Daily Volume Cap ---
    // Calculate total accumulated volume so far to prevent exceeding target
    // (Note: This is a simplified check based on current events + target)
    const currentEventVolume = (cat.settings.bulkEvents || []).reduce((sum, e) => sum + e.amount, 0);
    // Ideal volume up to now (rough estimate for cap)
    const totalWithNewBump = currentEventVolume + amount;
    const isOverTarget = totalWithNewBump > cat.settings.dailyVolumeTarget;

    if (recentBumps.length < 10 && !isOverTarget) {
      const newEvent: BulkEvent = {
        id: `bulk-${Date.now()}`,
        timestamp: new Date(),
        amount,
        timeframe
      };
      
      const updatedEvents = [...(cat.settings.bulkEvents || []), newEvent];
      await updateCategoryParams(categoryId, {
        bulkVolumeCount: recentBumps.length + 1, // Updating count for UI display
        bulkEvents: updatedEvents
      });
    } else {
      if (isOverTarget) console.warn("Bump blocked: Exceeds daily volume target");
      if (recentBumps.length >= 10) console.warn("Bump blocked: 10-minute limit reached");
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
