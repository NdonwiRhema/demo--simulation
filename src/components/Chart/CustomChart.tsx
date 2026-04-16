import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppConfig } from '../../context/AppContext';
import { Category, ChartMode, ChartDataPoint } from '../../types';
import { generateSimulationData } from '../../core/SimulationEngine';

interface Props {}

export default function CustomChart({}: Props) {
  const { categories, activeCategoryId, chartMode, timeFrame, currency } = useAppConfig();
  const category = categories.find(c => c.id === activeCategoryId);
  const mode = chartMode;

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

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

  const rawData = useMemo(() => {
    if (!category) return [];
    return generateSimulationData(category.settings, new Date());
  }, [category]);

  const displayData = useMemo(() => {
    if (!category || rawData.length === 0) return [];

    if (timeFrame === 'Hours') {
      const hourly: ChartDataPoint[] = [];
      const grouped = new Map<number, ChartDataPoint[]>();
      
      for(const pt of rawData) {
         const h = pt.time.getHours();
         if(!grouped.has(h)) grouped.set(h, []);
         grouped.get(h)!.push(pt);
      }
      
      grouped.forEach((pts, h) => {
         const last = pts[pts.length - 1];
         const sumVol = pts.reduce((a, b) => a + b.volume, 0);
         hourly.push({
            time: new Date(pts[0].time.getFullYear(), pts[0].time.getMonth(), pts[0].time.getDate(), h, 0, 0, 0),
            volume: sumVol,
            maxVolume: category.settings.rateOfDepletion,
            price: last.price, // Close price of the hour
            isProgressive: false,
            isRegressive: false
         });
      });
      hourly.forEach((h, i) => {
        if (i > 0) {
          h.isProgressive = h.price >= hourly[i-1].price;
          h.isRegressive = h.price < hourly[i-1].price;
        } else {
          h.isProgressive = true;
        }
      });
      return hourly;
    }

    if (timeFrame === 'Minutes') {
      const minutely: ChartDataPoint[] = [];
      const grouped = new Map<number, ChartDataPoint[]>();
      for(const pt of rawData) {
         const ts = new Date(pt.time.getFullYear(), pt.time.getMonth(), pt.time.getDate(), pt.time.getHours(), pt.time.getMinutes(), 0, 0).getTime();
         if(!grouped.has(ts)) grouped.set(ts, []);
         grouped.get(ts)!.push(pt);
      }
      grouped.forEach((pts, ts) => {
         const last = pts[pts.length - 1];
         const sumVol = pts.reduce((a, b) => a + b.volume, 0);
         minutely.push({
            time: new Date(ts),
            volume: sumVol,
            maxVolume: category.settings.rateOfDepletion / 60,
            price: last.price,
            isProgressive: false,
            isRegressive: false
         });
      });
      minutely.forEach((m, i) => {
        if (i > 0) {
          m.isProgressive = m.price >= minutely[i-1].price;
          m.isRegressive = m.price < minutely[i-1].price;
        } else {
          m.isProgressive = true;
        }
      });
      return minutely;
    }

    // Seconds
    return rawData;
  }, [rawData, timeFrame, category]);

  useEffect(() => {
    setHoveredIndex(null);
    setClickedIndex(null);
  }, [displayData]);

  if (!category || displayData.length === 0) {
    return <div className="no-chart" ref={containerRef}>Processing Simulation Data...</div>;
  }

  const maxVolumeLimit = Math.max(...displayData.map(d => Math.max(d.maxVolume, d.volume))) * 1.2;
  const maxPriceLimit = Math.max(...displayData.map(d => d.price)) * 1.2;
  
  const paddingX = 40;
  const paddingY = 40;
  
  const chartW = dimensions.width - paddingX * 2;
  const chartH = dimensions.height - paddingY * 2;
  
  const getX = (index: number) => paddingX + (index / Math.max(displayData.length - 1, 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - (val / (maxVolumeLimit || 1)) * chartH;
  const getPriceY = (val: number) => paddingY + chartH - (val / (maxPriceLimit || 1)) * chartH;

  const pathD = mode === 'Line' && displayData.length > 0
    ? displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getPriceY(d.price)}`).join(' ')
    : '';

  const yTicks = [0, maxPriceLimit * 0.25, maxPriceLimit * 0.5, maxPriceLimit * 0.75, maxPriceLimit];
  
  const pointWidth = Math.max((chartW / displayData.length) * 0.6, 2);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width={dimensions.width} height={dimensions.height}>
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line 
              x1={paddingX} y1={getPriceY(tick)} 
              x2={dimensions.width - paddingX} y2={getPriceY(tick)} 
              stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" 
            />
            <text x={10} y={getPriceY(tick) + 4} fill="var(--text-secondary)" fontSize={10}>{currencySymbol}{tick.toFixed(1)}</text>
          </g>
        ))}

        {mode === 'Line' && (
          <path d={pathD} fill="none" stroke="var(--accent-purple)" strokeWidth={2} />
        )}

        {mode !== 'Line' && displayData.map((d, i) => {
          const x = getX(i);
          const drawLabel = timeFrame === 'Hours' || (timeFrame === 'Minutes' && d.time.getMinutes() === 0);
          
          const openPrice = i > 0 ? displayData[i - 1].price : (displayData[0]?.price || 0);
          const closePrice = d.price;
          const remainingUnits = d.maxVolume - d.volume;

          const yOpen = getPriceY(openPrice);
          const yClose = getPriceY(closePrice);
          const yTop = Math.min(yOpen, yClose);
          const yBottom = Math.max(yOpen, yClose);
          const bodyHeight = Math.max(yBottom - yTop, 2);

          let color = 'var(--accent-purple)';
          if (category.settings.vToVRelation === 'Display') {
            color = closePrice >= openPrice ? 'var(--accent-green)' : 'var(--accent-red)';
          }

          return (
            <React.Fragment key={`group-${i}`}>
              {drawLabel && (
                <g key={`x-${i}`}>
                  <line x1={x} y1={paddingY} x2={x} y2={dimensions.height - paddingY} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                  <text x={x} y={dimensions.height - paddingY + 20} fill="var(--text-secondary)" fontSize={10} textAnchor="middle">
                     {d.time.toLocaleTimeString([], {hour: 'numeric', minute: timeFrame === 'Hours' ? undefined : '2-digit'})}
                  </text>
                </g>
              )}
              {mode === 'Bar' && (
                <rect 
                  key={`bar-${i}`} 
                  x={x - pointWidth/2} 
                  y={yTop} 
                  width={pointWidth} 
                  height={bodyHeight} 
                  fill={color} 
                  rx={1}
                />
              )}
              {mode === 'Candlestick' && (() => {
                 const wickLength = (Math.max(remainingUnits, 0) / (maxVolumeLimit || 1)) * chartH;
                 return (
                  <g key={`candle-${i}`}>
                    <line 
                      x1={x} y1={yBottom} 
                      x2={x} y2={yBottom + wickLength} 
                      stroke="#ffffff" 
                      strokeWidth={Math.max(pointWidth * 0.2, 1)} 
                      opacity={0.8}
                    />
                    <rect 
                      x={x - pointWidth/2} 
                      y={yTop} 
                      width={pointWidth} 
                      height={bodyHeight} 
                      fill={color} 
                    />
                  </g>
                 )
              })()}
            </React.Fragment>
          );
        })}
        
        <g className="interaction-layer">
          {displayData.map((d, i) => {
            const x = getX(i);
            const hitWidth = Math.max(pointWidth + 4, 10);
            return (
              <rect 
                key={`hit-${i}`}
                x={x - hitWidth/2}
                y={paddingY}
                width={hitWidth}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setClickedIndex(clickedIndex === i ? null : i)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>

        {hoveredIndex !== null && displayData[hoveredIndex] && (
          <circle 
            cx={getX(hoveredIndex)} 
            cy={getPriceY(displayData[hoveredIndex].price)} 
            r={5} 
            fill="var(--accent-gold)" 
            stroke="var(--bg-main)" 
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        )}
        
        {clickedIndex !== null && clickedIndex !== hoveredIndex && displayData[clickedIndex] && (
          <circle 
            cx={getX(clickedIndex)} 
            cy={getPriceY(displayData[clickedIndex].price)} 
            r={5} 
            fill="var(--text-primary)" 
            stroke="var(--bg-main)" 
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
      
      {clickedIndex !== null && displayData[clickedIndex] && (
        <div className="chart-tooltip" style={{
          left: Math.min(getX(clickedIndex) + 15, dimensions.width - 150),
          top: Math.max(getPriceY(displayData[clickedIndex].price) - 60, 20),
        }}>
          <p><strong>Time:</strong> {displayData[clickedIndex].time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <p><strong>Volume:</strong> {displayData[clickedIndex].volume.toFixed(2)}</p>
          <p><strong>Max Cap:</strong> {displayData[clickedIndex].maxVolume}</p>
          <p><strong>Price:</strong> {currencySymbol}{displayData[clickedIndex].price.toFixed(2)}</p>
          <button className="super-button primary mt-2" style={{width: '100%', padding: '4px'}} onClick={(e) => {}}></button>
        </div>
      )}

      <style>{`
        .chart-tooltip { position: absolute; background: var(--bg-surface); border: 1px solid var(--border-active); padding: 12px; border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,0.5); pointer-events: none; z-index: 100; font-size: 0.8rem; min-width: 140px; }
        .chart-tooltip p { margin: 0 0 6px 0; color: var(--text-secondary); display: flex; justify-content: space-between; gap: 15px;}
        .chart-tooltip p:last-child { margin-bottom: 0; }
        .chart-tooltip strong { color: var(--text-primary); font-weight: 500;}
        .no-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic; border: 1px dashed var(--border-light); border-radius: var(--radius-lg); }
      `}</style>
    </div>
  );
}
