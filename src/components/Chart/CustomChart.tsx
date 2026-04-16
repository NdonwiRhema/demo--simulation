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

  // To prevent the X-axis from sliding continuously alongside arrays of varying length, we maintain a hard-locked spatial constra  // Calculate total absolute boundaries representing 100% of the timeline scope for each scale respectively
  const maxDomainLength = timeFrame === 'Hours' 
     ? (category.settings.dayHours === 'Daylight' ? 8 : 24) 
     : (timeFrame === 'Minutes' ? (category.settings.dayHours === 'Daylight' ? 8 * 60 : 24 * 60) : 3600);

  const startHour = category.settings.dayHours === 'Daylight' ? 9 : 0;

  const displayData = useMemo(() => {
    if (!category || Object.keys(dataMap).length === 0) return [];
    
    // 1. HOURS TIMEFRAME
    if (timeFrame === 'Hours') {
      return macroData.filter(m => simulatedTime && m.time <= simulatedTime).map(m => {
         if (m.time.getHours() === currentHour && simulatedTime) {
           const currentRaw = dataMap[currentHour] ? dataMap[currentHour].filter(d => d.time <= simulatedTime) : [];
           if (currentRaw.length > 0) {
             const last = currentRaw[currentRaw.length - 1];
             const sumVol = currentRaw.reduce((acc, b) => acc + b.volume, 0);
             return {
               ...m, volume: Math.max(0, sumVol), price: last.price,
               isProgressive: currentHour > startHour ? last.price >= (macroData[m.time.getHours() - startHour - 1]?.price || 0) : true,
               isRegressive: currentHour > startHour ? last.price < (macroData[m.time.getHours() - startHour - 1]?.price || 0) : false
             };
           }
         }
         return m;
      });
    }

    // 2. MINUTES TIMEFRAME (Global accumulative up to current time)
    if (timeFrame === 'Minutes') {
       if (!simulatedTime) return [];
       const minutely: ChartDataPoint[] = [];

       // We gather points from ALL available cached hours up to current, preventing screen-clearing when hours swap!
       for (const [hourStr, points] of Object.entries(dataMap)) {
          const h = parseInt(hourStr);
          if (h > currentHour) continue;
          
          const validPoints = h === currentHour ? points.filter(p => p.time <= simulatedTime) : points;
          
          const groupedMap = new Map<number, ChartDataPoint[]>();
          for(const pt of validPoints) {
             const minuteTs = new Date(pt.time.getFullYear(), pt.time.getMonth(), pt.time.getDate(), pt.time.getHours(), pt.time.getMinutes(), 0, 0).getTime();
             if(!groupedMap.has(minuteTs)) groupedMap.set(minuteTs, []);
             groupedMap.get(minuteTs)!.push(pt);
          }

          const minutesInHour = h === currentHour ? simulatedTime.getMinutes() : 59;
          
          for (let m = 0; m <= minutesInHour; m++) {
             const minuteTs = new Date(simulatedTime.getFullYear(), simulatedTime.getMonth(), simulatedTime.getDate(), h, m, 0, 0).getTime();
             const pointsInMinute = groupedMap.get(minuteTs);
             
             if (pointsInMinute && pointsInMinute.length > 0) {
                const last = pointsInMinute[pointsInMinute.length - 1];
                const sumVol = pointsInMinute.reduce((a, b) => a + b.volume, 0);
                minutely.push({
                   time: new Date(minuteTs), volume: sumVol, maxVolume: category.settings.rateOfDepletion / 60, price: last.price, isProgressive: false, isRegressive: false
                });
             } else {
                minutely.push({
                   time: new Date(minuteTs), volume: 0, maxVolume: category.settings.rateOfDepletion / 60,
                   price: minutely.length > 0 ? minutely[minutely.length - 1].price : (h > startHour && macroData[h - startHour - 1] ? macroData[h - startHour - 1].price : 0),
                   isProgressive: false, isRegressive: false
                });
             }
          }
       }
       
       minutely.forEach((m, i) => {
         if (i > 0) { m.isProgressive = m.price >= minutely[i-1].price; m.isRegressive = m.price < minutely[i-1].price; } else { m.isProgressive = true; }
       });
       return minutely;
    }

    // 3. SECONDS TIMEFRAME (Accumulate entire current hour sequentially, no clearing after mere 60 seconds)
    if (timeFrame === 'Seconds') {
       if (!simulatedTime || !dataMap[currentHour]) return [];
       const validCurrentHourSecs = dataMap[currentHour].filter(d => d.time <= simulatedTime);
       
       return validCurrentHourSecs.map((pt, s) => ({
           ...pt,
           isProgressive: s > 0 ? pt.price >= validCurrentHourSecs[s-1].price : true, 
           isRegressive: s > 0 ? pt.price < validCurrentHourSecs[s-1].price : false 
       }));
    }

    return [];
  }, [timeFrame, category, simulatedTime, currentHour, dataMap, macroData]);

  // Live Engine Playback Timer
  useEffect(() => {
    if (!category || Object.keys(dataMap).length === 0) return;
    const endHour = category.settings.dayHours === 'Daylight' ? 17 : 24;

    if (!simulatedTime) {
      const initDt = new Date();
      initDt.setHours(startHour, 0, 0, 0);
      setSimulatedTime(initDt);
      return;
    }

    const playheadTimer = setInterval(() => {
      setSimulatedTime(prev => {
        if (!prev) return prev;
        const nextTime = new Date(prev.getTime() + 1000); 
        if (nextTime.getHours() >= endHour) { clearInterval(playheadTimer); return prev; }
        return nextTime;
      });
    }, 200);

    return () => clearInterval(playheadTimer);
  }, [category, simulatedTime === null, Object.keys(dataMap).length === 0, startHour]);

  useEffect(() => {
    setHoveredIndex(null);
    setClickedIndex(null);
  }, [displayData.length]);
  
  // Auto-scroll tracker when mapped boundaries expand aggressively (pin window to playback)
  useEffect(() => {
    if (containerRef.current) {
        const diff = containerRef.current.scrollWidth - containerRef.current.clientWidth;
        if (diff > 0 && containerRef.current.scrollLeft >= diff - 200) {
           // Only forcefully drag if the user is already actively watching the right-most edge
           containerRef.current.scrollLeft = diff;
        }
    }
  }, [displayData.length]);

  if (!category || displayData.length === 0) {
    return <div className="no-chart" ref={containerRef}>Processing Simulation Data...</div>;
  }
  
  const maxVolumeLimit = Math.max(...displayData.map(d => Math.max(d.maxVolume, d.volume))) * 1.2;
  const maxPriceLimit = Math.max(...displayData.map(d => d.price)) * 1.2;
  
  const paddingX = 40;
  const paddingY = 40;
  
  const basePointWidth = timeFrame === 'Hours' ? 80 : (timeFrame === 'Minutes' ? 15 : 5);
  const actualPointWidth = Math.max(basePointWidth * zoomLevel, 1);
  
  // Generating Scrollable Dimensions - Free unrestricted physical width!
  const svgPhysicalWidth = Math.max(dimensions.width, paddingX * 2 + (maxDomainLength * actualPointWidth));
  const chartH = dimensions.height - paddingY * 2;
  
  const getX = (index: number) => paddingX + (index * actualPointWidth) + (actualPointWidth / 2);
  const getY = (val: number) => paddingY + chartH - (val / (maxVolumeLimit || 1)) * chartH;
  const getPriceY = (val: number) => paddingY + chartH - (val / (maxPriceLimit || 1)) * chartH;

  const pathD = mode === 'Line' && displayData.length > 0
    ? displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getPriceY(d.price)}`).join(' ')
    : '';

  const yTicks = [0, maxPriceLimit * 0.25, maxPriceLimit * 0.5, maxPriceLimit * 0.75, maxPriceLimit];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth' }}>
      <div className="zoom-controls">
         <button className="super-button secondary" onClick={() => setZoomLevel(z => Math.min(z + 0.5, 4))}>+</button>
         <button className="super-button secondary" onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.25))}>-</button>
      </div>
      
      <svg width={svgPhysicalWidth} height={dimensions.height} style={{ minWidth: dimensions.width }}>
        {/* Y Axis Grid & Labels - We dynamically expand lines across the physical pan width */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line x1={paddingX} y1={getPriceY(tick)} x2={svgPhysicalWidth - paddingX} y2={getPriceY(tick)} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <text x={10} y={getPriceY(tick) + 4} fill="var(--text-secondary)" fontSize={10} style={{ position: 'sticky', left: 10 }}>{currencySymbol}{tick.toFixed(1)}</text>
          </g>
        ))}

        {/* Global Fixed X-Axis Grid - Renders fully out unconditionally across entirety of scope creating persistent scrollable canvas guidelines */}
        {[...Array(maxDomainLength)].map((_, i) => {
           let drawLabel = false;
           
           if (timeFrame === 'Hours') drawLabel = true;
           if (timeFrame === 'Minutes') drawLabel = i % 15 === 0; // Mark every 15 mins (0, 15, 30, 45)
           if (timeFrame === 'Seconds') drawLabel = i % 120 === 0; // Mark every 120s (2 minutes) on deep scroll mode
           
           if (!drawLabel) return null;
           
           const x = getX(i);
           
           let labelContent = '';
           if (timeFrame === 'Hours') {
             const dt = new Date(); dt.setHours(startHour + i, 0, 0, 0);
             labelContent = dt.toLocaleTimeString([], {hour: 'numeric'});
           } else if (timeFrame === 'Minutes') {
             const mTotal = i;
             const hOffset = Math.floor(mTotal / 60);
             const mins = mTotal % 60;
             const dt = new Date(); dt.setHours(startHour + hOffset, mins, 0, 0);
             labelContent = dt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
           } else {
             const mTotal = Math.floor(i / 60);
             const sOff = i % 60;
             const dt = new Date(); dt.setHours(currentHour, mTotal, sOff, 0);
             labelContent = dt.toLocaleTimeString([], {minute: '2-digit', second: '2-digit'});
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

        {mode === 'Line' && <path d={pathD} fill="none" stroke="var(--accent-purple)" strokeWidth={2} />}

        {mode !== 'Line' && displayData.map((d, i) => {
          const isMinutes = timeFrame === 'Minutes';
          const isHours = timeFrame === 'Hours';
          
          // Absolute explicit index mappings
          const mappedIndex = isHours ? (d.time.getHours() - startHour) : (isMinutes ? ((d.time.getHours() - startHour) * 60 + d.time.getMinutes()) : i);
          
          const x = getX(mappedIndex);
          const openPrice = i > 0 ? displayData[i - 1].price : (displayData[0]?.price || 0);
          const closePrice = d.price;
          const remainingUnits = d.maxVolume - d.volume;

          const yOpen = getPriceY(openPrice);
          const yClose = getPriceY(closePrice);
          const yTop = Math.min(yOpen, yClose);
          const yBottom = Math.max(yOpen, yClose);
          const bodyHeight = Math.max(yBottom - yTop, 2);

          let color = 'var(--accent-purple)';
          if (category.settings.vToVRelation === 'Display') { color = closePrice >= openPrice ? 'var(--accent-green)' : 'var(--accent-red)'; }

          const effectiveWidth = Math.max(actualPointWidth * 0.8, 2);

          if (mode === 'Bar') {
             return <rect key={`bar-${mappedIndex}`} x={x - effectiveWidth/2} y={yTop} width={effectiveWidth} height={bodyHeight} fill={color} rx={1} />;
          }

          if (mode === 'Candlestick') {
             const wickLength = (Math.max(remainingUnits, 0) / (maxVolumeLimit || 1)) * chartH;
             return (
               <g key={`candle-${mappedIndex}`}>
                 <line x1={x} y1={yBottom} x2={x} y2={yBottom + wickLength} stroke="#ffffff" strokeWidth={Math.max(effectiveWidth * 0.2, 1)} opacity={0.8} />
                 <rect x={x - effectiveWidth/2} y={yTop} width={effectiveWidth} height={bodyHeight} fill={color} />
               </g>
             );
          }
          return null;
        })}
        
        <g className="interaction-layer">
          {displayData.map((d, i) => {
            const mappedIndex = timeFrame === 'Hours' ? (d.time.getHours() - startHour) : (timeFrame === 'Minutes' ? ((d.time.getHours() - startHour) * 60 + d.time.getMinutes()) : i);
            const x = getX(mappedIndex);
            const hitWidth = Math.max(actualPointWidth, 15);
            return (
              <rect key={`hit-${i}`} x={x - hitWidth/2} y={paddingY} width={hitWidth} height={chartH} fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setClickedIndex(clickedIndex === i ? null : i)} style={{ cursor: 'pointer' }}
              />
            );
          })}
        </g>

        {hoveredIndex !== null && displayData[hoveredIndex] && (
          <circle 
            cx={getX(timeFrame === 'Hours' ? (displayData[hoveredIndex].time.getHours() - startHour) : (timeFrame === 'Minutes' ? ((displayData[hoveredIndex].time.getHours() - startHour) * 60 + displayData[hoveredIndex].time.getMinutes()) : hoveredIndex))} 
            cy={getPriceY(displayData[hoveredIndex].price)} r={5} fill="var(--accent-gold)" stroke="var(--bg-main)" strokeWidth={2} style={{ pointerEvents: 'none' }} />
        )}
        
        {clickedIndex !== null && displayData[clickedIndex] && (
          <circle cx={getX(timeFrame === 'Hours' ? (displayData[clickedIndex].time.getHours() - startHour) : (timeFrame === 'Minutes' ? ((displayData[clickedIndex].time.getHours() - startHour) * 60 + displayData[clickedIndex].time.getMinutes()) : clickedIndex))} 
            cy={getPriceY(displayData[clickedIndex].price)} r={5} fill="var(--text-primary)" stroke="var(--bg-main)" strokeWidth={2} style={{ pointerEvents: 'none' }} />
        )}
      </svg>
      
      {clickedIndex !== null && displayData[clickedIndex] && (
        <div className="chart-tooltip" style={{
          left: Math.min(getX(timeFrame === 'Hours' ? (displayData[clickedIndex].time.getHours() - startHour) : (timeFrame === 'Minutes' ? ((displayData[clickedIndex].time.getHours() - startHour) * 60 + displayData[clickedIndex].time.getMinutes()) : clickedIndex)) + 15, Math.max(dimensions.width, svgPhysicalWidth) - 150),
          top: Math.max(getPriceY(displayData[clickedIndex].price) - 60, 20),
        }}>
          <p><strong>Time:</strong> {displayData[clickedIndex].time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <p><strong>Volume:</strong> {displayData[clickedIndex].volume.toFixed(2)}</p>
          <p><strong>Max Cap:</strong> {displayData[clickedIndex].maxVolume}</p>
          <p><strong>Price:</strong> {currencySymbol}{displayData[clickedIndex].price.toFixed(2)}</p>
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
