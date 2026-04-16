import React, { useMemo } from 'react';
import { useAppConfig } from '../context/AppContext';
import CustomChart from '../components/Chart/CustomChart';

export default function ChartPage() {
  const { 
    timeFrame, 
    setTimeFrame, 
    chartMode, 
    setChartMode, 
    activeCategoryId, 
    categories 
  } = useAppConfig();

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <div className="chart-page-container">
      <div className="chart-header">
        <h2>Statistics <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>- {activeCategory?.name}</span></h2>
        
        <div className="timeframe-toggles">
          {(['Hours', 'Minutes', 'Seconds'] as const).map(tf => (
            <button 
              key={tf}
              className={`tf-btn ${timeFrame === tf ? 'active' : ''}`}
              onClick={() => setTimeFrame(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrapper">
        <CustomChart />

        {/* Floating Chart Mode Controls */}
        <div className="floating-controls">
           <div className="controls-panel">
             {(['Bar', 'Candlestick', 'Line'] as const).map(mode => (
               <button
                 key={mode}
                 className={`mode-btn ${chartMode === mode ? 'active' : ''}`}
                 onClick={() => setChartMode(mode)}
               >
                 {mode}
               </button>
             ))}
           </div>
        </div>
      </div>

  <style>{`
    .chart-page-container { display: flex; flex-direction: column; height: 100%; position: relative; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .chart-header h2 { font-size: 1.5rem; font-weight: 500; }
    .timeframe-toggles { display: flex; gap: 5px; background: rgba(255,255,255,0.03); padding: 5px; border-radius: var(--radius-lg); }
    .tf-btn { padding: 8px 16px; border-radius: var(--radius-lg); font-size: 0.85rem; color: var(--text-secondary); transition: 0.2s;}
    .tf-btn:hover { color: #fff; }
    .tf-btn.active { background: #fff; color: #000; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    
    .chart-wrapper { flex: 1; position: relative; border-radius: var(--radius-lg); overflow: hidden; }
    
    .floating-controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 50; }
    .controls-panel { display: flex; gap: 5px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px); padding: 8px; border-radius: var(--radius-xl); border: 1px solid rgba(255, 255, 255, 0.1); }
    .mode-btn { padding: 8px 20px; border-radius: var(--radius-xl); font-size: 0.85rem; color: var(--text-secondary); transition: 0.2s; }
    .mode-btn:hover { color: #fff; }
    .mode-btn.active { background: var(--bg-surface); color: var(--accent-purple); border: 1px solid var(--border-active); }
  `}</style>
    </div>
  );
}
