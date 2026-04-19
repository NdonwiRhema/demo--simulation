import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppConfig } from '../../context/AppContext';
import { Category, ChartDataPoint } from '../../types';
import { generateSimulationData, isFutureData } from '../../core/SimulationEngine';
import VerticalProgressIndicator from './VerticalProgressIndicator';

interface Props {
  isPresentationMode?: boolean;
}

export default function CustomChart({ isPresentationMode = false }: Props) {
  const { categories, activeCategoryId, timeFrame, currency } = useAppConfig();
  const category = categories.find(c => c.id === activeCategoryId);
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [simulatedTime, setSimulatedTime] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setDimensions({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Simulation Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const displayData = useMemo(() => {
    if (!category) return [];
    return generateSimulationData(category.settings, new Date(), timeFrame);
  }, [category, timeFrame]);

  if (!category || displayData.length === 0) {
    return <div className="no-chart" ref={containerRef}>Processing Simulation Data...</div>;
  }

  const maxVolumeLimit = Math.max(...displayData.map(d => Math.max(d.maxVolume, d.totalVolume))) * 1.2;
  const maxPriceLimit = Math.max(...displayData.map(d => d.price)) * 1.2;
  
  const paddingX = 60;
  const paddingY = 60;
  
  const basePointWidth = timeFrame === 'Daily' ? 120 : (timeFrame === 'Hourly' ? 60 : 30);
  const actualPointWidth = basePointWidth * zoomLevel;
  const svgPhysicalWidth = Math.max(dimensions.width, paddingX * 2 + (displayData.length * actualPointWidth));
  const chartH = dimensions.height - paddingY * 2;
  
  const getX = (index: number) => paddingX + (index * actualPointWidth) + (actualPointWidth / 2);
  const getPriceY = (val: number) => paddingY + chartH - (val / (maxPriceLimit || 1)) * chartH;

  const yTicks = [0, maxPriceLimit * 0.25, maxPriceLimit * 0.5, maxPriceLimit * 0.75, maxPriceLimit];

  const handlePointClick = (point: ChartDataPoint) => {
    const idx = displayData.findIndex(d => d.time.getTime() === point.time.getTime());
    setClickedIndex(idx);
  };

  return (
    <div className="chart-wrapper" ref={containerRef}>
      <div className="chart-scroll-container">
        <svg width={svgPhysicalWidth} height={dimensions.height} style={{ minWidth: dimensions.width }}>
          {/* Y Axis Grid */}
          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line x1={paddingX} y1={getPriceY(tick)} x2={svgPhysicalWidth - paddingX} y2={getPriceY(tick)} stroke="rgba(255,255,255,0.05)" />
              <text x={10} y={getPriceY(tick) + 4} fill="#94a3b8" fontSize={10}>{currencySymbol}{tick.toFixed(0)}</text>
            </g>
          ))}

          {/* X Axis Labels */}
          {displayData.map((d, i) => {
            if (timeFrame === '10 Minutes' && i % 6 !== 0) return null; // Show every hour for 10min view
            const x = getX(i);
            const label = timeFrame === 'Daily' ? d.time.toLocaleDateString() : d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <g key={`x-${i}`}>
                <text x={x} y={dimensions.height - 20} fill="#94a3b8" fontSize={10} textAnchor="middle">{label}</text>
              </g>
            );
          })}

          {/* Bars */}
          {displayData.map((d, i) => {
            const isFuture = isFutureData(d.time);
            const x = getX(i);
            const yPrice = getPriceY(d.price);
            const barWidth = actualPointWidth * 0.7;
            const barHeight = chartH - (yPrice - paddingY);
            
            // Animation logic: partially render current bar, fully render past bars, hide future
            let renderedHeight = barHeight;
            if (isFuture) {
              renderedHeight = 0;
            }

            const hasBulk = d.bulkVolume > 0;
            const fill = hasBulk 
              ? 'url(#bulkGradient)' 
              : (d.isProgressive ? '#10b981' : '#ef4444');

            return (
              <g key={`bar-${i}`}>
                <defs>
                  <linearGradient id="bulkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <rect 
                  x={x - barWidth/2} 
                  y={paddingY + chartH - renderedHeight} 
                  width={barWidth} 
                  height={renderedHeight} 
                  fill={fill}
                  rx={4}
                  className={isFuture ? '' : 'animate-bar'}
                />
                {/* Hit area for interactions */}
                <rect 
                  x={x - actualPointWidth/2} 
                  y={paddingY} 
                  width={actualPointWidth} 
                  height={chartH} 
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setClickedIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <VerticalProgressIndicator 
        data={displayData} 
        dailyTarget={category.settings.dailyVolumeTarget} 
        onPointClick={handlePointClick}
      />

      {clickedIndex !== null && displayData[clickedIndex] && (
        <div className="chart-popover" style={{
          left: getX(clickedIndex) - (containerRef.current?.scrollLeft || 0),
          top: getPriceY(displayData[clickedIndex].price) - 120
        }}>
          <div className="popover-header">
            <h3>{displayData[clickedIndex].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
            <button onClick={() => setClickedIndex(null)}>&times;</button>
          </div>
          <div className="popover-content">
            <div className="stat">
              <span>Normal Volume</span>
              <span>{displayData[clickedIndex].volume.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span>Bulk Volume</span>
              <span className="bulk-text">{displayData[clickedIndex].bulkVolume.toFixed(2)}</span>
            </div>
            <div className="stat total">
              <span>Total Volume</span>
              <span>{displayData[clickedIndex].totalVolume.toFixed(2)}</span>
            </div>
            <div className="stat price">
              <span>Current Price</span>
              <span>{currencySymbol}{displayData[clickedIndex].price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chart-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0d0e14;
          overflow: hidden;
        }
        .chart-scroll-container {
          width: 100%;
          height: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .animate-bar {
          transition: height 0.3s ease-out, y 0.3s ease-out;
        }
        .chart-popover {
          position: fixed;
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          min-width: 200px;
          z-index: 1000;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          transform: translateX(-50%);
        }
        .popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 8px;
        }
        .popover-header h3 {
          margin: 0;
          font-size: 0.9rem;
          color: #fff;
        }
        .popover-header button {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .stat.total {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 8px;
          color: #fff;
          font-weight: 600;
        }
        .stat.price {
          color: #fbbf24;
          font-weight: 600;
        }
        .bulk-text {
          color: #fbbf24;
        }
        .no-chart {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
