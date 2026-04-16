import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import ChartPage from './pages/ChartPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<ChartPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
