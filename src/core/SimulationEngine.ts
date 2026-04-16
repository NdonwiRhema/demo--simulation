import { CategorySettings, ChartDataPoint } from '../types';

/**
 * Procedurally generates data for an entire day
 */
export function generateSimulationData(settings: CategorySettings, date: Date = new Date()): ChartDataPoint[] {
  // Determine hours (0-23) based on Daylight (9-16, i.e., 8 hours starting 9 to 17) or 24H
  const startHour = settings.dayHours === 'Daylight' ? 9 : 0;
  const endHour = settings.dayHours === 'Daylight' ? 17 : 24;

  let currentVolume = settings.startingDailyVolume === 'Continuous' ? 0 : Number(settings.startingDailyVolume) || 0;
  
  // Continuous price tracking if continuous is used
  let currentPrice = settings.priceVariation === 'Continuous' && settings.startingPricePerDay 
    ? settings.startingPricePerDay 
    : 0;
    
  const totalHours = endHour - startHour;
  const priceStep = settings.priceVariation === 'Continuous' && settings.endingPricePerDay && settings.startingPricePerDay
    ? (settings.endingPricePerDay - settings.startingPricePerDay) / (totalHours * 3600)
    : 0;

  const data: ChartDataPoint[] = [];

  for (let h = startHour; h < endHour; h++) {
    // Target volume and price for this hour
    const targetVolumePerHour = settings.volumeVariation === 'Hourly' && settings.hourlyVolumePattern?.[h] !== undefined
      ? settings.hourlyVolumePattern[h]
      : settings.rateOfDepletion;
      
    const targetPricePerHour = settings.priceVariation === 'Hourly' && settings.hourlyPricePattern?.[h] !== undefined
      ? settings.hourlyPricePattern[h]
      : currentPrice + (priceStep * 3600);

    // Distribution arrays
    let volumeDeltas = new Array(3600).fill(targetVolumePerHour / 3600);

    if (settings.variationPattern) {
      // Smoothed Normalized Random Distribution over 3600 points
      const randoms = Array.from({ length: 3600 }, () => Math.random());
      
      // Smoothing with a moving average window of 10 to suppress extremely chaotic static
      const smoothed = randoms.map((_, i, arr) => {
        let sum = 0;
        let count = 0;
        for(let j = Math.max(0, i-5); j <= Math.min(arr.length-1, i+5); j++) {
            sum += arr[j];
            count++;
        }
        return sum / count;
      });

      const totalSmoothed = smoothed.reduce((a, b) => a + b, 0);
      volumeDeltas = smoothed.map(s => targetVolumePerHour * (s / totalSmoothed));
    }

    // Assign per second
    for (let s = 0; s < 3600; s++) {
      const min = Math.floor(s / 60);
      const sec = s % 60;
      
      const stepTime = new Date(date);
      stepTime.setHours(h, min, sec, 0);
      
      const prevPrice = data.length > 0 ? data[data.length - 1].price : currentPrice;
      
      // Update running values
      const volForSecond = volumeDeltas[s];
      currentVolume += volForSecond;
      
      let finalPriceForSecond = currentPrice;
      if (settings.priceVariation === 'Hourly') {
        finalPriceForSecond = targetPricePerHour; // Solid price for the hour.
        if (settings.variationPattern) {
            // Apply slight noise around it
            finalPriceForSecond = targetPricePerHour + (Math.random() - 0.5) * (targetPricePerHour * 0.05);
        }
      } else {
        currentPrice += priceStep; // Increment for continuous
        finalPriceForSecond = currentPrice;
      }
      
      const isProg = finalPriceForSecond >= prevPrice;
      const isReg = finalPriceForSecond < prevPrice;

      data.push({
        time: stepTime,
        volume: volForSecond, // For bar charts we show volume in that period (depletion).
        maxVolume: settings.rateOfDepletion / 3600, // Max rate per second capacity
        price: finalPriceForSecond,
        isProgressive: isProg,
        isRegressive: isReg
      });
    }
  }

  return data;
}
