import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppConfig } from '../../context/AppContext';
import { Category, ChartMode, ChartDataPoint } from '../../types';
import { generateSimulationData, generateDailyMacroData } from '../../core/SimulationEngine';

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
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const currentHour = simulatedTime ? simulatedTime.getHours() : (category?.settings.dayHours === 'Daylight' ? 9 : 0);

  const macroData = useMemo(() => {
    if (!category) return [];
    return generateDailyMacroData(category.settings, new Date());
  }, [category]);

  const [dataMap, setDataMap] = useState<Record<number, ChartDataPoint[]>>({});

  // Clear memory cache strictly when transitioning apps/categories
  useEffect(() => {
    if (!category) return;
    setDataMap({}); 
  }, [category]);

  // Hourly Background Cache Preloader
  useEffect(() => {
    if (!category) return;

    setDataMap(prev => {
      const next = { ...prev };
      let changed = false;

      // Ensure active chunk is populated
      if (!next[currentHour]) {
        next[currentHour] = generateSimulationData(category.settings, new Date(), currentHour);
        changed = true;
      }

      // Prefetch proceeding hour sequentially
      const nextHour = currentHour + 1;
      const endHour = category.settings.dayHours === 'Daylight' ? 17 : 24;
      if (nextHour < endHour && !next[nextHour]) {
        setTimeout(() => {
           setDataMap(p => {
              if (p[nextHour]) return p;
              return { ...p, [nextHour]: generateSimulationData(category.settings, new Date(), nextHour) };
           });
        }, 50);
      }
      
      return changed ? next : prev;
    });
  }, [category, currentHour]);

  // Retrieve raw active chunk scaled exactly by the progression of time
  const visibleRawData = useMemo(() => {
    if (!simulatedTime || !dataMap[currentHour]) return [];
    return dataMap[currentHour].filter(d => d.time <= simulatedTime);
  }, [simulatedTime, currentHour, dataMap]);

  // To prevent the X-axis from sliding continuously alongside arrays of varying length, we maintain a hard-locked spatial constraint.
  const maxDomainLength = timeFrame === 'Hours' ? (category.settings.dayHours === 'Daylight' ? 8 : 24) : 60; // Minutes and Seconds both max at 60 points!

  const displayData = useMemo(() => {
    if (!category || visibleRawData.length === 0) return [];
    const startHour = category.settings.dayHours === 'Daylight' ? 9 : 0;

    // 1. HOURS TIMEFRAME
    if (timeFrame === 'Hours') {
      return macroData.filter(m => simulatedTime && m.time <= simulatedTime).map(m => {
         if (m.time.getHours() === currentHour && simulatedTime) {
           const currentRaw = visibleRawData;
           if (currentRaw.length > 0) {
             const last = currentRaw[currentRaw.length - 1];
             const sumVol = currentRaw.reduce((acc, b) => acc + b.volume, 0);
             return {
               ...m,
               volume: Math.max(0, sumVol),
               price: last.price,
               isProgressive: currentHour > startHour ? last.price >= (macroData[m.time.getHours() - startHour - 1]?.price || 0) : true,
               isRegressive: currentHour > startHour ? last.price < (macroData[m.time.getHours() - startHour - 1]?.price || 0) : false
             };
           }
         }
         return m;
      });
    }

    // 2. MINUTES TIMEFRAME
    if (timeFrame === 'Minutes') {
       if (!simulatedTime) return [];
       const minutely: ChartDataPoint[] = [];
       const groupedMap = new Map<number, ChartDataPoint[]>();
       
       for(const pt of visibleRawData) {
          const minuteTs = new Date(pt.time.getFullYear(), pt.time.getMonth(), pt.time.getDate(), pt.time.getHours(), pt.time.getMinutes(), 0, 0).getTime();
          if(!groupedMap.has(minuteTs)) groupedMap.set(minuteTs, []);
          groupedMap.get(minuteTs)!.push(pt);
       }

       // Only map the minute segments that actually exist within visibleRawData
       const minutesPassed = simulatedTime.getMinutes();
       for (let m = 0; m <= minutesPassed; m++) {
          const minuteTs = new Date(simulatedTime.getFullYear(), simulatedTime.getMonth(), simulatedTime.getDate(), currentHour, m, 0, 0).getTime();
          const pointsInMinute = groupedMap.get(minuteTs);
          
          if (pointsInMinute && pointsInMinute.length > 0) {
             const last = pointsInMinute[pointsInMinute.length - 1];
             const sumVol = pointsInMinute.reduce((a, b) => a + b.volume, 0);
             minutely.push({
                time: new Date(minuteTs),
                volume: sumVol,
                maxVolume: category.settings.rateOfDepletion / 60,
                price: last.price, 
                isProgressive: false,
                isRegressive: false
             });
          } else if (m < minutesPassed) {
             // For missing minutes within the elapsed time, push zero volume to keep historical gaps accurate
             minutely.push({
                time: new Date(minuteTs),
                volume: 0,
                maxVolume: category.settings.rateOfDepletion / 60,
                price: minutely.length > 0 ? minutely[minutely.length - 1].price : (currentHour > startHour && macroData[currentHour - startHour - 1] ? macroData[currentHour - startHour - 1].price : 0),
                isProgressive: false,
                isRegressive: false
             });
          }
       }
       
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

    // 3. SECONDS TIMEFRAME
    if (timeFrame === 'Seconds') {
       if (!simulatedTime) return [];
       const currentMinTs = new Date(simulatedTime.getFullYear(), simulatedTime.getMonth(), simulatedTime.getDate(), simulatedTime.getHours(), simulatedTime.getMinutes(), 0, 0).getTime();
       
       // Sift visible array to strictly just the data existing within this specific ongoing minute. 
       const secondsInCurrentMinute = visibleRawData.filter(d => d.time.getTime() >= currentMinTs);
       
       return secondsInCurrentMinute.map((pt, s) => ({
           ...pt,
           isProgressive: s > 0 ? pt.price >= secondsInCurrentMinute[s-1].price : true, 
           isRegressive: s > 0 ? pt.price < secondsInCurrentMinute[s-1].price : false 
       }));
    }

    return [];
  }, [visibleRawData, timeFrame, category, simulatedTime, currentHour, dataMap, macroData]);

  // Live Engine Playback Timer
  useEffect(() => {
    if (!category || Object.keys(dataMap).length === 0) return;
    const startHour = category.settings.dayHours === 'Daylight' ? 9 : 0;
    const endHour = category.settings.dayHours === 'Daylight' ? 17 : 24;

    if (!simulatedTime) {
      const initDt = new Date();
      initDt.setHours(startHour, 0, 0, 0);
      setSimulatedTime(initDt);
      return;
    }

    // Slowed down playback visual for much easier and realistic progression observation (200ms -> 5x speed, previously 20x speed)
    const playheadTimer = setInterval(() => {
      setSimulatedTime(prev => {
        if (!prev) return prev;
        const nextTime = new Date(prev.getTime() + 1000); 
        if (nextTime.getHours() >= endHour) {
          clearInterval(playheadTimer);
          return prev;
        }
        return nextTime;
      });
    }, 200);

    return () => clearInterval(playheadTimer);
  }, [category, simulatedTime === null, Object.keys(dataMap).length === 0]);

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
  
  const chartW = (dimensions.width * zoomLevel) - paddingX * 2;
  const chartH = dimensions.height - paddingY * 2;
  
  // Math rigidly distributes against the Max Domain Space instead of dynamic length!
  const getX = (index: number) => paddingX + (index / Math.max(maxDomainLength - 1, 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - (val / (maxVolumeLimit || 1)) * chartH;
  const getPriceY = (val: number) => paddingY + chartH - (val / (maxPriceLimit || 1)) * chartH;

  const pathD = mode === 'Line' && displayData.length > 0
    ? displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getPriceY(d.price)}`).join(' ')
    : '';

  const yTicks = [0, maxPriceLimit * 0.25, maxPriceLimit * 0.5, maxPriceLimit * 0.75, maxPriceLimit];
  
  const pointWidth = Math.max((chartW / maxDomainLength) * 0.6, 2);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflowX: 'auto', overflowY: 'hidden' }}>
      <div className="zoom-controls">
         <button className="super-button secondary" onClick={() => setZoomLevel(z => Math.min(z + 0.5, 10))}>+</button>
         <button className="super-button secondary" onClick={() => setZoomLevel(z => Math.max(z - 0.5, 1))}>-</button>
      </div>
      
      <svg width={dimensions.width * zoomLevel} height={dimensions.height}>
        {/* Y Axis Grid & Labels */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line 
              x1={paddingX} y1={getPriceY(tick)} 
              x2={dimensions.width * zoomLevel - paddingX} y2={getPriceY(tick)} 
              stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" 
            />
            <text x={10} y={getPriceY(tick) + 4} fill="var(--text-secondary)" fontSize={10} style={{ position: 'sticky', left: 10 }}>{currencySymbol}{tick.toFixed(1)}</text>
          </g>
        ))}

        {/* Global Fixed X-Axis Grid & Timestamps - Guaranteed constant rendering space regardless of progressing simulated bounds */}
        {[...Array(maxDomainLength)].map((_, i) => {
           let drawLabel = false;
           
           if (timeFrame === 'Hours') drawLabel = true;
           // Interval rendering logic guaranteeing absolute constraints on exact markings (i.e. strictly :00, :10, :20 etc)
           if (timeFrame === 'Minutes') drawLabel = i % 10 === 0;   // Every 10 mins
           if (timeFrame === 'Seconds') drawLabel = i % 60 === 0;   // Every 60 secs (1 min)

           if (!drawLabel) return null;
           
           const x = getX(i);
           
           let labelContent = '';
           if (timeFrame === 'Hours') {
             const h = (category.settings.dayHours === 'Daylight' ? 9 : 0) + i;
             const dt = new Date(); dt.setHours(h, 0, 0, 0);
             labelContent = dt.toLocaleTimeString([], {hour: 'numeric'});
           } else if (timeFrame === 'Minutes') {
             const dt = new Date(); dt.setHours(currentHour, i, 0, 0);
             // Outputs exactly 10:00, 10:10, 10:20... 10:50!
             labelContent = dt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
           } else {
             const m = Math.floor(i / 60);
             const dt = new Date(); dt.setHours(currentHour, m, 0, 0);
             // Render minute strings onto map for seconds mapping blocks.
             labelContent = dt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
           }

           return (
             <g key={`x-axis-${i}`}>
               <line x1={x} y1={paddingY} x2={x} y2={dimensions.height - paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
               <text x={x} y={dimensions.height - paddingY + 20} fill="var(--text-secondary)" fontSize={10} textAnchor="middle">
                  {labelContent}
               </text>
             </g>
           );
        })}

        {/* Line Series Map */}
        {mode === 'Line' && (
          <path d={pathD} fill="none" stroke="var(--accent-purple)" strokeWidth={2} />
        )}

        {/* Candles and Bars Map */}
        {mode !== 'Line' && displayData.map((d, i) => {
          const x = getX(timeFrame === 'Hours' ? (d.time.getHours() - (category.settings.dayHours === 'Daylight' ? 9 : 0)) : (timeFrame === 'Minutes' ? d.time.getMinutes() : i));
          
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

          if (mode === 'Bar') {
             return (
               <rect 
                 key={`bar-${i}`} 
                 x={x - pointWidth/2} 
                 y={yTop} 
                 width={pointWidth} 
                 height={bodyHeight} 
                 fill={color} 
                 rx={1}
               />
             );
          }

          if (mode === 'Candlestick') {
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
             );
          }
          return null;
        })}
        
        <g className="interaction-layer">
          {displayData.map((d, i) => {
            const x = getX(timeFrame === 'Hours' ? (d.time.getHours() - (category.settings.dayHours === 'Daylight' ? 9 : 0)) : (timeFrame === 'Minutes' ? d.time.getMinutes() : i));
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
            cx={getX(timeFrame === 'Hours' ? (displayData[hoveredIndex].time.getHours() - (category.settings.dayHours === 'Daylight' ? 9 : 0)) : (timeFrame === 'Minutes' ? displayData[hoveredIndex].time.getMinutes() : hoveredIndex))} 
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
            cx={getX(timeFrame === 'Hours' ? (displayData[clickedIndex].time.getHours() - (category.settings.dayHours === 'Daylight' ? 9 : 0)) : (timeFrame === 'Minutes' ? displayData[clickedIndex].time.getMinutes() : clickedIndex))} 
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
          left: Math.min(getX(timeFrame === 'Hours' ? (displayData[clickedIndex].time.getHours() - (category.settings.dayHours === 'Daylight' ? 9 : 0)) : (timeFrame === 'Minutes' ? displayData[clickedIndex].time.getMinutes() : clickedIndex)) + 15, dimensions.width - 150),
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
        .zoom-controls { position: sticky; left: 10px; top: 10px; display: flex; flex-direction: column; gap: 5px; z-index: 50; padding-top: 10px;}
        .zoom-controls button { width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; font-weight: bold;}
        .chart-tooltip { position: absolute; background: var(--bg-surface); border: 1px solid var(--border-active); padding: 12px; border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0,0,0,0.5); pointer-events: none; z-index: 100; font-size: 0.8rem; min-width: 140px; }
        .chart-tooltip p { margin: 0 0 6px 0; color: var(--text-secondary); display: flex; justify-content: space-between; gap: 15px;}
        .chart-tooltip p:last-child { margin-bottom: 0; }
        .chart-tooltip strong { color: var(--text-primary); font-weight: 500;}
        .no-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic; border: 1px dashed var(--border-light); border-radius: var(--radius-lg); }
      `}</style>
    </div>
  );
}
