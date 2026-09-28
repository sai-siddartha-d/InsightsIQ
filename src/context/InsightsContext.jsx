// src/context/InsightsContext.jsx
import { createContext, useContext, useState } from 'react';

const InsightsContext = createContext({ tab: null, setTab: () => {} });

export function InsightsProvider({ children }) {
  const [tab, setTab] = useState(null);
  return (
    <InsightsContext.Provider value={{ tab, setTab }}>
      {children}
    </InsightsContext.Provider>
  );
}

export function useInsights() {
  return useContext(InsightsContext);
}
