import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppConfig } from '../../context/AppContext';
import { Category, ChartDataPoint } from '../../types';
import { generateSimulationData, isFutureData } from '../../core/SimulationEngine';
import VerticalProgressIndicator from './VerticalProgressIndicator';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
    return generateSimulationData(category.settings, simulatedTime, timeFrame);
  }, [category, timeFrame, simulatedTime]);

  if (!category || displayData.length === 0) {
    return <div className="no-chart" ref={containerRef}>Processing Simulation Data...</div>;
  }

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
      <div className="chart-main-section">
        {/* Zoom Controls Overlay */}
        <div className="chart-controls">
          <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 5))} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 0.5))} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => setZoomLevel(1)} title="Reset Zoom">
            <Maximize2 size={18} />
          </button>
        </div>

        <div className="chart-area-inner">
          {/* Sticky Y-Axis */}
          <div className="sticky-y-axis" style={{ height: dimensions.height }}>
            <svg width={paddingX} height={dimensions.height}>
              {yTicks.map((tick, i) => (
                <g key={`y-sticky-${i}`}>
                  <text x={paddingX - 10} y={getPriceY(tick) + 4} fill="#94a3b8" fontSize={10} textAnchor="end">
                    {/* {currencySymbol}{tick.toFixed(0)} */}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="chart-scroll-container">
            <svg width={svgPhysicalWidth} height={dimensions.height}>
              {/* Y Axis Grid Lines */}
              {yTicks.map((tick, i) => (
                <line
                  key={`grid-${i}`}
                  x1={0} y1={getPriceY(tick)}
                  x2={svgPhysicalWidth} y2={getPriceY(tick)}
                  stroke="rgba(255,255,255,0.05)"
                />
              ))}

              {/* X Axis Labels */}
              {displayData.map((d, i) => {
                if (timeFrame === '10 Minutes' && i % 6 !== 0) return null;
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
                const now = new Date();
                const pointTime = d.time.getTime();
                const tenMin = 10 * 60 * 1000;

                const isPast = pointTime + tenMin <= now.getTime();
                const isCurrent = pointTime <= now.getTime() && pointTime + tenMin > now.getTime();
                const isFuture = pointTime > now.getTime();

                if (isPresentationMode && isFuture) return null;

                const x = getX(i);
                const yPrice = getPriceY(d.price);
                const barWidth = actualPointWidth * 0.7;
                const barHeight = chartH - (yPrice - paddingY);

                const hasBulk = d.bulkVolume > 0;
                let fill = '#3b82f6';

                if (hasBulk) {
                  fill = 'url(#bulkGradient)';
                } else if (category?.settings.vToVRelation === 'Display') {
                  fill = d.isProgressive ? '#10b981' : '#ef4444';
                }

                let barClass = '';
                if (isCurrent) barClass = 'active-bar-anim';
                else if (isPast) barClass = 'static-bar';
                else if (!isPresentationMode && isFuture) barClass = 'future-preview-bar';

                return (
                  <g key={`bar-${i}`} opacity={isFuture ? 0.3 : 1}>
                    <defs>
                      <linearGradient id="bulkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9c2c04ff" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <rect
                      x={x - barWidth / 2}
                      y={paddingY + chartH - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill={fill}
                      rx={4}
                      className={barClass}
                    />
                    <rect
                      x={x - actualPointWidth / 2}
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

              {/* Live Price Line (Horizontal) */}
              {(() => {
                const currentPoint = displayData.find(d => {
                  const now = new Date();
                  const pTime = d.time.getTime();
                  const tenMin = 10 * 60 * 1000;
                  return pTime <= now.getTime() && pTime + tenMin > now.getTime();
                });

                if (!currentPoint) return null;

                const y = getPriceY(currentPoint.price);
                return (
                  <g className="live-price-line-group">
                    <line
                      x1={0} y1={y}
                      x2={svgPhysicalWidth} y2={y}
                      stroke="#d31612ff"
                      strokeWidth={1}

                      className="flicker-line"
                    />
                    <rect
                      x={svgPhysicalWidth - 55} y={y - 10}
                      width={55} height={20}
                      fill="#fbbf24"
                      rx={4}
                      opacity={0.9}
                    />
                    <text
                      x={svgPhysicalWidth - 50} y={y + 4}
                      fill="#000" fontSize={10} fontWeight="700"
                    >
                      {Math.round(currentPoint.price)}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      <div className="chart-indicator-section">
        <VerticalProgressIndicator
          data={displayData}
          dailyTarget={category.settings.dailyVolumeTarget}
          settings={category.settings}
          onPointClick={handlePointClick}
        />
      </div>

      {clickedIndex !== null && displayData[clickedIndex] && (
        <div
          className="chart-popover"
          style={(() => {
            const scrollLeft = containerRef.current?.querySelector('.chart-scroll-container')?.scrollLeft || 0;
            const x = getX(clickedIndex) - scrollLeft + paddingX;
            const y = getPriceY(displayData[clickedIndex].price);

            const pWidth = 220;
            const pHeight = 180;
            let leftPos = x;
            const rightBoundary = window.innerWidth - 250;

            if (leftPos - pWidth / 2 < 70) leftPos = pWidth / 2 + 70;
            if (leftPos + pWidth / 2 > rightBoundary) leftPos = rightBoundary - pWidth / 2;

            let topPos = y - pHeight - 10;
            if (topPos < 80) topPos = y + 20;

            return {
              left: leftPos,
              top: topPos
            };
          })()}
        >
          <div className="popover-header">
            <h3>{displayData[clickedIndex].time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
            <button onClick={() => setClickedIndex(null)}>&times;</button>
          </div>
          <div className="popover-content">
            <div className="stat">
              <span>Regular</span>
              <span>{Math.round(displayData[clickedIndex].price)}</span>
            </div>
            <div className="stat">
              <span style={{ fontWeight: "bolder" }}>Bulk </span>
              <span className="bulk-text">{Math.round(displayData[clickedIndex].bulkVolume)}</span>
            </div>
            {/* <div className="stat total">
              <span>Total Volume</span>
              <span>{displayData[clickedIndex].totalVolume.toFixed(2)}</span>
            </div>
            <div className="stat price">
              <span>Current Price</span>
              <span>{currencySymbol}{displayData[clickedIndex].price.toFixed(2)}</span>
            </div> */}
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
          display: flex;
        }

        .chart-main-section {
          width: 80%;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .chart-area-inner {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .chart-indicator-section {
          width: 20%;
          height: 100%;
          background: rgba(0, 0, 0, 0.2);
        }
        .chart-controls {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 8px;
          z-index: 100;
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(8px);
          padding: 6px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .chart-controls button {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .chart-controls button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .flicker-line {
          transition: y 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
          animation: priceFlicker 1s infinite alternate;
        }
        @keyframes priceFlicker {
          0% { opacity: 0.8; stroke-width: 1; }
          100% { opacity: 1; stroke-width: 1.5; }
        }
        .active-bar-anim {
          animation: barPulse 2s infinite ease-in-out;
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
        }
        @keyframes barPulse {
          0% { opacity: 0.8; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.3) drop-shadow(0 0 12px rgba(59, 130, 246, 0.7)); }
          100% { opacity: 0.8; filter: brightness(1); }
        }
        .live-price-line-group {
          z-index: 50;
        }
        .sticky-y-axis {
          width: 60px;
          background: #0d0e14;
          z-index: 10;
          flex-shrink: 0;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .chart-scroll-container {
          flex: 1;
          height: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          position: relative;
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
          font-size: 1.5rem;
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
          color: #9c2c04ff;
          font-weight: 600;
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
