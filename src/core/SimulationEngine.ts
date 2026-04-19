import { CategorySettings, ChartDataPoint } from '../types';

/**
 * Procedurally generates data for an entire day, aggregated by 10 minutes, Hour, or Day.
 */
export function generateSimulationData(
  settings: CategorySettings, 
  date: Date = new Date(), 
  timeFrame: 'Daily' | 'Hourly' | '10 Minutes' = '10 Minutes'
): ChartDataPoint[] {
  const startHour = settings.dayHours === 'Daylight' ? 8 : 0;
  const endHour = settings.dayHours === 'Daylight' ? 17 : 24;
  const totalHours = endHour - startHour;

  // Determine target volume per hour
  const actualDailyTarget = (settings.dailyVolumeTarget * settings.actualSellOutPercentage) / 100;
  const evenTargetPerHour = actualDailyTarget / totalHours;

  const allSecondsData: ChartDataPoint[] = [];

  for (let h = startHour; h < endHour; h++) {
    // 1. Volume Calculation
    const hourBaseVolume = settings.volumeVariation === 'Hourly' && settings.hourlyVolumePattern
      ? (settings.hourlyVolumePattern[h] || 0)
      : evenTargetPerHour;
    
    // Convert hourly volume to second-by-second volume (with optional minute variation later)
    const secondVolumeBase = hourBaseVolume / 3600;

    // 2. Price Calculation (Hourly vs Continuous)
    let startPrice = 0;
    let endPrice = 0;

    if (settings.priceVariation === 'Hourly' && settings.hourlyPricePattern) {
      startPrice = settings.hourlyPricePattern[h] || 0;
      // Interpolate towards the next hour's price, or stay flat if last hour
      endPrice = settings.hourlyPricePattern[h + 1] || startPrice;
    } else {
      // Continuous: Linearly interpolate across the entire day
      const dayProgressStart = (h - startHour) / totalHours;
      const dayProgressEnd = (h + 1 - startHour) / totalHours;
      const startDayPrice = settings.startingPricePerDay || 0;
      const endDayPrice = settings.endingPricePerDay || startDayPrice;
      
      startPrice = startDayPrice + (endDayPrice - startDayPrice) * dayProgressStart;
      endPrice = startDayPrice + (endDayPrice - startDayPrice) * dayProgressEnd;
    }

    const priceStepPerSecond = (endPrice - startPrice) / 3600;

    for (let s = 0; s < 3600; s++) {
      const stepTime = new Date(date);
      stepTime.setHours(h, Math.floor(s / 60), s % 60, 0);

      // CUTOFF: Only add volume if this second has passed
      const hasPassed = stepTime.getTime() <= date.getTime();
      const currentSecondVolume = hasPassed ? secondVolumeBase : 0;

      const prevPrice = allSecondsData.length > 0 ? allSecondsData[allSecondsData.length - 1].price : startPrice;
      const currentPrice = startPrice + (priceStepPerSecond * s);

      allSecondsData.push({
        time: stepTime,
        volume: currentSecondVolume,
        bulkVolume: 0,
        totalVolume: currentSecondVolume,
        maxVolume: settings.dailyVolumeTarget / (totalHours * 3600),
        price: currentPrice,
        isProgressive: currentPrice >= prevPrice,
        isRegressive: currentPrice < prevPrice
      });
    }
  }

  // Aggregation Logic
  let processedData: ChartDataPoint[] = [];
  if (timeFrame === '10 Minutes') {
    processedData = aggregateData(allSecondsData, 600);
  } else if (timeFrame === 'Hourly') {
    processedData = aggregateData(allSecondsData, 3600);
  } else {
    processedData = aggregateData(allSecondsData, allSecondsData.length);
  }

  // 3. Noise & Normalization (for the "Current" bar only)
  // This causes the "flicker" and height changes on a second-by-second/minute-by-minute basis
  if (settings.variationPattern) {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    processedData.forEach(p => {
      const pTime = p.time.getTime();
      const tenMin = 10 * 60 * 1000;
      const isCurrent = pTime <= now.getTime() && pTime + tenMin > now.getTime();
      
      if (isCurrent) {
        // High-frequency volume noise (±5% second-by-second)
        const secondSeed = currentSecond + now.getMilliseconds() / 1000;
        const noiseVolume = 1 + (Math.sin(secondSeed * 3) * 0.05);
        p.volume *= noiseVolume;
        p.totalVolume = p.volume + p.bulkVolume;

        // VISIBLE Price Volatility (Minute-by-minute)
        // We use the minute as a seed to create a more significant "jump" every minute
        // and add a small second-based jitter on top
        const minuteNoise = (Math.sin(currentMinute * 1.5) * 0.02); // ±2% jump per minute
        const secondJitter = (Math.cos(currentSecond * 2) * 0.002); // ±0.2% jitter
        
        p.price *= (1 + minuteNoise + secondJitter);
      }
    });
  }

  // Inject Bulk Events
  if (settings.bulkEvents && settings.bulkEvents.length > 0) {
    settings.bulkEvents.forEach(event => {
      const eventTs = event.timestamp;
      const eventDate = eventTs instanceof Date ? eventTs : (eventTs as any).toDate ? (eventTs as any).toDate() : new Date(eventTs as any);
      const eventTime = eventDate.getTime();
      
      if (event.timeframe === '10 Minutes') {
        // Find the specific 10m block
        // Note: Even if we are in Hourly view, we still need to know which 10m it hit to aggregate correctly.
        // But the user said if it's 10m, it hits that 10m block.
        processedData.forEach(p => {
          const pStart = p.time.getTime();
          const pEnd = pStart + (timeFrame === '10 Minutes' ? 600000 : (timeFrame === 'Hourly' ? 3600000 : 86400000));
          
          if (eventTime >= pStart && eventTime < pEnd) {
            if (timeFrame === '10 Minutes') {
              p.bulkVolume += event.amount;
              p.totalVolume += event.amount;
            } else {
              // In hourly view, a 10m bump still adds to the hour's total
              p.bulkVolume += event.amount;
              p.totalVolume += event.amount;
            }
          }
        });
      } else if (event.timeframe === 'Hourly') {
        // Find the specific hour
        processedData.forEach(p => {
          const pStart = p.time.getTime();
          const pEnd = pStart + (timeFrame === '10 Minutes' ? 600000 : (timeFrame === 'Hourly' ? 3600000 : 86400000));

          if (timeFrame === '10 Minutes') {
            // If we are in 10m view, an hourly bump should spread across the 6 blocks of that hour
            // We check if this 10m block's start time is within the same hour as the event
            const eventHour = event.timestamp.getHours();
            const pHour = p.time.getHours();
            if (eventHour === pHour) {
              const spreadAmount = event.amount / 6;
              p.bulkVolume += spreadAmount;
              p.totalVolume += spreadAmount;
            }
          } else {
            // In hourly view, just add the whole amount to that hour
            const eventHour = event.timestamp.getHours();
            const pHour = p.time.getHours();
            if (eventHour === pHour) {
              p.bulkVolume += event.amount;
              p.totalVolume += event.amount;
            }
          }
        });
      }
    });
  }

  return processedData;
}

function aggregateData(data: ChartDataPoint[], windowSize: number): ChartDataPoint[] {
  const aggregated: ChartDataPoint[] = [];
  for (let i = 0; i < data.length; i += windowSize) {
    const chunk = data.slice(i, i + windowSize);
    if (chunk.length === 0) continue;

    const totalVol = chunk.reduce((sum, p) => sum + p.volume, 0);
    const totalBulk = chunk.reduce((sum, p) => sum + p.bulkVolume, 0);
    const lastPoint = chunk[chunk.length - 1];

    aggregated.push({
      time: chunk[0].time,
      volume: totalVol,
      bulkVolume: totalBulk,
      totalVolume: totalVol + totalBulk,
      maxVolume: chunk.reduce((sum, p) => sum + p.maxVolume, 0),
      price: lastPoint.price,
      isProgressive: lastPoint.isProgressive,
      isRegressive: lastPoint.isRegressive
    });
  }
  return aggregated;
}

/**
 * Utility to determine if a data point should be animated (is in the future relative to "now" within the simulation day)
 */
export function isFutureData(pointTime: Date): boolean {
  const now = new Date();
  // For simulation purposes, we compare only hours/minutes/seconds of the current day
  const simNow = new Date(pointTime);
  simNow.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return pointTime > simNow;
}
