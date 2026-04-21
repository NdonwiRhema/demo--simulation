import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { Category } from '../types';
import { Plus, Save, Activity, LayoutGrid, Sliders, ArrowUpRight, ArrowDownRight, Zap, Check, Trash2, Edit3 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'presets' | 'live'>('presets');
  const { categories, activeCategoryId, setActiveCategory, updateCategoryParams, updateCategory, deleteCategory, addCategory, sendBulkVolume } = useAppConfig();
  
  // Local state for the category being edited in the form
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState<Category['settings'] | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [bumpTimeframe, setBumpTimeframe] = useState<'10 Minutes' | 'Hourly'>('10 Minutes');

  // Modal State for New Category
  const [newCat, setNewCat] = useState({
    name: '',
    dailyVolumeTarget: 1000,
    startingPrice: 10,
    endingPrice: 20,
    dayHours: 'Daylight' as 'Daylight' | '24H',
    actualPercentage: 85
  });

  // Initialize selection
  useEffect(() => {
    if (!localSelectedId && categories.length > 0) {
      const initialId = activeCategoryId || categories[0].id;
      setLocalSelectedId(initialId);
    }
  }, [categories, activeCategoryId]);

  // Update form when local selection changes
  useEffect(() => {
    if (localSelectedId) {
      const cat = categories.find(c => c.id === localSelectedId);
      if (cat) {
        setEditingSettings(cat.settings);
        setEditingName(cat.name);
      }
    }
  }, [localSelectedId, categories]);

  const handleCategoryClick = (id: string) => {
    setLocalSelectedId(id);
    setActiveCategory(id); // Set as the default for the chart too
  };

  const handleAddCategory = async () => {
    const id = `cat-${Date.now()}`;
    const category: Category = {
      id,
      name: newCat.name,
      isActive: false,
      settings: {
        dayHours: newCat.dayHours,
        rateOfDepletion: 60,
        dailyVolumeTarget: newCat.dailyVolumeTarget,
        actualSellOutPercentage: newCat.actualPercentage,
        bulkVolumeBumpValue: 50,
        bulkVolumeCount: 0,
        startingDailyVolume: 0,
        volumeVariation: 'Continuous',
        priceVariation: 'Continuous',
        vToVRelation: 'Display',
        variationPattern: true,
        startingPricePerDay: newCat.startingPrice,
        endingPricePerDay: newCat.endingPrice
      }
    };
    await addCategory(category);
    setIsModalOpen(false);
  };

  const handleUpdateSettings = async () => {
    if (!editingSettings || !localSelectedId) return;

    /* --- VALIDATION: Hourly Volume vs Sell Out Percentage --- */
    const actualTarget = (editingSettings.dailyVolumeTarget * (editingSettings.actualSellOutPercentage || 100)) / 100;
    const totalHourlyAssigned = Object.values(editingSettings.hourlyVolumePattern || {}).reduce((s, v) => s + v, 0);

    if (editingSettings.volumeVariation === 'Hourly' && totalHourlyAssigned > actualTarget) {
      alert(`Validation Error: Total hourly assigned volume (${totalHourlyAssigned}) exceeds the actual sell-out target (${actualTarget}). Please reduce hourly values.`);
      return;
    }
    /* --- END VALIDATION --- */

    setIsSaving(true);
    // Update name if changed
    if (currentCategory && editingName !== currentCategory.name) {
      await updateCategory(localSelectedId, { name: editingName });
    }
    await updateCategoryParams(localSelectedId, editingSettings);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleDeleteCategory = async () => {
    if (!localSelectedId) return;
    const cat = categories.find(c => c.id === localSelectedId);
    if (!cat) return;

    if (window.confirm(`Are you sure you want to delete "${cat.name}"? This action cannot be undone.`)) {
      await deleteCategory(localSelectedId);
      setLocalSelectedId(null);
      setEditingSettings(null);
    }
  };

  const currentCategory = categories.find(c => c.id === localSelectedId);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="tab-navigation">
          <button
            className={activeTab === 'presets' ? 'active' : ''}
            onClick={() => setActiveTab('presets')}
          >
            <LayoutGrid size={18} /> Presets
          </button>
          <button
            className={activeTab === 'live' ? 'active' : ''}
            onClick={() => setActiveTab('live')}
          >
            <Activity size={18} /> Live Control
          </button>
        </div>
        {activeTab === 'presets' && (
          <button className="add-cat-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Category
          </button>
        )}
      </header>

      <div className="settings-content">
        {activeTab === 'presets' ? (
          <div className="presets-layout">
            <div className="category-list-pane">
              <h4 className="pane-title">Categories</h4>
              <div className="category-vertical-list">
                {categories.length === 0 ? (
                  <div className="no-data">
                    <Sliders size={24} />
                    <p>No Categories Found</p>
                  </div>
                ) : (
                  categories.map(cat => (
                    <div
                      key={cat.id}
                      className={`cat-list-item ${cat.id === localSelectedId ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(cat.id)}
                    >
                      <div className="cat-info">
                        <span className="cat-name">{cat.name}</span>
                        <span className="cat-meta">Target: {cat.settings.dailyVolumeTarget}</span>
                      </div>
                      {cat.id === localSelectedId && <Check size={16} className="active-icon" />}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="settings-form-pane">
              {editingSettings ? (
                <div className="form-container">
                  <div className="form-header">
                    <div className="title-edit-group">
                      <Edit3 size={16} className="edit-icon" />
                      <input 
                        type="text" 
                        className="name-edit-input" 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)}
                        placeholder="Category Name"
                      />
                    </div>
                    <div className="header-actions">
                      <button className="delete-btn" onClick={handleDeleteCategory} title="Delete Category">
                        <Trash2 size={18} />
                      </button>
                      <button className="save-btn" onClick={handleUpdateSettings} disabled={isSaving}>
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                      </button>
                    </div>
                  </div>

                  <div className="form-sections-grid">
                    <div className="form-section">
                      <h4>V2 Configuration</h4>
                      <div className="input-group">
                        <label>Actual Sell-out Percentage (%)</label>
                        <input
                          type="number"
                          value={editingSettings.actualSellOutPercentage}
                          onChange={e => setEditingSettings({ ...editingSettings, actualSellOutPercentage: Number(e.target.value) })}
                        />
                      </div>
                      <div className="input-group">
                        <label>Bulk Volume Bump Value</label>
                        <input
                          type="number"
                          value={editingSettings.bulkVolumeBumpValue}
                          onChange={e => setEditingSettings({ ...editingSettings, bulkVolumeBumpValue: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <h4>Volume Strategy</h4>
                      <div className="input-group">
                        <label>Volume Variation Mode</label>
                        <select
                          value={editingSettings.volumeVariation}
                          onChange={e => setEditingSettings({ ...editingSettings, volumeVariation: e.target.value as any })}
                        >
                          <option value="Continuous">Continuous (Auto-Split Target)</option>
                          <option value="Hourly">Hourly (Manual Distribution)</option>
                        </select>
                      </div>

                      {editingSettings.volumeVariation === 'Continuous' ? (
                        <div className="input-group">
                          <label>Daily Volume Target</label>
                          <input
                            type="number"
                            value={editingSettings.dailyVolumeTarget}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const hours = editingSettings.dayHours === 'Daylight' ? 9 : 24;
                              const perHour = val / hours;
                              const newPattern: Record<number, number> = {};
                              const start = editingSettings.dayHours === 'Daylight' ? 8 : 0;
                              const end = editingSettings.dayHours === 'Daylight' ? 17 : 24;
                              for (let i = start; i < end; i++) newPattern[i] = perHour;

                              setEditingSettings({
                                ...editingSettings,
                                dailyVolumeTarget: val,
                                hourlyVolumePattern: newPattern
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          <label>Manual Hourly Volume Distribution</label>
                          <div className="hourly-distribution-grid">
                            {(() => {
                              const start = editingSettings.dayHours === 'Daylight' ? 8 : 0;
                              const end = editingSettings.dayHours === 'Daylight' ? 17 : 24;
                              const hours = [];
                              for (let i = start; i < end; i++) {
                                hours.push(
                                  <div key={i} className="hourly-input">
                                    <label>{i}:00</label>
                                    <input
                                      type="number"
                                      value={editingSettings.hourlyVolumePattern?.[i]?.toFixed(1) || 0}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        const newPattern = { ...editingSettings.hourlyVolumePattern, [i]: val };
                                        const total = Object.values(newPattern).reduce((a, b) => a + b, 0);
                                        setEditingSettings({
                                          ...editingSettings,
                                          hourlyVolumePattern: newPattern,
                                          dailyVolumeTarget: total
                                        });
                                      }}
                                    />
                                  </div>
                                );
                              }
                              return hours;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-section">
                      <h4>Price Strategy</h4>
                      <div className="input-group">
                        <label>Price Variation Mode</label>
                        <select
                          value={editingSettings.priceVariation}
                          onChange={e => setEditingSettings({ ...editingSettings, priceVariation: e.target.value as any })}
                        >
                          <option value="Continuous">Continuous (Start to End Range)</option>
                          <option value="Hourly">Hourly (Manual Distribution)</option>
                        </select>
                      </div>

                      {editingSettings.priceVariation === 'Continuous' ? (
                        <div className="input-row">
                          <div className="input-group">
                            <label>Start Price</label>
                            <input
                              type="number"
                              value={editingSettings.startingPricePerDay}
                              onChange={e => setEditingSettings({ ...editingSettings, startingPricePerDay: Number(e.target.value) })}
                            />
                          </div>
                          <div className="input-group">
                            <label>End Price</label>
                            <input
                              type="number"
                              value={editingSettings.endingPricePerDay}
                              onChange={e => setEditingSettings({ ...editingSettings, endingPricePerDay: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="input-group">
                          <label>Manual Hourly Price Distribution</label>
                          <div className="hourly-distribution-grid">
                            {(() => {
                              const start = editingSettings.dayHours === 'Daylight' ? 8 : 0;
                              const end = editingSettings.dayHours === 'Daylight' ? 17 : 24;
                              const hours = [];
                              for (let i = start; i < end; i++) {
                                hours.push(
                                  <div key={i} className="hourly-input">
                                    <label>{i}:00</label>
                                    <input
                                      type="number"
                                      value={editingSettings.hourlyPricePattern?.[i]?.toFixed(2) || 0}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        const newPattern = { ...editingSettings.hourlyPricePattern, [i]: val };
                                        setEditingSettings({
                                          ...editingSettings,
                                          hourlyPricePattern: newPattern
                                        });
                                      }}
                                    />
                                  </div>
                                );
                              }
                              return hours;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-section">
                      <h4>Additional Parameters</h4>
                      <div className="input-group">
                        <label>Day Hours</label>
                        <select
                          value={editingSettings.dayHours}
                          onChange={e => {
                            const newHours = e.target.value as any;
                            const count = newHours === 'Daylight' ? 9 : 24;
                            const perHour = editingSettings.dailyVolumeTarget / count;
                            const newPattern: Record<number, number> = {};
                            const start = newHours === 'Daylight' ? 8 : 0;
                            const end = newHours === 'Daylight' ? 17 : 24;
                            for (let i = start; i < end; i++) newPattern[i] = perHour;

                            setEditingSettings({
                              ...editingSettings,
                              dayHours: newHours,
                              hourlyVolumePattern: newPattern
                            });
                          }}
                        >
                          <option value="Daylight">Daylight (8am - 5pm)</option>
                          <option value="24H">24 Hours</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Rate of Depletion</label>
                        <input
                          type="number"
                          value={editingSettings.rateOfDepletion}
                          onChange={e => setEditingSettings({ ...editingSettings, rateOfDepletion: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="form-section full-width">
                      <h4>Advanced Logic</h4>
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="variationPattern"
                          checked={editingSettings.variationPattern}
                          onChange={e => setEditingSettings({ ...editingSettings, variationPattern: e.target.checked })}
                        />
                        <label htmlFor="variationPattern">Enable smoothed random minute-by-minute fluctuations</label>
                      </div>
                      <div className="input-group">
                        <label>V to V Relation (Chart Coloring)</label>
                        <select
                          value={editingSettings.vToVRelation}
                          onChange={e => setEditingSettings({ ...editingSettings, vToVRelation: e.target.value as any })}
                        >
                          <option value="None">None (Uniform Color)</option>
                          <option value="Display">Display (Progressive/Regressive Colors)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <Sliders size={48} />
                  <p>Select a category to edit its parameters</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="live-control-tab">
            <div className="live-grid">
              {categories.map(cat => (
                <div key={cat.id} className="live-cat-card">
                  <div className="live-header">
                    <h4>{cat.name}</h4>
                    <span className="live-status">Target: {cat.settings.dailyVolumeTarget}</span>
                  </div>
                  
                  <div className="control-sections">
                    <div className="volume-control">
                      <p>Daily Target Volume</p>
                      <div className="volume-input-group">
                        <input 
                          type="number" 
                          className="direct-volume-input"
                          value={cat.settings.dailyVolumeTarget} 
                          onChange={(e) => updateCategoryParams(cat.id, { dailyVolumeTarget: Number(e.target.value) })}
                        />
                        <div className="step-buttons">
                          <button onClick={() => updateCategoryParams(cat.id, { dailyVolumeTarget: cat.settings.dailyVolumeTarget - 10 })}>
                            <ArrowDownRight size={14} /> -10
                          </button>
                          <button onClick={() => updateCategoryParams(cat.id, { dailyVolumeTarget: cat.settings.dailyVolumeTarget + 10 })}>
                            <ArrowUpRight size={14} /> +10
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bulk-control">
                      <div className="bulk-label-row">
                        <p>Bulk Volume Bump</p>
                        <select 
                          className="timeframe-select" 
                          value={bumpTimeframe} 
                          onChange={(e) => setBumpTimeframe(e.target.value as any)}
                        >
                          <option value="10 Minutes">10m</option>
                          <option value="Hourly">1h</option>
                        </select>
                      </div>
                      <div className="bulk-actions">
                        <input 
                          type="number" 
                          value={cat.settings.bulkVolumeBumpValue} 
                          onChange={(e) => updateCategoryParams(cat.id, { bulkVolumeBumpValue: Number(e.target.value) })}
                        />
                        <button 
                          /* --- VALIDATION: Disable if Limit Reached or Target Exceeded --- */
                          disabled={(() => {
                            const recentCount = (cat.settings.bulkEvents || []).filter(e => {
                              const eTs = e.timestamp;
                              const eDate = eTs instanceof Date ? eTs : (eTs as any).toDate ? (eTs as any).toDate() : new Date(eTs as any);
                              return eDate.getTime() > Date.now() - (10 * 60 * 1000);
                            }).length;
                            
                            const totalBumps = (cat.settings.bulkEvents || []).reduce((s, e) => s + e.amount, 0);
                            const wouldExceed = (totalBumps + cat.settings.bulkVolumeBumpValue) > cat.settings.dailyVolumeTarget;
                            
                            return recentCount >= 10 || wouldExceed;
                          })()}
                          onClick={() => sendBulkVolume(cat.id, cat.settings.bulkVolumeBumpValue, bumpTimeframe)}
                          className="bump-btn"
                        >
                          <Zap size={16} /> Send {bumpTimeframe === 'Hourly' ? '1h' : '10m'} ({(() => {
                             const recentCount = (cat.settings.bulkEvents || []).filter(e => {
                              const eTs = e.timestamp;
                              const eDate = eTs instanceof Date ? eTs : (eTs as any).toDate ? (eTs as any).toDate() : new Date(eTs as any);
                              return eDate.getTime() > Date.now() - (10 * 60 * 1000);
                            }).length;
                            return 10 - recentCount;
                          })()} left)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Category</h2>
            <div className="form-group">
              <label>Category Name</label>
              <input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Retail Spaces" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Daily Volume Target</label>
                <input type="number" value={newCat.dailyVolumeTarget} onChange={e => setNewCat({ ...newCat, dailyVolumeTarget: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Actual % Target</label>
                <input type="number" value={newCat.actualPercentage} onChange={e => setNewCat({ ...newCat, actualPercentage: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Price</label>
                <input type="number" value={newCat.startingPrice} onChange={e => setNewCat({ ...newCat, startingPrice: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>End Price</label>
                <input type="number" value={newCat.endingPrice} onChange={e => setNewCat({ ...newCat, endingPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-group">
              <label>Day Hours</label>
              <select value={newCat.dayHours} onChange={e => setNewCat({ ...newCat, dayHours: e.target.value as any })}>
                <option value="Daylight">Daylight (8am - 5pm)</option>
                <option value="24H">24 Hours</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="confirm-btn" onClick={handleAddCategory}>Create Category</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tab-navigation {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .tab-navigation button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-navigation button.active {
          background: #3b82f6;
          color: #fff;
        }
        .add-cat-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #10b981;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .settings-content {
          flex: 1;
          overflow: hidden;
        }
        
        /* Presets Layout */
        .presets-layout {
          display: flex;
          height: 100%;
          gap: 24px;
        }
        .category-list-pane {
          width: 300px;
          background: #1a1c2c;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .pane-title {
          font-size: 0.8rem;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }
        .category-vertical-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cat-list-item {
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .cat-list-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .cat-list-item.active {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .cat-info {
          display: flex;
          flex-direction: column;
        }
        .cat-name {
          font-weight: 600;
          color: #fff;
          font-size: 0.9rem;
        }
        .cat-meta {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .active-icon {
          color: #3b82f6;
        }
        .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #475569;
          gap: 12px;
          text-align: center;
        }
        .no-data p {
          font-size: 0.85rem;
        }

        .settings-form-pane {
          flex: 1;
          background: #1a1c2c;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .form-container {
          padding: 30px;
          height: 100%;
          overflow-y: auto;
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn:disabled {
          background: #1e293b;
          color: #94a3b8;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .delete-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .delete-btn:hover {
          background: #ef4444;
          color: #fff;
        }

        .title-edit-group {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          flex: 1;
          max-width: 400px;
        }
        
        .edit-icon {
          color: #3b82f6;
          opacity: 0.6;
        }
        
        .name-edit-input {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 1.2rem;
          font-weight: 700;
          outline: none;
          width: 100%;
        }
        
        .name-edit-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        
        .form-sections-grid {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-section.full-width {
          grid-column: 1 / -1;
        }
        .form-section h4 {
          color: #3b82f6;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .input-group input, .input-group select {
          background: #0d0e14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 12px;
          border-radius: 10px;
          outline: none;
        }
        .input-row {
          display: flex;
          gap: 16px;
        }
        .input-row .input-group {
          flex: 1;
        }

        .hourly-distribution-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          padding: 16px;
          border-radius: 12px;
          max-height: 400px;
          overflow-y: auto;
        }
        .hourly-input {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hourly-input label {
          font-size: 0.7rem;
          color: #64748b;
        }
        .hourly-input input {
          padding: 6px 10px !important;
          font-size: 0.8rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 10px;
        }
        .checkbox-group label {
          font-size: 0.9rem;
          color: #fff;
          cursor: pointer;
        }

        .no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #475569;
          gap: 16px;
        }

        /* Live Grid */
        .live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .live-cat-card {
          background: #1a1c2c;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
        }
        .live-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .control-sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .button-group, .bulk-actions {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .button-group button {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .bulk-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .volume-input-group {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .direct-volume-input {
          width: 100px;
          background: #0d0e14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #3b82f6;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .direct-volume-input:focus {
          border-color: #3b82f6;
        }
        .step-buttons {
          flex: 1;
          display: flex;
          gap: 6px;
        }
        .step-buttons button {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .step-buttons button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .timeframe-select {
          background: #0d0e14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #3b82f6;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          outline: none;
        }
        .bulk-actions input {
          width: 80px;
          background: #0d0e14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 8px;
          border-radius: 8px;
        }
        .bump-btn {
          flex: 1;
          background: #fbbf24;
          color: #000;
          border: none;
          padding: 8px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .bump-btn:disabled {
          background: #475569;
          cursor: not-allowed;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }
        .modal-content {
          background: #1a1c2c;
          padding: 32px;
          border-radius: 24px;
          width: 100%;
          max-width: 500px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-row {
          display: flex;
          gap: 16px;
        }
        .form-group label {
          display: block;
          color: #94a3b8;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }
        .form-group input, .form-group select {
          width: 100%;
          background: #0d0e14;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          outline: none;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .cancel-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .confirm-btn {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
