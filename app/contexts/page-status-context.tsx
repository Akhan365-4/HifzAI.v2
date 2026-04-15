import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

import { mockJuzData, STATUS_CYCLE, type JuzData, type PageStatus } from '@/data/mock-juz-data';

interface PageStatusContextValue {
  juzData: JuzData[];
  cyclePageStatus: (pageNumber: number) => void;
  setPageStatus: (pageNumber: number, status: PageStatus) => void;
  getPageStatus: (pageNumber: number) => PageStatus;
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

  const setPageStatus = (pageNumber: number, status: PageStatus) => {
    setJuzData((prev) =>
      prev.map((juz) => ({
        ...juz,
        pages: juz.pages.map((p) =>
          p.pageNumber === pageNumber ? { ...p, status } : p,
        ),
      })),
    );
  };

  const getPageStatus = useCallback(
    (pageNumber: number): PageStatus => {
      for (const juz of juzData) {
        const found = juz.pages.find((p) => p.pageNumber === pageNumber);
        if (found) return found.status;
      }
      return 'Not Tested';
    },
    [juzData],
  );

  return (
    <PageStatusContext.Provider value={{ juzData, cyclePageStatus, setPageStatus, getPageStatus }}>
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
