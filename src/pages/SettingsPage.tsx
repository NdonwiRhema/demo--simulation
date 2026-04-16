import React, { useState } from 'react';
import { useAppConfig } from '../context/AppContext';
import { Category, DayHours, VariationType, VToVRelation } from '../types';

export default function SettingsPage() {
  const { categories, updateCategoryParams, savePreset, currency, setCurrency } = useAppConfig();
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id);
  const [isApplying, setIsApplying] = useState(false);

  const selectedCategory = categories.find(c => c.id === selectedCatId);

  const [volVar, setVolVar] = React.useState(categories[0]?.settings.volumeVariation);
  const [priceVar, setPriceVar] = React.useState(categories[0]?.settings.priceVariation);
  const [dayType, setDayType] = React.useState(categories[0]?.settings.dayHours);

  React.useEffect(() => {
    if (selectedCategory) {
      setVolVar(selectedCategory.settings.volumeVariation);
      setPriceVar(selectedCategory.settings.priceVariation);
      setDayType(selectedCategory.settings.dayHours);
    }
  }, [selectedCategory]);

  const isDaylight = dayType === 'Daylight';
  const startHour = isDaylight ? 9 : 0;
  const endHour = isDaylight ? 17 : 24;
  const hoursRange = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const formatHour = (h: number) => {
    const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}${ampm}`;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedCatId) return;

    setIsApplying(true);
    const fd = new FormData(e.currentTarget as HTMLFormElement);

    setTimeout(() => {
      const newParams: Partial<Category['settings']> = {
        dayHours: dayType as any,
        rateOfDepletion: Number(fd.get('rateOfDepletion')),
        startingDailyVolume: fd.get('startingDailyVolume') === 'Custom' ? Number(fd.get('customVolume')) : 'Continuous',
        volumeVariation: volVar as any,
        priceVariation: priceVar as any,
        vToVRelation: fd.get('vToVRelation') as any,
        variationPattern: fd.get('variationPattern') === 'on',
      };

      if (priceVar === 'Continuous') {
        newParams.startingPricePerDay = Number(fd.get('startingPricePerDay'));
        newParams.endingPricePerDay = Number(fd.get('endingPricePerDay'));
      }

      if (volVar === 'Hourly') {
        const hourlyVol: Record<number, number> = {};
        hoursRange.forEach(h => hourlyVol[h] = Number(fd.get(`vol-${h}`)));
        newParams.hourlyVolumePattern = hourlyVol;
      }

      if (priceVar === 'Hourly') {
        const hourlyPri: Record<number, number> = {};
        hoursRange.forEach(h => hourlyPri[h] = Number(fd.get(`price-${h}`)));
        newParams.hourlyPricePattern = hourlyPri;
      }

      updateCategoryParams(selectedCatId, newParams);
      setIsApplying(false);
    }, 800);
  };

  // In a full implementation, these would trigger context updates (e.g. updateCategoryParams).
  // For the UI mockup required by the current scope, they read from state.
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Admin Settings</h2>
        <p>Configure simulation parameters per category</p>
      </div>

      <div className="settings-body">
        <div className="cat-selector">
          <label>Select Category</label>
          <select
            value={selectedCatId}
            onChange={e => setSelectedCatId(e.target.value)}
            className="super-select"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <form className="params-grid" onSubmit={handleApply}>
            <div className="param-card">
              <label>Day Hours</label>
              <select className="super-select" name="dayHours" value={dayType} onChange={e => setDayType(e.target.value as any)}>
                <option value="Daylight">Daylight (9am - 5pm)</option>
                <option value="24H">24H</option>
              </select>
            </div>

            <div className="param-card">
              <label>Rate of Depletion (Max Vol/hr)</label>
              <input type="number" name="rateOfDepletion" className="super-input" defaultValue={selectedCategory.settings.rateOfDepletion} />
            </div>

            <div className="param-card">
              <label>Starting Daily Volume</label>
              <select className="super-select" name="startingDailyVolume" defaultValue={selectedCategory.settings.startingDailyVolume === 'Continuous' ? 'Continuous' : 'Custom'}>
                <option value="Custom">Custom (starts from X)</option>
                <option value="Continuous">Continuous (picks up from yesterday)</option>
              </select>
              {selectedCategory.settings.startingDailyVolume !== 'Continuous' && (
                <input type="number" name="customVolume" className="super-input mt-2" placeholder="Value (e.g. 0)" defaultValue={selectedCategory.settings.startingDailyVolume} />
              )}
            </div>

            <div className="settings-section">
              <h3 className="section-title">Global Settings</h3>
              <div className="param-card">
                <div className="param-header">
                  <h4>Primary Currency</h4>
                  <p>The standard fiat mapping used for the charts.</p>
                </div>
                <select className="super-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="INR">🇮🇳 INR</option>
                  <option value="USD">🇺🇸 USD</option>
                  <option value="EUR">🇪🇺 EUR</option>
                  <option value="GBP">🇬🇧 GBP</option>
                </select>
              </div>
            </div>

            <div className="settings-section">
              <h3 className="section-title">Data Variations</h3>
              <div className="param-card">
                <label>Volume Variation</label>
                <select className="super-select" value={volVar} onChange={e => setVolVar(e.target.value as any)}>
                  <option value="Hourly">Hourly Custom Setup</option>
                  <option value="Continuous">Continuous (Based on Rate)</option>
                </select>
                {volVar === 'Hourly' && (
                  <div className="hourly-grid">
                    {hoursRange.map(h => (
                      <div key={`vol-${h}`} className="hr-input-row">
                        <span>{formatHour(h)} - {formatHour(h + 1)}</span>
                        <input type="number" name={`vol-${h}`} className="super-input min" defaultValue={selectedCategory.settings.hourlyVolumePattern?.[h] || 0} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="param-card">
                <label>Price Variation</label>
                <select className="super-select" value={priceVar} onChange={e => setPriceVar(e.target.value as any)}>
                  <option value="Hourly">Hourly Custom Setup</option>
                  <option value="Continuous">Continuous (Start to End)</option>
                </select>
                {priceVar === 'Continuous' && (
                  <div className="flex-row">
                    <input type="number" name="startingPricePerDay" className="super-input min" placeholder="Start Price" defaultValue={selectedCategory.settings.startingPricePerDay} />
                    <input type="number" name="endingPricePerDay" className="super-input min" placeholder="End Price" defaultValue={selectedCategory.settings.endingPricePerDay} />
                  </div>
                )}
                {priceVar === 'Hourly' && (
                  <div className="hourly-grid">
                    {hoursRange.map(h => (
                      <div key={`price-${h}`} className="hr-input-row">
                        <span>{formatHour(h)} - {formatHour(h + 1)}</span>
                        <input type="number" name={`price-${h}`} className="super-input min" defaultValue={selectedCategory.settings.hourlyPricePattern?.[h] || 0} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="param-card">
                <label>V to V Relation (Chart Coloring)</label>
                <select className="super-select" name="vToVRelation" defaultValue={selectedCategory.settings.vToVRelation}>
                  <option value="None">None (Uniform Color)</option>
                  <option value="Display">Display (Progressive/Regressive)</option>
                </select>
              </div>

              <div className="param-card full-span">
                <label>Variation Pattern</label>
                <div className="flex-align">
                  <input type="checkbox" name="variationPattern" id="vpattern" defaultChecked={selectedCategory.settings.variationPattern} className="super-check" />
                  <label htmlFor="vpattern" className="check-label">Enable smoothed random minute-by-minute fluctuations</label>
                </div>
              </div>

              <div className="param-card full-span action-row">
                <button type="submit" className="super-button primary" disabled={isApplying}>
                  {isApplying ? 'Applying Changes...' : 'Apply Parameters'}
                </button>
                <button type="button" className="super-button secondary" onClick={() => {
                  savePreset();
                  alert('Application settings saved securely to browser Local Storage!');
                }}>Save as Preset</button>
              </div>
            </div>
          </form>
        )}
      </div>

      <style>{`
      .settings-container { display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding-right: 15px;}
      .settings-header { margin-bottom: 30px; }
      .settings-header h2 { font-size: 1.8rem; font-weight: 500; margin-bottom: 5px; }
      .settings-header p { color: var(--text-secondary); }
      
      .cat-selector { margin-bottom: 30px; max-width: 400px; }
      
      .params-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .param-card { background: var(--bg-surface); padding: 20px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.03);}
      .param-card.full-span { grid-column: 1 / -1; }
      .param-card label { display: block; margin-bottom: 10px; color: var(--text-secondary); font-size: 0.85rem;}
      
      .super-select, .super-input { width: 100%; background: var(--bg-main); border: 1px solid var(--border-light); color: #fff; padding: 12px; border-radius: var(--radius-sm); outline: none; transition: 0.2s;}
      .super-select:focus, .super-input:focus { border-color: var(--accent-purple); }
      .mt-2 { margin-top: 10px; }
      .flex-row { display: flex; gap: 10px; margin-top: 10px; }
      .super-input.min { width: 50%; }
      .hourly-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; max-height: 200px; overflow-y: auto; padding-right: 5px;}
      .hr-input-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 4px;}
      .hr-input-row input { width: 60px; padding: 5px; text-align: center;}
      
      .flex-align { display: flex; align-items: center; gap: 10px; }
      .super-check { width: 18px; height: 18px; accent-color: var(--accent-purple); cursor: pointer; }
      .check-label { margin-bottom: 0 !important; cursor: pointer; color: #fff !important; font-size: 1rem !important;}
      
      .action-row { display: flex; gap: 15px; background: transparent; border: none; padding: 0;}
      .super-button { padding: 12px 24px; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.95rem; }
      .super-button.primary { background: var(--accent-purple); color: #fff; box-shadow: var(--shadow-glow); border: 1px solid rgba(255,255,255,0.1); }
      .super-button.secondary { background: rgba(255,255,255,0.9); color: var(--text-muted);}
    
    `}</style>
    </div>
    // // .super-button.secondary { background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: not-allowed;}
  );
}
