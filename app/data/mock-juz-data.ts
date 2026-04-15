export type PageStatus = 'Strong' | 'Needs Review' | 'Retest Needed' | 'Not Tested';

export interface PageData {
  pageNumber: number;
  status: PageStatus;
}

export interface JuzData {
  juzNumber: number;
  pages: PageData[];
}

const statuses: PageStatus[] = ['Strong', 'Needs Review', 'Retest Needed', 'Not Tested'];

function seededStatus(juz: number, pageIndex: number): PageStatus {
  const hash = (juz * 31 + pageIndex * 7) % statuses.length;
  return statuses[hash];
}

function generateJuzData(juzNumber: number): JuzData {
  const startPage = (juzNumber - 1) * 20 + 1;
  const pages: PageData[] = Array.from({ length: 20 }, (_, i) => ({
    pageNumber: startPage + i,
    status: seededStatus(juzNumber, i),
  }));
  return { juzNumber, pages };
}

export const mockJuzData: JuzData[] = Array.from({ length: 30 }, (_, i) =>
  generateJuzData(i + 1),
);
