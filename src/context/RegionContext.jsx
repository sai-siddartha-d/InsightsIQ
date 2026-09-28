// src/context/RegionContext.jsx
import { createContext, useState, useContext } from 'react';

export const REGIONS = [
  { id: 'us',     label: 'US',     flag: '🇺🇸' },
  { id: 'canada', label: 'Canada', flag: '🇨🇦' },
  { id: 'japan',  label: 'Japan',  flag: '🇯🇵' },
];

const RegionContext = createContext(null);

export function RegionProvider({ children }) {
  const [regionId, setRegionId] = useState(() => {
    return localStorage.getItem('selectedRegion') || 'us';
  });

  const selectRegion = (id) => {
    localStorage.setItem('selectedRegion', id);
    setRegionId(id);
  };

  const currentRegion = REGIONS.find(r => r.id === regionId) ?? REGIONS[0];

  return (
    <RegionContext.Provider value={{ regionId, currentRegion, selectRegion, regions: REGIONS }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used inside RegionProvider');
  return ctx;
}
