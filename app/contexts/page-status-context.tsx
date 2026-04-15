import { createContext, useContext, useState, type ReactNode } from 'react';

import { mockJuzData, STATUS_CYCLE, type JuzData } from '@/data/mock-juz-data';

interface PageStatusContextValue {
  juzData: JuzData[];
  cyclePageStatus: (pageNumber: number) => void;
}

const PageStatusContext = createContext<PageStatusContextValue | null>(null);

export function PageStatusProvider({ children }: { children: ReactNode }) {
  const [juzData, setJuzData] = useState<JuzData[]>(() =>
    mockJuzData.map((juz) => ({ ...juz, pages: juz.pages.map((p) => ({ ...p })) })),
  );

  const cyclePageStatus = (pageNumber: number) => {
    setJuzData((prev) =>
      prev.map((juz) => ({
        ...juz,
        pages: juz.pages.map((p) => {
          if (p.pageNumber !== pageNumber) return p;
          const nextIndex = (STATUS_CYCLE.indexOf(p.status) + 1) % STATUS_CYCLE.length;
          return { ...p, status: STATUS_CYCLE[nextIndex] };
        }),
      })),
    );
  };

  return (
    <PageStatusContext.Provider value={{ juzData, cyclePageStatus }}>
      {children}
    </PageStatusContext.Provider>
  );
}

export function usePageStatus() {
  const context = useContext(PageStatusContext);
  if (!context) {
    throw new Error('usePageStatus must be used within a PageStatusProvider');
  }
  return context;
}
