import React from 'react';
import CustomChart from '../components/Chart/CustomChart';
import { useAppConfig } from '../context/AppContext';
import { Clock, LayoutGrid, BarChart3 } from 'lucide-react';

interface Props {
  isPresentationMode?: boolean;
}

const ChartPage: React.FC<Props> = ({ isPresentationMode = false }) => {
  const { timeFrame, setTimeFrame } = useAppConfig();

  React.useEffect(() => {
    if (isPresentationMode) {
      setTimeFrame('10 Minutes');
    }
  }, [isPresentationMode, setTimeFrame]);

  return (
    <div className={`chart-page-container ${isPresentationMode ? 'presentation' : ''}`}>
      {!isPresentationMode && (
        <header className="page-header">
          <div className="header-left">
            <h1>Market Preview</h1>
            <span className="live-indicator">
              <span className="dot" /> LIVE
            </span>
          </div>
          <div className="header-right">
            <div className="timeframe-selector">
              <button 
                className={timeFrame === 'Daily' ? 'active' : ''} 
                onClick={() => setTimeFrame('Daily')}
              >
                Daily
              </button>
              <button 
                className={timeFrame === 'Hourly' ? 'active' : ''} 
                onClick={() => setTimeFrame('Hourly')}
              >
                Hourly
              </button>
              <button 
                className={timeFrame === '10 Minutes' ? 'active' : ''} 
                onClick={() => setTimeFrame('10 Minutes')}
              >
                10m
              </button>
            </div>
          </div>
        </header>
      )}
      
      <div className="chart-content">
        <CustomChart isPresentationMode={isPresentationMode} />
      </div>

      <style>{`
        .chart-page-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0d0e14;
        }
        .chart-page-container.presentation {
          background: #000;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0 20px 0;
        }
        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
          margin-left: 15px;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .header-left {
          display: flex;
          align-items: center;
        }
        .timeframe-selector {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 10px;
          gap: 4px;
        }
        .timeframe-selector button {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .timeframe-selector button:hover {
          color: #fff;
        }
        .timeframe-selector button.active {
          background: #3b82f6;
          color: #fff;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }
        .chart-content {
          flex: 1;
          min-height: 0;
          border-radius: 16px;
          overflow: hidden;
          background: #111218;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

export default ChartPage;
