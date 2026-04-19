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

  // Actual Volume Target calculation (e.g. 85% of target)
  const actualDailyTarget = (settings.dailyVolumeTarget * settings.actualSellOutPercentage) / 100;
  const targetVolumePerHour = actualDailyTarget / totalHours;

  let currentPrice = settings.startingPricePerDay || 0;
  const priceStepTotal = settings.endingPricePerDay && settings.startingPricePerDay
    ? (settings.endingPricePerDay - settings.startingPricePerDay) / (totalHours * 3600)
    : 0;

  const allSecondsData: ChartDataPoint[] = [];

  for (let h = startHour; h < endHour; h++) {
    const hourVolume = settings.hourlyVolumePattern?.[h] ?? targetVolumePerHour;
    const secondVolumeBase = hourVolume / 3600;

    for (let s = 0; s < 3600; s++) {
      const stepTime = new Date(date);
      stepTime.setHours(h, Math.floor(s / 60), s % 60, 0);

      const prevPrice = allSecondsData.length > 0 ? allSecondsData[allSecondsData.length - 1].price : currentPrice;
      currentPrice += priceStepTotal;

      allSecondsData.push({
        time: stepTime,
        volume: secondVolumeBase,
        bulkVolume: 0, // Bulk volume is added separately via live control
        totalVolume: secondVolumeBase,
        maxVolume: settings.dailyVolumeTarget / (totalHours * 3600),
        price: currentPrice,
        isProgressive: currentPrice >= prevPrice,
        isRegressive: currentPrice < prevPrice
      });
    }
  }

  // Aggregation Logic
  if (timeFrame === '10 Minutes') {
    return aggregateData(allSecondsData, 600); // 600 seconds = 10 minutes
  } else if (timeFrame === 'Hourly') {
    return aggregateData(allSecondsData, 3600); // 3600 seconds = 1 hour
  } else {
    // Daily
    return aggregateData(allSecondsData, allSecondsData.length);
  }
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
