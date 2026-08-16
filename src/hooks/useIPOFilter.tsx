/**
 * useIPOFilter — Shared IPO filter context
 *
 * Provides a globally shared "selected IPO" state so that the Dashboard
 * and Applications page stay in sync. When the user clicks an IPO on the
 * Dashboard, the Applications page filters to that IPO automatically.
 */
import React, { createContext, useContext, useState } from 'react';

interface IPOFilterContextValue {
  /** The currently selected IPO id, or null for "All IPOs" */
  selectedIpoId: number | null;
  setSelectedIpoId: (id: number | null) => void;
}

const IPOFilterContext = createContext<IPOFilterContextValue>({
  selectedIpoId: null,
  setSelectedIpoId: () => {},
});

export const IPOFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedIpoId, setSelectedIpoId] = useState<number | null>(null);
  return (
    <IPOFilterContext.Provider value={{ selectedIpoId, setSelectedIpoId }}>
      {children}
    </IPOFilterContext.Provider>
  );
};

/** Use this hook in any component that needs to read/set the IPO filter. */
export function useIPOFilter() {
  return useContext(IPOFilterContext);
}
