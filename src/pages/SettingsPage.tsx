import React, { useState } from 'react';
import { useAppConfig } from '../context/AppContext';
import { Category } from '../types';
import { Plus, Save, Activity, LayoutGrid, Sliders, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'presets' | 'live'>('presets');
  const { categories, activeCategoryId, setActiveCategory, updateCategoryParams, addCategory, sendBulkVolume } = useAppConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal State for New Category
  const [newCat, setNewCat] = useState({
    name: '',
    dailyVolumeTarget: 1000,
    startingPrice: 10,
    endingPrice: 20,
    dayHours: 'Daylight' as 'Daylight' | '24H',
    actualPercentage: 85
  });

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

  const selectedCategory = categories.find(c => c.id === (activeTab === 'presets' ? activeCategoryId : activeCategoryId)) || categories[0];

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
          <div className="presets-tab">
            <div className="category-grid">
              {categories.map(cat => (
                <div 
                  key={cat.id} 
                  className={`cat-settings-card ${cat.id === activeCategoryId ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className="card-header">
                    <h3>{cat.name}</h3>
                    {cat.id === activeCategoryId && <span className="default-badge">Default</span>}
                  </div>
                  <div className="card-body">
                    <div className="setting-row">
                      <span>Daily Target</span>
                      <span>{cat.settings.dailyVolumeTarget}</span>
                    </div>
                    <div className="setting-row">
                      <span>Actual %</span>
                      <span>{cat.settings.actualSellOutPercentage}%</span>
                    </div>
                    <div className="setting-row">
                      <span>Price Range</span>
                      <span>{cat.settings.startingPricePerDay} - {cat.settings.endingPricePerDay}</span>
                    </div>
                  </div>
                </div>
              ))}
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
                      <p>Adjust Volume (Current Frame)</p>
                      <div className="button-group">
                        <button onClick={() => updateCategoryParams(cat.id, { dailyVolumeTarget: cat.settings.dailyVolumeTarget - 10 })}>
                          <ArrowDownRight size={16} /> -10
                        </button>
                        <button onClick={() => updateCategoryParams(cat.id, { dailyVolumeTarget: cat.settings.dailyVolumeTarget + 10 })}>
                          <ArrowUpRight size={16} /> +10
                        </button>
                      </div>
                    </div>

                    <div className="bulk-control">
                      <p>Bulk Volume Bump</p>
                      <div className="bulk-actions">
                        <input 
                          type="number" 
                          value={cat.settings.bulkVolumeBumpValue} 
                          onChange={(e) => updateCategoryParams(cat.id, { bulkVolumeBumpValue: Number(e.target.value) })}
                        />
                        <button 
                          disabled={cat.settings.bulkVolumeCount >= 10}
                          onClick={() => sendBulkVolume(cat.id, cat.settings.bulkVolumeBumpValue)}
                          className="bump-btn"
                        >
                          <Zap size={16} /> Send Bulk ({10 - cat.settings.bulkVolumeCount} left)
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
              <input type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} placeholder="e.g. Retail Spaces" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Daily Volume Target</label>
                <input type="number" value={newCat.dailyVolumeTarget} onChange={e => setNewCat({...newCat, dailyVolumeTarget: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>Actual % Target</label>
                <input type="number" value={newCat.actualPercentage} onChange={e => setNewCat({...newCat, actualPercentage: Number(e.target.value)})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Price</label>
                <input type="number" value={newCat.startingPrice} onChange={e => setNewCat({...newCat, startingPrice: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>End Price</label>
                <input type="number" value={newCat.endingPrice} onChange={e => setNewCat({...newCat, endingPrice: Number(e.target.value)})} />
              </div>
            </div>
            <div className="form-group">
              <label>Day Hours</label>
              <select value={newCat.dayHours} onChange={e => setNewCat({...newCat, dayHours: e.target.value as any})}>
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
          overflow-y: auto;
        }
        .category-grid, .live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .cat-settings-card, .live-cat-card {
          background: #1a1c2c;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cat-settings-card.active {
          border-color: #3b82f6;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
        }
        .card-header, .live-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .default-badge {
          font-size: 0.7rem;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .setting-row span:last-child {
          color: #fff;
          font-weight: 600;
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
