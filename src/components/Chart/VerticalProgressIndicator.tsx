import React, { useMemo, useState } from 'react';
import { CategorySettings, ChartDataPoint } from '../../types';

interface VerticalProgressIndicatorProps {
  data: ChartDataPoint[];
  dailyTarget: number;
  settings: CategorySettings;
  onPointClick: (point: ChartDataPoint) => void;
}

const VerticalProgressIndicator: React.FC<VerticalProgressIndicatorProps> = ({ data, dailyTarget, settings, onPointClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Suspend rendering until settings are available
  if (!settings) return null;

  // Calculate totalConsumed directly to ensure it updates as soon as props arrive
  const now = new Date();
  const currentHour = now.getHours();

  let totalConsumed = 0;
  if (settings) {
    const startHour = settings.dayHours === '24H' ? 0 : 8;

    // Iterate through all hours that have fully passed today
    for (let h = startHour; h < currentHour; h++) {
      if (settings.volumeVariation === 'Hourly' && settings.hourlyVolumePattern) {
        totalConsumed += (settings.hourlyVolumePattern[h] || 0);


      } else {
        const actualDailyTarget = (settings.dailyVolumeTarget * (settings.actualSellOutPercentage || 100)) / 100;
        const totalHours = settings.dayHours === 'Daylight' ? 9 : 24;
        totalConsumed += (actualDailyTarget / totalHours);
      }
    }

    // Add bumps from completed events
    // if (settings.bulkEvents) {
    //   settings.bulkEvents.forEach(event => {
    //     const eventTime = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
    //     if (eventTime.getTime() <= now.getTime()) {
    //       totalConsumed += event.amount;
    //     }
    //   });
    // }
  }

  const validTarget = dailyTarget > 0 ? dailyTarget : 1;
  const progressPercentage = Math.min((totalConsumed / validTarget) * 100, 100);

  console.log('[Progress Live]', {
    totalConsumed,
    dailyTarget,
    currentHour,
    percentage: progressPercentage
  });
  return (
    <div className="vertical-indicator-wrapper">
      {/* Secondary UI (Stacked Bars) */}
      <div className={`stacked-bars-container ${isVisible ? 'visible' : ''}`}>
        {data.map((point, index) => {
          const widthPercent = (point.totalVolume / dailyTarget) * 100 * 10; // Scaled for visibility
          return (
            <div
              key={index}
              className="stacked-bar"
              style={{
                width: `${Math.min(widthPercent, 100)}%`,
                background: point.bulkVolume > 0
                  ? 'linear-gradient(90deg, #10b981 0%, #fbbf24 100%)'
                  : '#10b981'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPointClick(point);
              }}
            // Removed native title to prevent flickering/interference
            />
          );
        })}
      </div>

      {/* Main Bar */}
      <div
        className={`main-progress-bar ${isVisible ? 'active' : ''}`}
        onClick={() => setIsVisible(!isVisible)}
      >
        {/* Background segments for bumps */}
        <div className="bump-indicators-layer">
          {data.map((p, i) => {
            if (p.bulkVolume <= 0) return null;
            const bottomPercent = (i / data.length) * 100;
            const heightPercent = (1 / data.length) * 100;
            return (
              <div
                key={`bump-marker-${i}`}
                className="bump-marker"
                style={{
                  bottom: `${bottomPercent}%`,
                  height: `${heightPercent}%`
                }}
              />
            );
          })}
        </div>

        <div
          className="progress-overlay"
          style={{ height: `${progressPercentage}%` }}
        />
      </div>

      <style>{`
        .vertical-indicator-wrapper {
          position: fixed;
          right: 100px;
          top: 50%;
          transform: translateY(-50%);
          height: 80vh;
          width: 200px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 100;
        }
        
        .main-progress-bar {
          width: 40px; /* Optimized width */
          height: 100%; /* 100% of parent height */
          background: #334155; /* Solid Gray background */
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          pointer-events: auto;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .main-progress-bar:hover {
          transform: scaleX(1.2);
        }

        .main-progress-bar.active {
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
          border-color: #10b981;
        }

        .bump-indicators-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 20; /* Higher than progress-overlay */
          pointer-events: none;
        }

        .bump-marker {
          position: absolute;
          left: 0;
          width: 100%;
          background: #9c2c04ff;
          box-shadow: 0 0 12px #9c2c04ff;
          z-index: 21;
        }

        .progress-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%; /* 100% width of parent gray bar */
          background: #10b981; /* Green child bar */
          box-shadow: 0 -2px 10px rgba(16, 185, 129, 0.5);
          transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
          border-top: 2px solid rgba(255, 255, 255, 0.3);
        }

        .stacked-bars-container {
          position: absolute;
          right: 30px;
          height: 100%;
          width: 160px;
          display: flex;
          flex-direction: column-reverse;
          gap: 2px; /* Denser */
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s, transform 0.3s;
          transform: translateX(10px);
          overflow-y: auto; /* Scrollable */
          padding-right: 5px;
        }

        .stacked-bars-container.visible {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0);
        }
        
        /* Custom scrollbar for indicator */
        .stacked-bars-container::-webkit-scrollbar {
          width: 3px;
        }
        .stacked-bars-container::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .stacked-bar {
          height: 4px; /* Smaller */
          min-height: 4px;
          border-radius: 1px;
          cursor: pointer;
          transition: transform 0.2s, filter 0.2s;
          flex-shrink: 0;
          transform-origin: right;
        }

        .stacked-bar:hover {
          transform: scaleX(1.1);
          filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
};

export default VerticalProgressIndicator;
