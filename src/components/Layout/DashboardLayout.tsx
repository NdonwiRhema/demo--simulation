import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BarChart2, Settings, Maximize, Search, LogOut, Eye } from 'lucide-react';
import { useAppConfig } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function DashboardLayout() {
  const { isFullScreen, setFullScreen, activeCategoryId, categories, setActiveCategory } = useAppConfig();
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = role === 'admin';
  const isSettings = location.pathname.includes('/settings');
  const isPreview = location.pathname.includes('/preview');

  // Show sidebars only for admin in specific pages
  const showSidebars = isAdmin && (isSettings || isPreview);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const otherCategories = categories.filter(c => c.id !== activeCategoryId);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`layout-container ${!showSidebars ? 'full-presentation' : ''}`}>
      {/* LEFT SIDEBAR (Admin only on specific pages) */}
      {showSidebars && (
        <aside className="sidebar-left">
          <div className="logo cursor-pointer" onClick={() => navigate(isAdmin ? '/preview' : '/')}>
            <img src={logo} alt="Logo" style={{ width: '40px' }} />
          </div>

          <nav className="nav-icons">
            <button className={`icon-btn ${isPreview ? 'active' : ''}`} onClick={() => navigate('/preview')}>
              <BarChart2 size={24} />
            </button>
            <button className={`icon-btn ${isSettings ? 'active' : ''}`} onClick={() => navigate('/settings')}>
              <Settings size={24} />
            </button>

            <div className="spacer" />

            <button className="icon-btn toggle-full" onClick={() => setFullScreen(!isFullScreen)}>
              <Maximize size={24} />
            </button>
          </nav>
        </aside>
      )}

      {/* MAIN CONTENT */}
      <div className="main-wrapper">
        {/* TOP BAR */}
        <header className="top-bar">
          <div className="logo-container">
            {!showSidebars && <img src={logo} alt="Logo" style={{ width: '40px', marginRight: '10px' }} />}
            <h2 className="brand-name">{!showSidebars ? 'High ' : ''}</h2>
          </div>

          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
              <span className="user-role">{role?.toUpperCase()}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="content-area">
          <main className="main-content">
            <Outlet />
          </main>

          {/* RIGHT SIDEBAR (Admin only on Preview page) */}
          {showSidebars && isPreview && (
            <aside className="sidebar-right">
              <div className="sidebar-section">
                <h3 className="section-title">Active Category</h3>
                {activeCategory && (
                  <div className="category-card active-card">
                    <div className="cat-icon" />
                    <div className="cat-details">
                      <span className="cat-name">{activeCategory.name}</span>
                      <span className="cat-stats">Target: {activeCategory.settings.dailyVolumeTarget}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="sidebar-section">
                <h3 className="section-title">All Categories</h3>
                <div className="search-box">
                  <Search size={16} />
                  <input type="text" placeholder="Search categories..." />
                </div>
                <div className="categories-list">
                  {otherCategories.map(cat => (
                    <div key={cat.id} className="category-item" onClick={() => setActiveCategory(cat.id)}>
                      <div className="cat-icon" />
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <style>{`
        .layout-container { 
          display: flex; 
          height: 100vh; 
          width: 100vw; 
          background: #0d0e14; 
          color: #fff; 
          font-family: 'Inter', sans-serif;
        }
        .full-presentation .main-content {
          padding: 0;
          border-radius: 0;
          background: #000;
        }
        .full-presentation .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(13, 14, 20, 0.8);
          backdrop-filter: blur(10px);
          padding: 0 20px;
        }
        .full-presentation .content-area {
          padding: 0;
        }
        .sidebar-left { 
          width: 80px; 
          background: #1a1c2c; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 20px 0; 
          border-right: 1px solid rgba(255, 255, 255, 0.05); 
        }
        .nav-icons { 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          margin-top: 40px; 
          flex: 1; 
        }
        .icon-btn { 
          color: #94a3b8; 
          padding: 12px; 
          border-radius: 12px; 
          border: none; 
          background: transparent; 
          cursor: pointer; 
          transition: all 0.2s;
        }
        .icon-btn:hover { 
          color: #fff; 
          background: rgba(255, 255, 255, 0.05); 
        }
        .icon-btn.active { 
          color: #3b82f6; 
          background: rgba(59, 130, 246, 0.1); 
        }
        .main-wrapper { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
        }
        .top-bar { 
          height: 70px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 0 40px; 
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .logo-container {
          display: flex;
          align-items: center;
        }
        .brand-name {
          font-size: 1.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .user-profile { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
        }
        .user-info { 
          display: flex; 
          flex-direction: column; 
          text-align: right; 
        }
        .user-name { 
          font-weight: 600; 
          font-size: 0.9rem; 
          color: #fff;
        }
        .user-role { 
          font-size: 0.75rem; 
          color: #3b82f6; 
          font-weight: 600;
        }
        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: #ef4444;
          color: #fff;
        }
        .content-area { 
          display: flex; 
          flex: 1; 
          overflow: hidden; 
          padding: 20px; 
          gap: 20px; 
        }
        .main-content { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          background: #111218; 
          border-radius: 16px; 
          overflow: hidden; 
          position: relative;
        }
        .sidebar-right { 
          width: 300px; 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          overflow-y: auto; 
        }
        .section-title { 
          font-size: 0.9rem; 
          color: #94a3b8; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          margin-bottom: 12px;
        }
        .category-card {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .cat-details {
          display: flex;
          flex-direction: column;
        }
        .cat-name {
          font-weight: 600;
          color: #fff;
        }
        .cat-stats {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .category-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .cat-icon {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3b82f6;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 15px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: #fff;
          outline: none;
          width: 100%;
          font-size: 0.85rem;
        }
        .spacer { flex: 1; }
      `}</style>
    </div>
  );
}
