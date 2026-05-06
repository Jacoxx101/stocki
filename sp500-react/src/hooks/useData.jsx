import { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/data.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(d => {
        console.log('Data loaded:', d.metadata);
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">Loading data...</div>
          <div className="text-sm text-gray-400 mt-2">This may take a few seconds</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md px-4">
          <div className="text-xl font-semibold text-red-600 mb-2">Failed to load data</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <div className="text-xs text-gray-400">Make sure data.json exists in the public folder</div>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}