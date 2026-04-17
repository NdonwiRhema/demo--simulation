import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart2, Settings, SlidersHorizontal, Maximize, Search, User } from 'lucide-react';
import { useAppConfig } from '../../context/AppContext';

export default function DashboardLayout() {
  const { isFullScreen, setFullScreen, activeCategoryId, categories, setActiveCategory } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const isSettings = location.pathname.includes('/settings');

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const otherCategories = categories.filter(c => c.id !== activeCategoryId);

  return (
    <div className={`layout-container ${isFullScreen ? 'fullscreen' : ''}`}>
      {/* LEFT SIDEBAR */}
      <aside className="sidebar-left">
        <div className="logo cursor-pointer" onClick={() => navigate('/')}>
          <span style={{ color: 'var(--accent-purple)', fontWeight: 800, fontSize: '1.5rem' }}>mo</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.5rem' }}>Bo</span>
        </div>

        <nav className="nav-icons">
          <button className={`icon-btn ${!isSettings ? 'active' : ''}`} onClick={() => navigate('/')}>
            <BarChart2 size={24} />
          </button>
          <button className="icon-btn disabled" disabled>
            <SlidersHorizontal size={24} />
          </button>
          <button className={`icon-btn ${isSettings ? 'active' : 'disabled'}`} disabled={true /* disabled via prompt, admin only via URL */}>
            <Settings size={24} />
          </button>

          <div className="spacer" />

          <button className="icon-btn toggle-full" onClick={() => setFullScreen(!isFullScreen)}>
            <Maximize size={24} />
          </button>
        </nav>
      </aside>

      {/* CENTER & RIGHT CONTENT */}
      <div className="main-wrapper">
        {/* TOP BAR */}
        <header className="top-bar">
          <div className="spacer"></div>
          {/* User profile section matching prompt */}
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">James Radcliffe</span>
              <span className="user-role">Admin</span>
            </div>
            <div className="avatar">
              <User size={20} />
            </div>
          </div>
        </header>

        <div className="content-area">
          {/* MAIN PAGE BODY */}
          <main className="main-content">
            <Outlet />
          </main>

          {/* RIGHT SIDEBAR (Only if not fullscreen) */}
          {!isFullScreen && (
            <aside className="sidebar-right">
              <div className="sidebar-section">
                <h3 className="section-title">Active</h3>
                {activeCategory ? (
                  <div className="category-card active-card">
                    <div className="cat-icon" />
                    <span>{activeCategory.name}</span>
                  </div>
                ) : (
                  <details><summary>No active category</summary></details>
                )}
              </div>

              <div className="sidebar-section">
                <details open className="accordion">
                  <summary className="section-title">All Categories</summary>
                  <div className="search-box">
                    <Search size={16} />
                    <input type="text" placeholder="Search..." />
                  </div>

                  <div className="categories-list">
                    {otherCategories.length === 0 ? (
                      <span className="no-data">No data</span>
                    ) : (
                      otherCategories.map(cat => (
                        <div key={cat.id} className="category-item" onClick={() => setActiveCategory(cat.id)}>
                          <div className="cat-icon" />
                          <span>{cat.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            </aside>
          )}
        </div>
      </div>
      {/* 
Quick layout styles injected for functionality - in a real app this is moved to CSS.
Using index.css for bulk sizing.
*/}
      <style>{`
    .layout-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: var(--bg-main); color: #fff; }
    .sidebar-left { width: var(--sidebar-w); background: var(--bg-panel); display: flex; flex-direction: column; align-items: center; padding: 20px 0; border-right: 1px solid var(--border-light); z-index: 10; }
    .nav-icons { display: flex; flex-direction: column; gap: 30px; margin-top: 60px; flex: 1; align-items: center; }
    .icon-btn { color: var(--text-secondary); transition: 0.3s; padding: 12px; border-radius: 12px; }
    .icon-btn:hover:not(.disabled) { color: #fff; background: rgba(255,255,255,0.05); }
    .icon-btn.active { color: var(--accent-purple); border-left: 3px solid var(--accent-purple); border-radius: 0; }
    .icon-btn.disabled { opacity: 0.3; cursor: not-allowed; }
    .spacer { flex: 1; }
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .top-bar { height: 80px; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; }
    .user-profile { display: flex; align-items: center; gap: 15px; }
    .user-info { display: flex; flex-direction: column; text-align: right; }
    .user-name { font-weight: 600; font-size: 0.9rem; }
    .user-role { font-size: 0.75rem; color: var(--text-secondary); }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-purple); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .content-area { display: flex; flex: 1; overflow: hidden; padding: 0 40px 40px 40px; gap: 30px; }
    .main-content { flex: 1; display: flex; flex-direction: column; background: var(--bg-panel); border-radius: var(--radius-xl); padding: 30px; overflow: hidden; position: relative;}
    .sidebar-right { width: var(--sidebar-right-w); display: flex; flex-direction: column; gap: 30px; overflow-y: auto; }
    .section-title { font-size: 1.25rem; margin-bottom: 15px; font-weight: 600; cursor: pointer; }
    .category-card, .category-item { display: flex; align-items: center; gap: 15px; background: var(--bg-surface); padding: 15px; border-radius: var(--radius-md); cursor: pointer; transition: 0.2s;}
    .category-item:hover { background: rgba(255,255,255, 0.05); }
    .cat-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--text-muted); }
    .search-box { display: flex; align-items: center; gap: 10px; background: var(--bg-main); padding: 12px; border-radius: var(--radius-md); margin-bottom: 20px; }
    .search-box input { background: transparent; border: none; color: #fff; outline: none; width: 100%; }
    details > summary { list-style: none; }
    details > summary::-webkit-details-marker { display: none; }
  `}</style>
    </div>
  );
}
