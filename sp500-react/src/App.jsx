import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { DataProvider } from './hooks/useData';
import ErrorBoundary from './components/ErrorBoundary';
import { LayoutDashboard, Search, Building2, BarChart3, Scale, Flame, Layers3, Layers } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';
import SectorAnalysis from './pages/SectorAnalysis';
import ComparisonTool from './pages/ComparisonTool';
import Heatmap from './pages/Heatmap';
import CompanyHeatmap from './pages/CompanyHeatmap';
import StackPage from './pages/StackPage';

function Navbar() {
  const location = useLocation();
  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/heatmap', label: 'Heatmap', icon: Flame },
    { path: '/company-heatmap', label: 'Cmp Heatmap', icon: Layers3 },
    { path: '/stacks', label: 'Stacks', icon: Layers },
    { path: '/companies', label: 'Companies', icon: Search },
    { path: '/sectors', label: 'Sectors', icon: Building2 },
    { path: '/compare', label: 'Compare', icon: Scale },
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">S&P 500</span>
          </Link>
          <div className="flex gap-1">
            {links.map(link => {
              const active = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-6">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/heatmap" element={<Heatmap />} />
                <Route path="/company-heatmap" element={<CompanyHeatmap />} />
                <Route path="/stacks" element={<StackPage />} />
                <Route path="/companies" element={<CompanyList />} />
                <Route path="/company/:symbol" element={<CompanyDetail />} />
                <Route path="/sectors" element={<SectorAnalysis />} />
                <Route path="/compare" element={<ComparisonTool />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
