import React, { useState } from 'react';
import { ChartDataPoint } from '../../types';

interface VerticalProgressIndicatorProps {
  data: ChartDataPoint[];
  dailyTarget: number;
  onPointClick: (point: ChartDataPoint) => void;
}

const VerticalProgressIndicator: React.FC<VerticalProgressIndicatorProps> = ({ data, dailyTarget, onPointClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const totalConsumed = data.reduce((sum, p) => sum + p.totalVolume, 0);
  const progressPercentage = Math.min((totalConsumed / dailyTarget) * 100, 100);

  return (
    <div 
      className="vertical-indicator-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Secondary UI (Stacked Bars) - Shown on Hover */}
      <div className={`stacked-bars-container ${isHovered ? 'visible' : ''}`}>
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
              onClick={() => onPointClick(point)}
              title={`${point.time.toLocaleTimeString()}: ${point.totalVolume.toFixed(2)}`}
            />
          );
        })}
      </div>

      {/* Main Bar */}
      <div className="main-progress-bar">
        <div 
          className="progress-overlay" 
          style={{ height: `${progressPercentage}%` }}
        />
      </div>

      <style>{`
        .vertical-indicator-wrapper {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          height: 80vh;
          width: 60px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 100;
        }

        .main-progress-bar {
          width: 12px;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .progress-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
          transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stacked-bars-container {
          position: absolute;
          right: 20px;
          height: 100%;
          width: 150px;
          display: flex;
          flex-direction: column-reverse;
          gap: 3px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s, transform 0.3s;
          transform: translateX(10px);
        }

        .stacked-bars-container.visible {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0);
        }

        .stacked-bar {
          height: 0.5%; /* As per requirement */
          min-height: 4px;
          border-radius: 2px;
          cursor: pointer;
          transition: transform 0.2s, filter 0.2s;
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
