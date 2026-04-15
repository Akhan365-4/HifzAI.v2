import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockJuzData, STATUS_CYCLE, type JuzData, type PageStatus, type Mistake } from '@/data/mock-juz-data';

const STORAGE_KEY = 'hifzai_page_statuses';

interface PageStatusContextValue {
  juzData: JuzData[];
  isLoaded: boolean;
  cyclePageStatus: (pageNumber: number) => void;
  setPageStatus: (pageNumber: number, status: PageStatus) => void;
  getPageStatus: (pageNumber: number) => PageStatus;
  setPageMistakes: (pageNumber: number, mistakes: Mistake[]) => void;
  getPageMistakes: (pageNumber: number) => Mistake[];
}

const PageStatusContext = createContext<PageStatusContextValue | null>(null);

function getDefaultData(): JuzData[] {
  return mockJuzData.map((juz) => ({ ...juz, pages: juz.pages.map((p) => ({ ...p })) }));
}

export function PageStatusProvider({ children }: { children: ReactNode }) {
  const [juzData, setJuzData] = useState<JuzData[]>(getDefaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as JuzData[];
          setJuzData(parsed);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (!isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(juzData)).catch(() => {});
  }, [juzData, isLoaded]);

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

  const setPageMistakes = (pageNumber: number, mistakes: Mistake[]) => {
    setJuzData((prev) =>
      prev.map((juz) => ({
        ...juz,
        pages: juz.pages.map((p) =>
          p.pageNumber === pageNumber ? { ...p, mistakes } : p,
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

  const getPageMistakes = useCallback(
    (pageNumber: number): Mistake[] => {
      for (const juz of juzData) {
        const found = juz.pages.find((p) => p.pageNumber === pageNumber);
        if (found) return found.mistakes ?? [];
      }
      return [];
    },
    [juzData],
  );

  if (!isLoaded) return null;

  return (
    <PageStatusContext.Provider value={{ juzData, isLoaded, cyclePageStatus, setPageStatus, getPageStatus, setPageMistakes, getPageMistakes }}>
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
