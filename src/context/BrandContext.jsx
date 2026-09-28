// src/context/BrandContext.jsx
import { createContext, useState, useContext } from 'react';

export const BRANDS = [
  { id: 'athleta',         label: 'Athleta',         configured: true,  logo: 'https://www.google.com/s2/favicons?domain=athleta.com&sz=128'         },
  { id: 'gap',             label: 'Gap',             configured: false, logo: 'https://www.google.com/s2/favicons?domain=gap.com&sz=128'             },
  { id: 'old-navy',        label: 'Old Navy',        configured: false, logo: 'https://www.google.com/s2/favicons?domain=oldnavy.com&sz=128'         },
  { id: 'banana-republic', label: 'Banana Republic', configured: false, logo: 'https://www.google.com/s2/favicons?domain=bananarepublic.com&sz=128'  },
];

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [brandId, setBrandId] = useState(() => {
    return localStorage.getItem('selectedBrand') || 'athleta';
  });

  const selectBrand = (id) => {
    localStorage.setItem('selectedBrand', id);
    setBrandId(id);
  };

  const currentBrand = BRANDS.find(b => b.id === brandId) ?? BRANDS[0];

  return (
    <BrandContext.Provider value={{ brandId, currentBrand, selectBrand, brands: BRANDS }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error('useBrand must be used inside BrandProvider');
  return ctx;
}
